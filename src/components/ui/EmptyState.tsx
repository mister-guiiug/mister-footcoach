import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-3 text-fg-faint">{icon}</div>}
      <h3 className="text-sm font-semibold text-fg-heading mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-fg-muted max-w-xs mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
