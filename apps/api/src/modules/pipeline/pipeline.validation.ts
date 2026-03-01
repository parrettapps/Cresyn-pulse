import { z } from 'zod';

// ============================================================
// PIPELINE VALIDATION SCHEMAS
// ============================================================

export const createPipelineSchema = z.object({
  name: z.string().min(1, 'Pipeline name is required').max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updatePipelineSchema = createPipelineSchema.partial();

// ============================================================
// STAGE VALIDATION SCHEMAS
// ============================================================

export const createStageSchema = z.object({
  pipelineId: z.string().uuid('Invalid pipeline ID'),
  name: z.string().min(1, 'Stage name is required').max(100),
  position: z.number().int().min(0),
  defaultProbability: z.number().int().min(0).max(100).default(0),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#6b7280'),
});

export const updateStageSchema = createStageSchema
  .omit({ pipelineId: true })
  .partial();

export const reorderStagesSchema = z.object({
  stages: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    }),
  ),
});

// ============================================================
// DEAL VALIDATION SCHEMAS
// ============================================================

export const createDealSchema = z.object({
  pipelineId: z.string().uuid('Invalid pipeline ID'),
  companyId: z.string().uuid('Invalid company ID').optional(),
  contactId: z.string().uuid('Invalid contact ID').optional(),
  stageId: z.string().uuid('Invalid stage ID'),
  name: z.string().min(1, 'Deal name is required').max(255),
  value: z.number().min(0).optional(),
  currency: z.string().length(3, 'Currency must be 3-letter code').default('USD'),
  probability: z.number().int().min(0).max(100).optional(),
  expectedClose: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  ownerId: z.string().uuid('Invalid owner ID').optional(),
  source: z.enum(['inbound', 'outbound', 'referral', 'partner']).optional(),
  dealType: z.enum(['new_business', 'expansion', 'renewal', 'churn_recovery']).optional(),
  forecastCategory: z.enum(['commit', 'best_case', 'pipeline', 'omitted']).optional(),
  nextStepDescription: z.string().max(500).optional(),
  nextStepDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateDealSchema = createDealSchema
  .omit({ pipelineId: true })
  .partial();

export const listDealsSchema = z.object({
  pipelineId: z.string().uuid('Invalid pipeline ID').optional(),
  stageId: z.string().uuid('Invalid stage ID').optional(),
  ownerId: z.string().uuid('Invalid owner ID').optional(),
  companyId: z.string().uuid('Invalid company ID').optional(),
  status: z.enum(['open', 'closed_won', 'closed_lost']).optional(),
  source: z.enum(['inbound', 'outbound', 'referral', 'partner']).optional(),
  dealType: z.enum(['new_business', 'expansion', 'renewal', 'churn_recovery']).optional(),
  forecastCategory: z.enum(['commit', 'best_case', 'pipeline', 'omitted']).optional(),
  expectedCloseFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expectedCloseTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  minValue: z.coerce.number().min(0).optional(),
  maxValue: z.coerce.number().min(0).optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
});

export const moveStageSchema = z.object({
  toStageId: z.string().uuid('Invalid stage ID'),
  notes: z.string().max(1000).optional(),
});

export const closeDealSchema = z.object({
  status: z.enum(['closed_won', 'closed_lost']),
  actualClose: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  lostReason: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => {
    // If closing as lost, lostReason is required
    if (data.status === 'closed_lost' && !data.lostReason) {
      return false;
    }
    return true;
  },
  {
    message: 'Lost reason is required when marking deal as closed lost',
    path: ['lostReason'],
  },
);

// ============================================================
// ACTIVITY VALIDATION SCHEMAS
// ============================================================

export const createActivitySchema = z.object({
  resourceType: z.enum(['deal', 'company', 'contact', 'project']),
  resourceId: z.string().uuid('Invalid resource ID'),
  activityType: z.enum(['call', 'meeting', 'email', 'task', 'note']),
  direction: z.enum(['inbound', 'outbound']).optional(),
  subject: z.string().min(1, 'Subject is required').max(255),
  description: z.string().max(5000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  ownerId: z.string().uuid('Invalid owner ID').optional(),
  relatedContactId: z.string().uuid('Invalid contact ID').optional(),
  duration: z.number().int().min(0).max(1440).optional(), // Max 24 hours in minutes
  outcome: z.enum(['interested', 'not_interested', 'no_answer', 'voicemail', 'next_steps_agreed', 'no_decision', 'completed']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateActivitySchema = createActivitySchema
  .omit({ resourceType: true, resourceId: true })
  .partial();

export const listActivitiesSchema = z.object({
  resourceType: z.enum(['deal', 'company', 'contact', 'project']).optional(),
  resourceId: z.string().uuid('Invalid resource ID').optional(),
  activityType: z.enum(['call', 'meeting', 'email', 'task', 'note']).optional(),
  ownerId: z.string().uuid('Invalid owner ID').optional(),
  onlyTasks: z.coerce.boolean().optional(), // Filter for uncompleted tasks
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
});

export const completeTaskSchema = z.object({
  completedAt: z.string().datetime().optional(), // ISO 8601 timestamp
});

// ============================================================
// REPORTING SCHEMAS
// ============================================================

export const forecastReportSchema = z.object({
  pipelineId: z.string().uuid('Invalid pipeline ID').optional(),
  ownerId: z.string().uuid('Invalid owner ID').optional(),
  dealType: z.enum(['new_business', 'expansion', 'renewal', 'churn_recovery']).optional(),
  groupBy: z.enum(['category', 'month', 'owner', 'dealType']).default('category'),
  expectedCloseFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expectedCloseTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const staleDealsSchema = z.object({
  daysSinceActivity: z.coerce.number().int().min(1).default(30),
  pipelineId: z.string().uuid('Invalid pipeline ID').optional(),
  ownerId: z.string().uuid('Invalid owner ID').optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
});

// ============================================================
// SHARED SCHEMAS
// ============================================================

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;

export type CreateStageInput = z.infer<typeof createStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type ListDealsQuery = z.infer<typeof listDealsSchema>;
export type MoveStageInput = z.infer<typeof moveStageSchema>;
export type CloseDealInput = z.infer<typeof closeDealSchema>;

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type ListActivitiesQuery = z.infer<typeof listActivitiesSchema>;
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;

export type ForecastReportQuery = z.infer<typeof forecastReportSchema>;
export type StaleDealsQuery = z.infer<typeof staleDealsSchema>;

export type IdParam = z.infer<typeof idParamSchema>;
