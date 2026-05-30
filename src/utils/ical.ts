import type { Match, Training } from '../types';

/** An RFC 5545 calendar event (specs §13.3). */
export interface CalendarEvent {
  uid: string;
  summary: string;
  start: string; // iCal datetime (floating local), e.g. 20260510T100000
  end: string;
  location?: string;
  description?: string;
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Formats a YYYY-MM-DD date + HH:MM time as a floating iCal datetime. */
export function icalDateTime(date: string, time: string): string {
  const [y, m, d] = date.split('-');
  const [hh, mm] = (time || '00:00').split(':');
  return `${y}${m}${d}T${hh}${mm}00`;
}

/** Same, shifted by `durationMin` minutes (handles hour/day rollover). */
export function icalEnd(
  date: string,
  time: string,
  durationMin: number
): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  const dt = new Date(y!, m! - 1, d!, hh!, mm! + durationMin);
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

/** Escapes a text value for iCal (RFC 5545 §3.3.11). */
export function escapeICalText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function matchEvent(
  match: Match,
  tournamentName?: string
): CalendarEvent {
  const status =
    match.status === 'annule'
      ? 'CANCELLED'
      : match.status === 'previsionnel'
        ? 'TENTATIVE'
        : 'CONFIRMED';
  const descParts = [`Statut : ${match.status}`, `Phase : ${match.phase}`];
  if (tournamentName) descParts.push(`Tournoi : ${tournamentName}`);
  if (match.meetingTime || match.meetingAddress) {
    descParts.push(
      `RDV : ${[match.meetingTime, match.meetingAddress].filter(Boolean).join(' — ')}`
    );
  }
  return {
    uid: `match-${match.id}@mister-footcoach`,
    summary: `⚽ ${match.isHome ? 'vs' : '@'} ${match.opponent}`,
    start: icalDateTime(match.date, match.time),
    end: icalEnd(match.date, match.time, 120),
    location: [match.location, match.address].filter(Boolean).join(', '),
    description: descParts.join('\n'),
    status,
  };
}

export function trainingEvent(training: Training): CalendarEvent {
  return {
    uid: `training-${training.id}@mister-footcoach`,
    summary: `🏋 ${training.theme ?? 'Entraînement'}`,
    start: icalDateTime(training.date, training.time),
    end: icalEnd(training.date, training.time, training.duration),
    description: training.note,
    status: training.cancelled ? 'CANCELLED' : 'CONFIRMED',
  };
}

/** Builds a complete .ics document from calendar events. */
export function buildICal(events: CalendarEvent[], calName: string): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mister Footcoach//FR',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeICalText(calName)}`,
  ];
  for (const e of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.uid}`);
    lines.push(`SUMMARY:${escapeICalText(e.summary)}`);
    lines.push(`DTSTART:${e.start}`);
    lines.push(`DTEND:${e.end}`);
    if (e.location) lines.push(`LOCATION:${escapeICalText(e.location)}`);
    if (e.description)
      lines.push(`DESCRIPTION:${escapeICalText(e.description)}`);
    lines.push(`STATUS:${e.status}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
