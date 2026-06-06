import { EMPTY_APP_STATE, type AppState } from '../store/AppContext';
import { getSupabase } from '../lib/supabase';
import type { Season, ClubSettings, NotificationPreferences } from '../types';

/** AppData array keys ↔ Postgres table names. */
export const ARRAY_TABLES: { table: string; key: keyof AppState }[] = [
  { table: 'teams', key: 'teams' },
  { table: 'players', key: 'players' },
  { table: 'contacts', key: 'contacts' },
  { table: 'users', key: 'users' },
  { table: 'matches', key: 'matches' },
  { table: 'match_events', key: 'matchEvents' },
  { table: 'trainings', key: 'trainings' },
  { table: 'training_blocks', key: 'trainingBlocks' },
  { table: 'exercises', key: 'exercises' },
  { table: 'attendances', key: 'attendances' },
  { table: 'lineups', key: 'lineups' },
  { table: 'position_history', key: 'positionHistory' },
  { table: 'tournaments', key: 'tournaments' },
  { table: 'tournament_groups', key: 'tournamentGroups' },
  { table: 'carpool_offers', key: 'carpoolOffers' },
  { table: 'surveys', key: 'surveys' },
  { table: 'survey_responses', key: 'surveyResponses' },
  { table: 'notifications', key: 'notifications' },
  { table: 'unavailabilities', key: 'unavailabilities' },
  { table: 'injuries', key: 'injuries' },
];

/** Every realtime-watched table (array tables + singletons). */
export const ALL_TABLES = [
  ...ARRAY_TABLES.map(t => t.table),
  'seasons',
  'club_settings',
  'notification_preferences',
];

/** Loads the full app state from Supabase into the AppState shape. */
export async function loadAllFromSupabase(): Promise<AppState> {
  const sb = getSupabase();
  const state: AppState = { ...EMPTY_APP_STATE };
  const mutable = state as unknown as Record<string, unknown>;

  const results = await Promise.all(
    ARRAY_TABLES.map(t => sb.from(t.table).select('*'))
  );
  ARRAY_TABLES.forEach((t, i) => {
    mutable[t.key as string] = results[i]?.data ?? [];
  });

  const { data: seasons } = await sb.from('seasons').select('*');
  const seasonRows = (seasons ?? []) as Season[];
  state.season =
    seasonRows.find(s => s.active) ?? seasonRows[0] ?? EMPTY_APP_STATE.season;

  const { data: cs } = await sb.from('club_settings').select('*').limit(1);
  const settings = (cs ?? []) as ClubSettings[];
  if (settings[0]) state.clubSettings = settings[0];

  const { data: np } = await sb.from('notification_preferences').select('*');
  const prefs = (np ?? []) as (NotificationPreferences & { userId: string })[];
  state.notificationPreferences = Object.fromEntries(
    prefs.map(p => [p.userId, p])
  );

  state.selectedTeamId = state.teams[0]?.id ?? '';
  return state;
}

/**
 * Keeps the previously selected team across a re-hydration when it still
 * exists, so a realtime refresh (or an error rollback) doesn't yank the coach
 * back to the first team. Falls back to the freshly loaded default otherwise.
 */
export function reconcileSelectedTeam(
  next: AppState,
  previousSelectedId: string
): AppState {
  if (previousSelectedId && next.teams.some(t => t.id === previousSelectedId)) {
    return { ...next, selectedTeamId: previousSelectedId };
  }
  return next;
}
