import { z } from 'zod';

// ============================================================
// CUSTOM VALIDATORS
// ============================================================

// URL validator that auto-prepends https:// if no protocol provided
const urlSchema = z
  .string()
  .transform((val) => {
    if (!val || val === '') return '';
    // If no protocol, prepend https://
    if (!/^https?:\/\//i.test(val)) {
      return `https://${val}`;
    }
    return val;
  })
  .refine(
    (val) => {
      if (val === '') return true;
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid URL format' }
  )
  .optional()
  .or(z.literal(''));

// ============================================================
// COMPANY VALIDATION SCHEMAS
// ============================================================

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  type: z.enum(['customer', 'partner', 'vendor', 'supplier']).default('customer'),
  website: urlSchema,
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().length(2, 'Country must be 2-letter code').default('US'),
  apContactName: z.string().max(255).optional(),
  apContactEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
  apContactPhone: z.string().max(50).optional(),
  standardTerms: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const listCompaniesSchema = z.object({
  type: z.enum(['customer', 'partner', 'vendor', 'supplier']).optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
});

// ============================================================
// CONTACT VALIDATION SCHEMAS
// ============================================================

export const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  companyId: z.string().uuid('Invalid company ID').optional(),
  isPrimary: z.boolean().default(false),
  linkedinUrl: urlSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const listContactsSchema = z.object({
  companyId: z.string().uuid('Invalid company ID').optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
});

// ============================================================
// SHARED SCHEMAS
// ============================================================

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// Type exports for convenience
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type ListCompaniesQuery = z.infer<typeof listCompaniesSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ListContactsQuery = z.infer<typeof listContactsSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
