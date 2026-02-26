import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { auth } from '../../lib/auth.js';
import { AuthService } from '../auth/auth.service.js';
import { ConflictError, ValidationError } from '../../core/repository/base.repository.js';
import { logger } from '../../core/logger.js';

// ============================================================
// ONBOARDING ROUTES — Tenant provisioning after sign-up
//
// This route is intentionally NOT protected by the JWT
// authenticate middleware. After signUp.email() the user only
// has a Better Auth session cookie — their JWT won't exist
// until their first post-provision login. We validate the BA
// session directly here via auth.api.getSession().
//
// POST /api/v1/onboarding/provision
//   - Verifies Better Auth session cookie
//   - Creates app user + tenant + membership (tenant_owner)
//   - Enables CRM module by default; 14-day trial starts
// ============================================================

const provisionBodySchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100).trim(),
  tenantName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100)
    .trim(),
  tenantSlug: z
    .string()
    .min(2, 'Workspace URL must be at least 2 characters')
    .max(48, 'Workspace URL must be at most 48 characters')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
      'Workspace URL must contain only lowercase letters, numbers, and hyphens',
    )
    .trim(),
});

/**
 * Convert Node.js IncomingHttpHeaders to a web-standard Headers object
 * so Better Auth's getSession() can read the cookie.
 */
function toWebHeaders(nodeHeaders: Record<string, string | string[] | undefined>): Headers {
  const h = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => h.append(key, v));
    } else {
      h.set(key, value);
    }
  }
  return h;
}

export async function onboardingRoutes(app: FastifyInstance) {
  // POST /api/v1/onboarding/provision
  app.post<{ Body: unknown }>('/onboarding/provision', async (request, reply) => {
    // ── Validate the Better Auth session ──────────────────────
    const session = await auth.api.getSession({
      headers: toWebHeaders(request.headers),
    });

    if (!session?.user) {
      return reply.code(401).send({
        type: 'https://api.cresyn.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'No active session found. Please sign up first.',
        instance: request.url,
        requestId: request.id,
      });
    }

    // ── Validate body ──────────────────────────────────────────
    const parsed = provisionBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return reply.code(400).send({
        type: 'https://api.cresyn.com/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail: firstError?.message ?? 'Invalid request body',
        instance: request.url,
        requestId: request.id,
        errors: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { fullName, tenantName, tenantSlug } = parsed.data;

    // ── Provision user + tenant ────────────────────────────────
    try {
      const result = await AuthService.provisionNewUser({
        baUserId: session.user.id,
        email: session.user.email,
        fullName,
        tenantName,
        tenantSlug,
        ...(request.ip ? { ipAddress: request.ip } : {}),
      });

      logger.info(
        { userId: result.userId, tenantId: result.tenantId, slug: tenantSlug },
        'New workspace provisioned',
      );

      return reply.code(201).send({
        userId: result.userId,
        tenantId: result.tenantId,
        tenantSlug,
        message: 'Workspace created successfully',
      });
    } catch (err) {
      if (err instanceof ConflictError) {
        return reply.code(409).send({
          type: 'https://api.cresyn.com/errors/conflict',
          title: 'Conflict',
          status: 409,
          detail: err.message,
          instance: request.url,
          requestId: request.id,
        });
      }
      if (err instanceof ValidationError) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: err.message,
          instance: request.url,
          requestId: request.id,
        });
      }
      throw err; // Let the global error handler handle unexpected errors
    }
  });
}
