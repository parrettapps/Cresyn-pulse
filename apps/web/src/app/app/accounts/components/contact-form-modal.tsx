'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { apiClient } from '@/lib/api-client';
import type { Contact, ContactFormData, Company, PaginatedResponse } from '@/types/crm';

interface ContactFormModalProps {
  open: boolean;
  onClose: () => void;
  contact?: Contact | null;
  onSuccess: () => void;
}

export function ContactFormModal({ open, onClose, contact, onSuccess }: ContactFormModalProps) {
  const isEditMode = !!contact;

  const [formData, setFormData] = useState<ContactFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    title: '',
    department: '',
    companyId: undefined,
    isPrimary: false,
  });

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens or contact changes
  useEffect(() => {
    if (open) {
      setFormData({
        firstName: contact?.firstName ?? '',
        lastName: contact?.lastName ?? '',
        email: contact?.email ?? '',
        phone: contact?.phone ?? '',
        mobile: contact?.mobile ?? '',
        title: contact?.title ?? '',
        department: contact?.department ?? '',
        companyId: contact?.companyId ?? undefined,
        isPrimary: contact?.isPrimary ?? false,
      });
      setErrors({});
      fetchCompanies();
    }
  }, [open, contact]);

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const response = await apiClient.get<PaginatedResponse<Company>>('/companies', {
        params: { limit: 500 }, // Increased limit to get all companies
      });
      setCompanies(response.data.data);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Prepare company options sorted alphabetically
  const companyOptions = useMemo(() => {
    return companies
      .map((company) => ({
        value: company.id,
        label: company.name,
        description: `${company.companyCode} • ${company.city ? `${company.city}, ` : ''}${company.state || ''}`.trim(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [companies]);

  const handleChange = (field: keyof ContactFormData, value: string | boolean | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (isEditMode) {
        await apiClient.patch(`/contacts/${contact.id}`, formData);
      } else {
        await apiClient.post('/contacts', formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      // Handle validation errors
      if (err.response?.data?.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const error of err.response.data.errors) {
          fieldErrors[error.field] = error.message;
        }
        setErrors(fieldErrors);
      } else {
        setErrors({ general: err.response?.data?.detail ?? 'An error occurred' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <ModalHeader
          title={isEditMode ? 'Edit Contact' : 'Add Contact'}
          description={
            isEditMode
              ? `Update details for ${contact.firstName} ${contact.lastName}`
              : 'Create a new contact in your CRM'
          }
          onClose={onClose}
        />

        <ModalBody>
          {/* General error */}
          {errors.general && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* First Name */}
            <Input
              label="First Name"
              id="firstName"
              required
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              error={errors.firstName}
              placeholder="John"
            />

            {/* Last Name */}
            <Input
              label="Last Name"
              id="lastName"
              required
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              error={errors.lastName}
              placeholder="Doe"
            />

            {/* Email */}
            <Input
              label="Email"
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              placeholder="john.doe@company.com"
            />

            {/* Phone */}
            <Input
              label="Phone"
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              error={errors.phone}
              placeholder="(555) 123-4567"
            />

            {/* Mobile */}
            <Input
              label="Mobile"
              id="mobile"
              type="tel"
              value={formData.mobile}
              onChange={(e) => handleChange('mobile', e.target.value)}
              error={errors.mobile}
              placeholder="(555) 987-6543"
            />

            {/* Title */}
            <Input
              label="Job Title"
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={errors.title}
              placeholder="Sales Manager"
            />

            {/* Department */}
            <Input
              label="Department"
              id="department"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              error={errors.department}
              placeholder="Sales"
            />

            {/* Company */}
            <SearchableSelect
              label="Company"
              options={companyOptions}
              value={formData.companyId}
              onChange={(value) => handleChange('companyId', value)}
              placeholder={loadingCompanies ? 'Loading companies...' : 'Search companies...'}
              disabled={loadingCompanies}
              error={errors.companyId}
              emptyMessage="No companies found"
              allowClear
            />

            {/* Primary Contact */}
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={formData.isPrimary}
                onChange={(e) => handleChange('isPrimary', e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <label htmlFor="isPrimary" className="text-sm font-medium text-neutral-700">
                Primary contact for company
              </label>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEditMode ? 'Save Changes' : 'Create Contact'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
