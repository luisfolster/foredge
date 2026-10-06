import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { requireKey } from "./auth.js";
import type { Database } from "./db.js";
import { ApiError } from "./errors.js";
import { findProject } from "./projects.js";
import {
  errorSchema,
  pagination,
  paginationQuerySchema,
  paginationSchema,
  releaseSchema,
} from "./schemas.js";

type Params = { slug: string; releaseId: string };
type ReleaseInput = {
  version: string;
  title: string;
  summary: string;
  body: string;
};
type ReleasePatch = Partial<ReleaseInput>;
type ReleaseQuery = {
  limit: number;
  offset: number;
  status?: "draft" | "published";
  version?: string;
};

const releaseInputSchema = {
  type: "object",
  required: ["version", "title", "summary", "body"],
  additionalProperties: false,
  properties: {
    version: { type: "string", minLength: 1, maxLength: 40 },
    title: { type: "string", minLength: 1, maxLength: 160 },
    summary: { type: "string", minLength: 1, maxLength: 500 },
    body: { type: "string", minLength: 1, maxLength: 20000 },
  },
} as const;

async function findRelease(db: Database, projectId: string, releaseId: string) {
  const [release] = await db`
    SELECT * FROM releases WHERE project_id = ${projectId} AND id = ${releaseId}
  `;
  if (!release) {
    throw new ApiError(
      404,
      "release_not_found",
      `Release ${releaseId} was not found.`,
    );
  }
  return release;
}

function rethrowVersionConflict(error: unknown, version: string): never {
  if (error instanceof Error && "code" in error && error.code === "23505") {
    throw new ApiError(
      409,
      "release_exists",
      `Release ${version} already exists for this project.`,
    );
  }
  throw error;
}

export function registerReleases(app: FastifyInstance, db: Database) {
  app.post<{ Params: Pick<Params, "slug">; Body: ReleaseInput }>(
    "/v1/projects/:slug/releases",
    {
      onRequest: (request) => requireKey(db, request, "write"),
      schema: {
        tags: ["Releases"],
        summary: "Create a draft release",
        security: [{ apiKey: [] }],
        params: {
          type: "object",
          required: ["slug"],
          properties: { slug: { type: "string" } },
        },
        body: releaseInputSchema,
        response: {
          201: releaseSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
          422: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const project = await findProject(db, request.params.slug);
      const { version, title, summary, body } = request.body;
      try {
        const [release] = await db`
        INSERT INTO releases (id, project_id, version, title, summary, body)
        VALUES (${randomUUID()}, ${project.id}, ${version}, ${title}, ${summary}, ${body})
        RETURNING *
      `;
        return reply.code(201).send(release);
      } catch (error) {
        rethrowVersionConflict(error, version);
      }
    },
  );

  app.get<{ Params: Pick<Params, "slug">; Querystring: ReleaseQuery }>(
    "/v1/projects/:slug/releases",
    {
      schema: {
        tags: ["Releases"],
        summary: "List releases",
        params: {
          type: "object",
          required: ["slug"],
          properties: { slug: { type: "string" } },
        },
        querystring: {
          ...paginationQuerySchema,
          properties: {
            ...paginationQuerySchema.properties,
            status: {
              type: "string",
              enum: ["draft", "published"],
              default: "published",
            },
            version: { type: "string", maxLength: 40 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: releaseSchema },
              pagination: paginationSchema,
            },
          },
          401: errorSchema,
          404: errorSchema,
          422: errorSchema,
        },
      },
    },
    async (request) => {
      const project = await findProject(db, request.params.slug);
      const { limit, offset, status = "published", version } = request.query;
      if (status === "draft") {
        await requireKey(db, request, "read");
      }
      const filter = version ?? "";
      const [count] = await db`
      SELECT count(*)::int AS total FROM releases
      WHERE project_id = ${project.id} AND status = ${status}
        AND (${filter} = '' OR version = ${filter})
    `;
      const data = await db`
      SELECT * FROM releases
      WHERE project_id = ${project.id} AND status = ${status}
        AND (${filter} = '' OR version = ${filter})
      ORDER BY published_at DESC NULLS LAST, created_at DESC, id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
      return { data, pagination: pagination(limit, offset, count.total) };
    },
  );

  app.get<{ Params: Params }>(
    "/v1/projects/:slug/releases/:releaseId",
    {
      schema: {
        tags: ["Releases"],
        summary: "Get a release",
        params: {
          type: "object",
          required: ["slug", "releaseId"],
          properties: {
            slug: { type: "string" },
            releaseId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: releaseSchema,
          401: errorSchema,
          404: errorSchema,
          422: errorSchema,
        },
      },
    },
    async (request) => {
      const project = await findProject(db, request.params.slug);
      const release = await findRelease(
        db,
        project.id,
        request.params.releaseId,
      );
      if (release.status === "draft") {
        await requireKey(db, request, "read");
      }
      return release;
    },
  );

  app.patch<{ Params: Params; Body: ReleasePatch }>(
    "/v1/projects/:slug/releases/:releaseId",
    {
      onRequest: (request) => requireKey(db, request, "write"),
      schema: {
        tags: ["Releases"],
        summary: "Update a draft release",
        security: [{ apiKey: [] }],
        params: {
          type: "object",
          required: ["slug", "releaseId"],
          properties: {
            slug: { type: "string" },
            releaseId: { type: "string", format: "uuid" },
          },
        },
        body: { ...releaseInputSchema, required: [], minProperties: 1 },
        response: {
          200: releaseSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
          422: errorSchema,
        },
      },
    },
    async (request) => {
      const project = await findProject(db, request.params.slug);
      const current = await findRelease(
        db,
        project.id,
        request.params.releaseId,
      );
      if (current.status !== "draft") {
        throw new ApiError(
          409,
          "release_published",
          "Published releases cannot be edited.",
        );
      }
      const { version, title, summary, body } = request.body;
      try {
        const [release] = await db`
        UPDATE releases SET
          version = ${version ?? current.version},
          title = ${title ?? current.title},
          summary = ${summary ?? current.summary},
          body = ${body ?? current.body},
          updated_at = now()
        WHERE id = ${current.id} AND status = 'draft'
        RETURNING *
      `;
        if (!release) {
          throw new ApiError(
            409,
            "release_published",
            "Published releases cannot be edited.",
          );
        }
        return release;
      } catch (error) {
        rethrowVersionConflict(error, version ?? current.version);
      }
    },
  );

  app.post<{ Params: Params }>(
    "/v1/projects/:slug/releases/:releaseId/publish",
    {
      onRequest: (request) => requireKey(db, request, "write"),
      schema: {
        tags: ["Releases"],
        summary: "Publish a release",
        security: [{ apiKey: [] }],
        params: {
          type: "object",
          required: ["slug", "releaseId"],
          properties: {
            slug: { type: "string" },
            releaseId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: releaseSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          422: errorSchema,
        },
      },
    },
    async (request) => {
      const project = await findProject(db, request.params.slug);
      const release = await findRelease(
        db,
        project.id,
        request.params.releaseId,
      );
      if (release.status === "published") {
        return release;
      }
      const published = await db.begin(async (tx) => {
        const [updated] = await tx`
        UPDATE releases SET status = 'published', published_at = now(), updated_at = now()
        WHERE id = ${release.id} AND status = 'draft'
        RETURNING *
      `;
        if (!updated) return null;

        const eventId = randomUUID();
        const payload = {
          id: eventId,
          type: "release.published",
          created_at: updated.published_at,
          data: {
            project: { id: project.id, slug: project.slug },
            release: updated,
          },
        };
        await tx`
        INSERT INTO webhook_deliveries
          (id, subscription_id, event_id, event_type, payload)
        SELECT gen_random_uuid(), id, ${eventId}, 'release.published', ${tx.json(payload)}
        FROM webhook_subscriptions
        WHERE project_id = ${project.id} AND disabled_at IS NULL
      `;
        return updated;
      });
      return published ?? findRelease(db, project.id, release.id);
    },
  );
}
