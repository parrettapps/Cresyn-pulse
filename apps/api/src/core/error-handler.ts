import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { logger } from './logger.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  SeatLimitExceededError,
} from './repository/base.repository.js';

// ============================================================
// GLOBAL ERROR HANDLER
// Maps domain errors to RFC 7807 Problem Details responses.
// Never exposes stack traces or internal details in production.
// ============================================================

export async function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const requestId = request.id;
  const instance = request.url;

  // Zod validation errors
  if (error instanceof ZodError) {
    await reply.code(422).send({
      type: 'https://api.cresyn.com/errors/validation-error',
      title: 'Validation Error',
      status: 422,
      detail: 'The request contains invalid fields',
      instance,
      requestId,
      errors: error.errors.map((e) => ({
        field: e.path.join('.'),
        code: e.code,
        message: e.message,
      })),
    });
    return;
  }

  // Domain errors
  if (error instanceof NotFoundError) {
    await reply.code(404).send({
      type: 'https://api.cresyn.com/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: error.message,
      instance,
      requestId,
    });
    return;
  }

  if (error instanceof ForbiddenError) {
    await reply.code(403).send({
      type: 'https://api.cresyn.com/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: 'You do not have permission to perform this action',
      instance,
      requestId,
    });
    return;
  }

  if (error instanceof ValidationError) {
    await reply.code(422).send({
      type: 'https://api.cresyn.com/errors/validation-error',
      title: 'Validation Error',
      status: 422,
      detail: error.message,
      instance,
      requestId,
    });
    return;
  }

  if (error instanceof ConflictError) {
    await reply.code(409).send({
      type: 'https://api.cresyn.com/errors/conflict',
      title: 'Conflict',
      status: 409,
      detail: error.message,
      instance,
      requestId,
    });
    return;
  }

  if (error instanceof SeatLimitExceededError) {
    await reply.code(402).send({
      type: 'https://api.cresyn.com/errors/seat-limit-exceeded',
      title: 'Seat Limit Exceeded',
      status: 402,
      detail: error.message,
      instance,
      requestId,
    });
    return;
  }

  // Fastify rate limit (already formatted, pass through)
  if ('statusCode' in error && (error as FastifyError).statusCode === 429) {
    await reply.code(429).send(error);
    return;
  }

  // Unexpected server error — log with full details, respond with generic message
  logger.error(
    { err: error, requestId, url: request.url, method: request.method },
    'Unhandled error',
  );

  await reply.code(500).send({
    type: 'https://api.cresyn.com/errors/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    detail:
      process.env['NODE_ENV'] === 'development'
        ? error.message
        : 'An unexpected error occurred. Please try again or contact support.',
    instance,
    requestId,
  });
}
