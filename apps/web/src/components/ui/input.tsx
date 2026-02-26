import { clsx } from 'clsx';
import { forwardRef } from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  hint?: string;
  // Explicitly typed with undefined for exactOptionalPropertyTypes compatibility
  error?: string | undefined;
  /** Leading icon or text rendered inside the input on the left */
  prefix?: React.ReactNode;
  /** Trailing icon or text rendered inside the input on the right */
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, prefix, suffix, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-neutral-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <div className="pointer-events-none absolute left-3 flex items-center text-neutral-400">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={clsx(
              'h-9 w-full rounded-lg border text-sm placeholder:text-neutral-400',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50',
              error
                ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/30'
                : 'border-neutral-300 bg-white focus:border-primary-400 focus:ring-primary-500/20',
              prefix ? 'pl-9' : 'px-3',
              suffix ? 'pr-9' : 'pr-3',
              className,
            )}
            {...props}
          />
          {suffix && (
            <div className="pointer-events-none absolute right-3 flex items-center text-neutral-400">
              {suffix}
            </div>
          )}
        </div>
        {hint && !error && <p className="text-xs text-neutral-400">{hint}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
