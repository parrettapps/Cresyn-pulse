import { pipelineStages, pipelineDeals } from '@cresyn/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { BaseRepository, ValidationError } from '../../../core/repository/base.repository.js';
import type { RequestContext } from '@cresyn/types';
import { AuditService } from '../../../core/services/audit.service.js';

// ============================================================
// TYPES
// ============================================================

export type Stage = typeof pipelineStages.$inferSelect;

export interface CreateStageInput {
  pipelineId: string;
  name: string;
  position: number;
  defaultProbability?: number;
  isWon?: boolean;
  isLost?: boolean;
  color?: string;
}

export interface UpdateStageInput {
  name?: string;
  position?: number;
  defaultProbability?: number;
  isWon?: boolean;
  isLost?: boolean;
  color?: string;
}

export interface ReorderStagesInput {
  stages: Array<{ id: string; position: number }>;
}

// ============================================================
// STAGE REPOSITORY
// ============================================================

export class StageRepository extends BaseRepository<typeof pipelineStages> {
  protected readonly table = pipelineStages;
  protected readonly resourceType = 'stage' as const;

  constructor(ctx: RequestContext) {
    super(ctx);
  }

  // ---- List stages for a pipeline ----
  async listByPipeline(pipelineId: string): Promise<Stage[]> {
    return this.db
      .select()
      .from(pipelineStages)
      .where(
        and(
          eq(pipelineStages.pipelineId, pipelineId),
          eq(pipelineStages.tenantId, this.tenantId),
          isNull(pipelineStages.deletedAt),
        ),
      )
      .orderBy(pipelineStages.position);
  }

  // ---- Create stage ----
  async create(input: CreateStageInput): Promise<Stage> {
    const [stage] = await this.db
      .insert(pipelineStages)
      .values({
        tenantId: this.tenantId,
        pipelineId: input.pipelineId,
        name: input.name,
        position: input.position,
        defaultProbability: input.defaultProbability ?? 0,
        isWon: input.isWon ?? false,
        isLost: input.isLost ?? false,
        color: input.color ?? '#6b7280',
      })
      .returning();

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'CREATE',
      resourceType: this.resourceType,
      resourceId: stage!.id,
      resourceName: stage!.name,
      changes: { after: stage },
      requestId: this.ctx.requestId,
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });

    return stage!;
  }

  // ---- Update stage ----
  async update(id: string, input: UpdateStageInput): Promise<Stage> {
    const existing = await this.findByIdOrThrow(id);

    const [updated] = await this.db
      .update(pipelineStages)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(pipelineStages.id, id), this.tenantScope()))
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

    return updated!;
  }

  // ---- Reorder stages ----
  async reorder(input: ReorderStagesInput): Promise<void> {
    // Validate all stages belong to tenant
    for (const { id, position } of input.stages) {
      await this.findByIdOrThrow(id); // Ensures tenant scope

      await this.db
        .update(pipelineStages)
        .set({ position, updatedAt: new Date() })
        .where(and(eq(pipelineStages.id, id), this.tenantScope()));
    }

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'UPDATE',
      resourceType: this.resourceType,
      resourceId: 'bulk',
      resourceName: 'stages_reordered',
      changes: { after: input.stages },
      requestId: this.ctx.requestId,
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });
  }

  // ---- Soft delete stage (with validation) ----
  async softDelete(id: string): Promise<void> {
    // Check if any deals are in this stage
    const dealsInStage = await this.db
      .select({ count: pipelineDeals.id })
      .from(pipelineDeals)
      .where(
        and(
          eq(pipelineDeals.stageId, id),
          eq(pipelineDeals.tenantId, this.tenantId),
          isNull(pipelineDeals.deletedAt),
        ),
      );

    if (dealsInStage.length > 0) {
      throw new ValidationError(
        `Cannot delete stage with ${dealsInStage.length} active deal(s). Move deals to another stage first.`,
      );
    }

    await super.softDelete(id);
  }
}
