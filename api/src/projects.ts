import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { Database } from "./db.js";
import { requireKey } from "./auth.js";
import { ApiError } from "./errors.js";
import {
  errorSchema,
  pagination,
  paginationQuerySchema,
  paginationSchema,
  projectSchema,
} from "./schemas.js";

type ProjectInput = { slug: string; name: string; description?: string };
type PaginationQuery = { limit: number; offset: number };

export async function findProject(db: Database, slug: string) {
  const [project] = await db`SELECT * FROM projects WHERE slug = ${slug}`;
  if (!project) {
    throw new ApiError(
      404,
      "project_not_found",
      `Project ${slug} was not found.`,
    );
  }
  return project;
}

export function registerProjects(app: FastifyInstance, db: Database) {
  app.post<{ Body: ProjectInput }>(
    "/v1/projects",
    {
      onRequest: (request) => requireKey(db, request, "write"),
      schema: {
        tags: ["Projects"],
        summary: "Create a project",
        security: [{ apiKey: [] }],
        body: {
          type: "object",
          required: ["slug", "name"],
          additionalProperties: false,
          properties: {
            slug: {
              type: "string",
              pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
              minLength: 3,
              maxLength: 60,
            },
            name: { type: "string", minLength: 1, maxLength: 120 },
            description: { type: "string", maxLength: 500 },
          },
        },
        response: {
          201: projectSchema,
          401: errorSchema,
          403: errorSchema,
          409: errorSchema,
          422: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { slug, name, description } = request.body;
      try {
        const [project] = await db`
        INSERT INTO projects (id, slug, name, description)
        VALUES (${randomUUID()}, ${slug}, ${name}, ${description ?? null})
        RETURNING *
      `;
        return reply.code(201).send(project);
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "23505"
        ) {
          throw new ApiError(
            409,
            "project_exists",
            `Project ${slug} already exists.`,
          );
        }
        throw error;
      }
    },
  );

  app.get<{ Querystring: PaginationQuery }>(
    "/v1/projects",
    {
      schema: {
        tags: ["Projects"],
        summary: "List projects",
        querystring: paginationQuerySchema,
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: projectSchema },
              pagination: paginationSchema,
            },
          },
          422: errorSchema,
        },
      },
    },
    async (request) => {
      const { limit, offset } = request.query;
      const [count] = await db`SELECT count(*)::int AS total FROM projects`;
      const data =
        await db`SELECT * FROM projects ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;
      return { data, pagination: pagination(limit, offset, count.total) };
    },
  );

  app.get<{ Params: { slug: string } }>(
    "/v1/projects/:slug",
    {
      schema: {
        tags: ["Projects"],
        summary: "Get a project",
        params: {
          type: "object",
          required: ["slug"],
          properties: { slug: { type: "string" } },
        },
        response: { 200: projectSchema, 404: errorSchema },
      },
    },
    async (request) => findProject(db, request.params.slug),
  );
}
