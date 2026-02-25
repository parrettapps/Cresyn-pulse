import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { db, users, userTenantMemberships, tenants, subscriptions, tenantModules,
  emailVerificationTokens, passwordResetTokens } from '@cresyn/db';
import { eq, and } from 'drizzle-orm';
import type { JWTPayload } from '@cresyn/types';
import { ROLE_PERMISSIONS, MODULES, type Role } from '@cresyn/config';
import { redis } from '../../core/redis.js';
import { AuditService } from '../../core/services/audit.service.js';
import { ConflictError, NotFoundError, ValidationError } from '../../core/repository/base.repository.js';
import { logger } from '../../core/logger.js';
import type { SignupInput, LoginInput } from '@cresyn/validation';

const JWT_SECRET = process.env['JWT_SECRET']!;
const JWT_EXPIRY_SECONDS = 3600; // 1 hour
const REFRESH_EXPIRY_SECONDS = 30 * 24 * 3600; // 30 days
const MIN_RESPONSE_MS = 200; // Timing attack prevention on auth endpoints

// ---- Argon2id settings (OWASP recommended) ----
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64MB
  timeCost: 3,
  parallelism: 4,
};

export class AuthService {
  // ============================================================
  // SIGNUP
  // ============================================================
  static async signup(input: SignupInput, ipAddress?: string): Promise<{ userId: string; tenantId: string }> {
    const start = Date.now();

    // Check email not already taken
    const existing = await db.query.users.findFirst({
      where: eq(users.email, input.email.toLowerCase()),
    });
    if (existing) {
      await timingDelay(start);
      throw new ConflictError('An account with this email already exists');
    }

    // Check slug not taken
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, input.tenantSlug),
    });
    if (existingTenant) {
      await timingDelay(start);
      throw new ConflictError('This workspace URL is already taken');
    }

    // Hash password
    const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);

    // Create user + tenant + membership in a transaction
    const result = await db.transaction(async (tx) => {
      // 1. Create user
      const [user] = await tx.insert(users).values({
        email: input.email.toLowerCase(),
        passwordHash,
        fullName: input.fullName,
        emailVerified: false,
      }).returning({ id: users.id });

      if (!user) throw new Error('Failed to create user');

      // 2. Create tenant
      const [tenant] = await tx.insert(tenants).values({
        name: input.tenantName,
        slug: input.tenantSlug,
        planTier: 'trial',
        status: 'active',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      }).returning({ id: tenants.id });

      if (!tenant) throw new Error('Failed to create tenant');

      // 3. Create membership as tenant_owner
      await tx.insert(userTenantMemberships).values({
        userId: user.id,
        tenantId: tenant.id,
        role: 'tenant_owner',
        status: 'active',
        acceptedAt: new Date(),
      });

      // 4. Create CRM module enabled by default (core module, always on)
      await tx.insert(tenantModules).values([
        { tenantId: tenant.id, moduleKey: MODULES.CRM, enabled: true, seatsUsed: 1 },
        { tenantId: tenant.id, moduleKey: MODULES.PIPELINE, enabled: false, seatsUsed: 0 },
        { tenantId: tenant.id, moduleKey: MODULES.TIMESHEETS, enabled: false, seatsUsed: 0 },
        { tenantId: tenant.id, moduleKey: MODULES.PROJECTS, enabled: false, seatsUsed: 0 },
      ]);

      return { userId: user.id, tenantId: tenant.id };
    });

    // Send verification email (non-blocking)
    AuthService.sendVerificationEmail(result.userId, input.email).catch((err) => {
      logger.error({ err, userId: result.userId }, 'Failed to send verification email');
    });

    await AuditService.log({
      tenantId: result.tenantId,
      actorId: result.userId,
      action: 'CREATE',
      resourceType: 'user',
      resourceId: result.userId,
      resourceName: input.email,
      metadata: { signupFlow: true },
      ipAddress,
    });

    await timingDelay(start);
    return result;
  }

  // ============================================================
  // LOGIN
  // ============================================================
  static async login(
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string; tenantId: string }> {
    const start = Date.now();

    // Check account lockout
    const lockoutKey = `lockout:${input.email.toLowerCase()}`;
    const isLocked = await redis.get(lockoutKey);
    if (isLocked) {
      await AuditService.logAuth({ action: 'LOGIN_FAILED', email: input.email, ipAddress, userAgent, reason: 'Account locked' });
      await timingDelay(start);
      throw new ValidationError('Account is temporarily locked due to too many failed attempts. Please try again later or reset your password.');
    }

    // Increment attempt counter
    const attemptsKey = `login:attempts:${input.email.toLowerCase()}`;

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email.toLowerCase()),
    });

    // Verify password (always run even if user not found to prevent timing attacks)
    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$dummyhashforsecurity';
    const passwordValid = user?.passwordHash
      ? await argon2.verify(user.passwordHash, input.password)
      : await argon2.verify(dummyHash, 'dummy').catch(() => false);

    if (!user || !passwordValid) {
      // Increment failed attempt counter
      const attempts = await redis.incr(attemptsKey);
      await redis.expire(attemptsKey, 3600); // Reset after 1 hour

      if (attempts >= 10) {
        await redis.setex(lockoutKey, 1800, '1'); // Lock for 30 minutes
        await redis.del(attemptsKey);
      }

      await AuditService.logAuth({ action: 'LOGIN_FAILED', email: input.email, ipAddress, userAgent, reason: 'Invalid credentials' });
      await timingDelay(start);
      throw new ValidationError('Invalid email or password');
    }

    // Get tenant membership (for now: get the primary/first active tenant)
    const membership = await db.query.userTenantMemberships.findFirst({
      where: and(
        eq(userTenantMemberships.userId, user.id),
        eq(userTenantMemberships.status, 'active'),
      ),
      with: { tenant: true },
    });

    if (!membership) {
      await timingDelay(start);
      throw new ValidationError('No active workspace found for this account');
    }

    // Get enabled modules for tenant
    const enabledModules = await db.query.tenantModules.findMany({
      where: and(
        eq(tenantModules.tenantId, membership.tenantId),
        eq(tenantModules.enabled, true),
      ),
    });

    const moduleKeys = enabledModules.map((m) => m.moduleKey);
    const permissions = ROLE_PERMISSIONS[membership.role as Role] ?? [];

    // Clear failed attempts on successful login
    await redis.del(attemptsKey);

    // Issue tokens
    const jti = randomBytes(16).toString('hex');
    const accessToken = jwt.sign(
      {
        sub: user.id,
        tenant_id: membership.tenantId,
        role: membership.role,
        permissions,
        modules: moduleKeys,
        jti,
      } satisfies Omit<JWTPayload, 'iat' | 'exp'>,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY_SECONDS },
    );

    const refreshToken = randomBytes(32).toString('hex');
    const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');

    // Store refresh token hash in Redis (30 day TTL)
    await redis.setex(
      `refresh:${refreshTokenHash}`,
      REFRESH_EXPIRY_SECONDS,
      JSON.stringify({ userId: user.id, tenantId: membership.tenantId, jti }),
    );

    // Update last login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    await AuditService.logAuth({ action: 'LOGIN', userId: user.id, email: user.email, ipAddress, userAgent });
    await timingDelay(start);

    return { accessToken, refreshToken, tenantId: membership.tenantId };
  }

  // ============================================================
  // REFRESH TOKEN
  // ============================================================
  static async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await redis.get(`refresh:${tokenHash}`);

    if (!stored) throw new ValidationError('Invalid or expired refresh token');

    const { userId, tenantId, jti: oldJti } = JSON.parse(stored) as { userId: string; tenantId: string; jti: string };

    // Rotate: delete old, issue new
    await redis.del(`refresh:${tokenHash}`);

    // Blacklist old JWT jti
    await redis.setex(`revoked:jti:${oldJti}`, JWT_EXPIRY_SECONDS, '1');

    const [user, membership, enabledModules] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, userId) }),
      db.query.userTenantMemberships.findFirst({
        where: and(eq(userTenantMemberships.userId, userId), eq(userTenantMemberships.tenantId, tenantId)),
      }),
      db.query.tenantModules.findMany({
        where: and(eq(tenantModules.tenantId, tenantId), eq(tenantModules.enabled, true)),
      }),
    ]);

    if (!user || !membership) throw new ValidationError('User or tenant not found');

    const permissions = ROLE_PERMISSIONS[membership.role as Role] ?? [];
    const moduleKeys = enabledModules.map((m) => m.moduleKey);

    const newJti = randomBytes(16).toString('hex');
    const accessToken = jwt.sign(
      { sub: userId, tenant_id: tenantId, role: membership.role, permissions, modules: moduleKeys, jti: newJti },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY_SECONDS },
    );

    const newRefreshToken = randomBytes(32).toString('hex');
    const newRefreshTokenHash = createHash('sha256').update(newRefreshToken).digest('hex');
    await redis.setex(`refresh:${newRefreshTokenHash}`, REFRESH_EXPIRY_SECONDS, JSON.stringify({ userId, tenantId, jti: newJti }));

    return { accessToken, refreshToken: newRefreshToken };
  }

  // ============================================================
  // SEND VERIFICATION EMAIL
  // ============================================================
  static async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await db.insert(emailVerificationTokens).values({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // TODO: Send via Resend in Week 3
    logger.info({ userId, email }, `[DEV] Email verification token: ${rawToken}`);
  }

  // ============================================================
  // VERIFY EMAIL
  // ============================================================
  static async verifyEmail(token: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const record = await db.query.emailVerificationTokens.findFirst({
      where: eq(emailVerificationTokens.tokenHash, tokenHash),
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new ValidationError('Invalid or expired verification token');
    }

    await db.transaction(async (tx) => {
      await tx.update(emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(emailVerificationTokens.id, record.id));

      await tx.update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, record.userId));
    });
  }
}

// ---- Timing attack prevention ----
async function timingDelay(startMs: number): Promise<void> {
  const elapsed = Date.now() - startMs;
  if (elapsed < MIN_RESPONSE_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_RESPONSE_MS - elapsed));
  }
}
