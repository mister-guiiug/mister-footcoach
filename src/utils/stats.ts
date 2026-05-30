import type {
  Match,
  MatchEvent,
  Attendance,
  PositionHistory,
  Player,
  Position,
} from '../types';

// ── Player statistics (specs §10.1 & §10.2) ──────────────────────────

export interface AttendanceBreakdown {
  present: number;
  absent: number;
  excuse: number;
  total: number;
  rate: number; // present / total, 0..1
}

export interface PlayerStats {
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  positionCounts: Partial<Record<Position, number>>;
  attendance: AttendanceBreakdown;
}

function attendanceBreakdown(records: Attendance[]): AttendanceBreakdown {
  const present = records.filter(a => a.status === 'present').length;
  const absent = records.filter(a => a.status === 'absent').length;
  const excuse = records.filter(a => a.status === 'excuse').length;
  const total = records.length;
  return {
    present,
    absent,
    excuse,
    total,
    rate: total === 0 ? 0 : present / total,
  };
}

export function computePlayerStats(
  playerId: string,
  matchEvents: MatchEvent[],
  attendances: Attendance[],
  positionHistory: PositionHistory[]
): PlayerStats {
  const playerHistory = positionHistory.filter(h => h.playerId === playerId);
  const matchesPlayed = new Set(playerHistory.map(h => h.matchId)).size;

  const positionCounts: Partial<Record<Position, number>> = {};
  for (const h of playerHistory) {
    positionCounts[h.position] = (positionCounts[h.position] ?? 0) + 1;
  }

  const playerEvents = matchEvents.filter(e => e.playerId === playerId);
  const goals = playerEvents.filter(e => e.type === 'but').length;
  const assists = matchEvents.filter(
    e => e.type === 'but' && e.player2Id === playerId
  ).length;
  const yellowCards = playerEvents.filter(
    e => e.type === 'carton_jaune'
  ).length;
  const redCards = playerEvents.filter(e => e.type === 'carton_rouge').length;

  return {
    matchesPlayed,
    goals,
    assists,
    yellowCards,
    redCards,
    positionCounts,
    attendance: attendanceBreakdown(
      attendances.filter(a => a.playerId === playerId)
    ),
  };
}

// ── Team statistics (specs §10.3) ────────────────────────────────────

export interface TopScorer {
  playerId: string;
  goals: number;
}

export interface TeamStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  topScorers: TopScorer[];
  attendance: AttendanceBreakdown;
}

/** Our goals/conceded for a played match, from the team's perspective. */
function ourScore(match: Match): { scored: number; conceded: number } | null {
  if (match.scoreHome === undefined || match.scoreAway === undefined)
    return null;
  return match.isHome
    ? { scored: match.scoreHome, conceded: match.scoreAway }
    : { scored: match.scoreAway, conceded: match.scoreHome };
}

export function computeTeamStats(
  teamId: string,
  matches: Match[],
  matchEvents: MatchEvent[],
  attendances: Attendance[],
  players: Player[]
): TeamStats {
  const teamMatches = matches.filter(
    m => m.teamId === teamId && m.status !== 'annule'
  );

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let played = 0;

  for (const m of teamMatches) {
    const sc = ourScore(m);
    if (!sc) continue;
    played += 1;
    goalsFor += sc.scored;
    goalsAgainst += sc.conceded;
    if (sc.scored > sc.conceded) wins += 1;
    else if (sc.scored === sc.conceded) draws += 1;
    else losses += 1;
  }

  // Top scorers across this team's matches.
  const teamMatchIds = new Set(teamMatches.map(m => m.id));
  const goalsByPlayer = new Map<string, number>();
  for (const e of matchEvents) {
    if (e.type !== 'but' || !e.playerId) continue;
    if (!teamMatchIds.has(e.matchId)) continue;
    goalsByPlayer.set(e.playerId, (goalsByPlayer.get(e.playerId) ?? 0) + 1);
  }
  const topScorers: TopScorer[] = [...goalsByPlayer.entries()]
    .map(([playerId, goals]) => ({ playerId, goals }))
    .sort((a, b) => b.goals - a.goals);

  // Attendance over all records for players belonging to the team.
  const teamPlayerIds = new Set(
    players
      .filter(p => p.primaryTeamId === teamId || p.secondaryTeamId === teamId)
      .map(p => p.id)
  );
  const teamAttendances = attendances.filter(a =>
    teamPlayerIds.has(a.playerId)
  );

  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    topScorers,
    attendance: attendanceBreakdown(teamAttendances),
  };
}
