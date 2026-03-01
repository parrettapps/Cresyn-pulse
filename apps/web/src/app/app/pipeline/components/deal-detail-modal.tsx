'use client';

import { useState } from 'react';
import { X, DollarSign, Calendar, Building2, User, Tag, Clock, Trash2 } from 'lucide-react';
import { Modal } from '../../../../components/ui/modal';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Avatar } from '../../../../components/ui/avatar';
import { apiClient } from '../../../../lib/api-client';
import type { DealWithRelations } from '../../../../types/pipeline';

interface DealDetailModalProps {
  deal: DealWithRelations;
  onClose: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}

export function DealDetailModal({ deal, onClose, onEdit, onDelete }: DealDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const value = deal.value ? parseFloat(deal.value) : 0;
  const probability = deal.probability || 0;
  const weightedValue = (value * probability) / 100;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/deals/${deal.id}`);
      onDelete?.();
      onClose();
    } catch (error) {
      console.error('Failed to delete deal:', error);
      alert('Failed to delete deal. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="xl">
      <div className="flex h-[80vh] flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-neutral-900 mb-1">{deal.name}</h2>
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  deal.status === 'open'
                    ? 'primary'
                    : deal.status === 'closed_won'
                      ? 'success'
                      : 'neutral'
                }
              >
                {deal.status === 'open'
                  ? 'Open'
                  : deal.status === 'closed_won'
                    ? 'Won'
                    : 'Lost'}
              </Badge>
              <span
                className="inline-flex items-center gap-1.5 text-sm text-neutral-600"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: deal.stage.color }}
                />
                {deal.stage.name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-6 p-6">
            {/* Main Column */}
            <div className="col-span-2 space-y-6">
              {/* Company */}
              {deal.company && (
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                    Company
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                      <Building2 className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">{deal.company.name}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Deal Value */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                    Deal Value
                  </label>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-semibold text-neutral-900">
                      ${(value / 1000).toFixed(0)}K
                    </span>
                    <span className="text-sm text-neutral-500">{deal.currency}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                    Probability
                  </label>
                  <div className="text-2xl font-semibold text-neutral-900">{probability}%</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                    Weighted Value
                  </label>
                  <div className="text-2xl font-semibold text-primary-600">
                    ${(weightedValue / 1000).toFixed(0)}K
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                    Expected Close
                  </label>
                  <div className="flex items-center gap-2 text-neutral-900">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    {deal.expectedClose
                      ? new Date(deal.expectedClose).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Not set'}
                  </div>
                </div>
                {deal.actualClose && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                      Actual Close
                    </label>
                    <div className="flex items-center gap-2 text-neutral-900">
                      <Calendar className="h-4 w-4 text-neutral-400" />
                      {new Date(deal.actualClose).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Classification */}
              <div className="grid grid-cols-2 gap-4">
                {deal.source && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                      Source
                    </label>
                    <Badge variant="secondary">{deal.source}</Badge>
                  </div>
                )}
                {deal.dealType && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                      Deal Type
                    </label>
                    <Badge variant="neutral">{deal.dealType.replace('_', ' ')}</Badge>
                  </div>
                )}
              </div>

              {/* Forecast Category */}
              {deal.forecastCategory && (
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                    Forecast Category
                  </label>
                  <Badge
                    variant={
                      deal.forecastCategory === 'commit'
                        ? 'success'
                        : deal.forecastCategory === 'best_case'
                          ? 'primary'
                          : 'neutral'
                    }
                  >
                    {deal.forecastCategory === 'best_case' ? 'Best Case' : deal.forecastCategory}
                  </Badge>
                </div>
              )}

              {/* Next Step */}
              {deal.nextStepDescription && (
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                    Next Step
                  </label>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-sm text-neutral-700">{deal.nextStepDescription}</p>
                    {deal.nextStepDueDate && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
                        <Clock className="h-3.5 w-3.5" />
                        Due {new Date(deal.nextStepDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Lost Reason */}
              {deal.lostReason && (
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                    Lost Reason
                  </label>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-700">{deal.lostReason}</p>
                  </div>
                </div>
              )}

              {/* Activity Placeholder */}
              <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                  Activity Timeline
                </label>
                <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-center">
                  <p className="text-sm text-neutral-400">Activity timeline coming soon</p>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Owner */}
              {deal.owner && (
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                    Deal Owner
                  </label>
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={deal.owner.avatarUrl || undefined}
                      alt={deal.owner.fullName}
                      fallback={deal.owner.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      size="sm"
                    />
                    <div className="text-sm font-medium text-neutral-900">{deal.owner.fullName}</div>
                  </div>
                </div>
              )}

              {/* Last Activity */}
              {deal.lastActivityAt && (
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                    Last Activity
                  </label>
                  <div className="text-sm text-neutral-700">
                    {new Date(deal.lastActivityAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                  {deal.lastActivityType && (
                    <div className="mt-1">
                      <Badge variant="neutral" size="sm">
                        {deal.lastActivityType}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                  Created
                </label>
                <div className="text-sm text-neutral-700">
                  {new Date(deal.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 uppercase mb-2">
                  Last Updated
                </label>
                <div className="text-sm text-neutral-700">
                  {new Date(deal.updatedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onEdit}>
              Edit Deal
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50">
            <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Delete Deal?</h3>
              <p className="text-sm text-neutral-600 mb-6">
                Are you sure you want to delete "{deal.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? 'Deleting...' : 'Delete Deal'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
