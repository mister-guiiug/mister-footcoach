/**
 * La mise en page, éprouvée sur le FICHIER : les octets sont relus page par
 * page (`src/test/pdf.ts`), et ce sont eux qu'on interroge — nombre de pages,
 * en-têtes répétés, ce qui tombe sur quelle page, octets écrits pour un
 * caractère accentué ou un émoji.
 */
import { describe, expect, it } from 'vitest';
import { createTranslator } from '@mister-guiiug/dev-pwa-config/react/i18n';
import { MOCK_DATA } from '../data/mock';
import { messages } from '../i18n/messages';
import type { Player } from '../types';
import { pdfBinary, pdfPages, pdfStreams, pdfText } from '../test/pdf';
import { buildAttendanceReport } from './attendanceReport';
import type { PdfBlock, PdfDocument, PdfI18n, Translate } from './document';
import { buildMatchSheet } from './matchSheet';
import { renderPdf, wrapText } from './render';

const i18n = (locale: 'fr' | 'en'): PdfI18n => ({
  t: createTranslator(messages, locale, 'fr') as Translate,
  localeTag: locale,
});

function doc(over: Partial<PdfDocument> = {}): PdfDocument {
  return {
    title: 'Titre',
    footer: 'Pied',
    pageLabel: (page, total) => `Page ${page} / ${total}`,
    blocks: [],
    ...over,
  };
}

/** Un effectif fabriqué, assez long pour déborder d'une page. */
function squad(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `x${i}`,
    firstName: 'Joueur',
    lastName: `N${String(i).padStart(3, '0')}`,
    dateOfBirth: '2013-01-01',
    primaryTeamId: 't1',
    preferredPosition: 'MC' as const,
    appetences: {},
    number: i + 1,
    active: true,
  }));
}

function matchSheetBytes(locale: 'fr' | 'en', matchId = 'm1') {
  const match = MOCK_DATA.matches.find(m => m.id === matchId)!;
  return renderPdf(
    buildMatchSheet(
      {
        match,
        team: MOCK_DATA.teams.find(t => t.id === match.teamId),
        clubName: 'FC Exemple',
        players: MOCK_DATA.players,
        lineups: MOCK_DATA.lineups,
        unavailabilities: MOCK_DATA.unavailabilities,
        matchEvents: MOCK_DATA.matchEvents,
        users: MOCK_DATA.users,
        tournaments: MOCK_DATA.tournaments,
        generatedAt: new Date(2026, 8, 25),
      },
      i18n(locale)
    ).document
  );
}

describe('renderPdf — un fichier PDF', () => {
  it('produit un PDF complet, dont la table xref pointe juste', () => {
    const bytes = matchSheetBytes('fr');
    const binary = pdfBinary(bytes);
    expect(binary.startsWith('%PDF-1.4\n')).toBe(true);
    expect(binary.trimEnd().endsWith('%%EOF')).toBe(true);
    // Chaque offset de la table mène bien à l'objet annoncé.
    const xref = Number(/startxref\n(\d+)/.exec(binary)![1]);
    const offsets = [...binary.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map(
      m => Number(m[1])
    );
    offsets.forEach((offset, i) =>
      expect(binary.startsWith(`${i + 1} 0 obj`, offset)).toBe(true)
    );
  });

  it('tient une feuille de match ordinaire sur une page, dans l’ordre', () => {
    const pages = pdfPages(matchSheetBytes('fr'));
    expect(pages).toHaveLength(1);
    const text = pages[0]!;
    const order = [
      'FC Exemple',
      'Feuille de match',
      'U13 A – FC Rivale',
      'Adversaire',
      'dimanche 10 mai 2026',
      'Titulaires (2-3-2)',
      'Enzo Thomas (indisponible)',
      'Remplaçants',
      'Joueurs indisponibles',
      'Blessure',
      'Encadrement',
      'Éric Coaching',
      'Signatures',
      "Responsable de l'équipe",
      'Arbitre',
      'Mister Footcoach · édité le 25 septembre 2026',
      'Page 1 / 1',
    ];
    const positions = order.map(s => text.indexOf(s));
    expect(positions).not.toContain(-1);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('n’écrit aucun « ? » de substitution, en français comme en anglais', () => {
    // Accents, « – », « · », « N° », « ’ » : tout ce que les libellés et le
    // jeu de données impriment tient dans WinAnsi. Un « ? » dans un flux
    // serait un caractère perdu.
    for (const locale of ['fr', 'en'] as const) {
      for (const matchId of ['m1', 'm2', 'm3']) {
        const streams = pdfStreams(matchSheetBytes(locale, matchId)).join('');
        expect(streams).not.toContain('?');
      }
    }
  });
});

describe('renderPdf — pagination', () => {
  const longReport = () =>
    buildAttendanceReport(
      {
        team: MOCK_DATA.teams[0]!,
        clubName: 'FC Exemple',
        seasonName: '2025-2026',
        players: squad(90),
        matches: [],
        trainings: [],
        attendances: [],
        from: '2025-08-01',
        to: '2026-06-30',
        generatedAt: new Date(2026, 8, 25),
      },
      i18n('fr')
    ).document;

  it('passe sur plusieurs pages quand l’effectif est long, sans perdre personne', () => {
    const pages = pdfPages(renderPdf(longReport()));
    expect(pages.length).toBeGreaterThan(1);
    const all = pages.flat();
    for (let i = 0; i < 90; i += 1) {
      const name = `Joueur N${String(i).padStart(3, '0')}`;
      // Une fois, et une seule : une ligne n'est ni perdue ni dédoublée au
      // passage de page.
      expect(all.filter(s => s === name)).toHaveLength(1);
    }
    // Le total ferme le tableau, sur la page de sa dernière ligne.
    const pageOf = (s: string) => pages.findIndex(p => p.includes(s));
    expect(pageOf("Total de l'équipe")).toBe(pageOf('Joueur N089'));
    expect(pageOf("Total de l'équipe")).toBeGreaterThan(0);
  });

  it('répète l’en-tête du tableau, numérote et titre chaque page', () => {
    const pages = pdfPages(renderPdf(longReport()));
    pages.forEach((page, i) => {
      expect(page, `page ${i + 1}`).toContain('Joueur');
      expect(page).toContain('Taux');
      expect(page).toContain(`Page ${i + 1} / ${pages.length}`);
      expect(page).toContain('Mister Footcoach · édité le 25 septembre 2026');
    });
    // L'en-tête complet n'est qu'en première page ; les suivantes disent de
    // quel document elles sont la suite.
    expect(pages[0]).toContain('FC Exemple');
    expect(pages[1]).not.toContain('FC Exemple');
    expect(pages[1]).toContain(
      "Rapport d'assiduité – U13 A · du 1 août 2025 au 30 juin 2026"
    );
  });

  // Une propriété, pas un exemple : on fait glisser un titre de section vers
  // le bas de la page, ligne après ligne, et à CHAQUE position on vérifie
  // qu'il ne reste jamais seul en bas — il part avec sa première ligne — et
  // que les cadres de signature ne se coupent jamais.
  it('ne laisse jamais un titre seul en bas de page ni une signature coupée', () => {
    for (let filler = 30; filler < 60; filler += 1) {
      const blocks: PdfBlock[] = [
        ...Array.from({ length: filler }, (_, i) => ({
          kind: 'text' as const,
          text: `Ligne de remplissage ${i}`,
        })),
        { kind: 'heading', text: 'Section suivante' },
        {
          kind: 'table',
          columns: [{ header: 'Colonne', width: 1 }],
          rows: [['Première ligne'], ['Deuxième ligne']],
        },
        { kind: 'signatures', labels: ['Gauche', 'Milieu', 'Droite'] },
      ];
      const pages = pdfPages(renderPdf(doc({ blocks })));
      const pageOf = (s: string) => pages.findIndex(p => p.includes(s));
      expect(pageOf('Section suivante'), `remplissage ${filler}`).toBe(
        pageOf('Première ligne')
      );
      expect(pageOf('Colonne')).toBe(pageOf('Première ligne'));
      expect(pageOf('Gauche')).toBe(pageOf('Droite'));
    }
  });

  // Même démarche pour la ligne de total : quelle que soit la longueur du
  // tableau, elle n'arrive jamais sur une page sans l'en-tête de ses colonnes.
  it('ne laisse jamais la ligne de total sans en-tête de colonnes', () => {
    let pushed = 0;
    for (let count = 30; count < 60; count += 1) {
      const blocks: PdfBlock[] = [
        {
          kind: 'table',
          columns: [
            { header: 'Colonne', width: 0.7 },
            { header: 'Nombre', width: 0.3, align: 'right' },
          ],
          rows: Array.from({ length: count }, (_, i) => [`Ligne ${i}`, '1']),
          total: ['Total', String(count)],
        },
      ];
      const pages = pdfPages(renderPdf(doc({ blocks })));
      const last = pages.findIndex(p => p.includes('Total'));
      expect(pages[last], `${count} lignes`).toContain('Colonne');
      if (!pages[last]!.includes(`Ligne ${count - 1}`)) pushed += 1;
    }
    // Garde anti-test-creux : au moins une longueur a bien poussé le total
    // seul sur la page suivante.
    expect(pushed).toBeGreaterThan(0);
  });

  it('rend un document sans bloc, sans sous-titre ni club : une page', () => {
    const pages = pdfPages(renderPdf(doc({ blocks: [] })));
    expect(pages).toEqual([['Titre', 'Pied', 'Page 1 / 1']]);
  });

  it('dessine l’en-tête d’un tableau sans ligne, et une suite sans sous-titre', () => {
    const blocks: PdfBlock[] = [
      { kind: 'table', columns: [{ header: 'Vide', width: 1 }], rows: [] },
      ...Array.from({ length: 70 }, (_, i) => ({
        kind: 'text' as const,
        text: `Ligne ${i}`,
      })),
    ];
    const pages = pdfPages(renderPdf(doc({ blocks })));
    expect(pages[0]).toContain('Vide');
    expect(pages[1]![0]).toBe('Titre');
  });

  it('laisse vide une cellule vide, sans y écrire de texte nul', () => {
    // La case d'un poste non pourvu, où le coach écrira le nom à la main.
    const bytes = renderPdf(
      doc({
        blocks: [
          {
            kind: 'table',
            columns: [
              { header: 'Poste', width: 0.5 },
              { header: 'Joueur', width: 0.5 },
            ],
            rows: [['Gardien', '']],
          },
        ],
      })
    );
    expect(pdfText(bytes)).toContain('Gardien');
    expect(pdfStreams(bytes)[0]).not.toContain('() Tj');
  });
});

describe('renderPdf — encodage WinAnsi', () => {
  it('écrit les accents et la ponctuation en un octet chacun', () => {
    const bytes = renderPdf(
      doc({ title: 'Théo Zoé Loïc — l’équipe « N° 10 » €' })
    );
    const stream = pdfStreams(bytes)[0]!;
    // é = 0xE9, ï = 0xEF, — = 0x97, ’ = 0x92, « = 0xAB, ° = 0xB0, € = 0x80.
    expect(stream).toContain(
      '(Th\xe9o Zo\xe9 Lo\xefc \x97 l\x92\xe9quipe \xab N\xb0 10 \xbb \x80) Tj'
    );
  });

  it('retire les émojis, et marque d’un « ? » une lettre non latine', () => {
    // Une famille : trois émojis soudés par des liants invisibles (U+200D),
    // écrits par leur point de code pour qu'on voie ce qui est éprouvé.
    const family = String.fromCodePoint(
      0x1f468,
      0x200d,
      0x1f469,
      0x200d,
      0x1f467
    );
    const bytes = renderPdf(
      doc({
        title: 'FC Rivale ⚽',
        subtitle: `Les ${family} Lions`,
        blocks: [
          {
            kind: 'table',
            columns: [{ header: 'Joueur 🟨', width: 1 }],
            rows: [['Иван Petrov'], ['Ștefan']],
          },
        ],
      })
    );
    const text = pdfText(bytes);
    expect(text).toContain('FC Rivale');
    expect(text).toContain('Les Lions');
    expect(text).toContain('Joueur');
    expect(text).toContain('Stefan');
    // Le « ? » n'apparaît que là où une lettre a été perdue.
    expect(text).toContain('???? Petrov');
    expect(pdfStreams(bytes).join('').split('?')).toHaveLength(5);
  });

  it('échappe les parenthèses et la barre oblique inverse d’un nom saisi', () => {
    const bytes = renderPdf(doc({ title: 'FC (réserve) \\ B' }));
    expect(pdfStreams(bytes)[0]).toContain('(FC \\(r\xe9serve\\) \\\\ B) Tj');
    expect(pdfText(bytes)).toContain('FC (réserve) \\ B');
  });
});

describe('wrapText', () => {
  it('coupe aux espaces, et au caractère un mot plus large que la colonne', () => {
    expect(wrapText('un deux trois', 10, 1000)).toEqual(['un deux trois']);
    const lines = wrapText(`court ${'A'.repeat(60)}`, 10, 100);
    expect(lines[0]).toBe('court');
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.slice(1).join('')).toBe('A'.repeat(60));
  });

  it('coupe aussi un premier mot trop large, sans ligne vide devant', () => {
    const lines = wrapText('B'.repeat(30), 10, 50);
    expect(lines[0]).not.toBe('');
    expect(lines.join('')).toBe('B'.repeat(30));
  });

  it('rend une ligne vide pour un texte vide : une cellule a une hauteur', () => {
    expect(wrapText('', 10, 100)).toEqual(['']);
  });
});
