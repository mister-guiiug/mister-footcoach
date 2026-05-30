import type { Player, Position, PositionHistory } from '../types';

/**
 * Suggestion score for placing a player at a given position (specs §11.5):
 * 1. preferred position (weight 1)
 * 2. appetence for the position (weight 2)
 * 3. number of times already played at that position (weight 3)
 */
export function positionScore(
  player: Player,
  position: Position,
  history: PositionHistory[]
): number {
  let score = 0;
  if (player.preferredPosition === position) score += 100;
  const appetence = player.appetences?.[position] ?? 0;
  score += appetence * 10;
  const timesPlayed = history.filter(
    h => h.playerId === player.id && h.position === position
  ).length;
  score += timesPlayed;
  return score;
}

/** True when the player is a strong fit for the position (preferred or high appetence). */
export function isSuggested(player: Player, position: Position): boolean {
  return (
    player.preferredPosition === position ||
    (player.appetences?.[position] ?? 0) >= 4
  );
}

/** Players sorted by descending suitability for the position. */
export function rankPlayersForPosition(
  players: Player[],
  position: Position,
  history: PositionHistory[]
): Player[] {
  return [...players].sort(
    (a, b) =>
      positionScore(b, position, history) - positionScore(a, position, history)
  );
}
