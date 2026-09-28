import { describe, expect, it } from 'vitest';
import { attendanceId, NEXT_ATTENDANCE } from './attendance';

describe('attendance', () => {
  it('a player not yet recorded becomes present on the first tap', () => {
    expect(NEXT_ATTENDANCE.unset).toBe('present');
  });

  it('then cycles présent → absent → excusé → présent', () => {
    expect(NEXT_ATTENDANCE.present).toBe('absent');
    expect(NEXT_ATTENDANCE.absent).toBe('excuse');
    expect(NEXT_ATTENDANCE.excuse).toBe('present');
  });

  it('the id is the session and the player: stable, one per pair', () => {
    expect(attendanceId('training', 'tr1', 'p1')).toBe('att-training-tr1-p1');
    expect(attendanceId('match', 'tr1', 'p1')).not.toBe(
      attendanceId('training', 'tr1', 'p1')
    );
  });
});
