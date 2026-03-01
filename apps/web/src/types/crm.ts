// ============================================================
// CRM TYPE DEFINITIONS
// ============================================================

export type CompanyType = 'customer' | 'partner' | 'vendor' | 'supplier';

export interface Company {
  id: string;
  tenantId: string;
  name: string;
  companyCode: string | null;
  type: CompanyType;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country: string;
  apContactName?: string | null;
  apContactEmail?: string | null;
  apContactPhone?: string | null;
  standardTerms?: string | null;
  metadata?: Record<string, unknown>;
  searchVector?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface Contact {
  id: string;
  tenantId: string;
  companyId?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  title?: string | null;
  department?: string | null;
  isPrimary: boolean;
  linkedinUrl?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
}

// Form data types (subset for create/edit)
export interface CompanyFormData {
  name: string;
  type?: CompanyType | undefined;
  website?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  addressLine1?: string | undefined;
  addressLine2?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  zip?: string | undefined;
  country?: string | undefined;
  apContactName?: string | undefined;
  apContactEmail?: string | undefined;
  apContactPhone?: string | undefined;
  standardTerms?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email?: string | undefined;
  phone?: string | undefined;
  mobile?: string | undefined;
  title?: string | undefined;
  department?: string | undefined;
  companyId?: string | undefined;
  isPrimary?: boolean | undefined;
  linkedinUrl?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    cursor?: string;
  };
}

// Statistics
export interface CompanyStats {
  total: number;
  byType: {
    customer: number;
    partner: number;
    vendor: number;
    supplier: number;
  };
  recentCount: number;
}
