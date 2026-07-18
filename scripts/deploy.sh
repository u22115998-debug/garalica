#!/usr/bin/env bash
set -euo pipefail

SERVER_HOST=""
USER_NAME=""
PORT=22
REMOTE_DIR="/opt/bugs.garakrral.com"
TMUX_SESSION="bugs-deploy"
INCLUDE_ENV=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage:
  ./deploy.sh -s SERVER_HOST -u USER [-p PORT] [-r REMOTE_DIR] [-t TMUX_SESSION] [-e] [-n]

Options:
  -s  Server host / IP (required)
  -u  SSH user (required)
  -p  SSH port (default: 22)
  -r  Remote deploy directory (default: /opt/bugs.garakrral.com)
  -t  Tmux session base name (default: bugs-deploy)
  -e  Include .env in archive
  -n  Dry run
EOF
}

log() {
  printf '==> %s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

shell_quote() {
  # POSIX-safe single-quoted string
  printf "'%s'" "${1//\'/\'\\\'\'}"
}

while getopts ":s:u:p:r:t:en" opt; do
  case "$opt" in
    s) SERVER_HOST="$OPTARG" ;;
    u) USER_NAME="$OPTARG" ;;
    p) PORT="$OPTARG" ;;
    r) REMOTE_DIR="$OPTARG" ;;
    t) TMUX_SESSION="$OPTARG" ;;
    e) INCLUDE_ENV=1 ;;
    n) DRY_RUN=1 ;;
    *) usage; exit 1 ;;
  esac
done

[[ -n "$SERVER_HOST" ]] || { usage; fail "Server host is required."; }
[[ -n "$USER_NAME" ]] || { usage; fail "User is required."; }

require_cmd ssh
require_cmd scp
require_cmd tar
require_cmd mktemp

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_ID="$(date +%Y%m%d-%H%M%S)"

SAFE_SESSION_BASE="$(printf '%s' "$TMUX_SESSION" | tr -cd 'A-Za-z0-9_.-' | sed 's/^-\+//; s/-\+$//')"
[[ -n "$SAFE_SESSION_BASE" ]] || SAFE_SESSION_BASE="bugs-deploy"

TMUX_SESSION_NAME="${SAFE_SESSION_BASE}-${RUN_ID}"
ARCHIVE_NAME="bugs-garakrral-deploy-${RUN_ID}.tar.gz"
ARCHIVE_PATH="$(mktemp -u "${TMPDIR:-/tmp}/${ARCHIVE_NAME}.XXXXXX")"
DEPLOY_SCRIPT_PATH="$(mktemp -u "${TMPDIR:-/tmp}/bugs-deploy-${RUN_ID}.sh.XXXXXX")"

REMOTE_TARGET="${USER_NAME}@${SERVER_HOST}"
REMOTE_ARCHIVE="/tmp/${ARCHIVE_NAME}"
REMOTE_LOG="${REMOTE_DIR}/deploy-${RUN_ID}.log"
REMOTE_DEPLOY_SCRIPT="/tmp/bugs-deploy-${RUN_ID}.sh"

ATTACH_COMMAND="ssh -p ${PORT} ${REMOTE_TARGET} \"tmux attach -t ${TMUX_SESSION_NAME}\""
LOGS_COMMAND="ssh -p ${PORT} ${REMOTE_TARGET} \"tail -f ${REMOTE_LOG}\""

cleanup() {
  rm -f "$ARCHIVE_PATH" "$DEPLOY_SCRIPT_PATH"
}
trap cleanup EXIT

# GHCR akışında sunucuya kaynak kod değil, sadece deploy için gerekli dosyalar gider.
items_to_archive=(
  "docker-compose.yml"
  ".env.example"
  "README.md"
  "nginx"
)

if [[ "$INCLUDE_ENV" -eq 1 ]]; then
  [[ -f "$PROJECT_ROOT/.env" ]] || fail ".env not found. Remove -e or create .env first."
  items_to_archive+=(".env")
fi

for item in "${items_to_archive[@]}"; do
  [[ -e "$PROJECT_ROOT/$item" ]] || fail "Missing deploy item: $item"
done

log "Creating archive $ARCHIVE_PATH"
(
  cd "$PROJECT_ROOT"
  tar -czf "$ARCHIVE_PATH" "${items_to_archive[@]}"
)

REMOTE_DIR_Q=$(shell_quote "$REMOTE_DIR")
REMOTE_ARCHIVE_Q=$(shell_quote "$REMOTE_ARCHIVE")
REMOTE_LOG_Q=$(shell_quote "$REMOTE_LOG")
REMOTE_DEPLOY_SCRIPT_Q=$(shell_quote "$REMOTE_DEPLOY_SCRIPT")
TMUX_SESSION_Q=$(shell_quote "$TMUX_SESSION_NAME")
CLEANUP_PATTERN_Q=$(shell_quote "^${SAFE_SESSION_BASE}-")

cat > "$DEPLOY_SCRIPT_PATH" <<EOF
#!/usr/bin/env bash
set -euo pipefail

REMOTE_DIR=${REMOTE_DIR_Q}
REMOTE_ARCHIVE=${REMOTE_ARCHIVE_Q}
REMOTE_LOG=${REMOTE_LOG_Q}
TMUX_SESSION=${TMUX_SESSION_Q}

mkdir -p "\$(dirname "\$REMOTE_LOG")"
touch "\$REMOTE_LOG"
exec > >(tee -a "\$REMOTE_LOG") 2>&1

status=0
(
  set -e
  echo "Starting deploy at \$(date -Is)"

  mkdir -p "\$REMOTE_DIR"
  tar -xzf "\$REMOTE_ARCHIVE" -C "\$REMOTE_DIR"
  rm -f "\$REMOTE_ARCHIVE"
  cd "\$REMOTE_DIR"

  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    echo "docker compose not found" >&2
    exit 1
  fi

  echo "Pulling latest images..."
  "\${COMPOSE_CMD[@]}" pull

  echo "Starting containers..."
  "\${COMPOSE_CMD[@]}" up -d --remove-orphans

  echo "Current status:"
  "\${COMPOSE_CMD[@]}" ps

  echo "Deployment command finished at \$(date -Is)"
) || status=\$?

echo
if [ "\$status" -eq 0 ]; then
  echo "Deployment finished successfully."
else
  echo "Deployment failed with exit code \$status."
fi

echo "Log file: \$REMOTE_LOG"
echo "Attach again with: tmux attach -t \$TMUX_SESSION"
echo "This tmux session will stay open; type exit to close it."
rm -f "\$0" 2>/dev/null || true
exec bash
EOF

chmod +x "$DEPLOY_SCRIPT_PATH"

REMOTE_COMMAND=$(cat <<EOF
set -eu
command -v tmux >/dev/null 2>&1 || { echo 'tmux not found. Install tmux on the server first.' >&2; exit 1; }
command -v bash >/dev/null 2>&1 || { echo 'bash not found. Install bash on the server first.' >&2; exit 1; }

mkdir -p $(shell_quote "$REMOTE_DIR")
touch $(shell_quote "$REMOTE_LOG")

echo 'Cleaning old tmux sessions matching: ${SAFE_SESSION_BASE}-*'
tmux list-sessions -F '#S' 2>/dev/null | grep -E ${CLEANUP_PATTERN_Q} | xargs -r -I{} tmux kill-session -t '{}' || true

tmux has-session -t ${TMUX_SESSION_Q} 2>/dev/null && { echo 'tmux session already exists: ${TMUX_SESSION_NAME}' >&2; exit 1; } || true

chmod +x $(shell_quote "$REMOTE_DEPLOY_SCRIPT")
tmux new-session -d -s ${TMUX_SESSION_Q} $(shell_quote "bash ${REMOTE_DEPLOY_SCRIPT}")

echo 'Started tmux session: ${TMUX_SESSION_NAME}'
echo 'Log file: ${REMOTE_LOG}'
echo 'tmux started. You can safely disconnect from SSH if needed.'
echo 'Reconnect command: ${ATTACH_COMMAND}'
echo 'Live logs command: ${LOGS_COMMAND}'
EOF
)

if [[ "$DRY_RUN" -eq 1 ]]; then
  printf 'DRY RUN\n'
  printf 'scp -O -P %s "%s" "%s:%s"\n' "$PORT" "$ARCHIVE_PATH" "$REMOTE_TARGET" "$REMOTE_ARCHIVE"
  printf 'scp -O -P %s "%s" "%s:%s"\n' "$PORT" "$DEPLOY_SCRIPT_PATH" "$REMOTE_TARGET" "$REMOTE_DEPLOY_SCRIPT"
  printf 'ssh -p %s "%s" "%s"\n' "$PORT" "$REMOTE_TARGET" "$REMOTE_COMMAND"
  printf 'tmux started. You can safely disconnect from SSH if needed.\n'
  printf 'Reconnect command: %s\n' "$ATTACH_COMMAND"
  printf 'Live logs command: %s\n' "$LOGS_COMMAND"
  exit 0
fi

log "Uploading archive to $REMOTE_TARGET"
scp -O -P "$PORT" "$ARCHIVE_PATH" "${REMOTE_TARGET}:${REMOTE_ARCHIVE}"

log "Uploading tmux deploy script to $REMOTE_TARGET"
scp -O -P "$PORT" "$DEPLOY_SCRIPT_PATH" "${REMOTE_TARGET}:${REMOTE_DEPLOY_SCRIPT}"

log "Starting remote tmux deploy"
ssh -p "$PORT" "$REMOTE_TARGET" "$REMOTE_COMMAND"

printf 'Deployment started in tmux.\n'
printf 'Session: %s\n' "$TMUX_SESSION_NAME"
printf 'tmux started. You can safely disconnect from SSH if needed.\n'
printf 'Reconnect command: %s\n' "$ATTACH_COMMAND"
printf 'Live logs command: %s\n' "$LOGS_COMMAND"