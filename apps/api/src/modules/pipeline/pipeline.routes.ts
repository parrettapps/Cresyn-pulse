import type { FastifyInstance } from 'fastify';
import { authenticate, requireModule, requirePermission } from '../../core/middleware/authenticate.js';
import { PERMISSIONS } from '@cresyn/config';

// Pipeline module routes — stages, deals, quotes
// Full implementation: Week 7-8 (Phase 2)
export async function pipelineRoutes(app: FastifyInstance) {
  app.get(
    '/deals',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_READ),
      ],
    },
    async (_request, reply) => {
      return reply.send({ data: [], pagination: { cursor: null, hasMore: false, count: 0 } });
    },
  );
}
