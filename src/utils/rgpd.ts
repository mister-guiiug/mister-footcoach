import type {
  Player,
  Contact,
  Attendance,
  Unavailability,
  Injury,
  PositionHistory,
  SurveyResponse,
} from '../types';

export interface PlayerExportInput {
  players: Player[];
  contacts: Contact[];
  attendances: Attendance[];
  unavailabilities: Unavailability[];
  injuries: Injury[];
  positionHistory: PositionHistory[];
  surveyResponses: SurveyResponse[];
}

/**
 * Gathers all data held about a player for an RGPD access/portability
 * request (specs §18.4). Contacts expose coordinates but no other player.
 */
export function buildPlayerExport(playerId: string, data: PlayerExportInput) {
  const player = data.players.find(p => p.id === playerId);
  return {
    exportedAt: new Date().toISOString(),
    player: player ?? null,
    contacts: data.contacts
      .filter(c => c.playerIds.includes(playerId))
      .map(c => ({
        firstName: c.firstName,
        lastName: c.lastName,
        type: c.type,
        phone: c.phone,
        email: c.email,
        consentDate: c.consentDate,
        consentVersion: c.consentVersion,
      })),
    attendances: data.attendances.filter(a => a.playerId === playerId),
    unavailabilities: data.unavailabilities.filter(
      u => u.playerId === playerId
    ),
    injuries: data.injuries.filter(i => i.playerId === playerId),
    positionHistory: data.positionHistory.filter(h => h.playerId === playerId),
    surveyResponses: data.surveyResponses.filter(r => r.playerId === playerId),
  };
}

export function exportToJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function csvCell(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Flattens the player's attendance records to CSV. */
export function attendancesToCsv(attendances: Attendance[]): string {
  const header = ['sessionType', 'sessionId', 'status', 'note'];
  const rows = attendances.map(a =>
    [a.sessionType, a.sessionId, a.status, a.note ?? ''].map(csvCell).join(',')
  );
  return [header.join(','), ...rows].join('\n');
}
