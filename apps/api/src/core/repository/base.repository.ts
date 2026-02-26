import { db } from '@cresyn/db';
import { eq, and, isNull, type SQL } from 'drizzle-orm';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';
import type { RequestContext } from '@cresyn/types';
import { AuditService } from '../services/audit.service.js';
import type { AuditAction, ResourceType } from '@cresyn/config';

// ============================================================
// BASE REPOSITORY
// ALL database access for tenant-scoped resources MUST go
// through this class. It structurally enforces tenant_id on
// every query. Bypassing it is a security defect.
// ============================================================

export abstract class BaseRepository<TTable extends PgTableWithColumns<any>> {
  protected readonly db = db;
  protected readonly tenantId: string;
  protected readonly ctx: RequestContext;
  protected abstract readonly table: TTable;
  protected abstract readonly resourceType: ResourceType;

  constructor(ctx: RequestContext) {
    this.tenantId = ctx.tenantId;
    this.ctx = ctx;
  }

  // ---- Tenant scope filter (ALWAYS applied) ----
  protected tenantScope(): SQL {
    return eq((this.table as any)['tenantId'], this.tenantId);
  }

  // ---- Soft delete filter ----
  protected notDeleted(): SQL {
    return isNull((this.table as any)['deletedAt']);
  }

  // ---- Combined base filter ----
  protected baseFilter(): SQL {
    return and(this.tenantScope(), this.notDeleted()) as SQL;
  }

  // ---- Find by ID (tenant-scoped) ----
  async findById(id: string): Promise<TTable['$inferSelect'] | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tbl = this.table as any;
    const results = await this.db
      .select()
      .from(tbl)
      .where(and(eq(tbl['id'], id), this.baseFilter()))
      .limit(1);

    return (results[0] as TTable['$inferSelect']) ?? null;
  }

  // ---- Find by ID or throw (tenant-scoped) ----
  async findByIdOrThrow(id: string): Promise<TTable['$inferSelect']> {
    const record = await this.findById(id);
    if (!record) {
      throw new NotFoundError(`${this.resourceType} not found`);
    }
    return record;
  }

  // ---- Soft delete (tenant-scoped) ----
  async softDelete(id: string): Promise<void> {
    // Verify record belongs to this tenant before deleting
    const record = await this.findByIdOrThrow(id);

    const before = { ...record, deletedAt: null };

    await this.db
      .update(this.table)
      .set({
        deletedAt: new Date(),
        updatedBy: this.ctx.userId,
        updatedAt: new Date(),
      } as any)
      .where(and(eq((this.table as any)['id'], id), this.tenantScope()));

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'DELETE' as AuditAction,
      resourceType: this.resourceType,
      resourceId: id,
      changes: { before, after: { ...before, deletedAt: new Date() } },
      requestId: this.ctx.requestId,
      // Only include optional fields if they are defined
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });
  }

  // ---- Helper: decode cursor for pagination ----
  protected decodeCursor(cursor: string): Record<string, unknown> {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as Record<string, unknown>;
    } catch {
      throw new ValidationError('Invalid pagination cursor');
    }
  }

  // ---- Helper: encode cursor ----
  protected encodeCursor(data: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }
}

// ============================================================
// DOMAIN ERRORS
// ============================================================

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  readonly statusCode = 422;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class SeatLimitExceededError extends Error {
  readonly statusCode = 402;
  constructor(message: string) {
    super(message);
    this.name = 'SeatLimitExceededError';
  }
}
