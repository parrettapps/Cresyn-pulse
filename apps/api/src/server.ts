import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { redis } from './core/redis.js';
import { logger } from './core/logger.js';
import { moduleRegistry } from './modules/registry.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { healthRoutes } from './core/health.routes.js';
import { errorHandler } from './core/error-handler.js';
import { RATE_LIMITS } from '@cresyn/config';

const PORT = parseInt(process.env['API_PORT'] ?? '3001', 10);
const IS_DEV = process.env['NODE_ENV'] === 'development';

async function buildServer() {
  const app = Fastify({
    logger: false, // Use our Pino logger directly
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
    trustProxy: true, // Railway sits behind a proxy
  });

  // ---- Security headers ----
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // ---- CORS ----
  await app.register(cors, {
    origin: process.env['WEB_URL'] ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID'],
  });

  // ---- Global rate limiting (unauthenticated) ----
  await app.register(rateLimit, {
    global: true,
    max: RATE_LIMITS.UNAUTHENTICATED_MAX,
    timeWindow: RATE_LIMITS.UNAUTHENTICATED_WINDOW_MS,
    redis: redis,
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => ({
      type: 'https://api.cresyn.com/errors/rate-limited',
      title: 'Too Many Requests',
      status: 429,
      detail: 'You are sending requests too quickly. Please slow down.',
    }),
  });

  // ---- Request logging hook ----
  app.addHook('onRequest', async (request) => {
    logger.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        ip: request.ip,
      },
      'Incoming request',
    );
  });

  app.addHook('onResponse', async (request, reply) => {
    logger.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      },
      'Request completed',
    );
  });

  // ---- Global error handler ----
  app.setErrorHandler(errorHandler);

  // ---- 404 handler ----
  app.setNotFoundHandler(async (_request, reply) => {
    await reply.code(404).send({
      type: 'https://api.cresyn.com/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: 'The requested endpoint does not exist',
    });
  });

  // ---- Health check (public, no auth) ----
  await app.register(healthRoutes);

  // ---- Auth routes (public, with own rate limiting) ----
  await app.register(authRoutes, { prefix: '/api/v1/auth' });

  // ---- Stripe webhook (public endpoint, validated by signature) ----
  // await app.register(stripeWebhookRoutes, { prefix: '/api/webhooks' });

  // ---- Module routes (all require authentication) ----
  for (const module of moduleRegistry) {
    await app.register(module.routes, { prefix: '/api/v1' });
    logger.info(`Registered module: ${module.key}`);
  }

  return app;
}

async function start() {
  try {
    const app = await buildServer();

    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info({ port: PORT, env: process.env['NODE_ENV'] }, 'Cresyn API server started');
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully');
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received — shutting down gracefully');
  await redis.quit();
  process.exit(0);
});

start();

export { buildServer }; // exported for testing
