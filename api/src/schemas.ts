export const errorSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message", "request_id"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        request_id: { type: "string" },
      },
    },
  },
} as const;

export const projectSchema = {
  type: "object",
  required: ["id", "slug", "name", "created_at"],
  properties: {
    id: { type: "string", format: "uuid" },
    slug: { type: "string" },
    name: { type: "string" },
    description: { type: ["string", "null"] },
    created_at: { type: "string", format: "date-time" },
  },
} as const;

export const releaseSchema = {
  type: "object",
  required: [
    "id",
    "project_id",
    "version",
    "title",
    "summary",
    "body",
    "status",
    "published_at",
    "created_at",
    "updated_at",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    project_id: { type: "string", format: "uuid" },
    version: { type: "string" },
    title: { type: "string" },
    summary: { type: "string" },
    body: { type: "string" },
    status: { type: "string", enum: ["draft", "published"] },
    published_at: { type: ["string", "null"], format: "date-time" },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
  },
} as const;

export const paginationSchema = {
  type: "object",
  required: ["limit", "offset", "total", "next_offset"],
  properties: {
    limit: { type: "integer" },
    offset: { type: "integer" },
    total: { type: "integer" },
    next_offset: { type: ["integer", "null"] },
  },
} as const;

export const paginationQuerySchema = {
  type: "object",
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    offset: { type: "integer", minimum: 0, maximum: 10000, default: 0 },
  },
} as const;

export function pagination(limit: number, offset: number, total: number) {
  const next = offset + limit;
  return { limit, offset, total, next_offset: next < total ? next : null };
}
