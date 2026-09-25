/**
 * La feuille de match depuis l'écran du match : le bouton, le module chargé
 * au clic, et le FICHIER qui part — relu, parce que c'est lui qui circule.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAtRoute } from '../test/helpers';
import { pdfText } from '../test/pdf';
import MatchDetailPage from './MatchDetailPage';

// Le téléchargement du socle, intercepté : jsdom n'a pas de
// `URL.createObjectURL`, et c'est de toute façon le fichier qu'on veut lire.
const downloadPdf = vi.hoisted(() =>
  vi.fn((_bytes: Uint8Array, _filename: string) => true)
);
vi.mock('@mister-guiiug/dev-pwa-config/pdf', async importOriginal => ({
  ...(await importOriginal<
    typeof import('@mister-guiiug/dev-pwa-config/pdf')
  >()),
  downloadPdf,
}));

/**
 * Le module PDF est chargé par `import()` au clic : la première fois, Vite le
 * transforme. Sur une machine chargée, ça dépasse la seconde d'attente par
 * défaut de `findBy` et de `vi.waitFor` — on mesure l'export, pas le compilateur.
 */
const LAZY = { timeout: 5000 };

beforeEach(() => {
  localStorage.clear();
  downloadPdf.mockClear();
});

async function exportSheet(matchId: string) {
  renderAtRoute(<MatchDetailPage />, {
    initialPath: `/matchs/${matchId}`,
    routePattern: '/matchs/:id',
  });
  expect(screen.getByText('Feuille de match')).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole('button', { name: 'Exporter en PDF : feuille de match' })
  );
  expect(
    await screen.findByText('PDF téléchargé.', {}, LAZY)
  ).toBeInTheDocument();
  expect(downloadPdf).toHaveBeenCalledOnce();
  const [bytes, filename] = downloadPdf.mock.calls[0]!;
  return { text: pdfText(bytes), filename };
}

describe('MatchDetailPage — feuille de match en PDF', () => {
  it('télécharge la feuille du match, club et composition compris', async () => {
    const { text, filename } = await exportSheet('m1');
    expect(filename).toBe('feuille-de-match-2026-05-10-fc-rivale.pdf');
    for (const expected of [
      'FC Exemple',
      'Feuille de match',
      'U13 A – FC Rivale',
      'Titulaires (2-3-2)',
      'Enzo Thomas (indisponible)',
      'Blessure',
      'Éric Coaching',
      'Arbitre',
    ]) {
      expect(text).toContain(expected);
    }
  });

  it('ne laisse sortir aucun détail médical de l’appareil', async () => {
    // La blessure d'Enzo Thomas porte une nature (« Entorse grade 2 »), une
    // zone et une note : le fichier n'en porte que le motif.
    const { text } = await exportSheet('m1');
    const all = text.join('\n');
    expect(all).not.toMatch(/entorse|cheville|grade|kiné/i);
  });

  it('porte le score et les buteurs d’un match joué', async () => {
    const { text } = await exportSheet('m3');
    expect(text).toContain('U13 A 4 – 1 US Montmartre');
    expect(text).toContain('Tom Moreau');
    expect(text).toContain("22', 31'");
  });
});
