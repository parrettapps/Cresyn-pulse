import { companies } from '@cresyn/db/schema';
import { and, ilike, or, desc, sql, eq, gte, type SQL } from 'drizzle-orm';
import { BaseRepository } from '../../../core/repository/base.repository.js';
import type { RequestContext } from '@cresyn/types';
import { AuditService } from '../../../core/services/audit.service.js';
import type { AuditAction } from '@cresyn/config';

// ============================================================
// TYPES
// ============================================================

export type Company = typeof companies.$inferSelect;

export interface CreateCompanyInput {
  name: string;
  type?: 'customer' | 'partner' | 'vendor' | 'supplier' | undefined;
  website?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  addressLine1?: string | undefined;
  addressLine2?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  zip?: string | undefined;
  country?: string | undefined;
  apContactName?: string | undefined;
  apContactEmail?: string | undefined;
  apContactPhone?: string | undefined;
  standardTerms?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface UpdateCompanyInput {
  name?: string | undefined;
  type?: 'customer' | 'partner' | 'vendor' | 'supplier' | undefined;
  website?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  addressLine1?: string | undefined;
  addressLine2?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  zip?: string | undefined;
  country?: string | undefined;
  apContactName?: string | undefined;
  apContactEmail?: string | undefined;
  apContactPhone?: string | undefined;
  standardTerms?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface ListCompaniesFilters {
  type?: 'customer' | 'partner' | 'vendor' | 'supplier' | undefined;
  search?: string | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
}

export interface PaginatedCompanies {
  data: Company[];
  pagination: {
    hasMore: boolean;
    cursor?: string | undefined;
  };
}

export interface CompanyStats {
  total: number;
  byType: {
    customer: number;
    partner: number;
    vendor: number;
    supplier: number;
  };
  recentCount: number; // Last 7 days
}

// ============================================================
// COMPANY REPOSITORY
// ============================================================

export class CompanyRepository extends BaseRepository<typeof companies> {
  protected readonly table = companies;
  protected readonly resourceType = 'company' as const;

  constructor(ctx: RequestContext) {
    super(ctx);
  }

  // ---- List companies with filters and pagination ----
  async list(filters: ListCompaniesFilters = {}): Promise<PaginatedCompanies> {
    const { type, search, cursor, limit = 20 } = filters;

    // Build filter conditions
    const conditions: SQL[] = [this.baseFilter()];

    // Type filter
    if (type) {
      conditions.push(eq(companies.type, type));
    }

    // Search filter (name, email, city, companyCode)
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(companies.name, searchTerm),
          ilike(companies.email, searchTerm),
          ilike(companies.city, searchTerm),
          ilike(companies.companyCode, searchTerm),
        ) as SQL,
      );
    }

    // Cursor-based pagination
    let query = this.db
      .select()
      .from(companies)
      .where(and(...conditions))
      .orderBy(desc(companies.createdAt), desc(companies.id))
      .limit(limit + 1);

    if (cursor) {
      const { createdAt, id } = this.decodeCursor(cursor);
      conditions.push(
        or(
          sql`${companies.createdAt} < ${createdAt}`,
          and(
            sql`${companies.createdAt} = ${createdAt}`,
            sql`${companies.id} < ${id}`,
          ),
        ) as SQL,
      );
      query = this.db
        .select()
        .from(companies)
        .where(and(...conditions))
        .orderBy(desc(companies.createdAt), desc(companies.id))
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

  // ---- Create company with auto-generated code ----
  async create(input: CreateCompanyInput): Promise<Company> {
    // Generate company code based on company name
    const companyCode = await this.generateCompanyCode(input.name);

    // Prepare insert data
    const insertData = {
      ...input,
      companyCode,
      tenantId: this.tenantId,
      createdBy: this.ctx.userId,
      updatedBy: this.ctx.userId,
      type: input.type ?? 'customer',
      country: input.country ?? 'US',
      metadata: input.metadata ?? {},
    };

    const [company] = await this.db.insert(companies).values(insertData).returning();

    if (!company) {
      throw new Error('Failed to create company');
    }

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'CREATE' as AuditAction,
      resourceType: this.resourceType,
      resourceId: company.id,
      changes: { after: company as unknown as Record<string, unknown> },
      requestId: this.ctx.requestId,
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });

    return company;
  }

  // ---- Update company ----
  async update(id: string, input: UpdateCompanyInput): Promise<Company> {
    // Verify company belongs to this tenant
    const before = await this.findByIdOrThrow(id);

    // Prepare update data (exclude companyCode as it's immutable)
    const updateData = {
      ...input,
      updatedBy: this.ctx.userId,
      updatedAt: new Date(),
    };

    const [updated] = await this.db
      .update(companies)
      .set(updateData)
      .where(and(eq(companies.id, id), this.tenantScope()))
      .returning();

    if (!updated) {
      throw new Error('Failed to update company');
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

  // ---- Get statistics ----
  async getStats(): Promise<CompanyStats> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Total count
    const totalResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(this.baseFilter());
    const total = totalResult[0]?.count ?? 0;

    // Count by type
    const typeResults = await this.db
      .select({
        type: companies.type,
        count: sql<number>`count(*)::int`,
      })
      .from(companies)
      .where(this.baseFilter())
      .groupBy(companies.type);

    const byType = {
      customer: 0,
      partner: 0,
      vendor: 0,
      supplier: 0,
    };

    for (const result of typeResults) {
      if (result.type in byType) {
        byType[result.type as keyof typeof byType] = result.count;
      }
    }

    // Recent count (last 7 days)
    const recentResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(and(this.baseFilter(), gte(companies.createdAt, sevenDaysAgo)));
    const recentCount = recentResult[0]?.count ?? 0;

    return {
      total,
      byType,
      recentCount,
    };
  }

  // ---- Generate next company code ----
  private async generateCompanyCode(companyName: string): Promise<string> {
    // Extract first 4 letters from company name (uppercase, letters only)
    const lettersOnly = companyName.replace(/[^a-zA-Z]/g, '').toUpperCase();

    // Get prefix (first 4 chars, pad with X if shorter)
    let prefix = lettersOnly.substring(0, 4);
    if (prefix.length < 4) {
      prefix = prefix.padEnd(4, 'X');
    }

    // Get highest existing code with this prefix for this tenant
    const result = await this.db
      .select({ code: companies.companyCode })
      .from(companies)
      .where(
        and(
          this.tenantScope(),
          sql`${companies.companyCode} LIKE ${prefix + '-%'}`
        )
      )
      .orderBy(desc(companies.companyCode))
      .limit(1);

    const lastCode = result[0]?.code;

    // Extract number from last code (e.g., "CISC-0042" -> 42)
    // If no code exists with this prefix, start at 1
    const lastNumber = lastCode ? parseInt(lastCode.split('-')[1] ?? '0', 10) : 0;
    const nextNumber = lastNumber + 1;

    // Format with zero-padding to 4 digits
    return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
  }
}
