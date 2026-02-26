import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
  iconColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const iconColorClasses = {
  primary:   { bg: 'bg-primary-50',   icon: 'text-primary-600' },
  secondary: { bg: 'bg-secondary-50', icon: 'text-secondary-600' },
  success:   { bg: 'bg-green-50',     icon: 'text-green-600' },
  warning:   { bg: 'bg-amber-50',     icon: 'text-amber-600' },
  danger:    { bg: 'bg-red-50',       icon: 'text-red-600' },
};

export function StatCard({
  title,
  value,
  delta,
  deltaDirection = 'neutral',
  icon: Icon,
  iconColor = 'primary',
  className,
}: StatCardProps) {
  const colors = iconColorClasses[iconColor];
  const DeltaIcon =
    deltaDirection === 'up' ? TrendingUp : deltaDirection === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={clsx(
        'rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-neutral-500">{title}</p>
        {Icon && (
          <div className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', colors.bg)}>
            <Icon className={clsx('h-4 w-4', colors.icon)} aria-hidden="true" />
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">{value}</p>
      {delta && (
        <div
          className={clsx(
            'mt-1.5 flex items-center gap-1 text-xs font-medium',
            deltaDirection === 'up' && 'text-green-600',
            deltaDirection === 'down' && 'text-red-500',
            deltaDirection === 'neutral' && 'text-neutral-400',
          )}
        >
          <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}
