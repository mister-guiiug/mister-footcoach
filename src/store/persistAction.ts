import type { AppAction, AppState } from './AppContext';
import { getSupabase } from '../lib/supabase';
import { isNotificationAllowed } from '../utils/notifications';
import { genId, nowIso } from '../utils/id';

type Row = Record<string, unknown>;

/**
 * Awaits a Supabase query and throws on error. supabase-js resolves (does not
 * reject) on RLS denials and constraint violations, returning `{ error }` — so
 * without this check, failed writes would be swallowed silently.
 */
async function run(query: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await query;
  if (error) {
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Échec de la requête Supabase';
    throw new Error(message);
  }
}

function upsert(table: string, row: Row) {
  return run(getSupabase().from(table).upsert(row));
}
function insert(table: string, rows: Row | Row[]) {
  return run(getSupabase().from(table).insert(rows));
}
function del(table: string, id: string) {
  return run(getSupabase().from(table).delete().eq('id', id));
}
function patch(table: string, id: string, changes: Row) {
  return run(getSupabase().from(table).update(changes).eq('id', id));
}

/**
 * Translates a dispatched action into the equivalent Supabase write. Reads are
 * kept in sync by realtime (the provider re-hydrates on any change), so this
 * only persists; failures (including RLS denials) reject the returned promise
 * so the caller can roll back and notify the user.
 */
export async function persistAction(
  action: AppAction,
  state: AppState
): Promise<void> {
  switch (action.type) {
    case 'ADD_PLAYER':
    case 'UPDATE_PLAYER':
      await upsert('players', action.player as unknown as Row);
      return;
    case 'ADD_CONTACT':
    case 'UPDATE_CONTACT':
      await upsert('contacts', action.contact as unknown as Row);
      return;
    case 'DELETE_CONTACT':
      await del('contacts', action.contactId);
      return;
    case 'ADD_MATCH':
    case 'UPDATE_MATCH':
      await upsert('matches', action.match as unknown as Row);
      return;
    case 'ADD_MATCH_EVENT':
      await insert('match_events', action.event as unknown as Row);
      return;
    case 'ADD_POSITION_HISTORY':
      await insert('position_history', action.entries as unknown as Row[]);
      return;
    case 'SET_MATCH_LIVE':
      await patch('matches', action.matchId, { liveActive: action.active });
      return;
    case 'UPDATE_MATCH_SCORE':
      await patch('matches', action.matchId, {
        scoreHome: action.scoreHome,
        scoreAway: action.scoreAway,
      });
      return;
    case 'ADD_TRAINING':
    case 'UPDATE_TRAINING':
      await upsert('trainings', action.training as unknown as Row);
      return;
    case 'SET_TRAINING_BLOCKS':
      await run(
        getSupabase()
          .from('training_blocks')
          .delete()
          .eq('trainingId', action.trainingId)
      );
      if (action.blocks.length > 0)
        await insert('training_blocks', action.blocks as unknown as Row[]);
      return;
    case 'SET_ATTENDANCE':
      await upsert('attendances', action.attendance as unknown as Row);
      return;
    case 'SAVE_LINEUP':
      await upsert('lineups', action.lineup as unknown as Row);
      return;
    case 'ADD_SURVEY':
      await insert('surveys', action.survey as unknown as Row);
      return;
    case 'ADD_SURVEY_RESPONSE':
    case 'UPDATE_SURVEY_RESPONSE':
      await upsert('survey_responses', action.response as unknown as Row);
      return;
    case 'ADD_TOURNAMENT':
    case 'UPDATE_TOURNAMENT':
      await upsert('tournaments', action.tournament as unknown as Row);
      return;
    case 'ADD_TOURNAMENT_GROUP':
    case 'UPDATE_TOURNAMENT_GROUP':
      await upsert('tournament_groups', action.group as unknown as Row);
      return;
    case 'DELETE_TOURNAMENT_GROUP':
      await del('tournament_groups', action.groupId);
      return;
    case 'ADD_EXERCISE':
    case 'UPDATE_EXERCISE':
      await upsert('exercises', action.exercise as unknown as Row);
      return;
    case 'DELETE_EXERCISE':
      await del('exercises', action.exerciseId);
      return;
    case 'ADD_CARPOOL_OFFER':
      await insert('carpool_offers', action.offer as unknown as Row);
      return;
    case 'DELETE_CARPOOL_OFFER':
      await del('carpool_offers', action.offerId);
      return;
    case 'ADD_UNAVAILABILITY':
    case 'UPDATE_UNAVAILABILITY':
      await upsert('unavailabilities', action.unavailability as unknown as Row);
      return;
    case 'ADD_INJURY':
    case 'UPDATE_INJURY':
      await upsert('injuries', action.injury as unknown as Row);
      return;
    case 'NOTIFY': {
      const ts = nowIso();
      const rows = state.users
        .filter(
          u =>
            u.teamIds.includes(action.teamId) &&
            isNotificationAllowed(
              state.notificationPreferences[u.id],
              action.notifType
            )
        )
        .map(u => ({
          id: genId('notif'),
          userId: u.id,
          type: action.notifType,
          message: action.message,
          read: false,
          relatedId: action.relatedId,
          relatedType: action.relatedType,
          createdAt: ts,
        }));
      if (rows.length > 0) await insert('notifications', rows);
      return;
    }
    case 'MARK_NOTIFICATION_READ':
      await patch('notifications', action.notificationId, { read: true });
      return;
    case 'MARK_ALL_NOTIFICATIONS_READ':
      await run(
        getSupabase()
          .from('notifications')
          .update({ read: true })
          .eq('userId', action.userId)
      );
      return;
    case 'SET_NOTIFICATION_PREFERENCES':
      await upsert('notification_preferences', {
        userId: action.userId,
        ...action.preferences,
      });
      return;
    case 'SET_CLUB_SETTINGS':
      await upsert('club_settings', {
        id: 'default',
        ...action.settings,
      });
      return;
    // Local-only actions — nothing to persist.
    case 'SET_SELECTED_TEAM':
    case 'HYDRATE':
    case 'RESET_TO_MOCK':
      return;
    /* c8 ignore next 3 */
    default:
      return;
  }
}
