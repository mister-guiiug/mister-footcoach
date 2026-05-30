import { describe, it, expect } from 'vitest';
import {
  icalDateTime,
  icalEnd,
  escapeICalText,
  matchEvent,
  trainingEvent,
  buildICal,
} from './ical';
import type { Match, Training } from '../types';

function mkMatch(p: Partial<Match> & { id: string }): Match {
  return {
    teamId: 't1',
    seasonId: 's1',
    date: '2026-05-10',
    time: '10:00',
    location: 'Stade',
    address: '1 rue X',
    isHome: true,
    opponent: 'FC Rivale',
    status: 'engage',
    phase: 'Championnat',
    liveActive: false,
    ...p,
  };
}

describe('date helpers', () => {
  it('formats a floating iCal datetime', () => {
    expect(icalDateTime('2026-05-10', '10:00')).toBe('20260510T100000');
  });

  it('adds the duration, handling hour rollover', () => {
    expect(icalEnd('2026-05-10', '10:30', 120)).toBe('20260510T123000');
    expect(icalEnd('2026-05-10', '23:30', 60)).toBe('20260511T003000');
  });
});

describe('escapeICalText', () => {
  it('escapes commas, semicolons and newlines', () => {
    expect(escapeICalText('a, b; c\nd')).toBe('a\\, b\\; c\\nd');
  });
});

describe('matchEvent', () => {
  it('maps a cancelled match to CANCELLED', () => {
    expect(matchEvent(mkMatch({ id: 'm', status: 'annule' })).status).toBe(
      'CANCELLED'
    );
  });

  it('maps a provisional match to TENTATIVE', () => {
    expect(
      matchEvent(mkMatch({ id: 'm', status: 'previsionnel' })).status
    ).toBe('TENTATIVE');
  });

  it('maps a confirmed match to CONFIRMED', () => {
    expect(matchEvent(mkMatch({ id: 'm' })).status).toBe('CONFIRMED');
  });

  it('includes the tournament name in the description (RG-ICAL-04)', () => {
    const e = matchEvent(mkMatch({ id: 'm' }), 'Tournoi de Noël');
    expect(e.description).toContain('Tournoi : Tournoi de Noël');
  });

  it('has a stable uid', () => {
    expect(matchEvent(mkMatch({ id: 'm1' })).uid).toBe(
      'match-m1@mister-footcoach'
    );
  });
});

describe('trainingEvent', () => {
  it('uses the training duration for the end time', () => {
    const t: Training = {
      id: 'tr1',
      teamId: 't1',
      date: '2026-05-12',
      time: '18:00',
      duration: 90,
      type: 'regulier',
      cancelled: false,
    };
    const e = trainingEvent(t);
    expect(e.start).toBe('20260512T180000');
    expect(e.end).toBe('20260512T193000');
    expect(e.status).toBe('CONFIRMED');
  });
});

describe('buildICal', () => {
  it('wraps events in a VCALENDAR with CRLF line endings', () => {
    const ics = buildICal([matchEvent(mkMatch({ id: 'm' }))], 'U13 A');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:match-m@mister-footcoach');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('\r\n');
  });
});
