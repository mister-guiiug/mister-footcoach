import { describe, it, expect, beforeEach, vi } from 'vitest';

type Call = [string, ...unknown[]];

const { calls, fromImpl, rpcImpl, setError } = vi.hoisted(() => {
  const calls: Call[] = [];
  let error: { message: string } | null = null;
  const result = () => Promise.resolve({ error });
  function fromImpl(table: string) {
    return {
      upsert: (row: unknown) => {
        calls.push(['upsert', table, row]);
        return result();
      },
      insert: (rows: unknown) => {
        calls.push(['insert', table, rows]);
        return result();
      },
      delete: () => ({
        eq: (col: string, val: unknown) => {
          calls.push(['delete', table, col, val]);
          return result();
        },
      }),
      update: (changes: unknown) => ({
        eq: (col: string, val: unknown) => {
          calls.push(['update', table, changes, col, val]);
          return result();
        },
      }),
    };
  }
  function setError(e: { message: string } | null) {
    error = e;
  }
  function rpcImpl(name: string, args: unknown) {
    calls.push(['rpc', name, args]);
    return result();
  }
  return { calls, fromImpl, rpcImpl, setError };
});

// La fabrique du socle rend le client dans une PROMESSE : le double aussi.
vi.mock('../lib/supabase', () => ({
  getSupabase: () => Promise.resolve({ from: fromImpl, rpc: rpcImpl }),
}));

import { persistAction } from './persistAction';
import type { AppState } from './AppContext';

const state = {
  users: [
    { id: 'u1', teamIds: ['t1'], roles: ['coach'] },
    { id: 'u2', teamIds: ['t2'], roles: ['coach'] },
  ],
  notificationPreferences: {},
} as unknown as AppState;

describe('persistAction routing', () => {
  beforeEach(() => {
    calls.length = 0;
    setError(null);
  });

  it('upserts a match on ADD_MATCH', async () => {
    await persistAction(
      { type: 'ADD_MATCH', match: { id: 'm1' } as never },
      state
    );
    expect(calls).toEqual([['upsert', 'matches', { id: 'm1' }]]);
  });

  it('deletes a contact on DELETE_CONTACT', async () => {
    await persistAction({ type: 'DELETE_CONTACT', contactId: 'c1' }, state);
    expect(calls).toEqual([['delete', 'contacts', 'id', 'c1']]);
  });

  it('updates the live flag on SET_MATCH_LIVE', async () => {
    await persistAction(
      { type: 'SET_MATCH_LIVE', matchId: 'm1', active: true },
      state
    );
    expect(calls).toEqual([
      ['update', 'matches', { liveActive: true }, 'id', 'm1'],
    ]);
  });

  it('inserts notifications for matching team recipients on NOTIFY', async () => {
    await persistAction(
      {
        type: 'NOTIFY',
        teamId: 't1',
        notifType: 'match_nouveau',
        message: 'x',
      },
      state
    );
    expect(calls).toHaveLength(1);
    const [op, table, rows] = calls[0]!;
    expect(op).toBe('insert');
    expect(table).toBe('notifications');
    // only u1 belongs to team t1
    expect((rows as unknown[]).length).toBe(1);
  });

  it('upserts the singleton row on SET_CLUB_SETTINGS', async () => {
    await persistAction(
      { type: 'SET_CLUB_SETTINGS', settings: { autoSurveyOnMatch: false } },
      state
    );
    expect(calls).toEqual([
      ['upsert', 'club_settings', { id: 'default', autoSurveyOnMatch: false }],
    ]);
  });

  it('écrit le nom du club dans sa colonne — et un nom effacé comme une chaîne vide', async () => {
    // La colonne `"clubName"` vient de `0005_nom_du_club.sql`. Un nom effacé
    // part en '' et non en `undefined` : JSON retirerait la clé, et l'upsert
    // laisserait l'ancien nom en base.
    await persistAction(
      {
        type: 'SET_CLUB_SETTINGS',
        settings: { autoSurveyOnMatch: true, clubName: '' },
      },
      state
    );
    expect(calls).toEqual([
      [
        'upsert',
        'club_settings',
        { id: 'default', autoSurveyOnMatch: true, clubName: '' },
      ],
    ]);
  });

  it('l’intention d’un joueur passe par SA RPC, jamais par la table', async () => {
    // La table des réponses n'est pas ouverte au compte joueur (0006) : un
    // `upsert` y serait refusé. La RPC retrouve le joueur de la session et
    // n'écrit que l'intention — le `playerId` de l'action ne part donc pas.
    await persistAction(
      {
        type: 'SET_PLAYER_INTENTION',
        surveyId: 'sv1',
        playerId: 'p1',
        value: 'absent',
      },
      state
    );
    expect(calls).toEqual([
      [
        'rpc',
        'set_player_intention',
        { p_survey_id: 'sv1', p_intention: 'absent' },
      ],
    ]);
  });

  it('un refus de la RPC (sondage fermé) remonte, pour que l’écran se réaligne', async () => {
    setError({ message: 'sondage_ferme' });
    await expect(
      persistAction(
        {
          type: 'SET_PLAYER_INTENTION',
          surveyId: 'sv1',
          playerId: 'p1',
          value: 'present',
        },
        state
      )
    ).rejects.toThrow('sondage_ferme');
  });

  it('does nothing for local-only actions', async () => {
    await persistAction({ type: 'SET_SELECTED_TEAM', teamId: 't1' }, state);
    await persistAction({ type: 'RESET_TO_MOCK' }, state);
    expect(calls).toHaveLength(0);
  });

  it('rejects when Supabase returns an error (e.g. RLS denial)', async () => {
    setError({ message: 'new row violates row-level security policy' });
    await expect(
      persistAction({ type: 'ADD_MATCH', match: { id: 'm1' } as never }, state)
    ).rejects.toThrow(/row-level security/);
  });
});
