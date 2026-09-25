import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Le client Supabase, doublé : chaque table rend ce qu'on lui a posé, et la
 * RPC `my_survey_responses` aussi. `select('*')` se lit directement (on
 * l'attend) ou par `.limit(1)` (le singleton des réglages du club).
 */
const { rows, rpcAnswer, rpc } = vi.hoisted(() => {
  const rows: Record<string, unknown[]> = {};
  const rpcAnswer: {
    value: { data: unknown; error: { message: string } | null };
  } = { value: { data: [], error: null } };
  const rpc = vi.fn(() => Promise.resolve(rpcAnswer.value));
  return { rows, rpcAnswer, rpc };
});
vi.mock('../lib/supabase', () => ({
  getSupabase: () =>
    Promise.resolve({
      from: (table: string) => ({
        select: () => {
          const answer = Promise.resolve({ data: rows[table] ?? [] });
          return {
            then: (
              onFulfilled: (value: unknown) => unknown,
              onRejected?: (reason: unknown) => unknown
            ) => answer.then(onFulfilled, onRejected),
            limit: () => answer,
          };
        },
      }),
      rpc,
    }),
}));

import {
  ARRAY_TABLES,
  ALL_TABLES,
  loadAllFromSupabase,
  reconcileSelectedTeam,
} from './tables';
import { MOCK_DATA } from '../data/mock';
import type { AppState } from '../store/AppContext';

const stateWith = (teamIds: string[], selectedTeamId: string): AppState =>
  ({ teams: teamIds.map(id => ({ id })), selectedTeamId }) as AppState;

describe('ARRAY_TABLES mapping', () => {
  it('maps every array field of AppData to a table', () => {
    const arrayKeys = Object.entries(MOCK_DATA)
      .filter(([, v]) => Array.isArray(v))
      .map(([k]) => k)
      .sort();
    const mapped = ARRAY_TABLES.map(t => t.key).sort();
    expect(mapped).toEqual(arrayKeys);
  });

  it('includes the singleton tables in the realtime watch list', () => {
    expect(ALL_TABLES).toContain('seasons');
    expect(ALL_TABLES).toContain('club_settings');
    expect(ALL_TABLES).toContain('notification_preferences');
  });
});

describe('reconcileSelectedTeam', () => {
  it('keeps the previous selection when the team still exists', () => {
    const next = stateWith(['t1', 't2'], 't1');
    const result = reconcileSelectedTeam(next, 't2');
    expect(result.selectedTeamId).toBe('t2');
  });

  it('falls back to the loaded default when the team is gone', () => {
    const next = stateWith(['t1', 't2'], 't1');
    const result = reconcileSelectedTeam(next, 'deleted');
    expect(result.selectedTeamId).toBe('t1');
  });

  it('falls back when there was no previous selection', () => {
    const next = stateWith(['t1'], 't1');
    expect(reconcileSelectedTeam(next, '').selectedTeamId).toBe('t1');
  });
});

describe('loadAllFromSupabase', () => {
  beforeEach(() => {
    for (const key of Object.keys(rows)) delete rows[key];
    rpcAnswer.value = { data: [], error: null };
    rpc.mockClear();
  });

  it('charge chaque table, les singletons, et retient la saison active', async () => {
    rows.teams = [{ id: 't1' }, { id: 't2' }];
    rows.seasons = [
      { id: 's0', active: false },
      { id: 's1', active: true },
    ];
    rows.club_settings = [{ autoSurveyOnMatch: false, clubName: 'FC Test' }];
    rows.notification_preferences = [
      {
        userId: 'u1',
        enabled: false,
        mutedCategories: [],
        reminderDelay: 'J-1',
      },
    ];

    const state = await loadAllFromSupabase();

    expect(state.teams).toHaveLength(2);
    expect(state.selectedTeamId).toBe('t1');
    expect(state.season.id).toBe('s1');
    expect(state.clubSettings.clubName).toBe('FC Test');
    expect(state.notificationPreferences.u1?.enabled).toBe(false);
  });

  it('le compte joueur reçoit SES réponses par la RPC, qui complète la table sans doublon', async () => {
    rows.survey_responses = [{ id: 'sr1', surveyId: 'sv1', playerId: 'p1' }];
    rpcAnswer.value = {
      data: [
        { id: 'sr1', surveyId: 'sv1', playerId: 'p1' },
        {
          id: 'sr2',
          surveyId: 'sv2',
          playerId: 'p1',
          intentionJoueur: 'present',
          confirmationParent: null,
        },
      ],
      error: null,
    };

    const state = await loadAllFromSupabase();

    expect(rpc).toHaveBeenCalledWith('my_survey_responses');
    expect(state.surveyResponses.map(r => r.id)).toEqual(['sr1', 'sr2']);
  });

  it('une base sans la migration 0006 : la RPC échoue, l’app se charge comme avant', async () => {
    rows.survey_responses = [{ id: 'sr1', surveyId: 'sv1', playerId: 'p1' }];
    rpcAnswer.value = {
      data: null,
      error: { message: 'Could not find the function my_survey_responses' },
    };

    const state = await loadAllFromSupabase();

    expect(state.surveyResponses.map(r => r.id)).toEqual(['sr1']);
  });
});
