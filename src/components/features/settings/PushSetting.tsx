import { useEffect, useState, type ReactNode } from 'react';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useSessionUserId } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n';
import {
  currentPushEndpoint,
  disablePush,
  enablePush,
  pushBrowserSupport,
  pushDeployed,
  pushPermissionDenied,
} from '../../../lib/push';

type Status = 'loading' | 'on' | 'off' | 'denied' | 'busy';

/**
 * LE PUSH, APPAREIL PAR APPAREIL — dans les préférences de notification
 * (mode `supabase` seulement ; `SettingsPage` ne le monte pas en mode local).
 *
 * UN RÉGLAGE D'APPAREIL, PAS DE COMPTE. Un abonnement push est celui d'un
 * navigateur : l'activer sur le téléphone n'allume rien sur l'ordinateur. Les
 * CATÉGORIES, elles, sont celles du compte (les cases au-dessus) — et c'est
 * sur elles que l'Edge Function trie ce qu'elle envoie.
 *
 * CHAQUE « NON » DIT POURQUOI, parce que chacun appelle un geste différent :
 *  - le déploiement n'a pas de clé publique VAPID : rien à faire ici ;
 *  - un iPhone en onglet : ajouter l'app à l'écran d'accueil — le seul refus
 *    que l'utilisateur peut lever lui-même, et le plus surprenant ;
 *  - un navigateur qui ne sait pas : rien à faire ;
 *  - une permission REFUSÉE : elle ne se redemande pas, seuls les réglages
 *    du navigateur la rendent.
 *
 * L'activer vaut consentement (§ 16.4), distinct de celui du RGPD, et il se
 * retire au même endroit : l'écran le dit sous le bouton.
 */
export function PushSetting() {
  const { t } = useI18n();
  const toast = useToast();
  const userId = useSessionUserId();
  const deployed = pushDeployed();
  const support = pushBrowserSupport();
  const usable = deployed && support.supported;
  const [status, setStatus] = useState<Status>('loading');

  // L'état de CET appareil : abonné ? permission déjà refusée ?
  useEffect(() => {
    if (!usable) return;
    let alive = true;
    currentPushEndpoint()
      .then(endpoint => {
        if (!alive) return;
        setStatus(endpoint ? 'on' : pushPermissionDenied() ? 'denied' : 'off');
      })
      .catch(() => {
        if (alive) setStatus('off');
      });
    return () => {
      alive = false;
    };
  }, [usable]);

  async function toggle() {
    if (status === 'busy' || status === 'loading') return;
    if (status === 'on') {
      setStatus('busy');
      try {
        await disablePush();
        setStatus('off');
        toast.success(t('push.disabled'));
      } catch {
        setStatus('on');
        toast.error(t('push.disableFailed'));
      }
      return;
    }
    setStatus('busy');
    const result = userId ? await enablePush(userId) : 'error';
    if (result === 'on') {
      setStatus('on');
      toast.success(t('push.enabled'));
    } else if (result === 'denied') {
      // Un refus n'est pas une panne : l'écran passe au message qui dit où
      // le lever, sans toast d'erreur.
      setStatus('denied');
    } else {
      setStatus('off');
      toast.error(t('push.enableFailed'));
    }
  }

  let body: ReactNode;
  if (!deployed) {
    body = <p className="text-xs text-fg-muted">{t('push.notDeployed')}</p>;
  } else if (!support.supported) {
    body = (
      <p className="rounded-xl bg-amber-50 dark:bg-amber-900/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
        {support.reason === 'requires-installed-app'
          ? t('push.installFirst')
          : t('push.unsupported')}
      </p>
    );
  } else if (status === 'denied') {
    body = (
      <p className="rounded-xl bg-amber-50 dark:bg-amber-900/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
        {t('push.denied')}
      </p>
    );
  } else {
    const on = status === 'on';
    const busy = status === 'busy' || status === 'loading';
    body = (
      <>
        <p className="mb-2 text-xs text-fg-muted">{t('push.desc')}</p>
        <div className="flex items-center justify-between gap-3">
          <span id="push-switch-label" className="text-sm text-fg">
            {t('push.onThisDevice')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-labelledby="push-switch-label"
            aria-busy={busy || undefined}
            onClick={() => void toggle()}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
              on ? 'bg-primary' : 'bg-border-ui-strong'
            } ${busy ? 'opacity-60' : ''}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                on ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        <p className="mt-2 text-xs text-fg-faint">{t('push.consent')}</p>
      </>
    );
  }

  return (
    <div className="mt-3 border-t border-border-ui pt-3">
      <p className="mb-1.5 text-xs font-medium text-fg-muted">
        {t('push.title')}
      </p>
      {body}
    </div>
  );
}
