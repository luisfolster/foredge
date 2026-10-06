# Create a project

A project groups the release notes for one software product. It has a stable slug used in URLs, a display name, and an optional description.

With a [write API key](../authentication.md) in the `$token` variable:

```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Method Post -Uri http://localhost:3100/v1/projects -Headers $headers -ContentType application/json -Body '{"slug":"tavern-ledger","name":"Tavern Ledger","description":"Fantasy tabletop RPG companion"}'
```

The response is `201 Created` and includes an ID and creation time. Slugs use lowercase letters, numbers, and internal hyphens. They are unique; creating `tavern-ledger` twice returns `409 project_exists`.

Project metadata can be read without a key:

```powershell
Invoke-RestMethod http://localhost:3100/v1/projects/tavern-ledger
```

There is no project update or delete endpoint in this version. Choose a slug you can keep. The [publishing guide](./publishing.md) uses this project.
