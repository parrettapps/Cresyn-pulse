import type { ModuleKey, Permission, Role, AuditAction, ResourceType } from '@cresyn/config';

// ============================================================
// Request Context — attached to every authenticated request
// ============================================================
export interface RequestContext {
  userId: string;
  tenantId: string;
  role: Role;
  permissions: Permission[];
  modules: ModuleKey[];
  jti: string; // JWT ID for blacklist support
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}

// ============================================================
// JWT Payload
// ============================================================
export interface JWTPayload {
  sub: string; // user_id
  tenant_id: string;
  role: Role;
  permissions: Permission[];
  modules: ModuleKey[];
  iat: number;
  exp: number;
  jti: string;
}

// ============================================================
// API Response shapes
// ============================================================
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    count: number;
  };
}

// RFC 7807 Problem Details
export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: FieldError[];
  requestId?: string;
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

// ============================================================
// Audit Log
// ============================================================
export interface AuditLogEntry {
  tenantId?: string;
  actorId?: string;
  actorRole?: Role;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  resourceName?: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

// ============================================================
// Module export job (PDF, CSV)
// ============================================================
export type ExportFormat = 'pdf' | 'csv';
export type JobStatus = 'queued' | 'processing' | 'complete' | 'failed';

export interface ExportJob {
  jobId: string;
  status: JobStatus;
  format: ExportFormat;
  downloadUrl?: string;
  expiresAt?: string;
  error?: string;
  estimatedWaitSeconds?: number;
}

// ============================================================
// Stripe / Billing
// ============================================================
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'unpaid'
  | 'incomplete';

// ============================================================
// User membership status
// ============================================================
export type MembershipStatus = 'active' | 'invited' | 'suspended';

// ============================================================
// Utility types
// ============================================================
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
