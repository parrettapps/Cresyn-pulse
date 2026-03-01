// ============================================================
// AUTH SERVICE — Post-Auth Business Logic
//
// Better Auth handles all authentication (sessions, OAuth, 2FA).
// This service handles the business logic that runs AFTER a user
// authenticates: linking their Better Auth identity to our app
// tables (users, tenants, memberships).
//
// Flow:
//   1. User authenticates via Better Auth (Google OAuth / email)
//   2. Better Auth emits an event (or the route handler calls us)
//   3. We create/link records in our app tables:
//      - Look up or create a record in `users` by email
//      - Look up or create their tenant membership
// ============================================================

import { db, users, userTenantMemberships, tenants, tenantModules, baUsers } from '@cresyn/db';
import { eq, and } from 'drizzle-orm';
import { MODULES, ROLE_PERMISSIONS, type Role, type Permission, type ModuleKey } from '@cresyn/config';
import { AuditService } from '../../core/services/audit.service.js';
import { ConflictError, ValidationError } from '../../core/repository/base.repository.js';
import { logger } from '../../core/logger.js';
import jwt from 'jsonwebtoken';
import type { JWTPayload } from '@cresyn/types';

const JWT_SECRET = process.env['JWT_SECRET'];
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');

export class AuthService {
  // ============================================================
  // PROVISION USER AFTER FIRST AUTH
  // Called when a new user signs in via Better Auth for the first
  // time. Creates their record in our `users` table and, if
  // they're signing up, creates their tenant.
  // ============================================================
  static async provisionNewUser(params: {
    baUserId: string;
    email: string;
    fullName: string;
    tenantName: string;
    tenantSlug: string;
    ipAddress?: string;
  }): Promise<{ userId: string; tenantId: string }> {
    const { baUserId, email, fullName, tenantName, tenantSlug, ipAddress } = params;

    // Verify the BA user exists
    const baUser = await db.query.baUsers.findFirst({ where: eq(baUsers.id, baUserId) });
    if (!baUser) throw new ValidationError('Better Auth user not found');

    // Check if we already have an app user record for this email
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    if (existingUser) throw new ConflictError('An account with this email already exists');

    // Check tenant slug not taken
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, tenantSlug),
    });
    if (existingTenant) throw new ConflictError('This workspace URL is already taken');

    const result = await db.transaction(async (tx) => {
      // 1. Create app user record (linked to Better Auth user by email)
      const [user] = await tx
        .insert(users)
        .values({
          email: email.toLowerCase(),
          fullName,
          emailVerified: true, // Google OAuth is pre-verified
        })
        .returning({ id: users.id });

      if (!user) throw new Error('Failed to create user');

      // 2. Create tenant
      const [tenant] = await tx
        .insert(tenants)
        .values({
          name: tenantName,
          slug: tenantSlug,
          planTier: 'trial',
          status: 'active',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        })
        .returning({ id: tenants.id });

      if (!tenant) throw new Error('Failed to create tenant');

      // 3. Create owner membership
      await tx.insert(userTenantMemberships).values({
        userId: user.id,
        tenantId: tenant.id,
        role: 'tenant_owner' as Role,
        status: 'active',
        acceptedAt: new Date(),
      });

      // 4. Enable CRM module by default (all others off until subscribed)
      await tx.insert(tenantModules).values([
        { tenantId: tenant.id, moduleKey: MODULES.CRM, enabled: true, seatsUsed: 1 },
        { tenantId: tenant.id, moduleKey: MODULES.PIPELINE, enabled: false, seatsUsed: 0 },
        { tenantId: tenant.id, moduleKey: MODULES.TIMESHEETS, enabled: false, seatsUsed: 0 },
        { tenantId: tenant.id, moduleKey: MODULES.PROJECTS, enabled: false, seatsUsed: 0 },
      ]);

      return { userId: user.id, tenantId: tenant.id };
    });

    await AuditService.log({
      tenantId: result.tenantId,
      actorId: result.userId,
      action: 'CREATE',
      resourceType: 'user',
      resourceId: result.userId,
      resourceName: email,
      metadata: { signupFlow: true, provider: 'google' },
      ...(ipAddress ? { ipAddress } : {}),
    });

    logger.info({ userId: result.userId, tenantId: result.tenantId }, 'New user provisioned');
    return result;
  }

  // ============================================================
  // GET APP USER BY BETTER AUTH SESSION
  // Resolves the app-layer user from a Better Auth session.
  // Used by routes that need the app user context (tenantId, role).
  // ============================================================
  static async getAppUserByEmail(email: string): Promise<{
    userId: string;
    tenantId: string;
    role: Role;
  } | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) return null;

    const membership = await db.query.userTenantMemberships.findFirst({
      where: and(
        eq(userTenantMemberships.userId, user.id),
        eq(userTenantMemberships.status, 'active'),
      ),
    });

    if (!membership) return null;

    return {
      userId: user.id,
      tenantId: membership.tenantId,
      role: membership.role as Role,
    };
  }

  // ============================================================
  // GENERATE JWT TOKEN FOR AUTHENTICATED USER
  // Creates a JWT access token for an authenticated Better Auth user.
  // Returns the token along with user/tenant context.
  // ============================================================
  static async generateJWT(email: string): Promise<{
    accessToken: string;
    payload: JWTPayload;
    user: {
      id: string;
      email: string;
      name: string;
    };
    tenant: {
      id: string;
    };
  }> {
    // 1. Get app user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    // 2. Get primary tenant membership
    const membership = await db.query.userTenantMemberships.findFirst({
      where: and(
        eq(userTenantMemberships.userId, user.id),
        eq(userTenantMemberships.status, 'active'),
      ),
    });

    if (!membership) {
      throw new ValidationError('User has no active tenant membership');
    }

    // 3. Get tenant's enabled modules
    const enabledModules = await db.query.tenantModules.findMany({
      where: and(
        eq(tenantModules.tenantId, membership.tenantId),
        eq(tenantModules.enabled, true),
      ),
    });

    const modules = enabledModules.map((m) => m.moduleKey as ModuleKey);

    // 4. Get permissions for user's role
    const permissions = (ROLE_PERMISSIONS[membership.role] || []) as Permission[];

    // 5. Generate JWT payload
    const payload: JWTPayload = {
      sub: user.id,
      tenant_id: membership.tenantId,
      role: membership.role as Role,
      permissions,
      modules,
      jti: crypto.randomUUID(), // Unique token ID for potential blacklisting
    };

    // 6. Sign JWT (30 day expiration)
    const accessToken = jwt.sign(payload, JWT_SECRET as string, {
      expiresIn: '30d',
    });

    return {
      accessToken,
      payload,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
      },
      tenant: {
        id: membership.tenantId,
      },
    };
  }
}
