import { db, auditLogs } from '@cresyn/db';
import type { AuditLogEntry } from '@cresyn/types';
import { logger } from '../logger.js';

// ============================================================
// AUDIT SERVICE
// Writes immutable audit log entries for all mutations.
// Uses fire-and-forget pattern to avoid blocking request lifecycle.
// In high-volume scenarios, move to BullMQ batch writes.
// ============================================================

export class AuditService {
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        tenantId: entry.tenantId ?? null,
        actorId: entry.actorId ?? null,
        actorRole: entry.actorRole ?? null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        resourceName: entry.resourceName ?? null,
        changes: entry.changes ?? null,
        metadata: entry.metadata ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        requestId: entry.requestId ?? null,
      });
    } catch (err) {
      // Audit log failure MUST NOT fail the primary request.
      // Log the error for alerting but do not re-throw.
      logger.error({ err, entry }, 'Failed to write audit log — this requires investigation');
    }
  }

  // Convenience: log auth events (login, logout, failed attempts)
  static async logAuth(params: {
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED';
    userId?: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    reason?: string;
  }): Promise<void> {
    // Use spread to omit optional fields rather than passing undefined
    // (required by exactOptionalPropertyTypes: true)
    await AuditService.log({
      action: params.action,
      resourceType: 'user',
      resourceId: params.userId ?? params.email ?? 'unknown',
      metadata: {
        email: params.email,
        reason: params.reason,
      },
      ...(params.userId ? { actorId: params.userId } : {}),
      ...(params.email ? { resourceName: params.email } : {}),
      ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
      ...(params.userAgent ? { userAgent: params.userAgent } : {}),
      ...(params.requestId ? { requestId: params.requestId } : {}),
    });
  }
}
