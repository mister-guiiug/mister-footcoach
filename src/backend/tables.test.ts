import { describe, it, expect } from 'vitest';
import { ARRAY_TABLES, ALL_TABLES } from './tables';
import { MOCK_DATA } from '../data/mock';

describe('ARRAY_TABLES mapping', () => {
  it('maps every array field of AppData to a table', () => {
    const arrayKeys = Object.entries(MOCK_DATA)
      .filter(([, v]) => Array.isArray(v))
      .map(([k]) => k)
      .sort();
    const mapped = ARRAY_TABLES.map(t => t.key).sort();
    expect(mapped).toEqual(arrayKeys);
  });

  it('includes the singleton tables in the realtime watch list', () => {
    expect(ALL_TABLES).toContain('seasons');
    expect(ALL_TABLES).toContain('club_settings');
    expect(ALL_TABLES).toContain('notification_preferences');
  });
});
