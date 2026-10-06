# Development

The shortest path to a working API is the [Quickstart](./quickstart.md). This page is for contributors changing code, schemas, or documentation.

## Tools and local services

Use Node.js 24, pnpm 11, and Docker Desktop with Compose. From the repository root:

```powershell
Copy-Item .env.example .env
docker compose --profile test up -d db test-db
pnpm install
pnpm db:migrate
pnpm dev:api
```

The development database is on localhost port 5433; the isolated test database is on 5434. `pnpm test` refuses a database URL whose path is not `/foredge_test`. The API reads `DATABASE_URL` from `.env`; the test suite reads `TEST_DATABASE_URL` or uses the documented local default.

For a container-only setup, run `docker compose up --build -d`. The API container applies migrations before serving requests. `GET /health` confirms the process is responding, not that PostgreSQL is reachable.

## Checks

```powershell
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

`pnpm build` compiles the API, exports `docs/public/openapi.json` from the route schemas, then builds the VitePress site. The site build checks internal links. `pnpm dev:docs` previews the documentation locally.

Tests cover authentication, project and release behavior, publication conflicts, rate limiting, webhook signatures and retries, and the generated contract. They use the isolated test database. The Python and JavaScript examples can be run against an API seeded by the Quickstart.

## Database changes

Add a numbered SQL file under `api/migrations/`. The migration runner applies files in order and records checksums in `schema_migrations`. Do not edit an applied migration; add a new file. `pnpm db:migrate` applies outstanding files to the development database.

## Configuration

`.env.example` lists local settings. Keep `.env`, API keys, webhook signing keys, database exports, and logs out of Git. To use webhooks, provide a 64-character hexadecimal `WEBHOOK_SIGNING_KEY` and a comma-separated `WEBHOOK_ALLOWED_HOSTS` list. The signing key must stay stable while subscriptions remain active.
