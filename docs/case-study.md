# Case study

## Why I built Foredge

I built Foredge to strengthen my API engineering and technical writing skills in one project. A release notes service is small enough to understand end to end, but it still requires decisions about state changes, authentication, errors, data access, and documentation. The goal was to make those decisions visible and testable.

## The problem

Publishing a changelog often starts as an informal document. That works until another application needs to read releases reliably or respond when one is published. Foredge provides a narrow workflow: create a project, prepare a draft, publish it once, and let readers or webhook consumers receive the result.

## What I built

- A Fastify API backed by PostgreSQL, with scoped API keys and public reads for published releases.
- A release state transition that keeps publication and webhook enqueueing in one database transaction.
- Signed webhook deliveries with persisted retries and an explicit delivery contract.
- A VitePress documentation site with a Quickstart, task guides, reference pages, and an OpenAPI 3.1 file generated from route schemas.
- Docker Compose setup and automated checks for API behavior, contract consistency, docs build, and the local publishing flow.

The examples use **Tavern Ledger**, a fictional fantasy tabletop RPG companion. Its `2.4.0` encounter builder release gives every guide the same concrete product and release. Tavern Ledger is sample data; the Foredge API is the portfolio project.

## Decisions and trade-offs

I used route schemas as the source for both runtime validation and the OpenAPI contract. This keeps field definitions together, while the handwritten guides explain workflows and failure recovery that schemas cannot. I used SQL migrations and parameterized queries to make the small data model and publication transaction easy to inspect. Offset pagination favors a simple reader experience for this scope; the reference explains how changing data can shift pages.

API keys are global and scoped to read or write. There are no user accounts or project-level permissions. The webhook worker runs in the API process, and rate limits are in memory, so this version targets a local or single-instance deployment. Those boundaries are documented rather than hidden behind a production-scale claim. The [design decisions](./design.md) explain each choice in more detail.

## Verification

The automated suite exercises authentication, drafts, publication, errors, pagination, rate limits, and webhook signing and retries. A separate contract check compares the exported OpenAPI file with the route schemas. The smoke script uses the running API to create a project, publish a release, and read the public list. The documentation build checks its internal links; the JavaScript and Python listing examples were also run against a locally published release.

## What I learned

The Quickstart exposed a real integration problem: a bodyless PowerShell publish request was sent with an unsupported media type. I corrected the error mapping to return `415`, updated the command to send an explicit JSON body, and added a regression test. That review changed both the API and its documentation.

## Next steps

If this service needed multiple instances or external customers, I would move rate limiting and webhook processing into shared infrastructure, add project-level authorization, and expose delivery history and replay controls. Those are future extensions, not dependencies of the current workflow.
