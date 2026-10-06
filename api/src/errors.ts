import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function errorBody(code: string, message: string, requestId: string) {
  return { error: { code, message, request_id: requestId } };
}

export function installErrorHandler(app: FastifyInstance) {
  app.setErrorHandler(
    (
      error: FastifyError | ApiError,
      request: FastifyRequest,
      reply: FastifyReply,
    ) => {
      if (error instanceof ApiError) {
        return reply
          .code(error.status)
          .send(errorBody(error.code, error.message, request.id));
      }

      if (error.validation) {
        return reply
          .code(422)
          .send(
            errorBody(
              "invalid_request",
              "The request does not match the API schema.",
              request.id,
            ),
          );
      }

      if (error.statusCode === 429) {
        return reply
          .code(429)
          .send(
            errorBody(
              "rate_limited",
              "Too many requests. Retry after the indicated delay.",
              request.id,
            ),
          );
      }

      if (error.statusCode === 400) {
        return reply
          .code(400)
          .send(
            errorBody(
              "bad_request",
              "The request could not be parsed.",
              request.id,
            ),
          );
      }

      if (error.statusCode === 415) {
        return reply
          .code(415)
          .send(
            errorBody(
              "unsupported_media_type",
              "Use application/json for request bodies.",
              request.id,
            ),
          );
      }

      if (error.statusCode === 413) {
        return reply
          .code(413)
          .send(
            errorBody(
              "payload_too_large",
              "The request body is too large.",
              request.id,
            ),
          );
      }

      request.log.error(error);
      return reply
        .code(500)
        .send(
          errorBody(
            "internal_error",
            "An unexpected error occurred.",
            request.id,
          ),
        );
    },
  );

  app.setNotFoundHandler((request, reply) => {
    return reply
      .code(404)
      .send(errorBody("route_not_found", "Route not found.", request.id));
  });
}
