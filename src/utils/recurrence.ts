import type { Training } from '../types';
import { addDays } from './date';

export interface RecurringTrainingBase {
  teamId: string;
  date: string;
  time: string;
  duration: number;
  type: Training['type'];
  theme?: string;
  note?: string;
}

/**
 * Generates `count` weekly training occurrences sharing a series id
 * (specs §8.2). Each occurrence is an independent, separately editable entity.
 */
export function generateWeeklyTrainings(
  base: RecurringTrainingBase,
  count: number,
  makeId: () => string,
  seriesId: string
): Training[] {
  const list: Training[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      id: makeId(),
      teamId: base.teamId,
      date: addDays(base.date, 7 * i),
      time: base.time,
      duration: base.duration,
      type: base.type,
      cancelled: false,
      theme: base.theme,
      note: base.note,
      seriesId,
    });
  }
  return list;
}
