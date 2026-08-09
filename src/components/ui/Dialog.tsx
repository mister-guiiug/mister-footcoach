import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Mobile-first bottom-sheet dialog. Slides up from the bottom on small
 * screens, centered card on larger ones. Closes on overlay click or Escape.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: DialogProps) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-surface shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border-ui px-4 py-3">
          <h2 className="text-sm font-semibold text-fg-heading">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-fg-muted hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer && (
          <div className="border-t border-border-ui px-4 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
