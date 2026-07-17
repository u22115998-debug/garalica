[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ServerHost,

  [Parameter(Mandatory = $true)]
  [string]$User,

  [int]$Port = 22,

  [string]$RemoteDir = "/opt/bugs.garakrral.com",

  [string]$TmuxSession = "bugs-deploy",

  [switch]$IncludeEnv,

  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-Command {
  param([Parameter(Mandatory = $true)][string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )

  Write-Host "==> $Label"
  & $Action
}

function ConvertTo-ShSingleQuoted {
  param([Parameter(Mandatory = $true)][string]$Value)

  return "'" + $Value.Replace("'", "'\''") + "'"
}

Assert-Command -Name "ssh"
Assert-Command -Name "scp"
Assert-Command -Name "tar"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runId = Get-Date -Format "yyyyMMdd-HHmmss"
$safeSessionBase = ($TmuxSession -replace "[^A-Za-z0-9_.-]", "-").Trim("-")
if ([string]::IsNullOrWhiteSpace($safeSessionBase)) {
  $safeSessionBase = "bugs-deploy"
}

$tmuxSessionName = "$safeSessionBase-$runId"
$archiveName = "bugs-garakrral-deploy-$runId.tar.gz"
$archivePath = Join-Path $env:TEMP $archiveName
$remoteDeployScriptName = "bugs-deploy-$runId.sh"
$deployScriptPath = Join-Path $env:TEMP $remoteDeployScriptName

$itemsToArchive = @(
  "docker-compose.yml",
  ".env.example",
  "README.md",
  "backend",
  "frontend",
  "nginx"
)

if ($IncludeEnv) {
  $envPath = Join-Path $projectRoot ".env"
  if (-not (Test-Path $envPath)) {
    throw ".env not found. Remove -IncludeEnv or create .env first."
  }

  $itemsToArchive += ".env"
}

foreach ($item in $itemsToArchive) {
  $sourcePath = Join-Path $projectRoot $item
  if (-not (Test-Path $sourcePath)) {
    throw "Missing deploy item: $item"
  }
}

if (Test-Path $archivePath) {
  Remove-Item -LiteralPath $archivePath -Force
}

$tarArgs = @(
  "-czf", $archivePath,
  "--exclude=backend/.env",
  "--exclude=backend/.env.*",
  "--exclude=backend/__pycache__",
  "--exclude=backend/.pytest_cache",
  "--exclude=frontend/.env",
  "--exclude=frontend/.env.*",
  "--exclude=frontend/node_modules",
  "--exclude=frontend/build",
  "--exclude=frontend/dist"
) + $itemsToArchive

try {
  Invoke-Step -Label "Creating archive $archivePath" -Action {
    Push-Location $projectRoot
    try {
      & tar @tarArgs
      if ($LASTEXITCODE -ne 0) {
        throw "tar failed with exit code $LASTEXITCODE"
      }
    }
    finally {
      Pop-Location
    }
  }

  $remoteTarget = "$User@$ServerHost"
  $remoteArchive = "/tmp/$archiveName"
  $remoteLog = "$RemoteDir/deploy-$runId.log"
  $remoteDeployScript = "/tmp/$remoteDeployScriptName"
  $attachCommand = "ssh -p $Port $remoteTarget `"tmux attach -t $tmuxSessionName`""
  $logsCommand = "ssh -p $Port $remoteTarget `"tail -f $remoteLog`""

  $remoteDirQ = ConvertTo-ShSingleQuoted $RemoteDir
  $remoteArchiveQ = ConvertTo-ShSingleQuoted $remoteArchive
  $remoteLogQ = ConvertTo-ShSingleQuoted $remoteLog
  $remoteDeployScriptQ = ConvertTo-ShSingleQuoted $remoteDeployScript
  $tmuxSessionQ = ConvertTo-ShSingleQuoted $tmuxSessionName
  $cleanupPatternQ = ConvertTo-ShSingleQuoted ("^" + [regex]::Escape("$safeSessionBase-"))
  $cleanupCommand = "tmux list-sessions -F '#S' 2>/dev/null | grep -E $cleanupPatternQ | xargs -r -I{} tmux kill-session -t '{}' || true"
  $tmuxRunCommand = "bash $remoteDeployScriptQ"

  $deployScriptTemplate = @'
#!/usr/bin/env bash
set -uo pipefail

REMOTE_DIR=__REMOTE_DIR__
REMOTE_ARCHIVE=__REMOTE_ARCHIVE__
REMOTE_LOG=__REMOTE_LOG__
TMUX_SESSION=__TMUX_SESSION__

mkdir -p "$(dirname "$REMOTE_LOG")"
touch "$REMOTE_LOG"
exec > >(tee -a "$REMOTE_LOG") 2>&1

status=0

(
  set -e
  echo "Starting deploy at $(date -Is)"
  mkdir -p "$REMOTE_DIR"
  tar -xzf "$REMOTE_ARCHIVE" -C "$REMOTE_DIR"
  rm -f "$REMOTE_ARCHIVE"
  cd "$REMOTE_DIR"

  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
  else
    echo "docker compose not found" >&2
    exit 1
  fi

  $COMPOSE_CMD build --progress=plain
  $COMPOSE_CMD up -d --remove-orphans
  $COMPOSE_CMD ps
  echo "Deployment command finished at $(date -Is)"
) || status=$?

echo
if [ "$status" -eq 0 ]; then
  echo "Deployment finished successfully."
else
  echo "Deployment failed with exit code $status."
fi

echo "Log file: $REMOTE_LOG"
echo "Attach again with: tmux attach -t $TMUX_SESSION"
echo "This tmux session will stay open; type exit to close it."
rm -f "$0" 2>/dev/null || true
exec bash
'@

  $deployScriptContent = $deployScriptTemplate.
    Replace("__REMOTE_DIR__", $remoteDirQ).
    Replace("__REMOTE_ARCHIVE__", $remoteArchiveQ).
    Replace("__REMOTE_LOG__", $remoteLogQ).
    Replace("__TMUX_SESSION__", $tmuxSessionQ)

  [System.IO.File]::WriteAllText(
    $deployScriptPath,
    ($deployScriptContent -replace "`r`n", "`n"),
    [System.Text.UTF8Encoding]::new($false)
  )

  $remoteCommand = @(
    "set -eu"
    "command -v tmux >/dev/null 2>&1 || { echo 'tmux not found. Install tmux on the server first.' >&2; exit 1; }"
    "command -v bash >/dev/null 2>&1 || { echo 'bash not found. Install bash on the server first.' >&2; exit 1; }"
    "mkdir -p $remoteDirQ"
    "touch $remoteLogQ"
    "echo 'Cleaning old tmux sessions matching: $safeSessionBase-*'"
    $cleanupCommand
    "tmux has-session -t $tmuxSessionQ 2>/dev/null && { echo 'tmux session already exists: $tmuxSessionName' >&2; exit 1; } || true"
    "chmod +x $remoteDeployScriptQ"
    "tmux new-session -d -s $tmuxSessionQ $(ConvertTo-ShSingleQuoted $tmuxRunCommand)"
    "echo 'Started tmux session: $tmuxSessionName'"
    "echo 'Log file: $remoteLog'"
    "echo $(ConvertTo-ShSingleQuoted "tmux started. You can safely disconnect from SSH if needed.")"
    "echo $(ConvertTo-ShSingleQuoted "Reconnect command: $attachCommand")"
    "echo $(ConvertTo-ShSingleQuoted "Live logs command: $logsCommand")"
  ) -join "; "

  if ($DryRun) {
    Write-Host "DRY RUN"
    Write-Host "scp -P $Port `"$archivePath`" `"${remoteTarget}:$remoteArchive`""
    Write-Host "scp -P $Port `"$deployScriptPath`" `"${remoteTarget}:$remoteDeployScript`""
    Write-Host "ssh -p $Port `"$remoteTarget`" `"$remoteCommand`""
    Write-Host "tmux started. You can safely disconnect from SSH if needed."
    Write-Host "Reconnect command: $attachCommand"
    Write-Host "Live logs command: $logsCommand"
    return
  }

  Invoke-Step -Label "Uploading archive to $remoteTarget" -Action {
    & scp -O -P $Port $archivePath "${remoteTarget}:$remoteArchive"
    if ($LASTEXITCODE -ne 0) {
      throw "scp failed with exit code $LASTEXITCODE"
    }
  }

  Invoke-Step -Label "Uploading tmux deploy script to $remoteTarget" -Action {
    & scp -O -P $Port $deployScriptPath "${remoteTarget}:$remoteDeployScript"
    if ($LASTEXITCODE -ne 0) {
      throw "scp failed with exit code $LASTEXITCODE"
    }
  }

  Invoke-Step -Label "Starting remote tmux deploy" -Action {
    & ssh -p $Port $remoteTarget $remoteCommand
    if ($LASTEXITCODE -ne 0) {
      throw "ssh failed with exit code $LASTEXITCODE"
    }
  }

  Write-Host "Deployment started in tmux."
  Write-Host "Session: $tmuxSessionName"
  Write-Host "tmux started. You can safely disconnect from SSH if needed."
  Write-Host "Reconnect command: $attachCommand"
  Write-Host "Live logs command: $logsCommand"
}
finally {
  if (Test-Path $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
  }
  if (Test-Path $deployScriptPath) {
    Remove-Item -LiteralPath $deployScriptPath -Force
  }
}
