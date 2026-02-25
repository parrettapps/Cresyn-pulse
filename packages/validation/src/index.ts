import { z } from 'zod';
import {
  COMPANY_TYPES,
  PAYMENT_TERMS,
  ROLES,
  FILE_LIMITS,
  PAGINATION,
} from '@cresyn/config';

// ============================================================
// COMMON PRIMITIVES
// ============================================================
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email().max(255).toLowerCase().trim();
export const urlSchema = z.string().url().max(2048).optional();
export const phoneSchema = z.string().max(50).trim().optional();
export const cursorSchema = z.string().base64().optional();

// ============================================================
// PAGINATION
// ============================================================
export const paginationSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  cursor: cursorSchema,
});

// ============================================================
// AUTH SCHEMAS
// ============================================================
export const signupSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password too long'),
  fullName: z.string().min(2, 'Name too short').max(255).trim(),
  tenantName: z.string().min(2, 'Company name too short').max(255).trim(),
  tenantSlug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .trim(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  totpCode: z.string().length(6).optional(),
});

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(512),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password too long'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1).max(512),
});

// ============================================================
// TENANT SCHEMAS
// ============================================================
export const updateTenantSettingsSchema = z.object({
  name: z.string().min(2).max(255).trim().optional(),
  settings: z
    .object({
      timezone: z.string().max(50).optional(),
      dateFormat: z.string().max(20).optional(),
      defaultCurrency: z.string().length(3).optional(),
    })
    .optional(),
});

// ============================================================
// USER SCHEMAS
// ============================================================
export const inviteUserSchema = z.object({
  email: emailSchema,
  role: z.enum([
    ROLES.TENANT_ADMIN,
    ROLES.MANAGER,
    ROLES.CONSULTANT,
    ROLES.SALES_REP,
    ROLES.VIEWER,
  ]),
});

export const updateUserRoleSchema = z.object({
  role: z.enum([
    ROLES.TENANT_ADMIN,
    ROLES.MANAGER,
    ROLES.CONSULTANT,
    ROLES.SALES_REP,
    ROLES.VIEWER,
  ]),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(255).trim().optional(),
  avatarUrl: urlSchema,
});

// ============================================================
// COMPANY SCHEMAS
// ============================================================
export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255).trim(),
  type: z.enum([
    COMPANY_TYPES.CUSTOMER,
    COMPANY_TYPES.PARTNER,
    COMPANY_TYPES.VENDOR,
    COMPANY_TYPES.SUPPLIER,
  ]),
  website: urlSchema,
  email: emailSchema.optional(),
  phone: phoneSchema,
  addressLine1: z.string().max(255).trim().optional(),
  addressLine2: z.string().max(255).trim().optional(),
  city: z.string().max(100).trim().optional(),
  state: z.string().max(100).trim().optional(),
  zip: z.string().max(20).trim().optional(),
  country: z.string().length(2).default('US'),
  apContactName: z.string().max(255).trim().optional(),
  apContactEmail: emailSchema.optional(),
  apContactPhone: phoneSchema,
  standardTerms: z.enum(PAYMENT_TERMS).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const listCompaniesSchema = paginationSchema.extend({
  type: z
    .enum([COMPANY_TYPES.CUSTOMER, COMPANY_TYPES.PARTNER, COMPANY_TYPES.VENDOR, COMPANY_TYPES.SUPPLIER])
    .optional(),
  search: z.string().max(255).trim().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('name'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

// ============================================================
// CONTACT SCHEMAS
// ============================================================
export const createContactSchema = z.object({
  companyId: uuidSchema.optional(),
  firstName: z.string().min(1).max(255).trim(),
  lastName: z.string().min(1).max(255).trim(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  mobile: phoneSchema,
  title: z.string().max(255).trim().optional(),
  department: z.string().max(255).trim().optional(),
  isPrimary: z.boolean().default(false),
  linkedinUrl: urlSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const updateContactSchema = createContactSchema.partial();

// ============================================================
// NOTE SCHEMAS
// ============================================================
export const createNoteSchema = z.object({
  content: z
    .string()
    .min(1, 'Note content cannot be empty')
    .max(50_000, 'Note content too long')
    .trim(),
  resourceType: z.enum(['company', 'contact', 'deal', 'project']),
  resourceId: uuidSchema,
  isPinned: z.boolean().default(false),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1).max(50_000).trim().optional(),
  isPinned: z.boolean().optional(),
});

// ============================================================
// PIPELINE SCHEMAS
// ============================================================
export const createStageSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  position: z.number().int().min(0),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .default('#6b7280'),
});

export const createDealSchema = z.object({
  companyId: uuidSchema.optional(),
  contactId: uuidSchema.optional(),
  stageId: uuidSchema,
  name: z.string().min(1).max(255).trim(),
  value: z.coerce.number().min(0).max(999_999_999).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedClose: z.string().date().optional(),
  ownerId: uuidSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateDealSchema = createDealSchema.partial().extend({
  status: z.enum(['open', 'won', 'lost']).optional(),
  lostReason: z.string().max(1000).trim().optional(),
  actualClose: z.string().date().optional(),
});

// ============================================================
// QUOTE SCHEMAS
// ============================================================
export const quoteLineItemSchema = z.object({
  description: z.string().min(1).max(1000).trim(),
  quantity: z.coerce.number().min(0.01).max(999_999),
  unit: z.string().max(50).trim().optional(),
  unitPrice: z.coerce.number().min(0).max(999_999_999),
});

export const createQuoteSchema = z.object({
  dealId: uuidSchema.optional(),
  companyId: uuidSchema.optional(),
  title: z.string().min(1).max(255).trim(),
  validUntil: z.string().date().optional(),
  discountType: z.enum(['percent', 'fixed']).optional(),
  discountValue: z.coerce.number().min(0).max(100).optional(),
  taxRate: z.coerce.number().min(0).max(1).optional(),
  notes: z.string().max(5000).trim().optional(),
  terms: z.string().max(5000).trim().optional(),
  lineItems: z.array(quoteLineItemSchema).min(1, 'At least one line item required').max(100),
});

export const updateQuoteSchema = createQuoteSchema.partial();

export const updateQuoteStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'declined', 'expired']),
});

// ============================================================
// PROJECT SCHEMAS
// ============================================================
export const createProjectSchema = z.object({
  companyId: uuidSchema.optional(),
  dealId: uuidSchema.optional(),
  name: z.string().min(1).max(255).trim(),
  description: z.string().max(5000).trim().optional(),
  type: z.enum(['time_and_materials', 'milestone', 'fixed_fee']),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  budgetHours: z.coerce.number().min(0).max(99_999).optional(),
  budgetAmount: z.coerce.number().min(0).max(999_999_999).optional(),
  billingRate: z.coerce.number().min(0).max(99_999).optional(),
  managerId: uuidSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
});

export const createMilestoneSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  description: z.string().max(5000).trim().optional(),
  dueDate: z.string().date().optional(),
  amount: z.coerce.number().min(0).max(999_999_999).optional(),
});

export const updateMilestoneSchema = createMilestoneSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'invoiced']).optional(),
  completedDate: z.string().date().optional(),
});

export const addTeamMemberSchema = z.object({
  userId: uuidSchema,
  role: z.enum(['manager', 'consultant']),
  billingRate: z.coerce.number().min(0).max(99_999).optional(),
});

// ============================================================
// TIMESHEET SCHEMAS
// ============================================================
export const createTimesheetEntrySchema = z
  .object({
    projectId: uuidSchema,
    milestoneId: uuidSchema.optional(),
    date: z.string().date(),
    hours: z.coerce
      .number()
      .min(0.25, 'Minimum 0.25 hours (15 minutes)')
      .max(24, 'Cannot exceed 24 hours per entry'),
    description: z.string().max(1000).trim().optional(),
    billingType: z.enum(['billable', 'non_billable', 'internal']).default('billable'),
  })
  .refine(
    (data) => {
      // No future-dated entries
      const entryDate = new Date(data.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return entryDate <= today;
    },
    { message: 'Cannot log time for future dates', path: ['date'] },
  );

export const updateTimesheetEntrySchema = z.object({
  hours: z.coerce.number().min(0.25).max(24).optional(),
  description: z.string().max(1000).trim().optional(),
  billingType: z.enum(['billable', 'non_billable', 'internal']).optional(),
});

export const approveTimesheetSchema = z.object({
  entryIds: z.array(uuidSchema).min(1).max(100),
  action: z.enum(['approve', 'reject']),
  note: z.string().max(500).trim().optional(),
});

export const listTimesheetEntriesSchema = paginationSchema.extend({
  userId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

// ============================================================
// EXPORT TYPE HELPERS
// ============================================================
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type CreateDealInput = z.infer<typeof createDealSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateTimesheetEntryInput = z.infer<typeof createTimesheetEntrySchema>;
export type UpdateTimesheetEntryInput = z.infer<typeof updateTimesheetEntrySchema>;
