import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastApi {
  /** Shows a transient toast. Safe to call outside a provider (no-op). */
  show: (message: string, variant?: ToastVariant) => void;
}

/** Default is a no-op so components/tests can call useToast without a provider. */
const ToastContext = createContext<ToastApi>({ show: () => {} });

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-l-4 border-l-[var(--status-present)]',
  error: 'border-l-4 border-l-red-600',
  info: 'border-l-4 border-l-primary',
};

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = nextId.current++;
      setToasts(prev => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
        aria-live="polite"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role={t.variant === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl bg-surface px-4 py-3 text-sm text-fg shadow-lg ${variantStyles[t.variant]}`}
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => dismiss(t.id)}
              className="text-fg-faint transition-colors hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}
