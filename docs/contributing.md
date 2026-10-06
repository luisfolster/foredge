# Contributing

Start with [Development](./development.md) to run the API and checks. Changes should keep code, the OpenAPI contract, and the handwritten documentation in agreement.

For an endpoint change, update the route schema and behavior, add or adjust a test for the important outcome, regenerate the contract with `pnpm build`, then revise the relevant guide and reference page. For documentation-only changes, run `pnpm build` so broken internal links are caught.

Describe the user-visible behavior in a pull request and include the commands you ran. If an example changed, state how you verified it. Do not add speculative documentation for features that are not implemented. Keep API keys and local `.env` files out of commits and bug reports.

Small, focused commits make it easier to see why a behavior or explanation changed. [Design decisions](./design.md) records trade-offs that could reasonably be revisited; routine implementation details do not need a new decision record.
