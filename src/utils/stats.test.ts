import { describe, it, expect } from 'vitest';
import { computePlayerStats, computeTeamStats } from './stats';
import type {
  Match,
  MatchEvent,
  Attendance,
  PositionHistory,
  Player,
} from '../types';

const positionHistory: PositionHistory[] = [
  {
    id: 'h1',
    playerId: 'p1',
    matchId: 'm1',
    matchDate: '2026-01-01',
    opponent: 'X',
    period: '1ère mi-temps',
    position: 'AT',
  },
  {
    id: 'h2',
    playerId: 'p1',
    matchId: 'm1',
    matchDate: '2026-01-01',
    opponent: 'X',
    period: '2ème mi-temps',
    position: 'AT',
  },
  {
    id: 'h3',
    playerId: 'p1',
    matchId: 'm2',
    matchDate: '2026-01-08',
    opponent: 'Y',
    period: 'complet',
    position: 'MC',
  },
];

const matchEvents: MatchEvent[] = [
  { id: 'e1', matchId: 'm1', type: 'but', playerId: 'p1' },
  { id: 'e2', matchId: 'm1', type: 'but', playerId: 'p2', player2Id: 'p1' },
  { id: 'e3', matchId: 'm1', type: 'carton_jaune', playerId: 'p1' },
  { id: 'e4', matchId: 'm2', type: 'but', playerId: 'p1' },
  { id: 'e5', matchId: 'm2', type: 'but', playerId: 'p2' },
];

const attendances: Attendance[] = [
  {
    id: 'a1',
    sessionType: 'match',
    sessionId: 'm1',
    playerId: 'p1',
    status: 'present',
  },
  {
    id: 'a2',
    sessionType: 'training',
    sessionId: 't1',
    playerId: 'p1',
    status: 'present',
  },
  {
    id: 'a3',
    sessionType: 'training',
    sessionId: 't2',
    playerId: 'p1',
    status: 'absent',
  },
  {
    id: 'a4',
    sessionType: 'match',
    sessionId: 'm1',
    playerId: 'p2',
    status: 'excuse',
  },
];

describe('computePlayerStats', () => {
  const stats = computePlayerStats(
    'p1',
    matchEvents,
    attendances,
    positionHistory
  );

  it('counts distinct matches played', () => {
    expect(stats.matchesPlayed).toBe(2);
  });

  it('counts goals scored by the player', () => {
    expect(stats.goals).toBe(2);
  });

  it('counts assists (player2Id)', () => {
    expect(stats.assists).toBe(1);
  });

  it('counts yellow cards', () => {
    expect(stats.yellowCards).toBe(1);
  });

  it('aggregates positions played', () => {
    expect(stats.positionCounts.AT).toBe(2);
    expect(stats.positionCounts.MC).toBe(1);
  });

  it('computes attendance breakdown and rate', () => {
    expect(stats.attendance.total).toBe(3);
    expect(stats.attendance.present).toBe(2);
    expect(stats.attendance.absent).toBe(1);
    expect(stats.attendance.rate).toBeCloseTo(2 / 3);
  });

  it('returns zero rate when no attendance', () => {
    const s = computePlayerStats('ghost', [], [], []);
    expect(s.attendance.rate).toBe(0);
    expect(s.matchesPlayed).toBe(0);
  });
});

const teamMatches: Match[] = [
  {
    id: 'm1',
    teamId: 't1',
    isHome: true,
    scoreHome: 3,
    scoreAway: 1,
    status: 'saison',
  } as Match,
  {
    id: 'm2',
    teamId: 't1',
    isHome: false,
    scoreHome: 2,
    scoreAway: 2,
    status: 'saison',
  } as Match,
  {
    id: 'm3',
    teamId: 't1',
    isHome: true,
    scoreHome: 0,
    scoreAway: 4,
    status: 'annule',
  } as Match,
  { id: 'm4', teamId: 't1', isHome: true, status: 'engage' } as Match,
];

const teamPlayers: Player[] = [
  { id: 'p1', primaryTeamId: 't1' } as Player,
  { id: 'p2', primaryTeamId: 't1' } as Player,
];

describe('computeTeamStats', () => {
  const stats = computeTeamStats(
    't1',
    teamMatches,
    matchEvents,
    attendances,
    teamPlayers
  );

  it('ignores cancelled and unplayed matches', () => {
    expect(stats.played).toBe(2);
  });

  it('counts wins/draws/losses from team perspective', () => {
    expect(stats.wins).toBe(1);
    expect(stats.draws).toBe(1);
    expect(stats.losses).toBe(0);
  });

  it('sums goals for and against', () => {
    expect(stats.goalsFor).toBe(5);
    expect(stats.goalsAgainst).toBe(3);
  });

  it('ranks top scorers', () => {
    expect(stats.topScorers[0]).toEqual({ playerId: 'p1', goals: 2 });
    expect(stats.topScorers.find(s => s.playerId === 'p2')?.goals).toBe(2);
  });

  it('aggregates team attendance', () => {
    expect(stats.attendance.total).toBe(4);
    expect(stats.attendance.present).toBe(2);
  });
});
