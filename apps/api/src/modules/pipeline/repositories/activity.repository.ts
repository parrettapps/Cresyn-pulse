import { activities, contacts, users, pipelineDeals } from '@cresyn/db/schema';
import { and, eq, desc, isNull, or, sql, type SQL } from 'drizzle-orm';
import { BaseRepository } from '../../../core/repository/base.repository.js';
import type { RequestContext } from '@cresyn/types';
import { AuditService } from '../../../core/services/audit.service.js';

// ============================================================
// TYPES
// ============================================================

export type Activity = typeof activities.$inferSelect;

export interface CreateActivityInput {
  resourceType: 'deal' | 'company' | 'contact' | 'project';
  resourceId: string;
  activityType: 'call' | 'meeting' | 'email' | 'task' | 'note';
  direction?: 'inbound' | 'outbound';
  subject: string;
  description?: string;
  dueDate?: string;
  ownerId?: string;
  relatedContactId?: string;
  duration?: number;
  outcome?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateActivityInput {
  activityType?: 'call' | 'meeting' | 'email' | 'task' | 'note';
  direction?: 'inbound' | 'outbound';
  subject?: string;
  description?: string;
  dueDate?: string;
  ownerId?: string;
  relatedContactId?: string;
  duration?: number;
  outcome?: string;
  metadata?: Record<string, unknown>;
}

export interface ListActivitiesFilters {
  resourceType?: 'deal' | 'company' | 'contact' | 'project';
  resourceId?: string;
  activityType?: 'call' | 'meeting' | 'email' | 'task' | 'note';
  ownerId?: string;
  onlyTasks?: boolean;
  cursor?: string;
  limit?: number;
}

export interface PaginatedActivities {
  data: ActivityWithRelations[];
  pagination: {
    hasMore: boolean;
    cursor?: string;
  };
}

export interface ActivityWithRelations extends Activity {
  owner?: { id: string; fullName: string; avatarUrl: string | null } | null;
  relatedContact?: { id: string; firstName: string; lastName: string } | null;
  createdByUser: { id: string; fullName: string; avatarUrl: string | null };
}

// ============================================================
// ACTIVITY REPOSITORY
// ============================================================

export class ActivityRepository extends BaseRepository<typeof activities> {
  protected readonly table = activities;
  protected readonly resourceType = 'activity' as const;

  constructor(ctx: RequestContext) {
    super(ctx);
  }

  // ---- List activities with filters ----
  async list(filters: ListActivitiesFilters = {}): Promise<PaginatedActivities> {
    const {
      resourceType,
      resourceId,
      activityType,
      ownerId,
      onlyTasks,
      cursor,
      limit = 50,
    } = filters;

    // Build filter conditions
    const conditions: SQL[] = [this.baseFilter()];

    if (resourceType) conditions.push(eq(activities.resourceType, resourceType));
    if (resourceId) conditions.push(eq(activities.resourceId, resourceId));
    if (activityType) conditions.push(eq(activities.activityType, activityType));
    if (ownerId) conditions.push(eq(activities.ownerId, ownerId));

    // Only uncompleted tasks
    if (onlyTasks) {
      conditions.push(
        and(
          eq(activities.activityType, 'task'),
          isNull(activities.completedAt),
        ) as SQL,
      );
    }

    // Cursor-based pagination
    let query = this.db
      .select({
        activity: activities,
        owner: {
          id: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        },
        relatedContact: {
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
        },
        createdByUser: {
          id: users.id,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(activities)
      .leftJoin(users, eq(activities.ownerId, users.id))
      .leftJoin(contacts, eq(activities.relatedContactId, contacts.id))
      .innerJoin(users as any, eq(activities.createdBy, (users as any).id))
      .where(and(...conditions))
      .orderBy(desc(activities.createdAt), desc(activities.id))
      .limit(limit + 1);

    if (cursor) {
      const { createdAt, id } = this.decodeCursor(cursor);
      conditions.push(
        or(
          sql`${activities.createdAt} < ${createdAt}`,
          and(
            sql`${activities.createdAt} = ${createdAt}`,
            sql`${activities.id} < ${id}`,
          ),
        ) as SQL,
      );
      query = this.db
        .select({
          activity: activities,
          owner: {
            id: users.id,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
          },
          relatedContact: {
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
          },
          createdByUser: {
            id: users.id,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(activities)
        .leftJoin(users, eq(activities.ownerId, users.id))
        .leftJoin(contacts, eq(activities.relatedContactId, contacts.id))
        .innerJoin(users as any, eq(activities.createdBy, (users as any).id))
        .where(and(...conditions))
        .orderBy(desc(activities.createdAt), desc(activities.id))
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
            createdAt: data[data.length - 1]!.activity.createdAt,
            id: data[data.length - 1]!.activity.id,
          })
        : undefined;

    // Map results to include relations
    const mappedData = data.map((row) => ({
      ...row.activity,
      owner: row.owner.id ? row.owner : null,
      relatedContact: row.relatedContact.id ? row.relatedContact : null,
      createdByUser: row.createdByUser,
    }));

    return {
      data: mappedData,
      pagination: {
        hasMore,
        cursor: nextCursor,
      },
    };
  }

  // ---- Create activity ----
  async create(input: CreateActivityInput): Promise<Activity> {
    const [activity] = await this.db
      .insert(activities)
      .values({
        tenantId: this.tenantId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        activityType: input.activityType,
        direction: input.direction,
        subject: input.subject,
        description: input.description,
        dueDate: input.dueDate,
        ownerId: input.ownerId || this.ctx.userId,
        relatedContactId: input.relatedContactId,
        duration: input.duration,
        outcome: input.outcome,
        metadata: input.metadata || {},
        createdBy: this.ctx.userId,
        updatedBy: this.ctx.userId,
      })
      .returning();

    // If activity is on a deal, update lastActivityAt
    if (input.resourceType === 'deal') {
      await this.db
        .update(pipelineDeals)
        .set({
          lastActivityAt: new Date(),
          lastActivityType: input.activityType,
        })
        .where(
          and(
            eq(pipelineDeals.id, input.resourceId),
            eq(pipelineDeals.tenantId, this.tenantId),
          ),
        );
    }

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'CREATE',
      resourceType: this.resourceType,
      resourceId: activity!.id,
      resourceName: activity!.subject,
      changes: { after: activity },
      requestId: this.ctx.requestId,
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });

    return activity!;
  }

  // ---- Update activity ----
  async update(id: string, input: UpdateActivityInput): Promise<Activity> {
    const existing = await this.findByIdOrThrow(id);

    const [updated] = await this.db
      .update(activities)
      .set({
        ...input,
        updatedBy: this.ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(activities.id, id), this.tenantScope()))
      .returning();

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'UPDATE',
      resourceType: this.resourceType,
      resourceId: id,
      resourceName: updated!.subject,
      changes: { before: existing, after: updated },
      requestId: this.ctx.requestId,
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });

    return updated!;
  }

  // ---- Complete task ----
  async completeTask(id: string, completedAt?: string): Promise<Activity> {
    const existing = await this.findByIdOrThrow(id);

    const [updated] = await this.db
      .update(activities)
      .set({
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        updatedBy: this.ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(activities.id, id), this.tenantScope()))
      .returning();

    // Audit log
    await AuditService.log({
      tenantId: this.tenantId,
      actorId: this.ctx.userId,
      actorRole: this.ctx.role,
      action: 'UPDATE',
      resourceType: this.resourceType,
      resourceId: id,
      resourceName: updated!.subject,
      changes: { before: { completedAt: existing.completedAt }, after: { completedAt: updated!.completedAt } },
      metadata: { action: 'task_completed' },
      requestId: this.ctx.requestId,
      ...(this.ctx.ipAddress ? { ipAddress: this.ctx.ipAddress } : {}),
      ...(this.ctx.userAgent ? { userAgent: this.ctx.userAgent } : {}),
    });

    return updated!;
  }
}
