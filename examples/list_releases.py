"""List the public Tavern Ledger releases with the Python standard library."""

import json
import os
from urllib.request import urlopen

base_url = os.environ.get("FOREDGE_BASE_URL", "http://localhost:3100")
slug = os.environ.get("FOREDGE_PROJECT_SLUG", "tavern-ledger")
with urlopen(f"{base_url}/v1/projects/{slug}/releases", timeout=10) as response:
    result = json.load(response)

for release in result["data"]:
    print(f'{release["version"]}: {release["title"]}')
print(f'Showing {len(result["data"])} of {result["pagination"]["total"]} published releases.')
