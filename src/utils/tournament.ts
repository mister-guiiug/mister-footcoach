import type { Match } from '../types';

/**
 * Standing of a single entrant within a tournament group (specs §12.4).
 * Points: win 3, draw 1, loss 0. Tie-break: goal difference, then goals for.
 */
export interface GroupStanding {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

function emptyStanding(name: string): GroupStanding {
  return {
    name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
  };
}

function recordResult(s: GroupStanding, scored: number, conceded: number) {
  s.played += 1;
  s.goalsFor += scored;
  s.goalsAgainst += conceded;
  s.goalDiff = s.goalsFor - s.goalsAgainst;
  if (scored > conceded) {
    s.won += 1;
    s.points += 3;
  } else if (scored === conceded) {
    s.drawn += 1;
    s.points += 1;
  } else {
    s.lost += 1;
  }
}

/**
 * Computes the standings for a set of group matches. Each match is read from
 * both entrants' perspective (our team vs the opponent). Only matches with
 * both scores entered are counted (RG-TOURN-04).
 */
export function computeGroupStandings(
  matches: Match[],
  teamName: (teamId: string) => string
): GroupStanding[] {
  const table = new Map<string, GroupStanding>();

  function entrant(name: string): GroupStanding {
    let s = table.get(name);
    if (!s) {
      s = emptyStanding(name);
      table.set(name, s);
    }
    return s;
  }

  for (const m of matches) {
    if (m.scoreHome === undefined || m.scoreAway === undefined) continue;
    const ourName = teamName(m.teamId);
    const oppName = m.opponent;
    const ourScored = m.isHome ? m.scoreHome : m.scoreAway;
    const ourConceded = m.isHome ? m.scoreAway : m.scoreHome;
    recordResult(entrant(ourName), ourScored, ourConceded);
    recordResult(entrant(oppName), ourConceded, ourScored);
  }

  return [...table.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.name.localeCompare(b.name)
  );
}
