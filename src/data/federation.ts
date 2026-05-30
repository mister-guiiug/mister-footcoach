import type { FederationMatch } from '../utils/federation';

/**
 * Simulated federation feed for team "U13 A" (specs §17). Stands in for the
 * real federation API (PO-04) so the reconciliation flow is demonstrable.
 *
 * Against the seeded matches it yields: 1 score update (FC Rivale),
 * 1 date/time conflict (US Montmartre), 1 new season match (Racing Nord).
 */
export const FEDERATION_SAMPLE: FederationMatch[] = [
  {
    date: '2026-05-10',
    time: '15:00',
    opponent: 'FC Rivale',
    location: 'Stade Municipal',
    scoreHome: 1,
    scoreAway: 2,
  },
  {
    date: '2026-04-12',
    time: '16:00', // local match is at 15:30 → date/time conflict
    opponent: 'US Montmartre',
    location: 'Stade Municipal',
  },
  {
    date: '2026-05-24',
    time: '15:00',
    opponent: 'Racing Nord',
    location: 'Stade Régional',
  },
];
