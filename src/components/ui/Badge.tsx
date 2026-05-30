import type { ReactNode } from 'react';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted'
  | 'present'
  | 'absent'
  | 'excuse';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-surface border border-border-ui text-fg',
  primary: 'bg-primary-subtle text-primary',
  success:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  muted: 'bg-surface-muted text-fg-muted',
  present:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  excuse:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
