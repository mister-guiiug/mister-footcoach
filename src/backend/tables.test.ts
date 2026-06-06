import { describe, it, expect } from 'vitest';
import { ARRAY_TABLES, ALL_TABLES, reconcileSelectedTeam } from './tables';
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
