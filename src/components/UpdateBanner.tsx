import { registerSW } from 'virtual:pwa-register';
import { useUpdatePrompt } from '@mister-guiiug/dev-wpa-config/react/use-update-prompt';
import { useI18n } from '../i18n';

export function UpdateBanner() {
  const { t } = useI18n();
  const { visible, update } = useUpdatePrompt({ registerSW });

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-surface px-4 py-3 shadow-lg border border-border-ui flex items-center gap-3">
      <span className="text-sm text-fg">{t('update.available')}</span>
      <button
        onClick={() => void update()}
        className="rounded-lg bg-primary px-3 py-1 text-sm font-medium text-primary-fg hover:bg-primary-hover transition-colors"
      >
        {t('update.refresh')}
      </button>
    </div>
  );
}
