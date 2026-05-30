import type { Match } from '../types';

/** A match as returned by the (simulated) federation API (specs §17.2). */
export interface FederationMatch {
  date: string;
  time: string;
  opponent: string;
  location?: string;
  scoreHome?: number;
  scoreAway?: number;
}

export interface FederationConflict {
  matchId: string;
  field: 'date' | 'lieu' | 'score';
  local: string;
  federal: string;
}

export interface ReconcileResult {
  updated: Match[];
  created: Match[];
  conflicts: FederationConflict[];
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Reconciles federation matches against local ones (specs §17.3–17.4).
 * Matches by date+time+opponent; federal fields (score, status) are applied
 * without overwriting local-only fields. Live scores are never overwritten —
 * a difference is surfaced as a conflict instead.
 */
export function reconcileFederationMatches(
  localMatches: Match[],
  fedMatches: FederationMatch[],
  ctx: { teamId: string; seasonId: string; makeId: () => string }
): ReconcileResult {
  const updated: Match[] = [];
  const created: Match[] = [];
  const conflicts: FederationConflict[] = [];
  const consumed = new Set<string>();

  const teamMatches = localMatches.filter(m => m.teamId === ctx.teamId);

  for (const fed of fedMatches) {
    const exact = teamMatches.find(
      m =>
        !consumed.has(m.id) &&
        m.date === fed.date &&
        m.time === fed.time &&
        norm(m.opponent) === norm(fed.opponent)
    );
    const byOpponent =
      exact ??
      teamMatches.find(
        m =>
          !consumed.has(m.id) &&
          norm(m.opponent) === norm(fed.opponent) &&
          m.status !== 'annule'
      );

    if (!byOpponent) {
      created.push({
        id: ctx.makeId(),
        teamId: ctx.teamId,
        seasonId: ctx.seasonId,
        date: fed.date,
        time: fed.time,
        location: fed.location ?? '',
        address: '',
        isHome: true,
        opponent: fed.opponent,
        status: 'saison',
        phase: 'Championnat',
        scoreHome: fed.scoreHome,
        scoreAway: fed.scoreAway,
        liveActive: false,
      });
      continue;
    }

    consumed.add(byOpponent.id);
    const changes: Partial<Match> = {};

    // Date/time conflict — never auto-changed, the coach decides (§17.4).
    if (byOpponent.date !== fed.date || byOpponent.time !== fed.time) {
      conflicts.push({
        matchId: byOpponent.id,
        field: 'date',
        local: `${byOpponent.date} ${byOpponent.time}`,
        federal: `${fed.date} ${fed.time}`,
      });
    }

    // Location: federal value applied by default.
    if (fed.location && byOpponent.location !== fed.location) {
      conflicts.push({
        matchId: byOpponent.id,
        field: 'lieu',
        local: byOpponent.location,
        federal: fed.location,
      });
      changes.location = fed.location;
    }

    // Score: federal wins unless the live mode produced it.
    if (fed.scoreHome !== undefined && fed.scoreAway !== undefined) {
      const differs =
        byOpponent.scoreHome !== fed.scoreHome ||
        byOpponent.scoreAway !== fed.scoreAway;
      if (differs) {
        if (byOpponent.liveActive) {
          conflicts.push({
            matchId: byOpponent.id,
            field: 'score',
            local: `${byOpponent.scoreHome ?? '-'}-${byOpponent.scoreAway ?? '-'}`,
            federal: `${fed.scoreHome}-${fed.scoreAway}`,
          });
        } else {
          changes.scoreHome = fed.scoreHome;
          changes.scoreAway = fed.scoreAway;
        }
      }
    }

    // Federal validation promotes the match to a season match.
    if (
      byOpponent.status === 'previsionnel' ||
      byOpponent.status === 'engage'
    ) {
      changes.status = 'saison';
    }

    if (Object.keys(changes).length > 0) {
      updated.push({ ...byOpponent, ...changes });
    }
  }

  return { updated, created, conflicts };
}
