import { describe, it, expect } from 'vitest';
import { positionScore, isSuggested, rankPlayersForPosition } from './lineup';
import type { Player, PositionHistory } from '../types';

function mkPlayer(p: Partial<Player> & { id: string }): Player {
  return {
    firstName: 'X',
    lastName: 'Y',
    dateOfBirth: '2014-01-01',
    primaryTeamId: 't1',
    preferredPosition: 'MC',
    appetences: {},
    active: true,
    ...p,
  };
}

const history: PositionHistory[] = [
  {
    id: 'h1',
    playerId: 'p3',
    matchId: 'm1',
    matchDate: '2026-01-01',
    opponent: 'X',
    period: 'complet',
    position: 'AT',
  },
];

describe('positionScore', () => {
  it('rewards the preferred position most', () => {
    const p = mkPlayer({ id: 'p1', preferredPosition: 'AT' });
    expect(positionScore(p, 'AT', [])).toBeGreaterThan(
      positionScore(p, 'MC', [])
    );
  });

  it('adds appetence weight', () => {
    const p = mkPlayer({
      id: 'p2',
      preferredPosition: 'MC',
      appetences: { AT: 5 },
    });
    expect(positionScore(p, 'AT', [])).toBe(50);
  });

  it('adds times-played weight', () => {
    const p = mkPlayer({ id: 'p3', preferredPosition: 'MC' });
    expect(positionScore(p, 'AT', history)).toBe(1);
  });
});

describe('isSuggested', () => {
  it('is true for the preferred position', () => {
    expect(
      isSuggested(mkPlayer({ id: 'a', preferredPosition: 'DC' }), 'DC')
    ).toBe(true);
  });

  it('is true for high appetence (>=4)', () => {
    expect(
      isSuggested(mkPlayer({ id: 'b', appetences: { ATG: 4 } }), 'ATG')
    ).toBe(true);
  });

  it('is false otherwise', () => {
    expect(
      isSuggested(mkPlayer({ id: 'c', appetences: { ATG: 2 } }), 'ATG')
    ).toBe(false);
  });
});

describe('rankPlayersForPosition', () => {
  it('orders the best fit first', () => {
    const players = [
      mkPlayer({ id: 'mid', preferredPosition: 'MC' }),
      mkPlayer({ id: 'striker', preferredPosition: 'AT' }),
      mkPlayer({ id: 'appet', preferredPosition: 'MC', appetences: { AT: 5 } }),
    ];
    const ranked = rankPlayersForPosition(players, 'AT', []);
    expect(ranked[0]?.id).toBe('striker');
    expect(ranked.at(-1)?.id).toBe('mid');
  });
});
