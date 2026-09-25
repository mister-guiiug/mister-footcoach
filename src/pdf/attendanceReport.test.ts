/**
 * Le rapport d'assiduité, lu sur son contenu. Jeu de production : l'équipe
 * U13 A a quatre entraînements et sept matchs sur la saison (dont trois au
 * tournoi du 23/05), et des présences relevées à l'entraînement du 29/04 et
 * au match du 26/04.
 */
import { describe, expect, it } from 'vitest';
import { createTranslator } from '@mister-guiiug/dev-pwa-config/react/i18n';
import { MOCK_DATA } from '../data/mock';
import { messages } from '../i18n/messages';
import type { Attendance, Player } from '../types';
import {
  buildAttendanceReport,
  summarizeAttendance,
  type AttendanceReportInput,
} from './attendanceReport';
import type { PdfBlock, PdfDocument, PdfI18n, Translate } from './document';

const fr: PdfI18n = {
  t: createTranslator(messages, 'fr', 'fr') as Translate,
  localeTag: 'fr',
};
const en: PdfI18n = {
  t: createTranslator(messages, 'en', 'fr') as Translate,
  localeTag: 'en',
};

const teamA = MOCK_DATA.teams[0]!;

function inputFor(
  over: Partial<AttendanceReportInput> = {}
): AttendanceReportInput {
  return {
    team: teamA,
    clubName: 'FC Exemple',
    seasonName: MOCK_DATA.season.name,
    players: MOCK_DATA.players,
    matches: MOCK_DATA.matches,
    trainings: MOCK_DATA.trainings,
    attendances: MOCK_DATA.attendances,
    from: MOCK_DATA.season.startDate,
    to: MOCK_DATA.season.endDate,
    generatedAt: new Date(2026, 8, 25, 10, 0),
    ...over,
  };
}

const report = (over?: Partial<AttendanceReportInput>) =>
  buildAttendanceReport(inputFor(over), fr).document;

function field(doc: PdfDocument, label: string): string | undefined {
  for (const block of doc.blocks) {
    if (block.kind !== 'fields') continue;
    const row = block.rows.find(r => r.label === label);
    if (row) return row.value;
  }
  return undefined;
}

function table(doc: PdfDocument): Extract<PdfBlock, { kind: 'table' }> {
  const found = doc.blocks.find(b => b.kind === 'table');
  if (found?.kind !== 'table') throw new Error('aucun tableau');
  return found;
}

describe('buildAttendanceReport — contenu', () => {
  it('présente l’équipe, la saison et la période', () => {
    const doc = report();
    expect(doc.kicker).toBe('FC Exemple');
    expect(doc.title).toBe("Rapport d'assiduité");
    expect(doc.subtitle).toBe('U13 A · du 1 août 2025 au 30 juin 2026');
    expect(field(doc, 'Équipe')).toBe('U13 A');
    expect(field(doc, 'Saison')).toBe('2025-2026');
    expect(field(doc, 'Période')).toBe('du 1 août 2025 au 30 juin 2026');
    expect(field(doc, 'Entraînements')).toBe('4');
    expect(field(doc, 'Matchs')).toBe('7');
  });

  it('compte par joueur, en colonnes chiffrées, par ordre alphabétique', () => {
    const { columns, rows, total } = table(report());
    expect(columns.map(c => c.header)).toEqual([
      'Joueur',
      'Présent',
      'Absent',
      'Excusé',
      'Saisies',
      'Taux',
    ]);
    // Les chiffres s'alignent à droite, le nom à gauche.
    expect(columns.map(c => c.align ?? 'left')).toEqual([
      'left',
      'right',
      'right',
      'right',
      'right',
      'right',
    ]);
    expect(rows).toEqual([
      ['Mathis Bernard', '1', '1', '0', '2', '50 %'],
      ['Lucas Dupont', '2', '0', '0', '2', '100 %'],
      ['Axel Durand', '1', '0', '1', '2', '50 %'],
      // Renfort de l'équipe B, rien de relevé ici : un tiret, pas « 0 % ».
      ['Sacha Guerin', '0', '0', '0', '0', '–'],
      ['Théo Marchand', '0', '0', '0', '0', '–'],
      ['Théo Martin', '2', '0', '0', '2', '100 %'],
      ['Tom Moreau', '2', '0', '0', '2', '100 %'],
      ['Hugo Petit', '2', '0', '0', '2', '100 %'],
      ['Nathan Richard', '2', '0', '0', '2', '100 %'],
      ['Lilian Simon', '0', '0', '0', '0', '–'],
      ['Enzo Thomas', '0', '1', '1', '2', '0 %'],
    ]);
    expect(total).toEqual(["Total de l'équipe", '12', '2', '2', '16', '75 %']);
  });

  it('explique la base du taux sous le tableau', () => {
    const legend = report().blocks.at(-1);
    expect(legend).toMatchObject({ kind: 'text', tone: 'muted' });
    expect(legend?.kind === 'text' && legend.text).toContain(
      'Taux : présences / saisies'
    );
  });

  it('dit qu’il n’y a personne plutôt que d’imprimer un tableau vide', () => {
    const doc = report({ players: [] });
    expect(doc.blocks.some(b => b.kind === 'table')).toBe(false);
    expect(doc.blocks.at(-1)).toEqual({
      kind: 'text',
      text: "Aucun joueur dans l'effectif.",
      tone: 'muted',
    });
  });

  it('n’imprime aucune note d’assiduité', () => {
    const attendances: Attendance[] = [
      {
        id: 'x',
        sessionType: 'training',
        sessionId: 'tr1',
        playerId: 'p1',
        status: 'excuse',
        note: 'Rendez-vous chez le pédiatre',
      },
    ];
    expect(JSON.stringify(report({ attendances }))).not.toContain('pédiatre');
  });
});

describe('summarizeAttendance — le périmètre', () => {
  it('ne retient que les séances de la période, bornes comprises', () => {
    // Du 27/04 au 31/05 : l'entraînement du 29/04 compte, le match du 26/04
    // non. Entraînements : 29/04, 06/05, 12/05 ; matchs : m1 et m6 le 10/05,
    // et les trois du tournoi du 23/05.
    const s = summarizeAttendance(
      inputFor({ from: '2026-04-27', to: '2026-05-31' }),
      'fr'
    );
    expect(s.trainings).toBe(3);
    expect(s.matches).toBe(5);
    expect(s.total).toEqual({ present: 6, absent: 1, excuse: 1, total: 8 });
    const lucas = s.lines.find(l => l.player.id === 'p1');
    expect(lucas).toMatchObject({ present: 1, total: 1 });
    // Les bornes sont incluses : un jour de période suffit.
    const oneDay = summarizeAttendance(
      inputFor({ from: '2026-04-29', to: '2026-04-29' }),
      'fr'
    );
    expect(oneDay.trainings).toBe(1);
    expect(oneDay.total.total).toBe(8);
  });

  it('écarte les séances annulées et celles des autres équipes', () => {
    const s = summarizeAttendance(
      inputFor({ team: MOCK_DATA.teams[1]! }),
      'fr'
    );
    // Équipe B : tr4 compte, tr5 est annulé ; m4 et m5.
    expect(s.trainings).toBe(1);
    expect(s.matches).toBe(2);
    const cancelled = summarizeAttendance(
      inputFor({
        matches: MOCK_DATA.matches.map(m =>
          m.id === 'm2' ? { ...m, status: 'annule' as const } : m
        ),
      }),
      'fr'
    );
    // m2 annulé : ses présences sortent du compte.
    expect(cancelled.matches).toBe(6);
    expect(cancelled.total.total).toBe(8);
  });

  it('ne compte un renfort que pour les séances de l’équipe', () => {
    const attendances: Attendance[] = [
      // Sacha Guerin : équipe B d'abord, renfort de l'équipe A.
      {
        id: 'r1',
        sessionType: 'training',
        sessionId: 'tr4',
        playerId: 'p18',
        status: 'present',
      },
      {
        id: 'r2',
        sessionType: 'training',
        sessionId: 'tr1',
        playerId: 'p18',
        status: 'absent',
      },
      // Une séance inconnue ne compte pour personne.
      {
        id: 'r3',
        sessionType: 'match',
        sessionId: 'ghost',
        playerId: 'p18',
        status: 'present',
      },
    ];
    const s = summarizeAttendance(inputFor({ attendances }), 'fr');
    expect(s.lines.find(l => l.player.id === 'p18')).toMatchObject({
      present: 0,
      absent: 1,
      total: 1,
    });
  });

  it('à nom de famille égal, départage par le prénom', () => {
    const homonym: Player = {
      ...MOCK_DATA.players.find(p => p.id === 'p1')!,
      id: 'p98',
      firstName: 'Anatole',
    };
    const s = summarizeAttendance(
      inputFor({ players: [...MOCK_DATA.players, homonym] }),
      'fr'
    );
    const names = s.lines.map(
      l => `${l.player.firstName} ${l.player.lastName}`
    );
    expect(names.indexOf('Anatole Dupont')).toBe(
      names.indexOf('Lucas Dupont') - 1
    );
  });

  it('suit l’effectif actif, comme les écrans', () => {
    const players: Player[] = MOCK_DATA.players.map(p =>
      p.id === 'p1' ? { ...p, active: false } : p
    );
    const s = summarizeAttendance(inputFor({ players }), 'fr');
    expect(s.lines.map(l => l.player.id)).not.toContain('p1');
    // Le total est la somme des lignes imprimées, rien de plus.
    expect(s.total.present).toBe(10);
  });
});

describe('buildAttendanceReport — période, langue et fichier', () => {
  it('dit une période ouverte d’un côté ou des deux', () => {
    expect(field(report({ to: undefined }), 'Période')).toBe(
      'depuis le 1 août 2025'
    );
    expect(
      buildAttendanceReport(inputFor({ to: undefined }), fr).filename
    ).toBe('assiduite-u13-a-2025-08-01.pdf');
    expect(field(report({ from: undefined }), 'Période')).toBe(
      "jusqu'au 30 juin 2026"
    );
    expect(field(report({ from: '', to: '' }), 'Période')).toBe(
      'Toutes les séances'
    );
    expect(field(report({ seasonName: '' }), 'Saison')).toBeUndefined();
  });

  it('nomme le fichier par l’équipe et la période', () => {
    expect(buildAttendanceReport(inputFor(), fr).filename).toBe(
      'assiduite-u13-a-2025-08-01-2026-06-30.pdf'
    );
    expect(
      buildAttendanceReport(inputFor({ from: '', to: '' }), fr).filename
    ).toBe('assiduite-u13-a.pdf');
    expect(buildAttendanceReport(inputFor(), fr).shareTitle).toBe(
      'Assiduité U13 A'
    );
  });

  it('parle anglais quand l’app parle anglais', () => {
    const out = buildAttendanceReport(inputFor({ clubName: '' }), en);
    expect(out.document.kicker).toBeUndefined();
    expect(out.document.title).toBe('Attendance report');
    expect(field(out.document, 'Period')).toBe(
      'August 1, 2025 to June 30, 2026'
    );
    expect(table(out.document).total).toEqual([
      'Team total',
      '12',
      '2',
      '2',
      '16',
      '75%',
    ]);
    expect(out.filename).toBe('attendance-u13-a-2025-08-01-2026-06-30.pdf');
  });
});
