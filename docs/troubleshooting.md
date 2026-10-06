# Troubleshooting

## Docker does not start

Check that Docker Desktop is running and `docker compose ps` can reach its engine. On Windows, Docker Desktop needs its WSL and virtualization prerequisites. The [Quickstart](./quickstart.md) assumes Docker is already installed and working.

## Port 3100, 5433, or 5434 is in use

`docker compose ps` shows the ports used by Foredge. Stop the process using the conflicting port or change the host-side mapping in `compose.yaml`. If you change the API port, use the matching base URL in every example. The test suite expects port 5434 unless `TEST_DATABASE_URL` points elsewhere.

## The database migration reports a changed checksum

An applied SQL migration was edited. Restore the original file and add a new numbered migration for the new change. The check prevents a previously applied database from silently diverging from the repository.

## A write request returns 401 or 403

Send `Authorization: Bearer <key>`. A missing, malformed, or revoked key returns 401. A read-only key used for a write returns 403. Create a new write key with `docker compose exec -T api pnpm key:create editorial write`; it is displayed once. See [Authentication](./authentication.md).

## A request returns 409

`project_exists` and `release_exists` mean the slug or version is already present. The [Quickstart](./quickstart.md) creates `tavern-ledger` version `2.4.0`, so a second run against the same database will conflict. Use a new slug or version. `release_published` means a published release is immutable.

## A webhook is not received

Confirm that the subscription existed before publication, its URL uses an allowlisted HTTPS host, and the API container has a valid signing key. The receiver must return `2xx` within ten seconds. Foredge retries failed deliveries, but does not expose delivery history or replay in this version. See [Webhook payloads](./reference/webhooks.md) for timing and signature details.

## A request returns 429

Read the `retry-after` response header and wait that many seconds. The default is 60 requests per minute per direct client IP. See [Rate limits](./reference/rate-limits.md).

## The documentation build reports a broken link

VitePress checks internal links during `pnpm build`. Fix the target path or its extension in the Markdown source. Do not disable the check to make the build pass.
