'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '../../../../components/ui/badge';
import { DealCard } from './deal-card';
import { DealDetailModal } from './deal-detail-modal';
import { DealFormModal } from './deal-form-modal';
import { apiClient } from '../../../../lib/api-client';
import type { PipelineWithStages, DealWithRelations } from '../../../../types/pipeline';

interface PipelineKanbanProps {
  pipeline: PipelineWithStages;
  deals: DealWithRelations[];
  loading: boolean;
  onDealMoved: () => void;
}

// Helper component to make columns droppable
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef} className="flex flex-1 flex-col">{children}</div>;
}

export function PipelineKanban({ pipeline, deals, loading, onDealMoved }: PipelineKanbanProps) {
  const [activeDeal, setActiveDeal] = useState<DealWithRelations | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<DealWithRelations | null>(null);
  const [editingDeal, setEditingDeal] = useState<DealWithRelations | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to activate drag
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === event.active.id);
    if (deal) {
      setActiveDeal(deal);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over || active.id === over.id) return;

    // Get the deal and target stage
    const dealId = active.id as string;
    // Check if we're dropping over a sortable item (another deal) or directly on a droppable (stage)
    // If dropping over a deal, get its container (stage) ID from sortable data
    const targetStageId = (over.data.current?.sortable?.containerId || over.id) as string;
    const deal = deals.find((d) => d.id === dealId);
    const targetStage = pipeline.stages.find((s) => s.id === targetStageId);

    console.log('=== DRAG DEBUG ===');
    console.log('Deal being dragged:', dealId, deal?.name);
    console.log('Over ID:', over.id);
    console.log('Over data FULL:', JSON.stringify(over.data, null, 2));
    console.log('Over rect:', over.rect);
    console.log('Is over a sortable item?', !!over.data.current?.sortable);
    console.log('Sortable containerId:', over.data.current?.sortable?.containerId);
    console.log('Resolved target stage ID:', targetStageId);
    console.log('Target stage found:', targetStage?.name, 'isWon:', targetStage?.isWon, 'isLost:', targetStage?.isLost);

    // Check if the over.id is a deal
    const overDeal = deals.find(d => d.id === over.id);
    if (overDeal) {
      console.log('Over deal:', overDeal.name, 'in stage:', overDeal.stageId);
      const overDealStage = pipeline.stages.find(s => s.id === overDeal.stageId);
      console.log('Over deal stage:', overDealStage?.name);
    }
    console.log('=================');

    if (!deal || !targetStage || deal.stageId === targetStageId) return;

    try {
      const isClosed = deal.status === 'closed_won' || deal.status === 'closed_lost';
      const isMovingToWonLost = targetStage.isWon || targetStage.isLost;
      const isMovingToOpenStage = !targetStage.isWon && !targetStage.isLost;

      console.log('Target stage flags:', { isWon: targetStage.isWon, isLost: targetStage.isLost });

      if (isClosed && isMovingToOpenStage) {
        // Reopening a closed deal - use update endpoint
        console.log(`Reopening deal ${dealId} and moving to stage ${targetStageId}`);
        await apiClient.patch(`/deals/${dealId}`, {
          stageId: targetStageId,
        });
        console.log('Deal reopened and moved successfully');
      } else if (isMovingToWonLost) {
        // Use close endpoint for Won/Lost stages
        const status = targetStage.isWon ? 'closed_won' : 'closed_lost';
        const today = new Date().toISOString().split('T')[0];

        console.log(`Closing deal ${dealId} as ${status} to stage ${targetStageId}`);
        await apiClient.post(`/deals/${dealId}/close`, {
          status,
          actualClose: today,
          ...(status === 'closed_lost' ? { lostReason: 'Moved to Lost stage' } : {}),
        });
        console.log('Deal closed successfully');
      } else {
        // Use move-stage endpoint for regular stages
        console.log(`Moving deal ${dealId} to stage ${targetStageId}`);
        await apiClient.post(`/deals/${dealId}/move-stage`, {
          toStageId: targetStageId,
        });
        console.log('Deal moved successfully');
      }

      // Refresh deals
      onDealMoved();
    } catch (error: any) {
      console.error('Failed to move/close deal:', error);
      console.error('Error details:', error.response?.data);
      // Refresh to revert any optimistic updates
      onDealMoved();
      // Show error to user
      alert(`Failed to move deal: ${error.response?.data?.detail || error.message}`);
    }
  };

  // Group deals by stage
  const dealsByStage = pipeline.stages.reduce(
    (acc, stage) => {
      acc[stage.id] = deals.filter((deal) => deal.stageId === stage.id);
      return acc;
    },
    {} as Record<string, DealWithRelations[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-sm text-neutral-500">Loading deals...</div>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="mx-6 mb-6 flex gap-4 overflow-x-auto pb-4">
          {pipeline.stages.map((stage) => {
            const stageDeals = dealsByStage[stage.id] || [];
            const stageValue = stageDeals.reduce(
              (sum, deal) => sum + (deal.value ? parseFloat(deal.value) : 0),
              0
            );

            return (
              <div
                key={stage.id}
                className="flex w-80 flex-shrink-0 flex-col rounded-xl border border-neutral-200 bg-white overflow-hidden"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-sm font-semibold text-neutral-900">{stage.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">
                      {stageDeals.length}
                    </Badge>
                    {stageValue > 0 && (
                      <span className="text-xs font-medium text-neutral-500">
                        ${(stageValue / 1000).toFixed(0)}K
                      </span>
                    )}
                  </div>
                </div>

                {/* Droppable Zone */}
                <DroppableColumn id={stage.id}>
                  <SortableContext
                    id={stage.id}
                    items={stageDeals.map((d) => d.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-1 flex-col gap-3 p-3 min-h-[200px]">
                      {stageDeals.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          onClick={() => setSelectedDeal(deal)}
                        />
                      ))}
                      {stageDeals.length === 0 && (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-neutral-200 p-6">
                          <p className="text-xs text-neutral-400">Drop deals here</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DroppableColumn>
              </div>
            );
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeDeal && (
            <div className="w-80 opacity-50">
              <DealCard deal={activeDeal} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <DealDetailModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onEdit={() => {
            setEditingDeal(selectedDeal);
            setSelectedDeal(null);
          }}
          onDelete={onDealMoved}
        />
      )}

      {/* Edit Deal Modal */}
      {editingDeal && (
        <DealFormModal
          pipeline={pipeline}
          deal={editingDeal}
          onClose={() => setEditingDeal(null)}
          onSuccess={() => {
            setEditingDeal(null);
            onDealMoved();
          }}
        />
      )}
    </>
  );
}
