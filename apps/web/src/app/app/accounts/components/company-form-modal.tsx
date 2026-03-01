'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import type { Company, CompanyFormData, CompanyType } from '@/types/crm';

interface CompanyFormModalProps {
  open: boolean;
  onClose: () => void;
  company?: Company | null;
  onSuccess: () => void;
}

export function CompanyFormModal({ open, onClose, company, onSuccess }: CompanyFormModalProps) {
  const isEditMode = !!company;

  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    type: 'customer',
    email: '',
    phone: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    standardTerms: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens or company changes
  useEffect(() => {
    if (open) {
      setFormData({
        name: company?.name ?? '',
        type: company?.type ?? 'customer',
        email: company?.email ?? '',
        phone: company?.phone ?? '',
        website: company?.website ?? '',
        addressLine1: company?.addressLine1 ?? '',
        addressLine2: company?.addressLine2 ?? '',
        city: company?.city ?? '',
        state: company?.state ?? '',
        zip: company?.zip ?? '',
        country: company?.country ?? 'US',
        standardTerms: company?.standardTerms ?? '',
      });
      setErrors({});
    }
  }, [open, company]);

  const handleChange = (field: keyof CompanyFormData, value: string) => {
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
        await apiClient.patch(`/companies/${company.id}`, formData);
      } else {
        await apiClient.post('/companies', formData);
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
          title={isEditMode ? 'Edit Company' : 'Add Company'}
          description={
            isEditMode
              ? `Update details for ${company.name}`
              : 'Create a new company in your CRM'
          }
          onClose={onClose}
        />

        <ModalBody>
          {/* Display company code in edit mode */}
          {isEditMode && company.companyCode && (
            <div className="mb-4 rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-3">
              <div className="text-xs font-medium text-neutral-500 mb-1">Company Code</div>
              <div className="font-mono text-sm text-neutral-900">{company.companyCode}</div>
            </div>
          )}

          {/* General error */}
          {errors.general && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <Input
              label="Company Name"
              id="name"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={errors.name}
              placeholder="Acme Corporation"
            />

            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="type" className="text-sm font-medium text-neutral-700">
                Type
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value as CompanyType)}
                className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-400 focus:ring-primary-500/20"
              >
                <option value="customer">Customer</option>
                <option value="partner">Partner</option>
                <option value="vendor">Vendor</option>
                <option value="supplier">Supplier</option>
              </select>
              {errors.type && <p className="text-xs text-red-600">{errors.type}</p>}
            </div>

            {/* Email */}
            <Input
              label="Email"
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              placeholder="contact@acme.com"
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

            {/* Website */}
            <div className="col-span-2">
              <Input
                label="Website"
                id="website"
                type="text"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                error={errors.website}
                placeholder="www.acme.com"
              />
            </div>

            {/* Address Line 1 */}
            <div className="col-span-2">
              <Input
                label="Address Line 1"
                id="addressLine1"
                value={formData.addressLine1}
                onChange={(e) => handleChange('addressLine1', e.target.value)}
                error={errors.addressLine1}
                placeholder="123 Main Street"
              />
            </div>

            {/* Address Line 2 */}
            <div className="col-span-2">
              <Input
                label="Address Line 2"
                id="addressLine2"
                value={formData.addressLine2}
                onChange={(e) => handleChange('addressLine2', e.target.value)}
                error={errors.addressLine2}
                placeholder="Suite 100"
              />
            </div>

            {/* City, State, Zip */}
            <Input
              label="City"
              id="city"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              error={errors.city}
              placeholder="San Francisco"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="State"
                id="state"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                error={errors.state}
                placeholder="CA"
              />

              <Input
                label="ZIP"
                id="zip"
                value={formData.zip}
                onChange={(e) => handleChange('zip', e.target.value)}
                error={errors.zip}
                placeholder="94102"
              />
            </div>

            {/* Payment Terms */}
            <div className="col-span-2">
              <Input
                label="Payment Terms"
                id="standardTerms"
                value={formData.standardTerms}
                onChange={(e) => handleChange('standardTerms', e.target.value)}
                error={errors.standardTerms}
                placeholder="e.g., net-30, net-60"
                hint="Standard payment terms for this company"
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEditMode ? 'Save Changes' : 'Create Company'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
