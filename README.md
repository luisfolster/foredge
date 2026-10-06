# Foredge

Release notes and changelog API for software teams.

Foredge is a portfolio project for practicing API design and technical writing through a real publishing workflow. The current foundation provides `GET /health`; project and release operations are planned.

## Run locally

Requires Node.js 24, pnpm 11, and Docker Desktop.

```powershell
Copy-Item .env.example .env
docker compose up -d db
pnpm install
pnpm dev:api
```

The API runs at `http://localhost:3100`. Check it with `Invoke-RestMethod http://localhost:3100/health` in a second PowerShell window. The health endpoint does not check PostgreSQL yet.

To build the documentation site, run `pnpm --filter @foredge/docs build`. See [development documentation](docs/development.md) for the current workflow.
