import type { FastifyInstance } from 'fastify';
import { authenticate, requireModule, requirePermission } from '../../core/middleware/authenticate.js';
import { PERMISSIONS } from '@cresyn/config';

// Timesheet module routes — entries, approvals
// Full implementation: Week 10 (Phase 3)
export async function timesheetRoutes(app: FastifyInstance) {
  app.get(
    '/timesheets',
    {
      preHandler: [
        authenticate,
        requireModule('timesheets'),
        requirePermission(PERMISSIONS.TIMESHEETS_ENTRIES_READ_OWN),
      ],
    },
    async (_request, reply) => {
      return reply.send({ data: [], pagination: { cursor: null, hasMore: false, count: 0 } });
    },
  );
}
