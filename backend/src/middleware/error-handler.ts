import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const requestId = `req_${randomUUID().slice(0, 12)}`;

  if (error instanceof ZodError) {
    const message = error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    return reply.status(400).send({
      error: {
        code: "validation_error",
        message,
        details: error.flatten(),
      },
      request_id: requestId,
      timestamp: new Date().toISOString(),
    });
  }

  const statusCode =
    typeof (error as { statusCode?: number }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : error.statusCode ?? 500;

  reply.status(statusCode).send({
    error: {
      code: (error as { code?: string }).code ?? error.code ?? "internal_error",
      message: error.message,
      details: [],
    },
    request_id: requestId,
    timestamp: new Date().toISOString(),
  });
}
