import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  date,
  jsonb,
  inet,
  index,
  uniqueIndex,
  check,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ============================================================
// HELPER: Standard audit columns (created/updated by + at)
// ============================================================
const auditColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

const auditByColumns = {
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
};

// ============================================================
// TENANTS
// ============================================================
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    planTier: text('plan_tier').notNull().default('trial'),
    status: text('status').notNull().default('active'),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    settings: jsonb('settings').notNull().default({}),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('tenants_slug_unique').on(table.slug).where(sql`${table.deletedAt} IS NULL`),
    index('tenants_status_idx').on(table.status).where(sql`${table.deletedAt} IS NULL`),
  ],
);

// ============================================================
// USERS
// ============================================================
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    passwordHash: text('password_hash'),
    fullName: text('full_name').notNull(),
    avatarUrl: text('avatar_url'),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    mfaSecret: text('mfa_secret'), // encrypted at application layer
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [index('users_email_idx').on(table.email).where(sql`${table.deletedAt} IS NULL`)],
);

// ============================================================
// USER_TENANT_MEMBERSHIPS
// ============================================================
export const userTenantMemberships = pgTable(
  'user_tenant_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    role: text('role').notNull(),
    status: text('status').notNull().default('active'),
    invitedBy: uuid('invited_by').references(() => users.id),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('memberships_user_tenant_unique').on(table.userId, table.tenantId),
    index('memberships_tenant_status_idx').on(table.tenantId, table.status),
    index('memberships_user_idx').on(table.userId),
  ],
);

// ============================================================
// SUBSCRIPTIONS (Stripe)
// ============================================================
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .unique()
      .references(() => tenants.id),
    stripeCustomerId: text('stripe_customer_id').notNull().unique(),
    stripeSubscriptionId: text('stripe_subscription_id'),
    status: text('status').notNull().default('trialing'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    trialEnd: timestamp('trial_end', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [index('subscriptions_stripe_customer_idx').on(table.stripeCustomerId)],
);

// ============================================================
// TENANT_MODULES (feature flags per tenant)
// ============================================================
export const tenantModules = pgTable(
  'tenant_modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    moduleKey: text('module_key').notNull(),
    enabled: boolean('enabled').notNull().default(false),
    seatLimit: integer('seat_limit'),
    seatsUsed: integer('seats_used').notNull().default(0),
    stripePriceId: text('stripe_price_id'),
    stripeSubscriptionItemId: text('stripe_subscription_item_id'),
    enabledAt: timestamp('enabled_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('tenant_modules_unique').on(table.tenantId, table.moduleKey),
    index('tenant_modules_tenant_idx').on(table.tenantId, table.enabled),
  ],
);

// ============================================================
// USER_MODULE_ACCESS (which users have access to which modules)
// ============================================================
export const userModuleAccess = pgTable(
  'user_module_access',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    moduleKey: text('module_key').notNull(),
    grantedBy: uuid('granted_by').references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('user_module_access_unique').on(table.userId, table.tenantId, table.moduleKey),
  ],
);

// ============================================================
// EMAIL_VERIFICATION_TOKENS
// ============================================================
export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('email_verification_user_idx').on(table.userId)],
);

// ============================================================
// PASSWORD_RESET_TOKENS
// ============================================================
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

// ============================================================
// TENANT_INVITATIONS
// ============================================================
export const tenantInvitations = pgTable(
  'tenant_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    email: text('email').notNull(),
    role: text('role').notNull(),
    tokenHash: text('token_hash').notNull(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('invitations_tenant_email_idx').on(table.tenantId, table.email),
    index('invitations_token_idx').on(table.tokenHash),
  ],
);

// ============================================================
// CRM: COMPANIES
// ============================================================
export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    type: text('type').notNull().default('customer'),
    website: text('website'),
    email: text('email'),
    phone: text('phone'),
    logoUrl: text('logo_url'),
    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    city: text('city'),
    state: text('state'),
    zip: text('zip'),
    country: text('country').notNull().default('US'),
    apContactName: text('ap_contact_name'),
    apContactEmail: text('ap_contact_email'),
    apContactPhone: text('ap_contact_phone'),
    standardTerms: text('standard_terms'),
    metadata: jsonb('metadata').default({}),
    searchVector: text('search_vector'), // populated by DB trigger
    ...auditColumns,
    ...auditByColumns,
  },
  (table) => [
    index('companies_tenant_idx').on(table.tenantId).where(sql`${table.deletedAt} IS NULL`),
    index('companies_name_idx')
      .on(table.tenantId, table.name)
      .where(sql`${table.deletedAt} IS NULL`),
    index('companies_type_idx')
      .on(table.tenantId, table.type)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

// ============================================================
// CRM: CONTACTS
// ============================================================
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    companyId: uuid('company_id').references(() => companies.id),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    mobile: text('mobile'),
    title: text('title'),
    department: text('department'),
    isPrimary: boolean('is_primary').notNull().default(false),
    linkedinUrl: text('linkedin_url'),
    metadata: jsonb('metadata').default({}),
    ...auditColumns,
    ...auditByColumns,
  },
  (table) => [
    index('contacts_tenant_idx').on(table.tenantId).where(sql`${table.deletedAt} IS NULL`),
    index('contacts_company_idx').on(table.companyId).where(sql`${table.deletedAt} IS NULL`),
    index('contacts_email_idx')
      .on(table.tenantId, table.email)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

// ============================================================
// CRM: NOTES
// ============================================================
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    content: text('content').notNull(), // sanitized plaintext on write
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id').notNull(),
    isPinned: boolean('is_pinned').notNull().default(false),
    ...auditColumns,
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
  },
  (table) => [
    index('notes_resource_idx')
      .on(table.tenantId, table.resourceType, table.resourceId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('notes_created_by_idx')
      .on(table.tenantId, table.createdBy)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

// ============================================================
// CRM: DOCUMENTS (metadata only, files in R2)
// ============================================================
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    docType: text('doc_type').notNull().default('other'),
    fileKey: text('file_key').notNull(), // R2 object key
    fileName: text('file_name').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: text('mime_type').notNull(),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    ...auditColumns,
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
  },
  (table) => [
    index('documents_resource_idx')
      .on(table.tenantId, table.resourceType, table.resourceId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

// ============================================================
// PIPELINE: STAGES
// ============================================================
export const pipelineStages = pgTable(
  'pipeline_stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    isWon: boolean('is_won').notNull().default(false),
    isLost: boolean('is_lost').notNull().default(false),
    color: text('color').default('#6b7280'),
    ...auditColumns,
  },
  (table) => [
    index('pipeline_stages_tenant_idx')
      .on(table.tenantId, table.position)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

// ============================================================
// PIPELINE: DEALS
// ============================================================
export const pipelineDeals = pgTable(
  'pipeline_deals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    companyId: uuid('company_id').references(() => companies.id),
    contactId: uuid('contact_id').references(() => contacts.id),
    stageId: uuid('stage_id')
      .notNull()
      .references(() => pipelineStages.id),
    name: text('name').notNull(),
    value: numeric('value', { precision: 15, scale: 2 }),
    currency: text('currency').notNull().default('USD'),
    probability: integer('probability'),
    expectedClose: date('expected_close'),
    actualClose: date('actual_close'),
    ownerId: uuid('owner_id').references(() => users.id),
    status: text('status').notNull().default('open'),
    lostReason: text('lost_reason'),
    metadata: jsonb('metadata').default({}),
    ...auditColumns,
    ...auditByColumns,
  },
  (table) => [
    index('deals_tenant_status_idx')
      .on(table.tenantId, table.status)
      .where(sql`${table.deletedAt} IS NULL`),
    index('deals_stage_idx').on(table.stageId).where(sql`${table.deletedAt} IS NULL`),
    index('deals_owner_idx')
      .on(table.tenantId, table.ownerId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('deals_company_idx').on(table.companyId).where(sql`${table.deletedAt} IS NULL`),
    check('deals_probability_check', sql`${table.probability} BETWEEN 0 AND 100`),
  ],
);

// ============================================================
// PIPELINE: QUOTES
// ============================================================
export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    dealId: uuid('deal_id').references(() => pipelineDeals.id),
    companyId: uuid('company_id').references(() => companies.id),
    quoteNumber: text('quote_number').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull().default('draft'),
    validUntil: date('valid_until'),
    subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull().default('0'),
    discountType: text('discount_type'),
    discountValue: numeric('discount_value', { precision: 15, scale: 2 }),
    taxRate: numeric('tax_rate', { precision: 5, scale: 4 }),
    total: numeric('total', { precision: 15, scale: 2 }).notNull().default('0'),
    currency: text('currency').notNull().default('USD'),
    notes: text('notes'),
    terms: text('terms'),
    ...auditColumns,
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
  },
  (table) => [
    index('quotes_tenant_status_idx')
      .on(table.tenantId, table.status)
      .where(sql`${table.deletedAt} IS NULL`),
    index('quotes_deal_idx').on(table.dealId).where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('quotes_number_unique')
      .on(table.tenantId, table.quoteNumber)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

// ============================================================
// PIPELINE: QUOTE LINE ITEMS
// ============================================================
export const quoteLineItems = pgTable('quote_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quotes.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unit: text('unit'),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ============================================================
// PROJECTS
// ============================================================
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    companyId: uuid('company_id').references(() => companies.id),
    dealId: uuid('deal_id').references(() => pipelineDeals.id),
    name: text('name').notNull(),
    description: text('description'),
    type: text('type').notNull().default('time_and_materials'),
    status: text('status').notNull().default('active'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    budgetHours: numeric('budget_hours', { precision: 10, scale: 2 }),
    budgetAmount: numeric('budget_amount', { precision: 15, scale: 2 }),
    billingRate: numeric('billing_rate', { precision: 10, scale: 2 }),
    managerId: uuid('manager_id').references(() => users.id),
    metadata: jsonb('metadata').default({}),
    ...auditColumns,
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
  },
  (table) => [
    index('projects_tenant_status_idx')
      .on(table.tenantId, table.status)
      .where(sql`${table.deletedAt} IS NULL`),
    index('projects_company_idx').on(table.companyId).where(sql`${table.deletedAt} IS NULL`),
    index('projects_manager_idx')
      .on(table.tenantId, table.managerId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

// ============================================================
// PROJECT TEAM
// ============================================================
export const projectTeam = pgTable(
  'project_team',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role').notNull().default('consultant'),
    billingRate: numeric('billing_rate', { precision: 10, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('project_team_unique').on(table.projectId, table.userId),
    index('project_team_project_idx').on(table.projectId),
    index('project_team_user_idx').on(table.userId),
  ],
);

// ============================================================
// PROJECT MILESTONES
// ============================================================
export const projectMilestones = pgTable(
  'project_milestones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    dueDate: date('due_date'),
    completedDate: date('completed_date'),
    amount: numeric('amount', { precision: 15, scale: 2 }),
    status: text('status').notNull().default('pending'),
    ...auditColumns,
    createdBy: uuid('created_by').references(() => users.id),
  },
  (table) => [
    index('milestones_project_idx')
      .on(table.projectId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

// ============================================================
// TIMESHEET ENTRIES
// ============================================================
export const timesheetEntries = pgTable(
  'timesheet_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    milestoneId: uuid('milestone_id').references(() => projectMilestones.id),
    date: date('date').notNull(),
    hours: numeric('hours', { precision: 5, scale: 2 }).notNull(),
    description: text('description'),
    billingType: text('billing_type').notNull().default('billable'),
    status: text('status').notNull().default('draft'),
    approvedBy: uuid('approved_by').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    locked: boolean('locked').notNull().default(false),
    ...auditColumns,
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
  },
  (table) => [
    index('timesheet_tenant_user_date_idx')
      .on(table.tenantId, table.userId, table.date)
      .where(sql`${table.deletedAt} IS NULL`),
    index('timesheet_project_date_idx')
      .on(table.projectId, table.date)
      .where(sql`${table.deletedAt} IS NULL`),
    index('timesheet_status_idx')
      .on(table.tenantId, table.status)
      .where(sql`${table.deletedAt} IS NULL`),
    check('timesheet_hours_check', sql`${table.hours} > 0 AND ${table.hours} <= 24`),
  ],
);

// ============================================================
// AUDIT LOGS (IMMUTABLE — no soft delete, no updates)
// ============================================================
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id'), // nullable for platform-level events
    actorId: uuid('actor_id'),   // nullable for system events
    actorRole: text('actor_role'),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id').notNull(),
    resourceName: text('resource_name'),
    changes: jsonb('changes'), // { before: {...}, after: {...} }
    metadata: jsonb('metadata'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    requestId: text('request_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    // NO updatedAt, NO deletedAt — audit logs are immutable
  },
  (table) => [
    index('audit_tenant_created_idx').on(table.tenantId, table.createdAt),
    index('audit_actor_created_idx').on(table.actorId, table.createdAt),
    index('audit_resource_idx').on(table.resourceType, table.resourceId),
  ],
);

// ============================================================
// STRIPE WEBHOOK EVENTS (deduplication)
// ============================================================
export const stripeWebhookEvents = pgTable(
  'stripe_webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stripeEventId: text('stripe_event_id').notNull().unique(),
    type: text('type').notNull(),
    processed: boolean('processed').notNull().default(false),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    error: text('error'),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('stripe_events_processed_idx').on(table.processed, table.createdAt)],
);

// ============================================================
// EXPORT JOBS (async PDF/CSV generation)
// ============================================================
export const exportJobs = pgTable(
  'export_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id').notNull(),
    format: text('format').notNull(),
    status: text('status').notNull().default('queued'),
    fileKey: text('file_key'), // R2 key when complete
    error: text('error'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('export_jobs_tenant_idx').on(table.tenantId, table.status),
    index('export_jobs_user_idx').on(table.userId),
  ],
);

// ============================================================
// RELATIONS
// ============================================================
export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  memberships: many(userTenantMemberships),
  subscription: one(subscriptions),
  modules: many(tenantModules),
  companies: many(companies),
  contacts: many(contacts),
  deals: many(pipelineDeals),
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(userTenantMemberships),
  projectTeam: many(projectTeam),
  timesheetEntries: many(timesheetEntries),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  tenant: one(tenants, { fields: [companies.tenantId], references: [tenants.id] }),
  contacts: many(contacts),
  notes: many(notes),
  documents: many(documents),
  deals: many(pipelineDeals),
  projects: many(projects),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  tenant: one(tenants, { fields: [contacts.tenantId], references: [tenants.id] }),
  company: one(companies, { fields: [contacts.companyId], references: [companies.id] }),
}));

export const pipelineDealsRelations = relations(pipelineDeals, ({ one, many }) => ({
  tenant: one(tenants, { fields: [pipelineDeals.tenantId], references: [tenants.id] }),
  company: one(companies, { fields: [pipelineDeals.companyId], references: [companies.id] }),
  contact: one(contacts, { fields: [pipelineDeals.contactId], references: [contacts.id] }),
  stage: one(pipelineStages, { fields: [pipelineDeals.stageId], references: [pipelineStages.id] }),
  quotes: many(quotes),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  tenant: one(tenants, { fields: [projects.tenantId], references: [tenants.id] }),
  company: one(companies, { fields: [projects.companyId], references: [companies.id] }),
  deal: one(pipelineDeals, { fields: [projects.dealId], references: [pipelineDeals.id] }),
  team: many(projectTeam),
  milestones: many(projectMilestones),
  timesheetEntries: many(timesheetEntries),
}));

export const timesheetEntriesRelations = relations(timesheetEntries, ({ one }) => ({
  tenant: one(tenants, { fields: [timesheetEntries.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [timesheetEntries.userId], references: [users.id] }),
  project: one(projects, { fields: [timesheetEntries.projectId], references: [projects.id] }),
  milestone: one(projectMilestones, {
    fields: [timesheetEntries.milestoneId],
    references: [projectMilestones.id],
  }),
}));

// ============================================================
// TYPE EXPORTS (inferred from schema)
// ============================================================
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserTenantMembership = typeof userTenantMemberships.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type TenantModule = typeof tenantModules.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type PipelineDeal = typeof pipelineDeals.$inferSelect;
export type NewPipelineDeal = typeof pipelineDeals.$inferInsert;
export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
export type QuoteLineItem = typeof quoteLineItems.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectTeamMember = typeof projectTeam.$inferSelect;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type TimesheetEntry = typeof timesheetEntries.$inferSelect;
export type NewTimesheetEntry = typeof timesheetEntries.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type ExportJob = typeof exportJobs.$inferSelect;
