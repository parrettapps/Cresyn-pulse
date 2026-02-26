import { Redis } from 'ioredis';
import { logger } from './logger.js';

if (!process.env['REDIS_URL']) {
  throw new Error('REDIS_URL environment variable is required');
}

export const redis = new Redis(process.env['REDIS_URL'], {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times: number) => {
    if (times > 5) {
      logger.error('Redis connection failed after 5 retries');
      return null;
    }
    return Math.min(times * 100, 2000);
  },
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err: Error) => logger.error({ err }, 'Redis error'));
redis.on('close', () => logger.warn('Redis connection closed'));

// Helper: revoke a JWT by its jti (for logout, deactivation)
export async function revokeJWT(jti: string, ttlSeconds: number): Promise<void> {
  await redis.setex(`revoked:jti:${jti}`, ttlSeconds, '1');
}

// Helper: revoke all JWTs for a user (nuclear option — requires re-login)
export async function revokeAllUserTokens(userId: string): Promise<void> {
  // Increment a per-user counter. Any JWT issued before this counter change is invalid.
  // This requires storing the counter in JWT claims — implemented in auth service.
  await redis.incr(`user:revoke-counter:${userId}`);
}

// Helper: cache tenant module list (avoid DB hit on every request)
export async function cacheTenantModules(tenantId: string, modules: string[]): Promise<void> {
  await redis.setex(`tenant:modules:${tenantId}`, 300, JSON.stringify(modules)); // 5-minute TTL
}

export async function getCachedTenantModules(tenantId: string): Promise<string[] | null> {
  const cached = await redis.get(`tenant:modules:${tenantId}`);
  return cached ? (JSON.parse(cached) as string[]) : null;
}

export async function invalidateTenantModuleCache(tenantId: string): Promise<void> {
  await redis.del(`tenant:modules:${tenantId}`);
}
