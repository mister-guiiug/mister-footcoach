import { describe, it, expect, beforeEach, vi } from 'vitest';

type Call = [string, ...unknown[]];

const { calls, fromImpl } = vi.hoisted(() => {
  const calls: Call[] = [];
  function fromImpl(table: string) {
    return {
      upsert: (row: unknown) => {
        calls.push(['upsert', table, row]);
        return Promise.resolve({ error: null });
      },
      insert: (rows: unknown) => {
        calls.push(['insert', table, rows]);
        return Promise.resolve({ error: null });
      },
      delete: () => ({
        eq: (col: string, val: unknown) => {
          calls.push(['delete', table, col, val]);
          return Promise.resolve({ error: null });
        },
      }),
      update: (changes: unknown) => ({
        eq: (col: string, val: unknown) => {
          calls.push(['update', table, changes, col, val]);
          return Promise.resolve({ error: null });
        },
      }),
    };
  }
  return { calls, fromImpl };
});

vi.mock('../lib/supabase', () => ({
  getSupabase: () => ({ from: fromImpl }),
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

  it('does nothing for local-only actions', async () => {
    await persistAction({ type: 'SET_SELECTED_TEAM', teamId: 't1' }, state);
    await persistAction({ type: 'RESET_TO_MOCK' }, state);
    expect(calls).toHaveLength(0);
  });
});
