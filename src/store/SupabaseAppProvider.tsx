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
import { getSupabase } from '../lib/supabase';
import { loadAllFromSupabase, ALL_TABLES } from '../backend/tables';
import { persistAction } from './persistAction';
import { Spinner } from '../components/ui/Spinner';

/**
 * Supabase-backed provider. Hydrates the full AppState from Postgres, keeps it
 * live via realtime, and applies dispatched actions optimistically (via the
 * shared reducer) while persisting them to Supabase. Reads reconcile to the
 * server truth on the next realtime event.
 */
export function SupabaseAppProvider({ children }: { children: ReactNode }) {
  const [state, localDispatch] = useReducer(reducer, EMPTY_APP_STATE);
  const [ready, setReady] = useState(false);

  // Keep the latest state available to the persist layer (e.g. NOTIFY).
  const stateRef = useRef<AppState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const reload = useCallback(async () => {
    const next = await loadAllFromSupabase();
    localDispatch({ type: 'HYDRATE', state: next });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    reload()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e: unknown) => {
        console.error('Supabase hydrate failed', e);
        if (!cancelled) setReady(true);
      });

    const sb = getSupabase();
    const channel = sb.channel('app-changes');
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

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      void sb.removeChannel(channel);
    };
  }, [reload]);

  // Optimistic local update + persistence to Supabase.
  const dispatch = useCallback((action: AppAction) => {
    localDispatch(action);
    void persistAction(action, stateRef.current).catch((e: unknown) =>
      console.error('Supabase persist failed', action.type, e)
    );
  }, []);

  if (!ready) return <Spinner fullscreen />;

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
