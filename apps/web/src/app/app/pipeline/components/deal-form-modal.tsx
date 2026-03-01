'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Building2, User, Tag } from 'lucide-react';
import { Modal } from '../../../../components/ui/modal';
import { Button } from '../../../../components/ui/button';
import { SearchableSelect, type SearchableSelectOption } from '../../../../components/ui/searchable-select';
import { apiClient } from '../../../../lib/api-client';
import type {
  PipelineWithStages,
  DealWithRelations,
  CreateDealInput,
  DealSource,
  DealType,
  ForecastCategory,
} from '../../../../types/pipeline';

interface DealFormModalProps {
  pipeline: PipelineWithStages;
  deal?: DealWithRelations; // If provided, we're in edit mode
  onClose: () => void;
  onSuccess: () => void;
}

const SOURCES: Array<{ value: DealSource; label: string }> = [
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'referral', label: 'Referral' },
  { value: 'partner', label: 'Partner' },
];

const DEAL_TYPES: Array<{ value: DealType; label: string }> = [
  { value: 'new_business', label: 'New Business' },
  { value: 'expansion', label: 'Expansion' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'churn_recovery', label: 'Churn Recovery' },
];

const FORECAST_CATEGORIES: Array<{ value: ForecastCategory; label: string }> = [
  { value: 'commit', label: 'Commit' },
  { value: 'best_case', label: 'Best Case' },
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'omitted', label: 'Omitted' },
];

export function DealFormModal({ pipeline, deal, onClose, onSuccess }: DealFormModalProps) {
  const isEditMode = !!deal;
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<SearchableSelectOption[]>([]);
  const [formData, setFormData] = useState<CreateDealInput>({
    pipelineId: deal?.pipelineId || pipeline.id,
    stageId: deal?.stageId || pipeline.stages[0]?.id || '',
    name: deal?.name || '',
    companyId: deal?.company?.id,
    value: deal?.value ? parseFloat(deal.value) : undefined,
    currency: deal?.currency || 'USD',
    expectedClose: deal?.expectedClose || '',
    source: deal?.source,
    dealType: deal?.dealType,
    forecastCategory: deal?.forecastCategory,
    nextStepDescription: deal?.nextStepDescription,
  });

  // Fetch companies for dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await apiClient.get<{ data: Array<{ id: string; name: string }> }>('/companies', {
          params: { limit: 1000 },
        });
        const companyOptions = response.data.data
          .map((company) => ({
            value: company.id,
            label: company.name,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setCompanies(companyOptions);
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      }
    };
    fetchCompanies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditMode) {
        await apiClient.patch(`/deals/${deal.id}`, formData);
      } else {
        await apiClient.post('/deals', formData);
      }
      onSuccess();
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} deal:`, error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} deal. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof CreateDealInput>(key: K, value: CreateDealInput[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal open onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            {isEditMode ? 'Edit Deal' : 'New Deal'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* Deal Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Deal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., Acme Corp - Enterprise Plan"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {/* Company */}
          <SearchableSelect
            label="Company"
            options={companies}
            value={formData.companyId}
            onChange={(value) => updateField('companyId', value)}
            placeholder="Select a company..."
            emptyMessage="No companies found. Create one in the Accounts module first."
            allowClear
          />

          {/* Stage */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Stage <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.stageId}
              onChange={(e) => updateField('stageId', e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {pipeline.stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          {/* Value and Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Deal Value
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.value || ''}
                onChange={(e) => updateField('value', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => updateField('currency', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Expected Close Date */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              <Calendar className="inline h-4 w-4 mr-1" />
              Expected Close Date
            </label>
            <input
              type="date"
              value={formData.expectedClose}
              onChange={(e) => updateField('expectedClose', e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {/* Source and Deal Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                <Tag className="inline h-4 w-4 mr-1" />
                Source
              </label>
              <select
                value={formData.source || ''}
                onChange={(e) => updateField('source', e.target.value as DealSource || undefined)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="">Select source...</option>
                {SOURCES.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Deal Type</label>
              <select
                value={formData.dealType || ''}
                onChange={(e) => updateField('dealType', e.target.value as DealType || undefined)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="">Select type...</option>
                {DEAL_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Forecast Category */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Forecast Category
            </label>
            <select
              value={formData.forecastCategory || ''}
              onChange={(e) => updateField('forecastCategory', e.target.value as ForecastCategory || undefined)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Select category...</option>
              {FORECAST_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Next Step */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Next Step</label>
            <textarea
              value={formData.nextStepDescription || ''}
              onChange={(e) => updateField('nextStepDescription', e.target.value)}
              rows={3}
              placeholder="What's the next action to move this deal forward?"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !formData.name}>
            {loading
              ? (isEditMode ? 'Updating...' : 'Creating...')
              : (isEditMode ? 'Update Deal' : 'Create Deal')
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}
