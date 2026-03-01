// ============================================================
// PIPELINE MODULE TYPES
// ============================================================

export interface Pipeline {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PipelineStage {
  id: string;
  tenantId: string;
  pipelineId: string;
  name: string;
  position: number;
  defaultProbability: number;
  isWon: boolean;
  isLost: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PipelineWithStages extends Pipeline {
  stages: PipelineStage[];
}

export type DealStatus = 'open' | 'closed_won' | 'closed_lost';
export type DealSource = 'inbound' | 'outbound' | 'referral' | 'partner';
export type DealType = 'new_business' | 'expansion' | 'renewal' | 'churn_recovery';
export type ForecastCategory = 'commit' | 'best_case' | 'pipeline' | 'omitted';

export interface Deal {
  id: string;
  tenantId: string;
  pipelineId: string;
  companyId: string | null;
  contactId: string | null;
  stageId: string;
  name: string;
  value: string | null;
  currency: string;
  probability: number | null;
  probabilityOverride: boolean;
  expectedClose: string | null; // YYYY-MM-DD
  actualClose: string | null; // YYYY-MM-DD
  ownerId: string | null;
  status: DealStatus;
  source: DealSource | null;
  dealType: DealType | null;
  forecastCategory: ForecastCategory | null;
  nextStepDescription: string | null;
  nextStepDueDate: string | null; // YYYY-MM-DD
  lostReason: string | null;
  lastActivityAt: string | null;
  lastActivityType: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string;
  updatedBy: string | null;
}

export interface DealWithRelations extends Deal {
  company: { id: string; name: string } | null;
  stage: { id: string; name: string; color: string };
  owner: { id: string; fullName: string; avatarUrl: string | null } | null;
}

export type ActivityType = 'call' | 'meeting' | 'email' | 'task' | 'note';
export type ActivityDirection = 'inbound' | 'outbound';
export type ActivityOutcome =
  | 'interested'
  | 'not_interested'
  | 'no_answer'
  | 'voicemail'
  | 'next_steps_agreed'
  | 'no_decision'
  | 'completed';

export interface Activity {
  id: string;
  tenantId: string;
  resourceType: 'deal' | 'company' | 'contact' | 'project';
  resourceId: string;
  activityType: ActivityType;
  direction: ActivityDirection | null;
  subject: string;
  description: string | null;
  dueDate: string | null; // YYYY-MM-DD
  completedAt: string | null;
  ownerId: string | null;
  relatedContactId: string | null;
  duration: number | null; // minutes
  outcome: ActivityOutcome | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string;
  updatedBy: string | null;
}

export interface ActivityWithRelations extends Activity {
  owner: { id: string; fullName: string; avatarUrl: string | null } | null;
  relatedContact: { id: string; firstName: string; lastName: string } | null;
  createdByUser: { id: string; fullName: string; avatarUrl: string | null };
}

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

export interface CreateDealInput {
  pipelineId: string;
  companyId?: string;
  contactId?: string;
  stageId: string;
  name: string;
  value?: number;
  currency?: string;
  probability?: number;
  expectedClose?: string; // YYYY-MM-DD
  ownerId?: string;
  source?: DealSource;
  dealType?: DealType;
  forecastCategory?: ForecastCategory;
  nextStepDescription?: string;
  nextStepDueDate?: string; // YYYY-MM-DD
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
  source?: DealSource;
  dealType?: DealType;
  forecastCategory?: ForecastCategory;
  nextStepDescription?: string;
  nextStepDueDate?: string;
  metadata?: Record<string, unknown>;
}

export interface MoveStageInput {
  toStageId: string;
  notes?: string;
}

export interface CloseDealInput {
  status: 'closed_won' | 'closed_lost';
  actualClose: string; // YYYY-MM-DD
  lostReason?: string;
  notes?: string;
}

export interface CreateActivityInput {
  resourceType: 'deal' | 'company' | 'contact' | 'project';
  resourceId: string;
  activityType: ActivityType;
  direction?: ActivityDirection;
  subject: string;
  description?: string;
  dueDate?: string; // YYYY-MM-DD
  ownerId?: string;
  relatedContactId?: string;
  duration?: number;
  outcome?: ActivityOutcome;
  metadata?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    cursor?: string;
  };
}

export interface ListDealsFilters {
  pipelineId?: string;
  stageId?: string;
  ownerId?: string;
  companyId?: string;
  status?: DealStatus;
  source?: DealSource;
  dealType?: DealType;
  forecastCategory?: ForecastCategory;
  expectedCloseFrom?: string;
  expectedCloseTo?: string;
  minValue?: number;
  maxValue?: number;
  search?: string;
  cursor?: string;
  limit?: number;
}
