/**
 * La feuille de match, lue sur son CONTENU : les fabriques rendent des
 * données (titres, champs, tableaux), et c'est là qu'on vérifie ce qui y
 * figure — et surtout ce qui n'y figure pas. La mise en page est éprouvée à
 * part, dans `render.test.ts`.
 *
 * Le jeu de données est celui de production (`src/data/mock.ts`) : un match
 * à domicile non joué (m1), un match à l'extérieur joué (m2), un match à
 * domicile joué (m3), un joueur blessé du 20/04 au 15/05 (Enzo Thomas) dont
 * la blessure porte une note et une nature MÉDICALES.
 */
import { describe, expect, it } from 'vitest';
import { createTranslator } from '@mister-guiiug/dev-pwa-config/react/i18n';
import { MOCK_DATA } from '../data/mock';
import { messages } from '../i18n/messages';
import type { Lineup, MatchEvent } from '../types';
import type { PdfBlock, PdfDocument, PdfI18n, Translate } from './document';
import {
  buildMatchSheet,
  pickLineup,
  type MatchSheetInput,
} from './matchSheet';

const fr: PdfI18n = {
  t: createTranslator(messages, 'fr', 'fr') as Translate,
  localeTag: 'fr',
};
const en: PdfI18n = {
  t: createTranslator(messages, 'en', 'fr') as Translate,
  localeTag: 'en',
};

function inputFor(
  matchId: string,
  over: Partial<MatchSheetInput> = {}
): MatchSheetInput {
  const match = MOCK_DATA.matches.find(m => m.id === matchId)!;
  return {
    match,
    team: MOCK_DATA.teams.find(t => t.id === match.teamId),
    clubName: 'FC Exemple',
    players: MOCK_DATA.players,
    lineups: MOCK_DATA.lineups,
    unavailabilities: MOCK_DATA.unavailabilities,
    // TOUS les événements de la saison : la fabrique doit trier elle-même.
    matchEvents: MOCK_DATA.matchEvents,
    users: MOCK_DATA.users,
    tournaments: MOCK_DATA.tournaments,
    generatedAt: new Date(2026, 8, 25, 10, 0),
    ...over,
  };
}

const sheet = (matchId: string, over?: Partial<MatchSheetInput>) =>
  buildMatchSheet(inputFor(matchId, over), fr).document;

/** La valeur d'un champ, où qu'il soit dans le document. */
function field(doc: PdfDocument, label: string): string | undefined {
  for (const block of doc.blocks) {
    if (block.kind !== 'fields') continue;
    const row = block.rows.find(r => r.label === label);
    if (row) return row.value;
  }
  return undefined;
}

/** Les blocs d'une section : ce qui suit son titre, jusqu'au titre suivant. */
function section(doc: PdfDocument, heading: string): PdfBlock[] {
  const start = doc.blocks.findIndex(
    b => b.kind === 'heading' && b.text === heading
  );
  if (start < 0) return [];
  const rest = doc.blocks.slice(start + 1);
  const end = rest.findIndex(b => b.kind === 'heading');
  return end < 0 ? rest : rest.slice(0, end);
}

function rowsIn(blocks: PdfBlock[]): string[][] | undefined {
  const table = blocks.find(b => b.kind === 'table');
  return table?.kind === 'table' ? table.rows : undefined;
}

function textsIn(blocks: PdfBlock[]): string[] {
  return blocks.flatMap(b => (b.kind === 'text' ? [b.text] : []));
}

function headings(doc: PdfDocument): string[] {
  return doc.blocks.flatMap(b => (b.kind === 'heading' ? [b.text] : []));
}

describe('buildMatchSheet — en-tête et informations du match', () => {
  it('porte le club, le titre et l’affiche, domicile en premier', () => {
    const home = sheet('m1');
    expect(home.kicker).toBe('FC Exemple');
    expect(home.title).toBe('Feuille de match');
    expect(home.subtitle).toBe('U13 A – FC Rivale');
    // À l'extérieur, c'est l'adversaire qui reçoit.
    expect(sheet('m2').subtitle).toBe('AS Belleville – U13 A');
  });

  it('donne équipe, adversaire, date, heure, lieu, domicile et rendez-vous', () => {
    const doc = sheet('m1');
    expect(field(doc, 'Équipe')).toBe('U13 A (U13)');
    expect(field(doc, 'Adversaire')).toBe('FC Rivale');
    expect(field(doc, 'Date')).toBe('dimanche 10 mai 2026');
    expect(field(doc, "Coup d'envoi")).toBe('15:00');
    expect(field(doc, 'Domicile / extérieur')).toBe('Domicile');
    expect(field(doc, 'Lieu')).toBe(
      'Stade Municipal, 1 Rue du Stade, 75000 Paris'
    );
    expect(field(doc, 'Phase')).toBe('Phase retour');
    expect(field(doc, 'Statut')).toBe('Saison');
    expect(field(doc, 'Rendez-vous')).toBe(
      '14:30 – Stade Municipal, entrée principale'
    );
    expect(field(sheet('m2'), 'Domicile / extérieur')).toBe('Extérieur');
  });

  it('ajoute la note du rendez-vous, ou dit qu’il n’y en a pas', () => {
    expect(field(sheet('m2'), 'Rendez-vous')).toBe(
      '12:45 – Parking du club, rue principale (Covoiturage organisé)'
    );
    expect(field(sheet('m3'), 'Rendez-vous')).toBe('Non défini');
  });

  it('nomme le tournoi et le terrain d’un match de tournoi', () => {
    const base = MOCK_DATA.matches.find(m => m.id === 'm1')!;
    const doc = sheet('m1', {
      match: { ...base, tournamentId: 'to1', field: 'Terrain 2' },
    });
    expect(field(doc, 'Tournoi')).toBe('Tournoi de Printemps U13');
    expect(field(doc, 'Terrain')).toBe('Terrain 2');
    expect(field(sheet('m1'), 'Tournoi')).toBeUndefined();
  });

  it('se passe d’une équipe inconnue, d’un club sans nom et de champs vides', () => {
    const base = MOCK_DATA.matches.find(m => m.id === 'm1')!;
    const doc = sheet('m1', {
      team: undefined,
      clubName: '   ',
      users: [],
      match: { ...base, time: '', location: '', address: '', phase: '' },
    });
    expect(doc.kicker).toBeUndefined();
    expect(doc.subtitle).toBe('Nous – FC Rivale');
    expect(field(doc, 'Équipe')).toBe('Nous');
    expect(field(doc, "Coup d'envoi")).toBe('–');
    expect(field(doc, 'Lieu')).toBe('–');
    expect(field(doc, 'Phase')).toBeUndefined();
    // Sans coach connu, l'encadrement le dit au lieu d'un tableau vide.
    expect(textsIn(section(doc, 'Encadrement'))).toEqual([
      'Aucun encadrant renseigné.',
    ]);
  });

  it('signe le pied de page et numérote dans la langue de l’app', () => {
    const doc = sheet('m1');
    expect(doc.footer).toBe('Mister Footcoach · édité le 25 septembre 2026');
    expect(doc.pageLabel(2, 3)).toBe('Page 2 / 3');
  });
});

describe('buildMatchSheet — composition', () => {
  it('aligne les titulaires poste par poste, dans l’ordre de la formation', () => {
    const doc = sheet('m1');
    expect(headings(doc)).toContain('Titulaires (2-3-2)');
    const blocks = section(doc, 'Titulaires (2-3-2)');
    expect(textsIn(blocks)).toEqual([
      'Composition « Compo type 2-3-2 », enregistrée le 20 avril 2026.',
    ]);
    expect(rowsIn(blocks)).toEqual([
      ['Gardien', '1', 'Lucas Dupont'],
      ['Défenseur Droit', '2', 'Théo Martin'],
      // Aligné ET blessé ce jour-là : la contradiction est imprimée.
      ['Défenseur Gauche', '4', 'Enzo Thomas (indisponible)'],
      ['Milieu Défensif', '3', 'Mathis Bernard'],
      ['Milieu Central', '6', 'Hugo Petit'],
      ['Meneur de Jeu', '10', 'Nathan Richard'],
      ['Ailier Droit', '7', 'Axel Durand'],
      ['Ailier Gauche', '11', 'Lilian Simon'],
    ]);
    expect(rowsIn(section(doc, 'Remplaçants'))).toEqual([['9', 'Tom Moreau']]);
  });

  it('laisse une ligne vide pour un poste non pourvu', () => {
    const lineup: Lineup = {
      ...MOCK_DATA.lineups[0]!,
      slots: [
        { position: 'GK', x: 50, y: 92, playerId: 'p1' },
        { position: 'DC', x: 50, y: 75 },
      ],
      substituteIds: [],
    };
    const doc = sheet('m1', { lineups: [lineup] });
    expect(rowsIn(section(doc, 'Titulaires (2-3-2)'))).toEqual([
      ['Gardien', '1', 'Lucas Dupont'],
      ['Défenseur Central', '', ''],
    ]);
    expect(textsIn(section(doc, 'Remplaçants'))).toEqual(['Aucun remplaçant.']);
  });

  it('sans composition, imprime l’effectif disponible par numéro', () => {
    // Un second joueur sans numéro : entre eux, l'ordre des noms de famille.
    const unnumbered = {
      ...MOCK_DATA.players.find(p => p.id === 'p19')!,
      id: 'p99',
      firstName: 'Adam',
      lastName: 'Marchand',
    };
    const doc = sheet('m1', {
      lineups: [],
      players: [...MOCK_DATA.players, unnumbered],
    });
    expect(textsIn(section(doc, 'Composition'))).toEqual([
      'Aucune composition enregistrée pour cette équipe.',
    ]);
    const rows = rowsIn(section(doc, 'Effectif disponible'))!;
    // Enzo Thomas est blessé ce jour-là : il n'est pas « disponible ».
    expect(rows.map(r => r[1])).not.toContain('Enzo Thomas');
    expect(rows[0]).toEqual(['1', 'Lucas Dupont', 'Gardien']);
    // Le renfort venu de l'équipe B est de l'effectif ; les joueurs sans
    // numéro ferment la marche.
    expect(rows).toContainEqual(['15', 'Sacha Guerin', 'Milieu Central']);
    expect(rows.slice(-2)).toEqual([
      ['', 'Adam Marchand', 'Attaquant'],
      ['', 'Théo Marchand', 'Attaquant'],
    ]);
    expect(headings(doc)).not.toContain('Remplaçants');
  });

  it('sans composition ni joueur disponible, ne dresse pas de tableau vide', () => {
    const doc = sheet('m1', { lineups: [], players: [] });
    expect(headings(doc)).not.toContain('Effectif disponible');
  });
});

describe('pickLineup', () => {
  const match = MOCK_DATA.matches.find(m => m.id === 'm1')!;
  const lineup = (over: Partial<Lineup>): Lineup => ({
    ...MOCK_DATA.lineups[0]!,
    ...over,
  });

  it('préfère la composition rattachée à CE match', () => {
    const own = lineup({ id: 'own', matchId: 'm1', createdAt: '2026-01-01' });
    const recent = lineup({ id: 'recent', createdAt: '2026-05-09' });
    expect(pickLineup([recent, own], match)?.id).toBe('own');
  });

  it('sinon la plus récente de l’équipe, jamais celle d’un autre match', () => {
    const old = lineup({ id: 'old', createdAt: '2026-03-01' });
    const recent = lineup({ id: 'recent', createdAt: '2026-05-09' });
    const other = lineup({ id: 'other', matchId: 'm3', createdAt: '2026-06' });
    const otherTeam = lineup({ id: 'b', teamId: 't2', createdAt: '2026-07' });
    expect(pickLineup([old, other, recent, otherTeam], match)?.id).toBe(
      'recent'
    );
    // L'ordre d'enregistrement ne compte pas : seule la date décide.
    expect(pickLineup([recent, old], match)?.id).toBe('recent');
    expect(pickLineup([other, otherTeam], match)).toBeUndefined();
  });
});

describe('buildMatchSheet — indisponibles : le motif, rien de médical', () => {
  it('liste l’indisponible du jour du match avec son seul motif', () => {
    expect(rowsIn(section(sheet('m1'), 'Joueurs indisponibles'))).toEqual([
      ['Enzo Thomas', 'Blessure'],
    ]);
  });

  it('n’imprime ni la note, ni la nature, ni la zone de la blessure', () => {
    // Tout le contenu du document, sérialisé : aucune trace médicale, où
    // qu'elle se cache. Et aucune coordonnée de contact.
    const everything = JSON.stringify(sheet('m1'));
    for (const forbidden of [
      'Entorse',
      'entorse',
      'cheville',
      'Cheville',
      'grade',
      'Kinésithérapeute',
      'rééducation',
      'Reprise progressive',
      '15 mai',
      '@',
      '06 ',
    ]) {
      expect(everything).not.toContain(forbidden);
    }
  });

  it('juge au jour du MATCH, pas au jour de l’édition', () => {
    // m3 (12/04) précède la blessure (20/04) : personne n'y manquait.
    expect(textsIn(section(sheet('m3'), 'Joueurs indisponibles'))).toEqual([
      'Aucun joueur indisponible.',
    ]);
  });

  it('cumule deux motifs sans doublon, et ignore un joueur hors de l’équipe', () => {
    const doc = sheet('m1', {
      unavailabilities: [
        ...MOCK_DATA.unavailabilities,
        {
          id: 'uv2',
          playerId: 'p4',
          startDate: '2026-05-01',
          motif: 'vacances',
          declaredBy: 'u1',
        },
        {
          // Une rechute déclarée à part : le motif n'est dit qu'une fois.
          id: 'uv4',
          playerId: 'p4',
          startDate: '2026-05-08',
          endDate: '2026-05-20',
          motif: 'blessure',
          declaredBy: 'u1',
        },
        {
          id: 'uv3',
          playerId: 'p10', // équipe B
          startDate: '2026-05-01',
          motif: 'maladie',
          declaredBy: 'u2',
        },
        {
          id: 'uv5',
          playerId: 'p2',
          startDate: '2026-05-09',
          endDate: '2026-05-10',
          motif: 'suspension',
          declaredBy: 'u1',
        },
      ],
    });
    // Par nom de famille, comme un appel : Martin avant Thomas.
    expect(rowsIn(section(doc, 'Joueurs indisponibles'))).toEqual([
      ['Théo Martin', 'Suspension'],
      ['Enzo Thomas', 'Blessure, Vacances'],
    ]);
  });
});

describe('buildMatchSheet — encadrement et signatures', () => {
  it('nomme le coach principal puis les autres coachs de l’équipe', () => {
    expect(rowsIn(section(sheet('m1'), 'Encadrement'))).toEqual([
      ['Éric Coaching', 'Coach principal'],
    ]);
    const doc = sheet('m1', {
      users: [
        ...MOCK_DATA.users,
        {
          id: 'u9',
          email: 'adjoint@fc-exemple.fr',
          firstName: 'Paul',
          lastName: 'Adjoint',
          roles: ['coach'],
          teamIds: ['t1'],
        },
      ],
    });
    // L'admin du club (u3) n'est pas sur le banc ; les e-mails, jamais.
    expect(rowsIn(section(doc, 'Encadrement'))).toEqual([
      ['Éric Coaching', 'Coach principal'],
      ['Paul Adjoint', 'Coach adjoint'],
    ]);
  });

  it('termine par trois cadres de signature', () => {
    const last = sheet('m1').blocks.at(-1);
    expect(last).toEqual({
      kind: 'signatures',
      labels: ["Responsable de l'équipe", 'Responsable adverse', 'Arbitre'],
    });
  });
});

describe('buildMatchSheet — résultat, si le match est joué', () => {
  it('ne dit rien du score d’un match à jouer', () => {
    expect(headings(sheet('m1'))).not.toContain('Résultat');
  });

  it('donne le score, domicile d’abord, et nos buteurs', () => {
    const doc = sheet('m3');
    expect(field(doc, 'Score final')).toBe('U13 A 4 – 1 US Montmartre');
    // Le contre-son-camp de m3 profite à l'adversaire : pas un buteur à nous.
    expect(rowsIn(section(doc, 'Résultat'))).toEqual([
      ['Tom Moreau', '2', "22', 31'"],
      ['Axel Durand', '1', "8'"],
      ['Nathan Richard', '1', "40'"],
    ]);
  });

  it('à l’extérieur, garde l’ordre domicile – extérieur et compte un but sans minute', () => {
    const doc = sheet('m2');
    expect(field(doc, 'Score final')).toBe('AS Belleville 2 – 3 U13 A');
    expect(rowsIn(section(doc, 'Résultat'))).toEqual([
      ['Tom Moreau', '1', "12'"],
      ['Nathan Richard', '1', "34'"],
      ['Hugo Petit', '1', '–'],
    ]);
  });

  it('à buts égaux, classe par première minute, les buts sans minute en dernier', () => {
    const goals: MatchEvent[] = [
      { id: 'g1', matchId: 'm3', type: 'but', minute: 30, playerId: 'p7' },
      { id: 'g2', matchId: 'm3', type: 'but', playerId: 'p8' },
      { id: 'g3', matchId: 'm3', type: 'but', minute: 10, playerId: 'p6' },
    ];
    expect(
      rowsIn(section(sheet('m3', { matchEvents: goals }), 'Résultat'))
    ).toEqual([
      ['Nathan Richard', '1', "10'"],
      ['Axel Durand', '1', "30'"],
      ['Tom Moreau', '1', '–'],
    ]);
  });

  it('regroupe les buts sans buteur saisi', () => {
    const goals: MatchEvent[] = [
      { id: 'g1', matchId: 'm3', type: 'but', minute: 5 },
      { id: 'g2', matchId: 'm3', type: 'but', minute: 9, playerId: 'ghost' },
    ];
    expect(
      rowsIn(section(sheet('m3', { matchEvents: goals }), 'Résultat'))
    ).toEqual([['Buteur non renseigné', '2', "5', 9'"]]);
  });

  it('dit que les buteurs manquent, ou se tait quand on n’a pas marqué', () => {
    expect(
      textsIn(section(sheet('m3', { matchEvents: [] }), 'Résultat'))
    ).toEqual(['Buteurs non renseignés.']);
    const base = MOCK_DATA.matches.find(m => m.id === 'm3')!;
    const blank = sheet('m3', {
      matchEvents: [],
      match: { ...base, scoreHome: 0, scoreAway: 2 },
    });
    expect(section(blank, 'Résultat')).toEqual([
      {
        kind: 'fields',
        rows: [{ label: 'Score final', value: 'U13 A 0 – 2 US Montmartre' }],
      },
    ]);
  });
});

describe('buildMatchSheet — livraison', () => {
  it('nomme le fichier lisiblement, date et adversaire', () => {
    const out = buildMatchSheet(inputFor('m1'), fr);
    expect(out.filename).toBe('feuille-de-match-2026-05-10-fc-rivale.pdf');
    expect(out.shareTitle).toBe('Feuille de match U13 A – FC Rivale');
  });

  it('parle anglais quand l’app parle anglais', () => {
    const out = buildMatchSheet(inputFor('m3'), en);
    expect(out.document.title).toBe('Match sheet');
    expect(out.document.subtitle).toBe('U13 A v US Montmartre');
    expect(field(out.document, 'Date')).toBe('Sunday, April 12, 2026');
    expect(field(out.document, 'Kick-off')).toBe('15:30');
    expect(field(out.document, 'Final score')).toBe(
      'U13 A 4 – 1 US Montmartre'
    );
    expect(out.document.pageLabel(1, 2)).toBe('Page 1 of 2');
    expect(out.filename).toBe('match-sheet-2026-04-12-us-montmartre.pdf');
  });
});
