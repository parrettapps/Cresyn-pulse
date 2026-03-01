import { pipelineDeals, pipelineStages, companies, users, dealStageHistory } from '@cresyn/db/schema';
import { and, eq, gte, lte, or, ilike, desc, sql, type SQL, isNull } from 'drizzle-orm';
import { BaseRepository, ValidationError } from '../../../core/repository/base.repository.js';
import type { RequestContext } from '@cresyn/types';
import { AuditService } from '../../../core/services/audit.service.js';

// ============================================================
// TYPES
// ============================================================

export type Deal = typeof pipelineDeals.$inferSelect;

export interface CreateDealInput {
  pipelineId: string;
  companyId?: string;
  contactId?: string;
  stageId: string;
  name: string;
  value?: number;
  currency?: string;
  probability?: number;
  expectedClose?: string;
  ownerId?: string;
  source?: string;
  dealType?: string;
  forecastCategory?: string;
  nextStepDescription?: string;
  nextStepDueDate?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateDealInput {
  companyId?: string;
  contactId?: string;
  stageId?: string;
  name?: string;
  value?: number;
  currency?: string;
  probability?: number;
  expectedClose?: string;
  ownerId?: string;
  source?: string;
  dealType?: string;
  forecastCategory?: string;
  nextStepDescription?: string;
  nextStepDueDate?: string;
  metadata?: Record<string, unknown>;
}

export interface ListDealsFilters {
  pipelineId?: string;
  stageId?: string;
  ownerId?: string;
  companyId?: string;
  status?: 'open' | 'closed_won' | 'closed_lost';
  source?: string;
  dealType?: string;
  forecastCategory?: string;
  expectedCloseFrom?: string;
  expectedCloseTo?: string;
  minValue?: number;
  maxValue?: number;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedDeals {
  data: DealWithRelations[];
  pagination: {
    hasMore: boolean;
    cursor?: string;
  };
}

export interface DealWithRelations extends Deal {
  company?: { id: string; name: string } | null;
  stage: { id: string; name: string; color: string };
  owner?: { id: string; fullName: string; avatarUrl: string | null } | null;
}

export interface MoveStageInput {
  toStageId: string;
  notes?: string;
}

export interface CloseDealInput {
  status: 'closed_won' | 'closed_lost';
  actualClose: string;
  lostReason?: string;
  notes?: string;
}

// ============================================================
// DEAL REPOSITORY
// ============================================================

export class DealRepository extends BaseRepository<typeof pipelineDeals> {
  protected readonly table = pipelineDeals;
  protected readonly resourceType = 'deal' as const;

  constructor(ctx: RequestContext) {
    super(ctx);
  }

  // ---- List deals with filters and pagination ----
  async list(filters: ListDealsFilters = {}): Promise<PaginatedDeals> {
    const {
      pipelineId,
      stageId,
      ownerId,
      companyId,
      status,
      source,
      dealType,
      forecastCategory,
      expectedCloseFrom,
      expectedCloseTo,
      minValue,
      maxValue,
      search,
      cursor,
      limit = 50,
    } = filters;

    // Build filter conditions
    const conditions: SQL[] = [this.baseFilter()];

    if (pipelineId) conditions.push(eq(pipelineDeals.pipelineId, pipelineId));
    if (stageId) conditions.push(eq(pipelineDeals.stageId, stageId));
    if (ownerId) conditions.push(eq(pipelineDeals.ownerId, ownerId));
    if (companyId) conditions.push(eq(pipelineDeals.companyId, companyId));
    if (status) conditions.push(eq(pipelineDeals.status, status));
    if (source) conditions.push(eq(pipelineDeals.source, source));
    if (dealType) conditions.push(eq(pipelineDeals.dealType, dealType));
    if (forecastCategory) conditions.push(eq(pipelineDeals.forecastCategory, forecastCategory));
    if (expectedCloseFrom) conditions.push(gte(pipelineDeals.expectedClose, expectedCloseFrom));
    if (expectedCloseTo) conditions.push(lte(pipelineDeals.expectedClose, expectedCloseTo));
    if (minValue !== undefined) conditions.push(gte(pipelineDeals.value, minValue.toString()));
    if (maxValue !== undefined) conditions.push(lte(pipelineDeals.value, maxValue.toString()));

    // Search filter (name, company name)
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(ilike(pipelineDeals.name, searchTerm) as SQL);
    }

    // Cursor-based pagination
    let query = this.db
      .select({
        deal: pipelineDeals,
        company: {
          id: companies.id,
          name: companies.name,
        },
        stage: {
          id: pipelineStages.id,
          name: pipelineStages.name,
          color: pipelineStages.color,
        },
        owner: {
          id: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(pipelineDeals)
      .leftJoin(companies, eq(pipelineDeals.companyId, companies.id))
      .innerJoin(pipelineStages, eq(pipelineDeals.stageId, pipelineStages.id))
      .leftJoin(users, eq(pipelineDeals.ownerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(pipelineDeals.createdAt), desc(pipelineDeals.id))
      .limit(limit + 1);

    if (cursor) {
      const { createdAt, id } = this.decodeCursor(cursor);
      conditions.push(
        or(
          sql`${pipelineDeals.createdAt} < ${createdAt}`,
          and(
            sql`${pipelineDeals.createdAt} = ${createdAt}`,
            sql`${pipelineDeals.id} < ${id}`,
          ),
        ) as SQL,
      );
      query = this.db
        .select({
          deal: pipelineDeals,
          company: {
            id: companies.id,
            name: companies.name,
          },
          stage: {
            id: pipelineStages.id,
            name: pipelineStages.name,
            color: pipelineStages.color,
          },
          owner: {
            id: users.id,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(pipelineDeals)
        .leftJoin(companies, eq(pipelineDeals.companyId, companies.id))
        .innerJoin(pipelineStages, eq(pipelineDeals.stageId, pipelineStages.id))
        .leftJoin(users, eq(pipelineDeals.ownerId, users.id))
        .where(and(...conditions))
        .orderBy(desc(pipelineDeals.createdAt), desc(pipelineDeals.id))
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
            createdAt: data[data.length - 1]!.deal.createdAt,
            id: data[data.length - 1]!.deal.id,
          })
        : undefined;

    // Map results to include relations
    const mappedData = data.map((row) => ({
      ...row.deal,
      company: row.company?.id ? row.company : null,
      stage: row.stage,
      owner: row.owner?.id ? row.owner : null,
    }));

    return {
      data: mappedData,
      pagination: {
        hasMore,
        cursor: nextCursor,
      },
    };
  }

  // ---- Get deal by ID with relations ----
  async findByIdWithRelations(id: string): Promise<DealWithRelations | null> {
    const results = await this.db
      .select({
        deal: pipelineDeals,
        company: {
          id: companies.id,
          name: companies.name,
        },
        stage: {
          id: pipelineStages.id,
          name: pipelineStages.name,
          color: pipelineStages.color,
        },
        owner: {
          id: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(pipelineDeals)
      .leftJoin(companies, eq(pipelineDeals.companyId, companies.id))
      .innerJoin(pipelineStages, eq(pipelineDeals.stageId, pipelineStages.id))
      .leftJoin(users, eq(pipelineDeals.ownerId, users.id))
      .where(and(eq(pipelineDeals.id, id), this.baseFilter()))
      .limit(1);

    if (!results[0]) return null;

    const row = results[0];
    return {
      ...row.deal,
      company: row.company?.id ? row.company : null,
      stage: row.stage,
      owner: row.owner?.id ? row.owner : null,
    };
  }

  // ---- Create deal ----
  async create(input: CreateDealInput): Promise<DealWithRelations> {
    // Validate stage belongs to the specified pipeline
    const stage = await this.db
      .select()
      .from(pipelineStages)
      .where(
        and(
          eq(pipelineStages.id, input.stageId),
          eq(pipelineStages.pipelineId, input.pipelineId),
          eq(pipelineStages.tenantId, this.tenantId),
          isNull(pipelineStages.deletedAt),
        ),
      )
      .limit(1);

    if (!stage[0]) {
      throw new ValidationError('Stage does not belong to the specified pipeline');
    }

    // Auto-set probability from stage default if not provided
    const probability = input.probability ?? stage[0].defaultProbability;

    const [deal] = await this.db
      .insert(pipelineDeals)
      .values({
        tenantId: this.tenantId,
        pipelineId: input.pipelineId,
        companyId: input.companyId,
        contactId: input.contactId,
        stageId: input.stageId,
        name: input.name,
        value: input.value?.toString(),
        currency: input.currency || 'USD',
        probability,
        probabilityOverride: input.probability !== undefined,
        expectedClose: input.expectedClose,
        ownerId: input.ownerId || this.ctx.userId,
        source: input.source,
        dealType: input.dealType,
        forecastCategory: input.forecastCategory,
        nextStepDescription: input.nextStepDescription,
        nextStepDueDate: input.nextStepDueDate,
        metadata: input.metadata || {},
        status: 'open',
        createdBy: this.ctx.userId,
        updatedBy: this.ctx.userId,
      })
      .returning();

    // Create initial stage history entry
    await this.db.insert(dealStageHistory).values({
      tenantId: this.tenantId,
      dealId: deal!.id,
      fromStageId: null, // First stage
      toStageId: input.stageId,
      daysInPreviousStage: 0,
      movedBy: this.ctx.userId,
      movedAt: new Date(),
      notes: 'Deal created',
    });

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'CREATE',
      resourceType: this.resourceType,
      resourceId: deal!.id,
      resourceName: deal!.name,
      changes: { after: deal },
      requestId: this.ctx.requestId,
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });

    return this.findByIdWithRelations(deal!.id) as Promise<DealWithRelations>;
  }

  // ---- Update deal ----
  async update(id: string, input: UpdateDealInput): Promise<DealWithRelations> {
    const existing = await this.findByIdOrThrow(id);

    // If changing stage, validate it belongs to the same pipeline
    if (input.stageId && input.stageId !== existing.stageId) {
      const stage = await this.db
        .select()
        .from(pipelineStages)
        .where(
          and(
            eq(pipelineStages.id, input.stageId),
            eq(pipelineStages.pipelineId, existing.pipelineId),
            eq(pipelineStages.tenantId, this.tenantId),
            isNull(pipelineStages.deletedAt),
          ),
        )
        .limit(1);

      if (!stage[0]) {
        throw new ValidationError('Stage does not belong to this deal\'s pipeline');
      }

      // Update probability from stage default if not manually overridden
      if (!input.probability && !existing.probabilityOverride) {
        input.probability = stage[0].defaultProbability;
      }
    }

    const [updated] = await this.db
      .update(pipelineDeals)
      .set({
        ...input,
        value: input.value?.toString(),
        probabilityOverride: input.probability !== undefined || existing.probabilityOverride,
        updatedBy: this.ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(pipelineDeals.id, id), this.tenantScope()))
      .returning();

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'UPDATE',
      resourceType: this.resourceType,
      resourceId: id,
      resourceName: updated!.name,
      changes: { before: existing, after: updated },
      requestId: this.ctx.requestId,
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });

    return this.findByIdWithRelations(id) as Promise<DealWithRelations>;
  }

  // ---- Move deal to different stage ----
  async moveStage(id: string, input: MoveStageInput): Promise<DealWithRelations> {
    const existing = await this.findByIdOrThrow(id);

    // Validate new stage belongs to same pipeline
    const newStage = await this.db
      .select()
      .from(pipelineStages)
      .where(
        and(
          eq(pipelineStages.id, input.toStageId),
          eq(pipelineStages.pipelineId, existing.pipelineId),
          eq(pipelineStages.tenantId, this.tenantId),
          isNull(pipelineStages.deletedAt),
        ),
      )
      .limit(1);

    if (!newStage[0]) {
      throw new ValidationError('Stage does not belong to this deal\'s pipeline');
    }

    // Calculate days in previous stage
    const previousHistory = await this.db
      .select()
      .from(dealStageHistory)
      .where(eq(dealStageHistory.dealId, id))
      .orderBy(desc(dealStageHistory.movedAt))
      .limit(1);

    const daysInPreviousStage = previousHistory[0]
      ? Math.floor((Date.now() - new Date(previousHistory[0].movedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Update deal with new stage and probability
    const [updated] = await this.db
      .update(pipelineDeals)
      .set({
        stageId: input.toStageId,
        probability: existing.probabilityOverride ? existing.probability : newStage[0].defaultProbability,
        updatedBy: this.ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(pipelineDeals.id, id), this.tenantScope()))
      .returning();

    // Record stage history
    await this.db.insert(dealStageHistory).values({
      tenantId: this.tenantId,
      dealId: id,
      fromStageId: existing.stageId,
      toStageId: input.toStageId,
      daysInPreviousStage,
      movedBy: this.ctx.userId,
      movedAt: new Date(),
      notes: input.notes || null,
    });

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'UPDATE',
      resourceType: this.resourceType,
      resourceId: id,
      resourceName: updated!.name,
      changes: {
        before: { stageId: existing.stageId },
        after: { stageId: input.toStageId },
      },
      metadata: { action: 'stage_moved', notes: input.notes },
      requestId: this.ctx.requestId,
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });

    return this.findByIdWithRelations(id) as Promise<DealWithRelations>;
  }

  // ---- Close deal (won or lost) ----
  async closeDeal(id: string, input: CloseDealInput): Promise<DealWithRelations> {
    const existing = await this.findByIdOrThrow(id);

    if (existing.status !== 'open') {
      throw new ValidationError('Deal is already closed');
    }

    const [updated] = await this.db
      .update(pipelineDeals)
      .set({
        status: input.status,
        actualClose: input.actualClose,
        lostReason: input.lostReason || null,
        updatedBy: this.ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(pipelineDeals.id, id), this.tenantScope()))
      .returning();

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'UPDATE',
      resourceType: this.resourceType,
      resourceId: id,
      resourceName: updated!.name,
      changes: {
        before: { status: existing.status },
        after: { status: input.status, actualClose: input.actualClose, lostReason: input.lostReason },
      },
      metadata: { action: 'deal_closed', notes: input.notes },
      requestId: this.ctx.requestId,
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });

    return this.findByIdWithRelations(id) as Promise<DealWithRelations>;
  }
}
