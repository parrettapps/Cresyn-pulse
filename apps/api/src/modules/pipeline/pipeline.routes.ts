import type { FastifyInstance } from 'fastify';
import { authenticate, requireModule, requirePermission } from '../../core/middleware/authenticate.js';
import { PERMISSIONS } from '@cresyn/config';
import type { RequestContext } from '@cresyn/types';
import { PipelineRepository } from './repositories/pipeline.repository.js';
import { StageRepository } from './repositories/stage.repository.js';
import { DealRepository } from './repositories/deal.repository.js';
import { ActivityRepository } from './repositories/activity.repository.js';
import {
  createPipelineSchema,
  updatePipelineSchema,
  createStageSchema,
  updateStageSchema,
  reorderStagesSchema,
  createDealSchema,
  updateDealSchema,
  listDealsSchema,
  moveStageSchema,
  closeDealSchema,
  createActivitySchema,
  updateActivitySchema,
  listActivitiesSchema,
  completeTaskSchema,
  idParamSchema,
  type CreatePipelineInput,
  type UpdatePipelineInput,
  type CreateStageInput,
  type UpdateStageInput,
  type ReorderStagesInput,
  type CreateDealInput,
  type UpdateDealInput,
  type ListDealsQuery,
  type MoveStageInput,
  type CloseDealInput,
  type CreateActivityInput,
  type UpdateActivityInput,
  type ListActivitiesQuery,
  type CompleteTaskInput,
  type IdParam,
} from './pipeline.validation.js';

// ============================================================
// PIPELINE MODULE ROUTES
// Pipelines, stages, deals, activities
// ============================================================

export async function pipelineRoutes(app: FastifyInstance) {
  // ============================================================
  // PIPELINE ROUTES (Admin only)
  // ============================================================

  // GET /pipelines — List all pipelines with stages
  app.get(
    '/pipelines',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_READ),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new PipelineRepository(ctx);

      const pipelines = await repo.listWithStages();
      return reply.send(pipelines);
    },
  );

  // GET /pipelines/:id — Get pipeline with stages
  app.get<{ Params: IdParam }>(
    '/pipelines/:id',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_READ),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new PipelineRepository(ctx);

      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid pipeline ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      const pipeline = await repo.findByIdWithStages(parsed.data.id);
      if (!pipeline) {
        return reply.code(404).send({
          type: 'https://api.cresyn.com/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Pipeline not found',
          instance: request.url,
          requestId: request.id,
        });
      }

      return reply.send(pipeline);
    },
  );

  // POST /pipelines — Create pipeline
  app.post<{ Body: CreatePipelineInput }>(
    '/pipelines',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_STAGES_MANAGE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new PipelineRepository(ctx);

      const parsed = createPipelineSchema.safeParse(request.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: parsed.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const pipeline = await repo.create(parsed.data);
      return reply.code(201).send(pipeline);
    },
  );

  // PATCH /pipelines/:id — Update pipeline
  app.patch<{ Params: IdParam; Body: UpdatePipelineInput }>(
    '/pipelines/:id',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_STAGES_MANAGE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new PipelineRepository(ctx);

      const paramsValidation = idParamSchema.safeParse(request.params);
      if (!paramsValidation.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid pipeline ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      const bodyValidation = updatePipelineSchema.safeParse(request.body);
      if (!bodyValidation.success) {
        const firstError = bodyValidation.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: bodyValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const pipeline = await repo.update(paramsValidation.data.id, bodyValidation.data);
      return reply.send(pipeline);
    },
  );

  // DELETE /pipelines/:id — Soft delete pipeline
  app.delete<{ Params: IdParam }>(
    '/pipelines/:id',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_STAGES_MANAGE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new PipelineRepository(ctx);

      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid pipeline ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      await repo.softDelete(parsed.data.id);
      return reply.code(204).send();
    },
  );

  // ============================================================
  // STAGE ROUTES (Admin only)
  // ============================================================

  // GET /pipelines/:id/stages — List stages for pipeline
  app.get<{ Params: IdParam }>(
    '/pipelines/:id/stages',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_READ),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new StageRepository(ctx);

      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid pipeline ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      const stages = await repo.listByPipeline(parsed.data.id);
      return reply.send(stages);
    },
  );

  // POST /stages — Create stage
  app.post<{ Body: CreateStageInput }>(
    '/stages',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_STAGES_MANAGE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new StageRepository(ctx);

      const parsed = createStageSchema.safeParse(request.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: parsed.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const stage = await repo.create(parsed.data);
      return reply.code(201).send(stage);
    },
  );

  // PATCH /stages/:id — Update stage
  app.patch<{ Params: IdParam; Body: UpdateStageInput }>(
    '/stages/:id',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_STAGES_MANAGE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new StageRepository(ctx);

      const paramsValidation = idParamSchema.safeParse(request.params);
      if (!paramsValidation.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid stage ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      const bodyValidation = updateStageSchema.safeParse(request.body);
      if (!bodyValidation.success) {
        const firstError = bodyValidation.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: bodyValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const stage = await repo.update(paramsValidation.data.id, bodyValidation.data);
      return reply.send(stage);
    },
  );

  // POST /stages/reorder — Reorder stages
  app.post<{ Body: ReorderStagesInput }>(
    '/stages/reorder',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_STAGES_MANAGE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new StageRepository(ctx);

      const parsed = reorderStagesSchema.safeParse(request.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: parsed.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      await repo.reorder(parsed.data);
      return reply.code(204).send();
    },
  );

  // DELETE /stages/:id — Soft delete stage
  app.delete<{ Params: IdParam }>(
    '/stages/:id',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_STAGES_MANAGE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new StageRepository(ctx);

      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid stage ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      await repo.softDelete(parsed.data.id);
      return reply.code(204).send();
    },
  );

  // ============================================================
  // DEAL ROUTES
  // ============================================================

  // GET /deals — List deals with filters
  app.get<{ Querystring: ListDealsQuery }>(
    '/deals',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_READ),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new DealRepository(ctx);

      const parsed = listDealsSchema.safeParse(request.query);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid query parameters',
          instance: request.url,
          requestId: request.id,
        });
      }

      const result = await repo.list(parsed.data);
      return reply.send(result);
    },
  );

  // GET /deals/:id — Get single deal
  app.get<{ Params: IdParam }>(
    '/deals/:id',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_READ),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new DealRepository(ctx);

      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid deal ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      const deal = await repo.findByIdWithRelations(parsed.data.id);
      if (!deal) {
        return reply.code(404).send({
          type: 'https://api.cresyn.com/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Deal not found',
          instance: request.url,
          requestId: request.id,
        });
      }

      return reply.send(deal);
    },
  );

  // POST /deals — Create deal
  app.post<{ Body: CreateDealInput }>(
    '/deals',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_CREATE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new DealRepository(ctx);

      const parsed = createDealSchema.safeParse(request.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: parsed.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const deal = await repo.create(parsed.data);
      return reply.code(201).send(deal);
    },
  );

  // PATCH /deals/:id — Update deal
  app.patch<{ Params: IdParam; Body: UpdateDealInput }>(
    '/deals/:id',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_UPDATE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new DealRepository(ctx);

      const paramsValidation = idParamSchema.safeParse(request.params);
      if (!paramsValidation.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid deal ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      const bodyValidation = updateDealSchema.safeParse(request.body);
      if (!bodyValidation.success) {
        const firstError = bodyValidation.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: bodyValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const deal = await repo.update(paramsValidation.data.id, bodyValidation.data);
      return reply.send(deal);
    },
  );

  // POST /deals/:id/move-stage — Move deal to different stage
  app.post<{ Params: IdParam; Body: MoveStageInput }>(
    '/deals/:id/move-stage',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_UPDATE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new DealRepository(ctx);

      const paramsValidation = idParamSchema.safeParse(request.params);
      if (!paramsValidation.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid deal ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      const bodyValidation = moveStageSchema.safeParse(request.body);
      if (!bodyValidation.success) {
        const firstError = bodyValidation.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: bodyValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const deal = await repo.moveStage(paramsValidation.data.id, bodyValidation.data);
      return reply.send(deal);
    },
  );

  // POST /deals/:id/close — Close deal (won or lost)
  app.post<{ Params: IdParam; Body: CloseDealInput }>(
    '/deals/:id/close',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_UPDATE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new DealRepository(ctx);

      const paramsValidation = idParamSchema.safeParse(request.params);
      if (!paramsValidation.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid deal ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      const bodyValidation = closeDealSchema.safeParse(request.body);
      if (!bodyValidation.success) {
        const firstError = bodyValidation.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: bodyValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const deal = await repo.closeDeal(paramsValidation.data.id, bodyValidation.data);
      return reply.send(deal);
    },
  );

  // DELETE /deals/:id — Soft delete deal
  app.delete<{ Params: IdParam }>(
    '/deals/:id',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_DELETE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new DealRepository(ctx);

      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid deal ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      await repo.softDelete(parsed.data.id);
      return reply.code(204).send();
    },
  );

  // ============================================================
  // ACTIVITY ROUTES
  // ============================================================

  // GET /activities — List activities with filters
  app.get<{ Querystring: ListActivitiesQuery }>(
    '/activities',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_READ),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new ActivityRepository(ctx);

      const parsed = listActivitiesSchema.safeParse(request.query);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid query parameters',
          instance: request.url,
          requestId: request.id,
        });
      }

      const result = await repo.list(parsed.data);
      return reply.send(result);
    },
  );

  // POST /activities — Create activity
  app.post<{ Body: CreateActivityInput }>(
    '/activities',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_UPDATE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new ActivityRepository(ctx);

      const parsed = createActivitySchema.safeParse(request.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: parsed.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const activity = await repo.create(parsed.data);
      return reply.code(201).send(activity);
    },
  );

  // PATCH /activities/:id — Update activity
  app.patch<{ Params: IdParam; Body: UpdateActivityInput }>(
    '/activities/:id',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_UPDATE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new ActivityRepository(ctx);

      const paramsValidation = idParamSchema.safeParse(request.params);
      if (!paramsValidation.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid activity ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      const bodyValidation = updateActivitySchema.safeParse(request.body);
      if (!bodyValidation.success) {
        const firstError = bodyValidation.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: bodyValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const activity = await repo.update(paramsValidation.data.id, bodyValidation.data);
      return reply.send(activity);
    },
  );

  // POST /activities/:id/complete — Complete task
  app.post<{ Params: IdParam; Body: CompleteTaskInput }>(
    '/activities/:id/complete',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_UPDATE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new ActivityRepository(ctx);

      const paramsValidation = idParamSchema.safeParse(request.params);
      if (!paramsValidation.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid activity ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      const bodyValidation = completeTaskSchema.safeParse(request.body);
      if (!bodyValidation.success) {
        const firstError = bodyValidation.error.errors[0];
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: firstError?.message ?? 'Invalid request body',
          instance: request.url,
          requestId: request.id,
          errors: bodyValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const activity = await repo.completeTask(
        paramsValidation.data.id,
        bodyValidation.data.completedAt,
      );
      return reply.send(activity);
    },
  );

  // DELETE /activities/:id — Soft delete activity
  app.delete<{ Params: IdParam }>(
    '/activities/:id',
    {
      preHandler: [
        authenticate,
        requireModule('pipeline'),
        requirePermission(PERMISSIONS.PIPELINE_DEALS_UPDATE),
      ],
    },
    async (request, reply) => {
      // @ts-expect-error — ctx attached by authenticate middleware
      const ctx = request.ctx as RequestContext;
      const repo = new ActivityRepository(ctx);

      const parsed = idParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          type: 'https://api.cresyn.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid activity ID',
          instance: request.url,
          requestId: request.id,
        });
      }

      await repo.softDelete(parsed.data.id);
      return reply.code(204).send();
    },
  );
}
