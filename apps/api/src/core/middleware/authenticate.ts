import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import type { JWTPayload, RequestContext } from '@cresyn/types';
import { redis } from '../redis.js';
import { logger } from '../logger.js';
import type { Permission, ModuleKey } from '@cresyn/config';

const JWT_SECRET = process.env['JWT_SECRET'];
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');

// ============================================================
// AUTHENTICATE — Primary security middleware
// Validates JWT, checks tenant header match, checks blacklist.
// Attaches ctx to request for downstream handlers.
// ============================================================
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    await reply.code(401).send({
      type: 'https://api.cresyn.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Missing or invalid Authorization header',
      instance: request.url,
      requestId: request.id,
    });
    return;
  }

  const token = authHeader.slice(7);

  let payload: JWTPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET as string) as JWTPayload;
  } catch (err) {
    const isExpired = err instanceof jwt.TokenExpiredError;
    await reply.code(401).send({
      type: 'https://api.cresyn.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: isExpired ? 'Token expired' : 'Invalid token',
      instance: request.url,
      requestId: request.id,
    });
    return;
  }

  // Validate X-Tenant-ID header matches JWT claim (prevents tenant switching without re-auth)
  const tenantHeader = request.headers['x-tenant-id'];
  if (!tenantHeader || tenantHeader !== payload.tenant_id) {
    logger.warn(
      { userId: payload.sub, jwtTenantId: payload.tenant_id, headerTenantId: tenantHeader },
      'Tenant ID mismatch between JWT and X-Tenant-ID header',
    );
    await reply.code(403).send({
      type: 'https://api.cresyn.com/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: 'Tenant context mismatch',
      instance: request.url,
      requestId: request.id,
    });
    return;
  }

  // Check JWT blacklist (for revoked tokens — e.g., user deactivated, logout)
  const isRevoked = await redis.get(`revoked:jti:${payload.jti}`);
  if (isRevoked) {
    await reply.code(401).send({
      type: 'https://api.cresyn.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Token has been revoked',
      instance: request.url,
      requestId: request.id,
    });
    return;
  }

  // Attach typed context to request — available in all downstream handlers
  const ctx: RequestContext = {
    userId: payload.sub,
    tenantId: payload.tenant_id,
    role: payload.role,
    permissions: payload.permissions,
    modules: payload.modules,
    jti: payload.jti,
    requestId: request.id,
    // Optional fields — only set if present
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(request.headers['user-agent'] ? { userAgent: request.headers['user-agent'] } : {}),
  };

  // @ts-expect-error — Fastify request augmentation (declared in types/fastify.d.ts)
  request.ctx = ctx;
}

// ============================================================
// REQUIRE MODULE — Checks if tenant has module enabled
// ============================================================
export function requireModule(moduleKey: ModuleKey) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // @ts-expect-error — ctx attached by authenticate
    const ctx = request.ctx as RequestContext;

    if (!ctx) {
      await reply.code(401).send({
        type: 'https://api.cresyn.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Not authenticated',
        instance: request.url,
      });
      return;
    }

    if (!ctx.modules.includes(moduleKey)) {
      await reply.code(403).send({
        type: 'https://api.cresyn.com/errors/module-not-enabled',
        title: 'Module Not Enabled',
        status: 403,
        detail: `The '${moduleKey}' module is not enabled for your subscription`,
        instance: request.url,
        requestId: request.id,
      });
      return;
    }
  };
}

// ============================================================
// REQUIRE PERMISSION — RBAC check on the user's role
// ============================================================
export function requirePermission(permission: Permission) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // @ts-expect-error — ctx attached by authenticate
    const ctx = request.ctx as RequestContext;

    if (!ctx?.permissions.includes(permission)) {
      await reply.code(403).send({
        type: 'https://api.cresyn.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'You do not have permission to perform this action',
        instance: request.url,
        requestId: request.id,
      });
      return;
    }
  };
}

// ============================================================
// REQUIRE PLATFORM ADMIN — For internal Cresyn-only routes
// ============================================================
export async function requirePlatformAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // @ts-expect-error — ctx attached by authenticate
  const ctx = request.ctx as RequestContext;

  if (ctx?.role !== 'platform_admin') {
    await reply.code(403).send({
      type: 'https://api.cresyn.com/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: 'This endpoint requires platform admin access',
      instance: request.url,
      requestId: request.id,
    });
  }
}
