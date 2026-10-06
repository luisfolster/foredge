# Quickstart

This guide runs Foredge locally, creates one project and release, publishes it, and reads the public changelog. It uses Docker Desktop and PowerShell; no local Node.js installation is required.

## 1. Start the service

From the repository root:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

Wait until `foredge-api-1` and `foredge-db-1` are healthy. `GET http://localhost:3100/health` returns `{ "status": "ok" }`. This endpoint checks the API process, not database connectivity.

## 2. Create an API key

```powershell
$token = (docker compose exec -T api pnpm key:create quickstart write | Select-Object -Last 1).Trim()
```

The command prints the complete token once. Keep it out of screenshots, logs, and committed files. `$token` exists only in this PowerShell session. To revoke the key later, use `docker compose exec -T api pnpm key:revoke <prefix>`; the prefix is the 12-character segment after `frg_`.

## 3. Create Tavern Ledger

```powershell
$headers = @{ Authorization = "Bearer $token" }
$project = Invoke-RestMethod -Method Post -Uri http://localhost:3100/v1/projects -Headers $headers -ContentType application/json -Body '{"slug":"tavern-ledger","name":"Tavern Ledger","description":"Fantasy tabletop RPG companion"}'
$project.slug
```

The last line prints `tavern-ledger`.

## 4. Create and publish a release

```powershell
$releaseBody = @{
  version = "2.4.0"
  title = "Encounter builder"
  summary = "Create encounters for a party before the session."
  body = "The encounter builder now groups creatures by initiative."
} | ConvertTo-Json
$release = Invoke-RestMethod -Method Post -Uri http://localhost:3100/v1/projects/tavern-ledger/releases -Headers $headers -ContentType application/json -Body $releaseBody
$release.status
```

The status is `draft`. Publish it:

```powershell
$published = Invoke-RestMethod -Method Post -Uri "http://localhost:3100/v1/projects/tavern-ledger/releases/$($release.id)/publish" -Headers $headers -ContentType application/json -Body '{}'
$published.status
```

The status is `published`. Repeating the publish request returns the same published release and does not queue another webhook.

## 5. Read the public changelog

```powershell
$changelog = Invoke-RestMethod http://localhost:3100/v1/projects/tavern-ledger/releases
$changelog.data | Select-Object version, title, summary, status
```

This read requires no API key. Only published releases appear in the default list. Run `docker compose down` when finished; the database volume is kept for the next run. To repeat this exact guide, use a new project slug or remove local data deliberately.

Next: [Authentication](./authentication.md) explains key scopes and draft access. [Publish a release](./guides/publishing.md) covers editing a draft and conflicts.
