'use client';

import { useState, useEffect } from 'react';
import { Plus, Filter, Search } from 'lucide-react';
import { StatCard } from '../../../components/ui/stat-card';
import { Button } from '../../../components/ui/button';
import { apiClient } from '../../../lib/api-client';
import { PipelineKanban } from './components/pipeline-kanban';
import { DealFormModal } from './components/deal-form-modal';
import { PipelineSelector } from './components/pipeline-selector';
import type {
  PipelineWithStages,
  DealWithRelations,
  PaginatedResponse,
} from '../../../types/pipeline';

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineWithStages | null>(null);
  const [deals, setDeals] = useState<DealWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDealModal, setShowDealModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      fetchDeals();
    }
  }, [selectedPipeline, searchQuery]);

  const fetchPipelines = async () => {
    try {
      const response = await apiClient.get<PipelineWithStages[]>('/pipelines');
      setPipelines(response.data);
      // Select default or first pipeline
      const defaultPipeline = response.data.find((p) => p.isDefault) || response.data[0];
      if (defaultPipeline) {
        setSelectedPipeline(defaultPipeline);
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
    }
  };

  const fetchDeals = async () => {
    if (!selectedPipeline) return;

    setLoading(true);
    try {
      const response = await apiClient.get<PaginatedResponse<DealWithRelations>>('/deals', {
        params: {
          pipelineId: selectedPipeline.id,
          // Removed status filter to show all deals including closed won/lost
          search: searchQuery || undefined,
          limit: 100,
        },
      });
      setDeals(response.data.data);
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDealCreated = () => {
    setShowDealModal(false);
    fetchDeals();
  };

  const handleDealMoved = () => {
    fetchDeals();
  };

  // Calculate stats (only for open deals)
  const openDealsOnly = deals.filter((d) => d.status === 'open');
  const openDeals = openDealsOnly.length;
  const pipelineValue = openDealsOnly.reduce((sum, deal) => {
    return sum + (deal.value ? parseFloat(deal.value) : 0);
  }, 0);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Pipeline</h1>
            <p className="mt-0.5 text-sm text-neutral-500">Track deals through your sales stages</p>
          </div>
          <div className="flex items-center gap-3">
            <PipelineSelector
              pipelines={pipelines}
              selected={selectedPipeline}
              onSelect={setSelectedPipeline}
            />
            <Button size="sm" onClick={() => setShowDealModal(true)}>
              <Plus className="h-4 w-4" />
              New Deal
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
        <StatCard
          title="Open Deals"
          value={openDeals.toString()}
          iconColor="primary"
        />
        <StatCard
          title="Pipeline Value"
          value={`$${(pipelineValue / 1000).toFixed(0)}K`}
          iconColor="success"
        />
        <StatCard
          title="Weighted Value"
          value={`$${(
            openDealsOnly.reduce((sum, deal) => {
              const value = deal.value ? parseFloat(deal.value) : 0;
              const probability = deal.probability || 0;
              return sum + (value * probability) / 100;
            }, 0) / 1000
          ).toFixed(0)}K`}
          iconColor="secondary"
        />
        <StatCard
          title="Avg. Probability"
          value={`${Math.round(
            openDealsOnly.reduce((sum, deal) => sum + (deal.probability || 0), 0) / (openDealsOnly.length || 1)
          )}%`}
          iconColor="warning"
        />
      </div>

      {/* Kanban Board */}
      {selectedPipeline && (
        <PipelineKanban
          pipeline={selectedPipeline}
          deals={deals}
          loading={loading}
          onDealMoved={handleDealMoved}
        />
      )}

      {/* Modals */}
      {showDealModal && selectedPipeline && (
        <DealFormModal
          pipeline={selectedPipeline}
          onClose={() => setShowDealModal(false)}
          onSuccess={handleDealCreated}
        />
      )}
    </div>
  );
}
