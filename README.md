# Foredge

Release notes and changelog API for software teams.

Foredge is a portfolio project built to develop professional software engineering skills alongside a deliberate approach to technical writing and product design. Teams can draft and publish release notes; applications can read published changes and receive signed webhooks. The documentation is part of the project, with a Quickstart, guides, and an OpenAPI contract generated from route schemas.

## Run locally

Requires Docker Desktop with Compose.

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

The API runs at `http://localhost:3100`. Check it with `Invoke-RestMethod http://localhost:3100/health`. The health endpoint checks the API process, not database connectivity.

Continue with the [Quickstart](docs/quickstart.md) to create a key and publish a release. The [documentation site](https://luisfolster.github.io/foredge/) includes guides and the API reference; the [case study](docs/case-study.md) explains the work. [Development](docs/development.md) covers tests and local code changes. The API requires a running server and database.

Version 0.1.0. Licensed under [MIT](LICENSE).
