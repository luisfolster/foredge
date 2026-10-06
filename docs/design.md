# Design decisions

These choices set the scope of the current implementation. They are recorded because a maintainer may reasonably choose differently as the service grows.

## SQL instead of an ORM

Foredge has a small, stable schema. Parameterized queries through Postgres.js keep constraints and transaction boundaries visible in the code. Numbered SQL migrations record schema changes. Prisma would add generated client code and a separate schema language without solving a current complexity problem; it remains an option if the data model grows.

## Code-first OpenAPI

Fastify validates requests with route schemas. `@fastify/swagger` turns those same schemas into OpenAPI 3.1, and the build exports a copy for the static documentation site. This avoids maintaining separate handwritten validation and contract files. The trade-off is that prose and examples still need review: a generated schema cannot explain why publishing is idempotent or what to do after a timeout.

## API keys without user accounts

The service is an API-focused portfolio project, so it uses identifiable, revocable read and write keys instead of login, password resets, or OAuth. Keys are random and stored as hashes. This makes the API usable without a frontend, but it also means permissions are global rather than tied to individual users or projects. A `User` table is intentionally absent from this version.

## Offset pagination

Offset and limit are easy for a reader to inspect and reproduce with a small release list. The database uses stable tie-breakers. Large or rapidly changing histories could benefit from cursor pagination later; the current API documents the possibility of page shifts.

## Publication and idempotency

`POST .../publish` is a state transition. If the release is already published, retrying returns the existing representation without queueing another event. Creation uses a unique `(project_id, version)` constraint and returns `409` for a duplicate. An `Idempotency-Key` store would add persistence and expiry rules to solve a problem that can currently be handled by looking up the version.

## Webhook delivery

Publication and delivery enqueueing share a database transaction, so a successful publish does not lose its event before the worker sees it. Delivery is asynchronous, signed, retried, and at least once. The operator chooses allowed HTTPS hosts; this keeps arbitrary URLs out of the API. There is no replay or delivery-history endpoint yet. The worker and rate limiter both run inside the API process to keep the local system small.

## Versioning

Domain paths begin with `/v1`. Compatible fields and endpoints can be added within v1. A breaking request or response change would need a new API version and a migration guide; no v2 exists today. The `/health` and `/openapi.json` utility routes are unversioned.
