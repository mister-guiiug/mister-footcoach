import { describe, expect, it } from 'vitest';
import { messages } from '../i18n/messages';
import { fileSlug, isWinAnsi, longDate, toPdfText } from './text';

/**
 * Un caractère par son point de code. Les espaces invisibles, les accents
 * combinants et les liants d'émoji ne se lisent pas dans un fichier source :
 * collés tels quels, personne ne saurait dire ce que le test éprouve.
 */
const u = (...codePoints: number[]) => String.fromCodePoint(...codePoints);

/** Toutes les chaînes d'un groupe du catalogue, avec leur chemin. */
function leaves(node: unknown, path: string): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
    leaves(v, `${path}.${k}`)
  );
}

describe('le catalogue imprimé tient dans WinAnsi', () => {
  // Ce que le PDF imprime vient de l'i18n : le groupe `pdf`, et les
  // énumérations qu'il reprend (postes, motifs, statuts). Un émoji ou une
  // flèche glissés un jour dans l'un de ces libellés deviendraient « ? » sur
  // chaque feuille de match — c'est ici que ça doit casser, pas au bord du
  // terrain.
  const printed = [
    'pdf',
    'position',
    'unavailabilityMotif',
    'matchStatus',
    'app',
  ] as const;

  for (const locale of ['fr', 'en'] as const) {
    it(`en ${locale}, aucun libellé imprimé ne sort de CP1252`, () => {
      const catalog = messages[locale];
      const offenders = printed
        .flatMap(group => leaves(catalog[group], group))
        .filter(([, text]) => !isWinAnsi(text));
      expect(offenders).toEqual([]);
      // Garde anti-test-creux : le groupe existe et il est fourni.
      expect(leaves(catalog.pdf, 'pdf').length).toBeGreaterThan(80);
    });
  }

  it('le groupe `pdf` a les mêmes clés en anglais qu’en français', () => {
    const keys = (locale: 'fr' | 'en') =>
      leaves(messages[locale].pdf, 'pdf').map(([path]) => path);
    expect(keys('en')).toEqual(keys('fr'));
  });
});

describe('isWinAnsi', () => {
  it('accepte les accents français et la ponctuation typographique', () => {
    expect(isWinAnsi('Théo, Zoé, Loïc, Éric — « N° 10 » : l’équipe…')).toBe(
      true
    );
    expect(isWinAnsi('Œuvre 12 € – 3‰')).toBe(true);
  });

  it('refuse les émojis, les symboles hors table et les contrôles', () => {
    expect(isWinAnsi(u(0x26bd))).toBe(false); // ballon
    expect(isWinAnsi(u(0x2192))).toBe(false); // flèche
    expect(isWinAnsi(`1${u(0x202f)}234`)).toBe(false); // fine insécable d'Intl
    // Un contrôle C1 serait écrit sur l'octet d'un autre glyphe (0x85 : « … »).
    expect(isWinAnsi(`a${u(0x85)}b`)).toBe(false);
    expect(isWinAnsi('a\nb')).toBe(false);
  });
});

describe('toPdfText', () => {
  it('garde les accents et la ponctuation que WinAnsi sait écrire', () => {
    expect(toPdfText('Théo Martin — l’équipe « U13 A »')).toBe(
      'Théo Martin — l’équipe « U13 A »'
    );
  });

  it('retire un émoji plutôt que d’écrire « ? »', () => {
    expect(toPdfText(`FC Rivale ${u(0x26bd)}`)).toBe('FC Rivale');
    // Famille : trois émojis soudés par des liants (U+200D).
    const family = u(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467);
    expect(toPdfText(`Les ${family} Lions`)).toBe('Les Lions');
    // Cœur + sélecteur de variante (U+FE0F), une marque sans base.
    expect(toPdfText(`Les ${u(0x2764, 0xfe0f)} Bleus`)).toBe('Les Bleus');
    expect(toPdfText(`${u(0x1f7e8)} Carton`)).toBe('Carton');
  });

  it('écrit « ? » pour une lettre d’une autre écriture : la perte se voit', () => {
    expect(toPdfText('Иван Petrov')).toBe('???? Petrov');
    // « Ά » se décompose, mais en « Α » grec : toujours hors table.
    expect(toPdfText('Άρης')).toBe('????');
  });

  it('ramène une lettre latine hors table à sa base', () => {
    // « á » est dans Latin-1 : il reste ; « Ș » et « ř » n'y sont pas.
    expect(toPdfText('Ștefan Dvořák')).toBe('Stefan Dvorák');
    expect(toPdfText(`${u(0xfb01)}nale`)).toBe('finale'); // ligature « fi »
  });

  it('recompose un accent saisi en deux points de code', () => {
    // « e » suivi de l'accent aigu combinant (U+0301).
    expect(toPdfText(`Ze${u(0x301)}lie`)).toBe('Zélie');
  });

  it('normalise les espaces et les tirets exotiques', () => {
    expect(toPdfText(`75${u(0x202f)}%`)).toBe('75 %');
    expect(toPdfText(`1${u(0xa0)}234\tbuts`)).toBe('1 234 buts');
    // Signe moins (U+2212) et trait d'union insécable (U+2011).
    expect(toPdfText(`${u(0x2212)}2 et Jean${u(0x2011)}Pierre`)).toBe(
      '-2 et Jean-Pierre'
    );
    expect(toPdfText('  deux   espaces  ')).toBe('deux espaces');
  });
});

describe('fileSlug', () => {
  it('rend un nom de fichier ASCII lisible', () => {
    expect(fileSlug('feuille-de-match-2026-10-04-FC Rivale')).toBe(
      'feuille-de-match-2026-10-04-fc-rivale'
    );
    expect(fileSlug('AS Saint-Étienne')).toBe('as-saint-etienne');
    expect(fileSlug('Cœur de Lion & Cie')).toBe('coeur-de-lion-cie');
  });

  it('resserre les tirets et les retire aux extrémités', () => {
    expect(fileSlug('assiduite-U13 A--')).toBe('assiduite-u13-a');
    expect(fileSlug(u(0x26bd, 0x26bd))).toBe('');
  });
});

describe('longDate', () => {
  it('écrit la date en toutes lettres dans la langue demandée', () => {
    expect(longDate('2026-05-10', 'fr')).toBe('10 mai 2026');
    expect(longDate('2026-05-10', 'fr', { weekday: true })).toBe(
      'dimanche 10 mai 2026'
    );
    expect(longDate('2026-05-10', 'en', { weekday: true })).toBe(
      'Sunday, May 10, 2026'
    );
  });

  it('lit une date ISO comme un jour local, sans glisser au fuseau', () => {
    expect(longDate('2025-08-01', 'fr')).toBe('1 août 2025');
    expect(longDate(new Date(2026, 8, 25, 23, 59), 'fr')).toBe(
      '25 septembre 2026'
    );
  });

  it('rend une date illisible telle quelle au lieu de lever', () => {
    expect(longDate('bientôt', 'fr')).toBe('bientôt');
  });
});
