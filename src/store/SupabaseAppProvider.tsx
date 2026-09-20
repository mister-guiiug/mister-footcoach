import {
  useReducer,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  AppContext,
  reducer,
  EMPTY_APP_STATE,
  type AppAction,
  type AppState,
} from './AppContext';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import {
  loadAllFromSupabase,
  reconcileSelectedTeam,
  ALL_TABLES,
} from '../backend/tables';
import { persistAction } from './persistAction';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../i18n';
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';

const log = createLogger('store');

/**
 * Supabase-backed provider. Hydrates the full AppState from Postgres, keeps it
 * live via realtime, and applies dispatched actions optimistically (via the
 * shared reducer) while persisting them to Supabase. Reads reconcile to the
 * server truth on the next realtime event.
 */
export function SupabaseAppProvider({ children }: { children: ReactNode }) {
  const [state, localDispatch] = useReducer(reducer, EMPTY_APP_STATE);
  const [ready, setReady] = useState(false);
  const toast = useToast();
  const { t } = useI18n();

  // Keep the latest state available to the persist layer (e.g. NOTIFY).
  const stateRef = useRef<AppState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const reload = useCallback(async () => {
    const next = await loadAllFromSupabase();
    // Preserve the coach's current team selection across the refresh.
    localDispatch({
      type: 'HYDRATE',
      state: reconcileSelectedTeam(next, stateRef.current.selectedTeamId),
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    reload()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e: unknown) => {
        log.error('Supabase hydrate failed', { error: e });
        if (!cancelled) setReady(true);
      });

    // Le client est une PROMESSE (fabrique du socle) : le canal s'ouvre quand
    // elle arrive — et pas du tout si le fournisseur s'est démonté entre-temps,
    // sinon un canal orphelin resterait ouvert et compterait dans le quota
    // temps réel du projet. L'hydratation, elle, a déjà son `catch` : un client
    // introuvable y est journalisé, et l'app s'ouvre sur un état vide plutôt
    // que de ne pas s'ouvrir.
    let sb: SupabaseClient | null = null;
    let channel: RealtimeChannel | null = null;
    getSupabase()
      .then(client => {
        if (cancelled) return;
        sb = client;
        channel = sb.channel('app-changes');
        for (const table of ALL_TABLES) {
          channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table },
            () => {
              if (timer) clearTimeout(timer);
              timer = setTimeout(() => void reload(), 300);
            }
          );
        }
        channel.subscribe();
      })
      .catch((e: unknown) => {
        log.error('Supabase realtime unavailable', { error: e });
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (sb && channel) void sb.removeChannel(channel);
    };
  }, [reload]);

  // Optimistic local update + persistence to Supabase. On failure (e.g. an RLS
  // denial), reconcile back to the server truth and tell the user, instead of
  // leaving a phantom change that silently disappears on the next refresh.
  const dispatch = useCallback(
    (action: AppAction) => {
      localDispatch(action);
      void persistAction(action, stateRef.current).catch((e: unknown) => {
        log.error('Supabase persist failed', {
          error: action.type,
          details: [e],
        });
        // Socle : une erreur reste affichée jusqu'à fermeture explicite.
        toast.error(t('errors.saveFailed'));
        void reload();
      });
    },
    [reload, toast, t]
  );

  if (!ready) return <Spinner fullscreen />;

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
