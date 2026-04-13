import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const requestId = `req_${randomUUID().slice(0, 12)}`;
  const statusCode = error.statusCode ?? 500;

  reply.status(statusCode).send({
    error: {
      code: error.code ?? "internal_error",
      message: error.message,
      details: [],
    },
    request_id: requestId,
    timestamp: new Date().toISOString(),
  });
}
