import { describe, it, expect } from 'vitest';
import { computeGroupStandings } from './tournament';
import type { Match } from '../types';

const teamName = (id: string) => (id === 't1' ? 'U13 A' : 'Autre');

function mkMatch(p: Partial<Match> & { id: string }): Match {
  return {
    teamId: 't1',
    seasonId: 's1',
    date: '2026-05-23',
    time: '09:00',
    location: 'L',
    address: 'A',
    isHome: true,
    opponent: 'X',
    status: 'tournoi',
    phase: 'Poule A',
    liveActive: false,
    ...p,
  };
}

describe('computeGroupStandings', () => {
  const matches = [
    mkMatch({ id: 'm1', opponent: 'FC Lyon', scoreHome: 3, scoreAway: 1 }),
    mkMatch({ id: 'm2', opponent: 'AS Martin', scoreHome: 2, scoreAway: 2 }),
    mkMatch({ id: 'm3', opponent: 'US Ouest' }), // no score → ignored
  ];
  const table = computeGroupStandings(matches, teamName);

  it('ignores matches without a score (RG-TOURN-04)', () => {
    // US Ouest never played a scored match → absent from the table.
    expect(table.find(s => s.name === 'US Ouest')).toBeUndefined();
  });

  it('ranks our team first on points', () => {
    expect(table[0]?.name).toBe('U13 A');
    expect(table[0]?.points).toBe(4); // 1 win + 1 draw
    expect(table[0]?.played).toBe(2);
    expect(table[0]?.goalDiff).toBe(2);
  });

  it('awards 3 points for a win and 0 for a loss', () => {
    expect(table.find(s => s.name === 'FC Lyon')?.points).toBe(0);
    expect(table.find(s => s.name === 'FC Lyon')?.lost).toBe(1);
  });

  it('awards 1 point each for a draw', () => {
    expect(table.find(s => s.name === 'AS Martin')?.points).toBe(1);
    expect(table.find(s => s.name === 'AS Martin')?.drawn).toBe(1);
  });

  it('maps the score from our perspective when away', () => {
    const away = computeGroupStandings(
      [mkMatch({ id: 'a1', isHome: false, scoreHome: 1, scoreAway: 4 })],
      teamName
    );
    // Away: our goals = scoreAway = 4 → a win for us.
    expect(away.find(s => s.name === 'U13 A')?.won).toBe(1);
    expect(away.find(s => s.name === 'U13 A')?.goalsFor).toBe(4);
  });

  it('returns an empty table when there are no scored matches', () => {
    expect(computeGroupStandings([], teamName)).toEqual([]);
  });
});
