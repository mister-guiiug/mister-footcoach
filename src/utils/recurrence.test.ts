import { describe, it, expect } from 'vitest';
import { generateWeeklyTrainings } from './recurrence';

const base = {
  teamId: 't1',
  date: '2026-05-04',
  time: '18:00',
  duration: 90,
  type: 'regulier' as const,
  theme: 'Pressing',
};

describe('generateWeeklyTrainings', () => {
  let n = 0;
  const makeId = () => `tr-${++n}`;

  it('generates the requested number of occurrences', () => {
    const list = generateWeeklyTrainings(base, 4, makeId, 'series-1');
    expect(list).toHaveLength(4);
  });

  it('spaces occurrences one week apart', () => {
    const list = generateWeeklyTrainings(base, 3, () => 'x', 's');
    expect(list.map(t => t.date)).toEqual([
      '2026-05-04',
      '2026-05-11',
      '2026-05-18',
    ]);
  });

  it('shares a series id and carries the base fields', () => {
    const list = generateWeeklyTrainings(base, 2, () => 'x', 'series-2');
    expect(list.every(t => t.seriesId === 'series-2')).toBe(true);
    expect(list[0]?.theme).toBe('Pressing');
    expect(list[0]?.duration).toBe(90);
    expect(list[0]?.cancelled).toBe(false);
  });
});
