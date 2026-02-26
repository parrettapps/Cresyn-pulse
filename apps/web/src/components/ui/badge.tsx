import { clsx } from 'clsx';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary:   'bg-primary-50   text-primary-700   ring-primary-200',
  secondary: 'bg-secondary-50 text-secondary-700 ring-secondary-200',
  success:   'bg-green-50     text-green-700     ring-green-200',
  warning:   'bg-amber-50     text-amber-700     ring-amber-200',
  danger:    'bg-red-50       text-red-700       ring-red-200',
  info:      'bg-sky-50       text-sky-700       ring-sky-200',
  neutral:   'bg-neutral-100  text-neutral-600   ring-neutral-200',
};

const dotClasses: Record<BadgeVariant, string> = {
  primary:   'bg-primary-500',
  secondary: 'bg-secondary-500',
  success:   'bg-green-500',
  warning:   'bg-amber-500',
  danger:    'bg-red-500',
  info:      'bg-sky-500',
  neutral:   'bg-neutral-400',
};

export function Badge({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        variantClasses[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={clsx('inline-block h-1.5 w-1.5 shrink-0 rounded-full', dotClasses[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
