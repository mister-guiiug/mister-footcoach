import { describe, it, expect, beforeEach } from 'vitest';
import { MOCK_DATA } from '../data/mock';
import {
  STORAGE_KEY,
  SCHEMA_VERSION,
  loadState,
  saveState,
  exportState,
  importState,
  completeSnapshot,
  assertAppState,
  type AppState,
} from './storage';

/**
 * LE TEST QUI JUSTIFIE LE MAGASIN, ÉCRIT AVANT LUI.
 *
 * Jusqu'ici, `AppContext` écrivait tout l'état d'un bloc sous
 * `mister-footcoach-data` — `JSON.stringify(state)`, sans numéro de version,
 * sans schéma, sans chaîne de migration. Les 23 collections d'`AppData`
 * (saisons, équipes, joueurs, contacts, indisponibilités, blessures, matchs,
 * entraînements, compositions, tournois, covoiturages, sondages,
 * notifications…) tenaient dans cette seule clé. La prochaine évolution du
 * modèle aurait donc eu deux issues : ou bien la donnée d'hier se relisait par
 * chance, ou bien elle vidait l'application EN SILENCE, sans que personne
 * puisse la rattraper — il n'existait aucun import.
 *
 * CE QUE CE FICHIER ÉTABLIT, et qu'une relecture du code ne peut pas établir :
 * l'instantané NU écrit par la version d'aujourd'hui est relu ENTIER par le
 * magasin versionné, collection par collection, et la donnée d'avant est mise
 * de côté avant que quoi que ce soit ne la transforme.
 *
 * L'INSTANTANÉ EST CELUI DE PRODUCTION, pas un décor : `MOCK_DATA` est très
 * exactement ce que `loadState()` écrit dans `localStorage` au premier
 * démarrage (1085 lignes, 23 collections peuplées). Un test qui aurait
 * fabriqué trois joueurs n'aurait rien prouvé de la migration réelle.
 */

/** L'instantané tel que la version SANS enveloppe l'écrivait : la donnée nue. */
function snapshotOfToday(patch: Partial<AppState> = {}): AppState {
  return {
    ...MOCK_DATA,
    selectedTeamId: MOCK_DATA.teams[0]!.id,
    ...patch,
  };
}

function seedRawSnapshot(value: unknown): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

/** Le contenu brut de la clé principale, tel qu'il est sur le disque. */
function rawSnapshot(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

/** Les 23 collections d'`AppData`, plus l'équipe sélectionnée. */
const ENTITY_KEYS = [
  'season',
  'teams',
  'players',
  'contacts',
  'users',
  'matches',
  'matchEvents',
  'trainings',
  'trainingBlocks',
  'exercises',
  'attendances',
  'lineups',
  'positionHistory',
  'tournaments',
  'tournamentGroups',
  'carpoolOffers',
  'surveys',
  'surveyResponses',
  'notifications',
  'notificationPreferences',
  'clubSettings',
  'unavailabilities',
  'injuries',
  'selectedTeamId',
] as const;

beforeEach(() => {
  localStorage.clear();
});

describe('migration 0 → 1 — la donnée d’aujourd’hui traverse sans perte', () => {
  it('relit les 24 entrées de l’instantané nu, à l’identique', () => {
    const before = snapshotOfToday();
    seedRawSnapshot(before);

    const after = loadState();

    // Entrée par entrée, plutôt qu'un seul `toEqual` : quand une collection
    // se perd, le journal doit NOMMER laquelle.
    for (const key of ENTITY_KEYS) {
      expect(after[key], `entrée « ${key} » perdue à la migration`).toEqual(
        before[key]
      );
    }
    // Et la garde anti-test-creux : l'instantané avait bien de quoi perdre.
    expect(after.players.length).toBeGreaterThan(0);
    expect(after.matches.length).toBeGreaterThan(0);
    expect(after.injuries.length).toBeGreaterThan(0);
  });

  it('met la donnée d’avant de côté AVANT de la transformer', () => {
    const before = snapshotOfToday();
    seedRawSnapshot(before);

    loadState();

    // La copie de côté du socle : `{clé}.backup-v0`, déterministe donc bornée.
    const shelter = localStorage.getItem(`${STORAGE_KEY}.backup-v0`);
    expect(shelter).not.toBeNull();
    expect(JSON.parse(shelter!)).toEqual(before);
  });

  it('persiste la migration : la clé porte ensuite l’enveloppe versionnée', () => {
    seedRawSnapshot(snapshotOfToday());

    loadState();

    const stored = JSON.parse(rawSnapshot()!) as { v: number; data: AppState };
    expect(stored.v).toBe(SCHEMA_VERSION);
    expect(stored.data.players).toEqual(MOCK_DATA.players);
  });

  it('complète une collection qu’un instantané plus ancien n’avait pas', () => {
    // Les blessures et les indisponibilités sont arrivées après le premier
    // modèle : un instantané écrit avant elles ne doit pas faire tomber l'app.
    const old = snapshotOfToday() as unknown as Record<string, unknown>;
    delete old.injuries;
    delete old.unavailabilities;
    seedRawSnapshot(old);

    const after = loadState();

    expect(after.injuries).toEqual([]);
    expect(after.unavailabilities).toEqual([]);
    // Le reste est intact : compléter n'est pas réinitialiser.
    expect(after.players).toEqual(MOCK_DATA.players);
  });

  it('relit une enveloppe déjà à jour sans la remigrer ni la recopier', () => {
    const state = snapshotOfToday();
    saveState(state);

    const after = loadState();

    expect(after.teams).toEqual(state.teams);
    expect(localStorage.getItem(`${STORAGE_KEY}.backup-v0`)).toBeNull();
  });

  it('sans rien en magasin, rend les données de démonstration', () => {
    expect(loadState().season.name).toBe(MOCK_DATA.season.name);
  });
});

describe('ce qui ne se comprend pas est mis de côté, jamais jeté', () => {
  it('un instantané illisible est copié avant le repli sur la démo', () => {
    localStorage.setItem(STORAGE_KEY, '{"players": [oups');

    const after = loadState();

    expect(after.season.name).toBe(MOCK_DATA.season.name);
    expect(localStorage.getItem(`${STORAGE_KEY}.backup-illisible`)).toBe(
      '{"players": [oups'
    );
  });

  it('une version d’APRÈS est copiée, et la clé principale reste intacte', () => {
    const raw = JSON.stringify({
      v: SCHEMA_VERSION + 1,
      data: { futur: true },
    });
    localStorage.setItem(STORAGE_KEY, raw);

    const after = loadState();

    expect(after.season.name).toBe(MOCK_DATA.season.name);
    expect(
      localStorage.getItem(`${STORAGE_KEY}.backup-v${SCHEMA_VERSION + 1}`)
    ).toBe(raw);
  });
});

describe('export et import — le filet qui manquait totalement', () => {
  it('exporte l’enveloppe, et se relit lui-même sans perte', () => {
    const state = snapshotOfToday();
    saveState(state);

    const json = exportState();
    expect(JSON.parse(json!)).toMatchObject({ v: SCHEMA_VERSION });

    localStorage.clear();
    const restored = importState(json!);

    for (const key of ENTITY_KEYS) {
      expect(restored[key], `entrée « ${key} » perdue à l’import`).toEqual(
        state[key]
      );
    }
    // L'import ÉCRIT : rouvrir l'app doit retrouver le fichier importé.
    expect(loadState().players).toEqual(state.players);
  });

  it('importe aussi un fichier NU, écrit avant l’enveloppe', () => {
    const restored = importState(JSON.stringify(snapshotOfToday()));
    expect(restored.matches).toEqual(MOCK_DATA.matches);
  });

  it('refuse le fichier d’une AUTRE application sans rien effacer', () => {
    const mine = snapshotOfToday({
      season: { ...MOCK_DATA.season, name: 'Saison à moi' },
    });
    saveState(mine);

    expect(() =>
      importState(
        JSON.stringify({ v: 1, data: { notes: [{ text: 'salut' }] } })
      )
    ).toThrow();

    // Rien n'a bougé : c'est la promesse qui compte.
    expect(loadState().season.name).toBe('Saison à moi');
  });

  it('refuse un fichier illisible sans rien effacer', () => {
    const mine = snapshotOfToday({
      season: { ...MOCK_DATA.season, name: 'Saison à moi' },
    });
    saveState(mine);

    expect(() => importState('{ ceci n’est pas du JSON')).toThrow();
    expect(loadState().season.name).toBe('Saison à moi');
  });

  it('refuse un fichier exporté par une version PLUS RÉCENTE', () => {
    expect(() =>
      importState(
        JSON.stringify({ v: SCHEMA_VERSION + 1, data: snapshotOfToday() })
      )
    ).toThrow(/version/i);
  });

  it('sans rien en magasin, l’export porte les données de démonstration', () => {
    localStorage.clear();
    // Le seed rend toujours un état : l'export porte donc les données de
    // démonstration, pas `null`. C'est voulu — un fichier vide serait un
    // piège au moment de le réimporter.
    expect(JSON.parse(exportState()!).data.season.name).toBe(
      MOCK_DATA.season.name
    );
  });
});

/**
 * LES DEUX RÔLES, PRIS SÉPARÉMENT. Passés par `loadState`, compléter et
 * valider sont indiscernables : un instantané refusé et un instantané complété
 * de travers rendent tous les deux les données de démonstration. Les éprouver
 * un par un est le seul moyen de savoir LEQUEL a parlé.
 */
describe('completeSnapshot — compléter n’est jamais écraser', () => {
  it('laisse passer ce qui n’est pas un objet, sans le déguiser', () => {
    // Une valeur nue ne devient pas un état vide : c'est la validation, ensuite,
    // qui la refuse — et le socle met alors la donnée de côté.
    expect(completeSnapshot('perdu')).toBe('perdu');
    expect(completeSnapshot(null)).toBeNull();
    expect(completeSnapshot([1, 2])).toEqual([1, 2]);
  });

  it('complète les deux dictionnaires absents, sans toucher aux présents', () => {
    const filled = completeSnapshot({
      teams: [{ id: 'tx' }],
    }) as Record<string, unknown>;

    expect(filled.notificationPreferences).toEqual({});
    expect(filled.clubSettings).toEqual({ autoSurveyOnMatch: true });

    const kept = completeSnapshot({
      notificationPreferences: { u1: { enabled: false } },
      clubSettings: { autoSurveyOnMatch: false },
    }) as Record<string, unknown>;
    expect(kept.notificationPreferences).toEqual({ u1: { enabled: false } });
    expect(kept.clubSettings).toEqual({ autoSurveyOnMatch: false });
  });

  it('retrouve l’équipe sélectionnée dans la première équipe, ou rien', () => {
    // `selectedTeamId` est né APRÈS le premier modèle : un instantané écrit
    // avant lui ouvrirait l'app sur aucune équipe.
    const withTeams = completeSnapshot({
      teams: [{ id: 'tx' }, { id: 'ty' }],
    }) as Record<string, unknown>;
    expect(withTeams.selectedTeamId).toBe('tx');

    expect(
      (completeSnapshot({ teams: [] }) as Record<string, unknown>)
        .selectedTeamId
    ).toBe('');
    expect(
      (
        completeSnapshot({ teams: [{ nom: 'sans id' }] }) as Record<
          string,
          unknown
        >
      ).selectedTeamId
    ).toBe('');
    // Et si `teams` lui-même est illisible, on n'en tire rien plutôt que de
    // lever : c'est la validation, pas la migration, qui refuse.
    expect(
      (completeSnapshot({ teams: 'oups' }) as Record<string, unknown>)
        .selectedTeamId
    ).toBe('');
  });

  it('ne remplace JAMAIS une valeur présente mais du mauvais type', () => {
    // Elle traverse, et c'est la validation qui refuse : écraser ici serait
    // perdre en silence, ce que ce fichier existe pour empêcher.
    const filled = completeSnapshot({ players: 'pas un tableau' }) as Record<
      string,
      unknown
    >;
    expect(filled.players).toBe('pas un tableau');
  });

  it('recopie les clés qu’une version future ajouterait', () => {
    const filled = completeSnapshot({ inconnu: 42 }) as Record<string, unknown>;
    expect(filled.inconnu).toBe(42);
  });
});

describe('assertAppState — refuser, et dire quoi', () => {
  /** Un état complet et valide, dont on retire une pièce à chaque cas. */
  function valid(): Record<string, unknown> {
    return {
      ...MOCK_DATA,
      selectedTeamId: MOCK_DATA.teams[0]!.id,
    } as unknown as Record<string, unknown>;
  }

  it('accepte l’instantané de production', () => {
    expect(assertAppState(valid()).season.name).toBe(MOCK_DATA.season.name);
  });

  it('refuse ce qui n’est pas un objet', () => {
    expect(() => assertAppState('salut')).toThrow(/pas un objet/);
    expect(() => assertAppState(null)).toThrow(/pas un objet/);
  });

  it('refuse un fichier sans saison — le signe d’une AUTRE application', () => {
    expect(() => assertAppState({ notes: [] })).toThrow(/Mister Footcoach/);
    const anonymous = valid();
    anonymous.season = { id: 's1' };
    expect(() => assertAppState(anonymous)).toThrow(/Mister Footcoach/);
  });

  it('NOMME la collection illisible', () => {
    const broken = valid();
    broken.lineups = { pas: 'un tableau' };
    expect(() => assertAppState(broken)).toThrow(/lineups/);
  });

  it('refuse des préférences, des réglages ou une équipe illisibles', () => {
    const noPrefs = valid();
    noPrefs.notificationPreferences = 'oups';
    expect(() => assertAppState(noPrefs)).toThrow(/notification/);

    const noSettings = valid();
    noSettings.clubSettings = null;
    expect(() => assertAppState(noSettings)).toThrow(/club/);

    const noTeam = valid();
    noTeam.selectedTeamId = 12;
    expect(() => assertAppState(noTeam)).toThrow(/sélectionnée/);
  });
});
