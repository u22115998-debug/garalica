# bugs.garakrral.com — Issue Tracker

A clean, modern issue tracker inspired by Google's design language. Built with React, FastAPI, PostgreSQL, and Docker.

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development only)
- Python 3.12+ (for local development only)

### Run with Docker

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env with your settings (change passwords!)
nano .env

# 3. Build and start
docker compose up -d --build

# 4. Open http://localhost
```

The admin account will be automatically created on first startup:
- **Username:** GaraKrral
- **Email:** admin@garakrral.com
- **Password:** change-me (set in `.env`)

### Deploy to Server

```powershell
.\scripts\deploy.ps1 -ServerHost your-server.com -User root -IncludeEnv
```

## Architecture

```
┌─────────┐     ┌───────────┐     ┌──────────┐     ┌────────────┐
│  Nginx   │────▶│  Frontend  │    │  Backend  │────▶│ PostgreSQL │
│  :80     │────▶│  React     │    │  FastAPI  │     │  :5432     │
└─────────┘     └───────────┘     └──────────┘     └────────────┘
```

## Features

- 🔐 JWT Authentication (register, login, token refresh)
- 📝 Issue tracking with status, priority, and type
- 💬 Comments with Markdown support
- 📎 Image and video attachments (drag & drop)
- 🔍 Search and filter issues
- 📄 Pagination
- 👤 Admin account seeding
- 🐳 Full Docker deployment

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend  | React 18, Vite, Framer Motion |
| Backend   | FastAPI, SQLAlchemy, Pydantic |
| Database  | PostgreSQL 16 |
| Proxy     | Nginx |
| Container | Docker Compose |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/me` | Current user |
| GET | `/api/issues` | List issues |
| POST | `/api/issues` | Create issue |
| GET | `/api/issues/{key}` | Get issue |
| PATCH | `/api/issues/{key}` | Update issue |
| DELETE | `/api/issues/{key}` | Delete issue |
| GET | `/api/issues/{key}/comments` | List comments |
| POST | `/api/issues/{key}/comments` | Add comment |
| POST | `/api/issues/{key}/attachments` | Upload file |
| GET | `/api/health` | Health check |

## License

Private — GaraKrral
