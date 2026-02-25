import type { FastifyInstance } from 'fastify';
import { authenticate, requireModule, requirePermission } from '../../core/middleware/authenticate.js';
import { PERMISSIONS } from '@cresyn/config';

// Project module routes — projects, milestones, team
// Full implementation: Week 9 (Phase 3)
export async function projectRoutes(app: FastifyInstance) {
  app.get(
    '/projects',
    {
      preHandler: [
        authenticate,
        requireModule('projects'),
        requirePermission(PERMISSIONS.PROJECTS_READ),
      ],
    },
    async (_request, reply) => {
      return reply.send({ data: [], pagination: { cursor: null, hasMore: false, count: 0 } });
    },
  );
}
