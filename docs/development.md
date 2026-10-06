# Development

This page describes the current foundation. The health endpoint does not check database connectivity.

## Requirements

- Node.js 24
- pnpm 11
- Docker Desktop with Compose

## Run the API

From the repository root:

```powershell
Copy-Item .env.example .env
docker compose up -d db
pnpm install
pnpm dev:api
```

In a second PowerShell window:

```powershell
Invoke-RestMethod http://localhost:3100/health
```

The response is `{ "status": "ok" }`. PostgreSQL is available on localhost port 5433 for local development; the API does not connect to it yet.

## Check the workspace

```powershell
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
```

Run `pnpm dev:docs` to preview this documentation locally.
