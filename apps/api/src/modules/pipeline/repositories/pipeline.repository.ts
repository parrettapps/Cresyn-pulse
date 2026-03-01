import { pipelines, pipelineStages } from '@cresyn/db/schema';
import { and, eq, desc, isNull } from 'drizzle-orm';
import { BaseRepository, ConflictError } from '../../../core/repository/base.repository.js';
import type { RequestContext } from '@cresyn/types';
import { AuditService } from '../../../core/services/audit.service.js';

// ============================================================
// TYPES
// ============================================================

export type Pipeline = typeof pipelines.$inferSelect;

export interface CreatePipelineInput {
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdatePipelineInput {
  name?: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface PipelineWithStages extends Pipeline {
  stages: Array<{
    id: string;
    name: string;
    position: number;
    defaultProbability: number;
    isWon: boolean;
    isLost: boolean;
    color: string;
  }>;
}

// ============================================================
// PIPELINE REPOSITORY
// ============================================================

export class PipelineRepository extends BaseRepository<typeof pipelines> {
  protected readonly table = pipelines;
  protected readonly resourceType = 'pipeline' as const;

  constructor(ctx: RequestContext) {
    super(ctx);
  }

  // ---- List all pipelines for tenant ----
  async list(): Promise<Pipeline[]> {
    return this.db
      .select()
      .from(pipelines)
      .where(this.baseFilter())
      .orderBy(pipelines.position, pipelines.name);
  }

  // ---- List all pipelines with stages ----
  async listWithStages(): Promise<PipelineWithStages[]> {
    const allPipelines = await this.list();

    const pipelinesWithStages = await Promise.all(
      allPipelines.map(async (pipeline) => {
        const stages = await this.db
          .select({
            id: pipelineStages.id,
            name: pipelineStages.name,
            position: pipelineStages.position,
            defaultProbability: pipelineStages.defaultProbability,
            isWon: pipelineStages.isWon,
            isLost: pipelineStages.isLost,
            color: pipelineStages.color,
          })
          .from(pipelineStages)
          .where(
            and(
              eq(pipelineStages.pipelineId, pipeline.id),
              eq(pipelineStages.tenantId, this.tenantId),
              isNull(pipelineStages.deletedAt),
            ),
          )
          .orderBy(pipelineStages.position);

        return {
          ...pipeline,
          stages,
        };
      })
    );

    return pipelinesWithStages;
  }

  // ---- Get pipeline with stages ----
  async findByIdWithStages(id: string): Promise<PipelineWithStages | null> {
    const pipeline = await this.findById(id);
    if (!pipeline) return null;

    const stages = await this.db
      .select({
        id: pipelineStages.id,
        name: pipelineStages.name,
        position: pipelineStages.position,
        defaultProbability: pipelineStages.defaultProbability,
        isWon: pipelineStages.isWon,
        isLost: pipelineStages.isLost,
        color: pipelineStages.color,
      })
      .from(pipelineStages)
      .where(
        and(
          eq(pipelineStages.pipelineId, id),
          eq(pipelineStages.tenantId, this.tenantId),
          isNull(pipelineStages.deletedAt),
        ),
      )
      .orderBy(pipelineStages.position);

    return {
      ...pipeline,
      stages,
    };
  }

  // ---- Get default pipeline for tenant ----
  async getDefault(): Promise<Pipeline | null> {
    const results = await this.db
      .select()
      .from(pipelines)
      .where(and(this.baseFilter(), eq(pipelines.isDefault, true)))
      .limit(1);

    return results[0] ?? null;
  }

  // ---- Create pipeline ----
  async create(input: CreatePipelineInput): Promise<Pipeline> {
    // If setting as default, unset current default first
    if (input.isDefault) {
      await this.db
        .update(pipelines)
        .set({ isDefault: false })
        .where(and(this.tenantScope(), eq(pipelines.isDefault, true)));
    }

    // Get max position
    const maxPositionResult = await this.db
      .select({ maxPosition: pipelines.position })
      .from(pipelines)
      .where(this.tenantScope())
      .orderBy(desc(pipelines.position))
      .limit(1);

    const position = (maxPositionResult[0]?.maxPosition ?? -1) + 1;

    const [pipeline] = await this.db
      .insert(pipelines)
      .values({
        tenantId: this.tenantId,
        name: input.name,
        description: input.description,
        isDefault: input.isDefault ?? false,
        isActive: input.isActive ?? true,
        position,
      })
      .returning();

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'CREATE',
      resourceType: this.resourceType,
      resourceId: pipeline!.id,
      resourceName: pipeline!.name,
      changes: { after: pipeline },
      requestId: this.ctx.requestId,
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });

    return pipeline!;
  }

  // ---- Update pipeline ----
  async update(id: string, input: UpdatePipelineInput): Promise<Pipeline> {
    const existing = await this.findByIdOrThrow(id);

    // If setting as default, unset current default first
    if (input.isDefault && !existing.isDefault) {
      await this.db
        .update(pipelines)
        .set({ isDefault: false })
        .where(and(this.tenantScope(), eq(pipelines.isDefault, true)));
    }

    const [updated] = await this.db
      .update(pipelines)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(pipelines.id, id), this.tenantScope()))
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
}
