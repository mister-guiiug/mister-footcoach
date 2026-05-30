import { describe, it, expect } from 'vitest';
import { reconcileFederationMatches, type FederationMatch } from './federation';
import type { Match } from '../types';

function mkMatch(p: Partial<Match> & { id: string }): Match {
  return {
    teamId: 't1',
    seasonId: 's1',
    date: '2026-05-10',
    time: '15:00',
    location: 'Stade',
    address: '',
    isHome: true,
    opponent: 'FC Rivale',
    status: 'saison',
    phase: 'Championnat',
    liveActive: false,
    ...p,
  };
}

let counter = 0;
const ctx = {
  teamId: 't1',
  seasonId: 's1',
  makeId: () => `new-${++counter}`,
};

describe('reconcileFederationMatches', () => {
  it('updates the federal score of an exactly matched match', () => {
    const local = [
      mkMatch({ id: 'm1', scoreHome: undefined, scoreAway: undefined }),
    ];
    const fed: FederationMatch[] = [
      {
        date: '2026-05-10',
        time: '15:00',
        opponent: 'FC Rivale',
        scoreHome: 1,
        scoreAway: 2,
      },
    ];
    const res = reconcileFederationMatches(local, fed, ctx);
    expect(res.updated).toHaveLength(1);
    expect(res.updated[0].scoreHome).toBe(1);
    expect(res.updated[0].scoreAway).toBe(2);
    expect(res.created).toHaveLength(0);
  });

  it('creates a season match when none matches', () => {
    const res = reconcileFederationMatches(
      [],
      [{ date: '2026-05-24', time: '15:00', opponent: 'Racing Nord' }],
      ctx
    );
    expect(res.created).toHaveLength(1);
    expect(res.created[0].status).toBe('saison');
    expect(res.created[0].opponent).toBe('Racing Nord');
  });

  it('flags a date/time conflict when only the opponent matches', () => {
    const local = [
      mkMatch({ id: 'm3', opponent: 'US Montmartre', time: '15:30' }),
    ];
    const fed: FederationMatch[] = [
      { date: '2026-05-10', time: '16:00', opponent: 'US Montmartre' },
    ];
    const res = reconcileFederationMatches(local, fed, ctx);
    expect(res.conflicts.some(c => c.field === 'date')).toBe(true);
    expect(res.created).toHaveLength(0);
  });

  it('never overwrites a live score (records a conflict instead)', () => {
    const local = [
      mkMatch({ id: 'm1', liveActive: true, scoreHome: 3, scoreAway: 0 }),
    ];
    const fed: FederationMatch[] = [
      {
        date: '2026-05-10',
        time: '15:00',
        opponent: 'FC Rivale',
        scoreHome: 1,
        scoreAway: 2,
      },
    ];
    const res = reconcileFederationMatches(local, fed, ctx);
    expect(res.conflicts.some(c => c.field === 'score')).toBe(true);
    expect(res.updated).toHaveLength(0);
  });

  it('promotes a provisional match to a season match', () => {
    const local = [mkMatch({ id: 'm1', status: 'previsionnel' })];
    const fed: FederationMatch[] = [
      { date: '2026-05-10', time: '15:00', opponent: 'FC Rivale' },
    ];
    const res = reconcileFederationMatches(local, fed, ctx);
    expect(res.updated[0].status).toBe('saison');
  });

  it('ignores matches from other teams', () => {
    const local = [mkMatch({ id: 'mx', teamId: 't2', opponent: 'FC Rivale' })];
    const fed: FederationMatch[] = [
      { date: '2026-05-10', time: '15:00', opponent: 'FC Rivale' },
    ];
    const res = reconcileFederationMatches(local, fed, ctx);
    // No t1 match → it is created instead of matched.
    expect(res.created).toHaveLength(1);
  });
});
