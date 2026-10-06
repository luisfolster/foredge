# Foredge

Foredge stores release notes for software projects and makes published updates available through an HTTP API. A release starts as a draft. Publishing makes it visible to readers and queues a `release.published` webhook for each active subscription.

This repository is a documentation project as well as an API implementation. The guides show how to use the service; the [API reference](./reference/api.md) describes the available endpoints; the [OpenAPI contract](./openapi.json) is generated from the same route schemas used by Fastify.

## Who this is for

- A developer who wants to publish release notes from an internal tool.
- An application that needs to display a project's changelog.
- A maintainer who needs to understand authentication, errors, delivery attempts, and local operation.

Examples use **Tavern Ledger**, a fictional fantasy tabletop RPG companion with character sheets and encounter planning. Its release `2.4.0` introduces an encounter builder. Tavern Ledger is example data; Foredge is the service being documented.

Start with the [Quickstart](./quickstart.md) to run the API and publish a release locally. The documentation site can be hosted on GitHub Pages; the API itself runs locally with Docker Compose.
