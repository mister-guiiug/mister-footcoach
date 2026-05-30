import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatDateFull,
  isUpcoming,
  isPast,
  age,
  today,
  isActiveUnavailability,
} from './date';

describe('formatDate', () => {
  it('formats a date in long French format', () => {
    const result = formatDate('2026-05-10');
    expect(result).toMatch(/10/);
    expect(result).toMatch(/mai|05/i);
    expect(result).toMatch(/2026/);
  });
});

describe('formatDateShort', () => {
  it('formats a date without year', () => {
    const result = formatDateShort('2026-05-10');
    expect(result).toMatch(/10/);
    expect(result).toMatch(/mai|05/i);
    expect(result).not.toMatch(/2026/);
  });
});

describe('formatDateFull', () => {
  it('includes weekday, day, month, year', () => {
    const result = formatDateFull('2026-05-10');
    // 10 May 2026 is a Sunday (dimanche)
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/10/);
  });
});

describe('isUpcoming', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns true for a future date', () => {
    expect(isUpcoming('2026-05-10')).toBe(true);
  });

  it('returns true for today', () => {
    expect(isUpcoming('2026-05-05')).toBe(true);
  });

  it('returns false for a past date', () => {
    expect(isUpcoming('2026-04-30')).toBe(false);
  });
});

describe('isPast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns true for a past date', () => {
    expect(isPast('2026-04-30')).toBe(true);
  });

  it('returns false for today', () => {
    expect(isPast('2026-05-05')).toBe(false);
  });

  it('returns false for a future date', () => {
    expect(isPast('2026-05-10')).toBe(false);
  });
});

describe('age', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('computes exact age when birthday already passed this year', () => {
    // Born 2012-03-15, today is 2026-05-05 → 14 years
    expect(age('2012-03-15')).toBe(14);
  });

  it('computes age minus one when birthday not yet reached (month before)', () => {
    // Born 2012-08-01, today is 2026-05-05 → birthday not reached → 13
    expect(age('2012-08-01')).toBe(13);
  });

  it('computes age minus one when birthday is same month but day not reached', () => {
    // Born 2012-05-10, today is 2026-05-05 → day 10 not reached → 13
    expect(age('2012-05-10')).toBe(13);
  });

  it('computes correct age when birthday is exactly today', () => {
    // Born 2012-05-05 → turns 14 today
    expect(age('2012-05-05')).toBe(14);
  });
});

describe('today', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns ISO date string for today', () => {
    expect(today()).toBe('2026-05-05');
  });
});

describe('isActiveUnavailability', () => {
  it('is active when start <= checkDate and no end', () => {
    expect(isActiveUnavailability('2026-05-01', undefined, '2026-05-05')).toBe(
      true
    );
  });

  it('is active when start <= checkDate and end >= checkDate', () => {
    expect(
      isActiveUnavailability('2026-05-01', '2026-05-10', '2026-05-05')
    ).toBe(true);
  });

  it('is inactive when start > checkDate', () => {
    expect(isActiveUnavailability('2026-05-10', undefined, '2026-05-05')).toBe(
      false
    );
  });

  it('is inactive when end < checkDate', () => {
    expect(
      isActiveUnavailability('2026-04-01', '2026-04-20', '2026-05-05')
    ).toBe(false);
  });

  it('uses today when no date arg provided', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T12:00:00'));
    // start well before today, no end → active
    expect(isActiveUnavailability('2026-01-01')).toBe(true);
    vi.useRealTimers();
  });
});
