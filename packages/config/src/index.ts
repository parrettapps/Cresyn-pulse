// ============================================================
// Shared constants across all apps
// ============================================================

export const MODULES = {
  CRM: 'crm',
  PIPELINE: 'pipeline',
  TIMESHEETS: 'timesheets',
  PROJECTS: 'projects',
} as const;

export type ModuleKey = (typeof MODULES)[keyof typeof MODULES];

export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  TENANT_OWNER: 'tenant_owner',
  TENANT_ADMIN: 'tenant_admin',
  MANAGER: 'manager',
  CONSULTANT: 'consultant',
  SALES_REP: 'sales_rep',
  VIEWER: 'viewer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  // CRM
  CRM_COMPANIES_READ: 'crm:companies:read',
  CRM_COMPANIES_CREATE: 'crm:companies:create',
  CRM_COMPANIES_UPDATE: 'crm:companies:update',
  CRM_COMPANIES_DELETE: 'crm:companies:delete',
  CRM_CONTACTS_READ: 'crm:contacts:read',
  CRM_CONTACTS_CREATE: 'crm:contacts:create',
  CRM_CONTACTS_UPDATE: 'crm:contacts:update',
  CRM_CONTACTS_DELETE: 'crm:contacts:delete',
  CRM_NOTES_READ: 'crm:notes:read',
  CRM_NOTES_CREATE: 'crm:notes:create',
  CRM_NOTES_UPDATE: 'crm:notes:update',
  CRM_NOTES_DELETE: 'crm:notes:delete',
  CRM_DOCUMENTS_READ: 'crm:documents:read',
  CRM_DOCUMENTS_UPLOAD: 'crm:documents:upload',
  // Pipeline
  PIPELINE_DEALS_READ: 'pipeline:deals:read',
  PIPELINE_DEALS_CREATE: 'pipeline:deals:create',
  PIPELINE_DEALS_UPDATE: 'pipeline:deals:update',
  PIPELINE_DEALS_DELETE: 'pipeline:deals:delete',
  PIPELINE_STAGES_MANAGE: 'pipeline:stages:manage',
  PIPELINE_QUOTES_READ: 'pipeline:quotes:read',
  PIPELINE_QUOTES_CREATE: 'pipeline:quotes:create',
  PIPELINE_QUOTES_UPDATE: 'pipeline:quotes:update',
  PIPELINE_QUOTES_EXPORT: 'pipeline:quotes:export',
  // Projects
  PROJECTS_READ: 'projects:projects:read',
  PROJECTS_CREATE: 'projects:projects:create',
  PROJECTS_UPDATE: 'projects:projects:update',
  PROJECTS_DELETE: 'projects:projects:delete',
  PROJECTS_TEAM_ASSIGN: 'projects:team:assign',
  PROJECTS_MILESTONES_MANAGE: 'projects:milestones:manage',
  // Timesheets
  TIMESHEETS_ENTRIES_READ_OWN: 'timesheets:entries:read_own',
  TIMESHEETS_ENTRIES_READ_ALL: 'timesheets:entries:read_all',
  TIMESHEETS_ENTRIES_CREATE: 'timesheets:entries:create',
  TIMESHEETS_ENTRIES_UPDATE_OWN: 'timesheets:entries:update_own',
  TIMESHEETS_ENTRIES_UPDATE_ALL: 'timesheets:entries:update_all',
  TIMESHEETS_ENTRIES_APPROVE: 'timesheets:entries:approve',
  TIMESHEETS_REPORTS_VIEW: 'timesheets:reports:view',
  // Billing
  BILLING_SUBSCRIPTION_READ: 'billing:subscription:read',
  BILLING_SUBSCRIPTION_MANAGE: 'billing:subscription:manage',
  BILLING_SEATS_MANAGE: 'billing:seats:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Role → permissions mapping — single source of truth
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  platform_admin: Object.values(PERMISSIONS),
  tenant_owner: Object.values(PERMISSIONS),
  tenant_admin: Object.values(PERMISSIONS).filter(
    (p) => p !== PERMISSIONS.BILLING_SUBSCRIPTION_MANAGE && p !== PERMISSIONS.BILLING_SEATS_MANAGE,
  ),
  manager: [
    PERMISSIONS.CRM_COMPANIES_READ,
    PERMISSIONS.CRM_COMPANIES_CREATE,
    PERMISSIONS.CRM_COMPANIES_UPDATE,
    PERMISSIONS.CRM_CONTACTS_READ,
    PERMISSIONS.CRM_CONTACTS_CREATE,
    PERMISSIONS.CRM_CONTACTS_UPDATE,
    PERMISSIONS.CRM_NOTES_READ,
    PERMISSIONS.CRM_NOTES_CREATE,
    PERMISSIONS.CRM_NOTES_UPDATE,
    PERMISSIONS.CRM_DOCUMENTS_READ,
    PERMISSIONS.CRM_DOCUMENTS_UPLOAD,
    PERMISSIONS.PIPELINE_DEALS_READ,
    PERMISSIONS.PIPELINE_DEALS_CREATE,
    PERMISSIONS.PIPELINE_DEALS_UPDATE,
    PERMISSIONS.PIPELINE_STAGES_MANAGE,
    PERMISSIONS.PIPELINE_QUOTES_READ,
    PERMISSIONS.PIPELINE_QUOTES_CREATE,
    PERMISSIONS.PIPELINE_QUOTES_UPDATE,
    PERMISSIONS.PIPELINE_QUOTES_EXPORT,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.PROJECTS_TEAM_ASSIGN,
    PERMISSIONS.PROJECTS_MILESTONES_MANAGE,
    PERMISSIONS.TIMESHEETS_ENTRIES_READ_OWN,
    PERMISSIONS.TIMESHEETS_ENTRIES_READ_ALL,
    PERMISSIONS.TIMESHEETS_ENTRIES_CREATE,
    PERMISSIONS.TIMESHEETS_ENTRIES_UPDATE_OWN,
    PERMISSIONS.TIMESHEETS_ENTRIES_UPDATE_ALL,
    PERMISSIONS.TIMESHEETS_ENTRIES_APPROVE,
    PERMISSIONS.TIMESHEETS_REPORTS_VIEW,
    PERMISSIONS.BILLING_SUBSCRIPTION_READ,
  ],
  consultant: [
    PERMISSIONS.CRM_COMPANIES_READ,
    PERMISSIONS.CRM_CONTACTS_READ,
    PERMISSIONS.CRM_NOTES_READ,
    PERMISSIONS.CRM_NOTES_CREATE,
    PERMISSIONS.CRM_DOCUMENTS_READ,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.TIMESHEETS_ENTRIES_READ_OWN,
    PERMISSIONS.TIMESHEETS_ENTRIES_CREATE,
    PERMISSIONS.TIMESHEETS_ENTRIES_UPDATE_OWN,
  ],
  sales_rep: [
    PERMISSIONS.CRM_COMPANIES_READ,
    PERMISSIONS.CRM_COMPANIES_CREATE,
    PERMISSIONS.CRM_COMPANIES_UPDATE,
    PERMISSIONS.CRM_CONTACTS_READ,
    PERMISSIONS.CRM_CONTACTS_CREATE,
    PERMISSIONS.CRM_CONTACTS_UPDATE,
    PERMISSIONS.CRM_NOTES_READ,
    PERMISSIONS.CRM_NOTES_CREATE,
    PERMISSIONS.CRM_DOCUMENTS_READ,
    PERMISSIONS.CRM_DOCUMENTS_UPLOAD,
    PERMISSIONS.PIPELINE_DEALS_READ,
    PERMISSIONS.PIPELINE_DEALS_CREATE,
    PERMISSIONS.PIPELINE_DEALS_UPDATE,
    PERMISSIONS.PIPELINE_QUOTES_READ,
    PERMISSIONS.PIPELINE_QUOTES_CREATE,
    PERMISSIONS.PIPELINE_QUOTES_UPDATE,
    PERMISSIONS.PIPELINE_QUOTES_EXPORT,
  ],
  viewer: [
    PERMISSIONS.CRM_COMPANIES_READ,
    PERMISSIONS.CRM_CONTACTS_READ,
    PERMISSIONS.CRM_DOCUMENTS_READ,
  ],
};

// Module → required permissions (any one of these = module access)
export const MODULE_REQUIRED_PERMISSIONS: Record<ModuleKey, Permission[]> = {
  crm: [PERMISSIONS.CRM_COMPANIES_READ],
  pipeline: [PERMISSIONS.PIPELINE_DEALS_READ],
  timesheets: [PERMISSIONS.TIMESHEETS_ENTRIES_READ_OWN],
  projects: [PERMISSIONS.PROJECTS_READ],
};

// Audit action types
export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  VIEW_SENSITIVE: 'VIEW_SENSITIVE',
  EXPORT: 'EXPORT',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  INVITE_SENT: 'INVITE_SENT',
  ROLE_CHANGED: 'ROLE_CHANGED',
  MODULE_ENABLED: 'MODULE_ENABLED',
  MODULE_DISABLED: 'MODULE_DISABLED',
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// Resource types for audit logs
export const RESOURCE_TYPES = {
  COMPANY: 'company',
  CONTACT: 'contact',
  NOTE: 'note',
  DOCUMENT: 'document',
  DEAL: 'deal',
  QUOTE: 'quote',
  PROJECT: 'project',
  MILESTONE: 'milestone',
  TIMESHEET_ENTRY: 'timesheet_entry',
  USER: 'user',
  TENANT: 'tenant',
  SUBSCRIPTION: 'subscription',
} as const;

export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];

// Tenant plan tiers
export const PLAN_TIERS = {
  TRIAL: 'trial',
  STARTER: 'starter',
  GROWTH: 'growth',
  ENTERPRISE: 'enterprise',
} as const;

export type PlanTier = (typeof PLAN_TIERS)[keyof typeof PLAN_TIERS];

// Company types
export const COMPANY_TYPES = {
  CUSTOMER: 'customer',
  PARTNER: 'partner',
  VENDOR: 'vendor',
  SUPPLIER: 'supplier',
} as const;

export type CompanyType = (typeof COMPANY_TYPES)[keyof typeof COMPANY_TYPES];

// Standard payment terms
export const PAYMENT_TERMS = ['net-15', 'net-30', 'net-45', 'net-60', 'net-90', 'due-on-receipt'] as const;
export type PaymentTerm = (typeof PAYMENT_TERMS)[number];

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200,
} as const;

// File upload limits
export const FILE_LIMITS = {
  MAX_SIZE_BYTES: 25 * 1024 * 1024, // 25MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'text/csv',
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg', '.csv'],
} as const;

// Rate limiting windows (milliseconds)
export const RATE_LIMITS = {
  AUTH_LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  AUTH_LOGIN_MAX: 5,
  AUTH_SIGNUP_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  AUTH_SIGNUP_MAX: 3,
  AUTH_RESET_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  AUTH_RESET_MAX: 3,
  API_USER_WINDOW_MS: 60 * 1000, // 1 minute
  API_USER_MAX: 300,
  API_TENANT_WINDOW_MS: 60 * 1000,
  API_TENANT_MAX: 2000,
  API_WRITE_WINDOW_MS: 60 * 1000,
  API_WRITE_MAX: 60,
  API_EXPORT_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  API_EXPORT_MAX: 10,
  UNAUTHENTICATED_WINDOW_MS: 60 * 1000,
  UNAUTHENTICATED_MAX: 20,
} as const;
