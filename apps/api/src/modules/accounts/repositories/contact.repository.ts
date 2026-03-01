import { contacts } from '@cresyn/db/schema';
import { and, ilike, or, desc, sql, eq, type SQL } from 'drizzle-orm';
import { BaseRepository } from '../../../core/repository/base.repository.js';
import type { RequestContext } from '@cresyn/types';
import { AuditService } from '../../../core/services/audit.service.js';
import type { AuditAction } from '@cresyn/config';

// ============================================================
// TYPES
// ============================================================

export type Contact = typeof contacts.$inferSelect;

export interface CreateContactInput {
  firstName: string;
  lastName: string;
  email?: string | undefined;
  phone?: string | undefined;
  mobile?: string | undefined;
  title?: string | undefined;
  department?: string | undefined;
  companyId?: string | undefined;
  isPrimary?: boolean | undefined;
  linkedinUrl?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface UpdateContactInput {
  firstName?: string | undefined;
  lastName?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  mobile?: string | undefined;
  title?: string | undefined;
  department?: string | undefined;
  companyId?: string | undefined;
  isPrimary?: boolean | undefined;
  linkedinUrl?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface ListContactsFilters {
  companyId?: string | undefined;
  search?: string | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
}

export interface PaginatedContacts {
  data: Contact[];
  pagination: {
    hasMore: boolean;
    cursor?: string | undefined;
  };
}

// ============================================================
// CONTACT REPOSITORY
// ============================================================

export class ContactRepository extends BaseRepository<typeof contacts> {
  protected readonly table = contacts;
  protected readonly resourceType = 'contact' as const;

  constructor(ctx: RequestContext) {
    super(ctx);
  }

  // ---- List contacts with filters and pagination ----
  async list(filters: ListContactsFilters = {}): Promise<PaginatedContacts> {
    const { companyId, search, cursor, limit = 20 } = filters;

    // Build filter conditions
    const conditions: SQL[] = [this.baseFilter()];

    // Company filter
    if (companyId) {
      conditions.push(eq(contacts.companyId, companyId));
    }

    // Search filter (firstName, lastName, email, title)
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(contacts.firstName, searchTerm),
          ilike(contacts.lastName, searchTerm),
          ilike(contacts.email, searchTerm),
          ilike(contacts.title, searchTerm),
        ) as SQL,
      );
    }

    // Cursor-based pagination
    let query = this.db
      .select()
      .from(contacts)
      .where(and(...conditions))
      .orderBy(desc(contacts.createdAt), desc(contacts.id))
      .limit(limit + 1);

    if (cursor) {
      const { createdAt, id } = this.decodeCursor(cursor);
      conditions.push(
        or(
          sql`${contacts.createdAt} < ${createdAt}`,
          and(sql`${contacts.createdAt} = ${createdAt}`, sql`${contacts.id} < ${id}`),
        ) as SQL,
      );
      query = this.db
        .select()
        .from(contacts)
        .where(and(...conditions))
        .orderBy(desc(contacts.createdAt), desc(contacts.id))
        .limit(limit + 1);
    }

    const results = await query;

    // Check if there are more results
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    // Generate next cursor
    const nextCursor =
      hasMore && data.length > 0
        ? this.encodeCursor({
            createdAt: data[data.length - 1]!.createdAt,
            id: data[data.length - 1]!.id,
          })
        : undefined;

    return {
      data,
      pagination: {
        hasMore,
        cursor: nextCursor,
      },
    };
  }

  // ---- Create contact ----
  async create(input: CreateContactInput): Promise<Contact> {
    // Prepare insert data
    const insertData = {
      ...input,
      tenantId: this.tenantId,
      createdBy: this.ctx.userId,
      updatedBy: this.ctx.userId,
      isPrimary: input.isPrimary ?? false,
      metadata: input.metadata ?? {},
    };

    const [contact] = await this.db.insert(contacts).values(insertData).returning();

    if (!contact) {
      throw new Error('Failed to create contact');
    }

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'CREATE' as AuditAction,
      resourceType: this.resourceType,
      resourceId: contact.id,
      changes: { after: contact as unknown as Record<string, unknown> },
      requestId: this.ctx.requestId,
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });

    return contact;
  }

  // ---- Update contact ----
  async update(id: string, input: UpdateContactInput): Promise<Contact> {
    // Verify contact belongs to this tenant
    const before = await this.findByIdOrThrow(id);

    // Prepare update data
    const updateData = {
      ...input,
      updatedBy: this.ctx.userId,
      updatedAt: new Date(),
    };

    const [updated] = await this.db
      .update(contacts)
      .set(updateData)
      .where(and(eq(contacts.id, id), this.tenantScope()))
      .returning();

    if (!updated) {
      throw new Error('Failed to update contact');
    }

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'UPDATE' as AuditAction,
      resourceType: this.resourceType,
      resourceId: id,
      changes: {
        before: before as unknown as Record<string, unknown>,
        after: updated as unknown as Record<string, unknown>,
      },
      requestId: this.ctx.requestId,
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });

    return updated;
  }

  // ---- Get total count ----
  async getTotalCount(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(this.baseFilter());

    return result[0]?.count ?? 0;
  }
}
