import type { FastifyInstance } from 'fastify';
import { authenticate, requireModule, requirePermission } from '../../core/middleware/authenticate.js';
import { PERMISSIONS } from '@cresyn/config';

// CRM module routes — companies, contacts, notes, documents
// Full implementation: Week 5 (Phase 2)
export async function crmRoutes(app: FastifyInstance) {
  // Placeholder: list companies
  app.get(
    '/companies',
    {
      preHandler: [
        authenticate,
        requireModule('crm'),
        requirePermission(PERMISSIONS.CRM_COMPANIES_READ),
      ],
    },
    async (_request, reply) => {
      return reply.send({ data: [], pagination: { cursor: null, hasMore: false, count: 0 } });
    },
  );
}
