import { describe, it, expect } from 'vitest';
import { genId, nowDate, nowIso } from './id';

describe('genId', () => {
  it('prefixes the id', () => {
    expect(genId('match')).toMatch(/^match-/);
  });

  it('returns unique ids on successive calls', () => {
    const a = genId('x');
    const b = genId('x');
    expect(a).not.toBe(b);
  });
});

describe('nowDate', () => {
  it('returns an ISO date (YYYY-MM-DD)', () => {
    expect(nowDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('nowIso', () => {
  it('returns a full ISO timestamp', () => {
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
