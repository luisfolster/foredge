import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/foredge/",
  appearance: false,
  title: "Foredge",
  description: "Release notes and changelog API for software teams.",
  themeConfig: {
    nav: [
      { text: "Overview", link: "/" },
      { text: "Quickstart", link: "/quickstart" },
      { text: "API reference", link: "/reference/api" },
    ],
    sidebar: [
      {
        text: "Start",
        items: [
          { text: "Overview", link: "/" },
          { text: "Quickstart", link: "/quickstart" },
          { text: "Authentication", link: "/authentication" },
        ],
      },
      {
        text: "Guides",
        items: [
          { text: "Create a project", link: "/guides/projects" },
          { text: "Publish a release", link: "/guides/publishing" },
          { text: "List releases", link: "/guides/listing" },
          { text: "Receive a webhook", link: "/guides/webhooks" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "API endpoints", link: "/reference/api" },
          { text: "Pagination and filtering", link: "/reference/pagination" },
          { text: "Errors", link: "/reference/errors" },
          { text: "Rate limits", link: "/reference/rate-limits" },
          { text: "Webhook payloads", link: "/reference/webhooks" },
        ],
      },
      {
        text: "Project",
        items: [
          { text: "Case study", link: "/case-study" },
          { text: "Design decisions", link: "/design" },
          { text: "Troubleshooting", link: "/troubleshooting" },
          { text: "Development", link: "/development" },
          { text: "Style guide", link: "/style-guide" },
          { text: "Contributing", link: "/contributing" },
          { text: "Glossary", link: "/glossary" },
          { text: "Changelog", link: "/changelog" },
        ],
      },
    ],
    search: { provider: "local" },
  },
});
