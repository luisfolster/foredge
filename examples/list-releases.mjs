const baseUrl = process.env.FOREDGE_BASE_URL ?? "http://localhost:3100";
const slug = process.env.FOREDGE_PROJECT_SLUG ?? "tavern-ledger";
const response = await fetch(`${baseUrl}/v1/projects/${slug}/releases`);

if (!response.ok) {
  throw new Error(
    `Foredge returned ${response.status}: ${await response.text()}`,
  );
}

const { data, pagination } = await response.json();
for (const release of data) {
  console.log(`${release.version}: ${release.title}`);
}
console.log(
  `Showing ${data.length} of ${pagination.total} published releases.`,
);
