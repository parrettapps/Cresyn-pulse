'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, Calendar, DollarSign, User } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Avatar } from '../../../../components/ui/avatar';
import type { DealWithRelations } from '../../../../types/pipeline';

interface DealCardProps {
  deal: DealWithRelations;
  onClick: () => void;
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const value = deal.value ? parseFloat(deal.value) : 0;
  const probability = deal.probability || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
    >
      {/* Deal Name */}
      <h3 className="mb-2 text-sm font-semibold text-neutral-900 line-clamp-2">{deal.name}</h3>

      {/* Company */}
      {deal.company && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-neutral-600">
          <Building2 className="h-3.5 w-3.5 text-neutral-400" />
          <span className="truncate">{deal.company.name}</span>
        </div>
      )}

      {/* Value and Probability */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-neutral-400" />
          <span className="text-sm font-semibold text-neutral-900">
            ${(value / 1000).toFixed(0)}K
          </span>
        </div>
        {probability > 0 && (
          <Badge variant="neutral" size="sm">
            {probability}%
          </Badge>
        )}
      </div>

      {/* Expected Close Date */}
      {deal.expectedClose && (
        <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-600">
          <Calendar className="h-3.5 w-3.5 text-neutral-400" />
          <span>{new Date(deal.expectedClose).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      )}

      {/* Owner */}
      {deal.owner && (
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
          <Avatar
            src={deal.owner.avatarUrl || undefined}
            alt={deal.owner.fullName}
            fallback={deal.owner.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
            size="xs"
          />
          <span className="text-xs text-neutral-600 truncate">{deal.owner.fullName}</span>
        </div>
      )}

      {/* Badges */}
      {(deal.source || deal.dealType) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {deal.source && (
            <Badge variant="secondary" size="sm">
              {deal.source}
            </Badge>
          )}
          {deal.dealType && (
            <Badge variant="neutral" size="sm">
              {deal.dealType.replace('_', ' ')}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
