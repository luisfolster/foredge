# Documentation style guide

Public documentation is in English. Repository discussion and mentoring can use Portuguese. The goal is to let a developer complete a task without needing to read the implementation first.

- Use sentence case in headings: “Publish a release”, not “Publish A Release”.
- Name the subject and action directly. Prefer “Create a draft with a write key” to promotional descriptions.
- Use `project` for the software being documented, `release` for one version's note, and `subscription` for a webhook destination. Do not use `changelog` to mean a single release.
- Show concrete Tavern Ledger data consistently: project slug `tavern-ledger`, example version `2.4.0`, title “Encounter builder”. Label generated IDs and timestamps as illustrative.
- Put a working command before optional background detail in task guides. Name required tools, environment variables, and the expected result.
- Write endpoint names as `METHOD /path`. Use exact API field names in code formatting, and explain error codes before suggesting recovery.
- Keep secrets out of examples. A placeholder token is never a usable credential.
- Update a guide, reference page, and generated OpenAPI contract when behavior changes. Add a test when an example can be checked automatically.
