/**
 * L'entrée chargée au clic, de bout en bout : fabrique, mise en page,
 * livraison. Ce qui part vers le téléchargement est un vrai PDF, relu.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslator } from '@mister-guiiug/dev-pwa-config/react/i18n';
import { MOCK_DATA } from '../data/mock';
import { messages } from '../i18n/messages';
import { pdfText } from '../test/pdf';
import type { PdfI18n, Translate } from './document';
import { exportAttendanceReport, exportMatchSheet } from './exportPdf';

const downloadPdf = vi.hoisted(() =>
  vi.fn((_bytes: Uint8Array, _filename: string) => true)
);
vi.mock('@mister-guiiug/dev-pwa-config/pdf', async importOriginal => ({
  ...(await importOriginal<
    typeof import('@mister-guiiug/dev-pwa-config/pdf')
  >()),
  downloadPdf,
}));

const fr: PdfI18n = {
  t: createTranslator(messages, 'fr', 'fr') as Translate,
  localeTag: 'fr',
};

beforeEach(() => downloadPdf.mockClear());

describe('exportPdf', () => {
  it('livre la feuille de match en PDF, sous un nom lisible', async () => {
    const match = MOCK_DATA.matches.find(m => m.id === 'm1')!;
    await expect(
      exportMatchSheet(
        {
          match,
          team: MOCK_DATA.teams[0],
          clubName: 'FC Exemple',
          players: MOCK_DATA.players,
          lineups: MOCK_DATA.lineups,
          unavailabilities: MOCK_DATA.unavailabilities,
          matchEvents: MOCK_DATA.matchEvents,
          users: MOCK_DATA.users,
          tournaments: MOCK_DATA.tournaments,
          generatedAt: new Date(2026, 8, 25),
        },
        fr
      )
    ).resolves.toBe('downloaded');
    const [bytes, filename] = downloadPdf.mock.calls[0]!;
    expect(filename).toBe('feuille-de-match-2026-05-10-fc-rivale.pdf');
    expect(pdfText(bytes)).toContain('Feuille de match');
  });

  it('livre le rapport d’assiduité en PDF', async () => {
    await expect(
      exportAttendanceReport(
        {
          team: MOCK_DATA.teams[0]!,
          players: MOCK_DATA.players,
          matches: MOCK_DATA.matches,
          trainings: MOCK_DATA.trainings,
          attendances: MOCK_DATA.attendances,
          from: '2025-08-01',
          to: '2026-06-30',
          generatedAt: new Date(2026, 8, 25),
        },
        fr
      )
    ).resolves.toBe('downloaded');
    const [bytes, filename] = downloadPdf.mock.calls[0]!;
    expect(filename).toBe('assiduite-u13-a-2025-08-01-2026-06-30.pdf');
    expect(pdfText(bytes)).toContain("Total de l'équipe");
  });
});
