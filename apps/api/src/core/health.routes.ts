import type { FastifyInstance } from 'fastify';
import { db } from '@cresyn/db';
import { sql } from 'drizzle-orm';
import { redis } from './redis.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    const checks: Record<string, 'ok' | 'error'> = {};

    // Check DB
    try {
      await db.execute(sql`SELECT 1`);
      checks['database'] = 'ok';
    } catch {
      checks['database'] = 'error';
    }

    // Check Redis
    try {
      await redis.ping();
      checks['redis'] = 'ok';
    } catch {
      checks['redis'] = 'error';
    }

    const allHealthy = Object.values(checks).every((s) => s === 'ok');

    return reply.code(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'ok' : 'degraded',
      version: process.env['npm_package_version'] ?? '0.1.0',
      environment: process.env['NODE_ENV'] ?? 'development',
      checks,
      timestamp: new Date().toISOString(),
    });
  });
}
