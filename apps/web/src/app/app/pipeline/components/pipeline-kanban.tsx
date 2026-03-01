'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
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
    const targetStageId = over.id as string;
    const deal = deals.find((d) => d.id === dealId);

    if (!deal || deal.stageId === targetStageId) return;

    // Optimistic update
    const previousDeals = [...deals];

    try {
      // Move deal to new stage
      await apiClient.post(`/deals/${dealId}/move-stage`, {
        toStageId: targetStageId,
      });

      // Refresh deals
      onDealMoved();
    } catch (error) {
      console.error('Failed to move deal:', error);
      // Revert optimistic update on error
      onDealMoved();
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
        collisionDetection={closestCorners}
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
                    <div className="flex flex-1 flex-col gap-3 p-3 min-h-32">
                      {stageDeals.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-neutral-200 p-6">
                          <p className="text-xs text-neutral-400">No deals in this stage</p>
                        </div>
                      ) : (
                        stageDeals.map((deal) => (
                          <DealCard
                            key={deal.id}
                            deal={deal}
                            onClick={() => setSelectedDeal(deal)}
                          />
                        ))
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
