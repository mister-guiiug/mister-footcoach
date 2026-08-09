import { describe, it, expect } from 'vitest';
import { buildPlayerExport, exportToJson, attendancesToCsv } from './rgpd';
import type {
  Player,
  Contact,
  Attendance,
  Unavailability,
  Injury,
  PositionHistory,
  SurveyResponse,
} from '../types';

const players: Player[] = [
  {
    id: 'p1',
    firstName: 'Lucas',
    lastName: 'Dupont',
    dateOfBirth: '2014-01-01',
    primaryTeamId: 't1',
    preferredPosition: 'MC',
    appetences: {},
    active: true,
  },
  {
    id: 'p2',
    firstName: 'Autre',
    lastName: 'Joueur',
    dateOfBirth: '2014-01-01',
    primaryTeamId: 't1',
    preferredPosition: 'AT',
    appetences: {},
    active: true,
  },
];

const contacts: Contact[] = [
  {
    id: 'c1',
    firstName: 'Pierre',
    lastName: 'Dupont',
    phone: '06',
    email: 'p@x.fr',
    type: 'père',
    playerIds: ['p1'],
    consentDate: '2025-09-01',
  },
  {
    id: 'c3',
    firstName: 'X',
    lastName: 'Y',
    phone: '06',
    email: 'y@x.fr',
    type: 'père',
    playerIds: ['p2'],
  },
];

const attendances: Attendance[] = [
  {
    id: 'a1',
    sessionType: 'match',
    sessionId: 'm1',
    playerId: 'p1',
    status: 'present',
  },
  {
    id: 'a2',
    sessionType: 'training',
    sessionId: 't1',
    playerId: 'p2',
    status: 'absent',
  },
];

const unavailabilities: Unavailability[] = [
  {
    id: 'u1',
    playerId: 'p1',
    startDate: '2026-01-01',
    motif: 'maladie',
    declaredBy: 'u1',
  },
];
const injuries: Injury[] = [];
const positionHistory: PositionHistory[] = [];
const surveyResponses: SurveyResponse[] = [];

const input = {
  players,
  contacts,
  attendances,
  unavailabilities,
  injuries,
  positionHistory,
  surveyResponses,
};

describe('buildPlayerExport', () => {
  const exp = buildPlayerExport('p1', input);

  it('includes only the requested player', () => {
    expect(exp.player?.id).toBe('p1');
  });

  it('includes only that player’s contacts', () => {
    expect(exp.contacts).toHaveLength(1);
    expect(exp.contacts[0]?.firstName).toBe('Pierre');
  });

  it('includes only that player’s attendances and unavailabilities', () => {
    expect(exp.attendances).toHaveLength(1);
    expect(exp.attendances[0]?.id).toBe('a1');
    expect(exp.unavailabilities).toHaveLength(1);
  });

  it('does not leak other players’ data', () => {
    expect(JSON.stringify(exp)).not.toContain('p2');
  });
});

describe('exportToJson', () => {
  it('pretty-prints JSON', () => {
    expect(exportToJson({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
});

describe('attendancesToCsv', () => {
  it('emits a header and one row per record', () => {
    const csv = attendancesToCsv(attendances);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('sessionType,sessionId,status,note');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('match,m1,present');
  });

  it('quotes cells containing commas', () => {
    const csv = attendancesToCsv([
      {
        id: 'a',
        sessionType: 'match',
        sessionId: 'm',
        playerId: 'p',
        status: 'present',
        note: 'a, b',
      },
    ]);
    expect(csv).toContain('"a, b"');
  });
});
