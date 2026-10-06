# Glossary

**Project** — A software product whose updates are managed by Foredge. `tavern-ledger` is the example project.

**Release** — One version's title, summary, and body. A release is either a draft or published.

**Draft** — A release that a key holder can edit. It is omitted from public release reads.

**Published release** — An immutable release visible through public reads. The first publish queues webhook deliveries.

**API key** — A revocable bearer credential with read or write scope. The service stores its hash and identifying prefix.

**Webhook subscription** — A project-specific HTTPS destination allowed to receive `release.published` events.

**Delivery** — One attempt series for one event and one subscription. Retries keep the delivery ID.

**Request ID** — An identifier in error bodies and the `x-request-id` response header that connects a client error to server logs.
