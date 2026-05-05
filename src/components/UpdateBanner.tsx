import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-surface px-4 py-3 shadow-lg border border-border-ui flex items-center gap-3">
      <span className="text-sm text-fg">Mise à jour disponible</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="rounded-lg bg-primary px-3 py-1 text-sm font-medium text-primary-fg hover:bg-primary-hover transition-colors"
      >
        Actualiser
      </button>
    </div>
  );
}
