/**
 * La persistance locale de Mister Footcoach — enveloppée, versionnée, migrable.
 *
 * CE QU'IL Y AVAIT AVANT, ET POURQUOI ÇA NE POUVAIT PAS TENIR. `AppContext`
 * écrivait tout l'état d'un bloc sous `mister-footcoach-data` :
 * `localStorage.setItem(KEY, JSON.stringify(state))`, relu par un
 * `JSON.parse` casté en `AppState`. Aucun numéro de version, aucun schéma,
 * aucune chaîne de migration — et 23 collections dans cette unique clé
 * (saisons, équipes, joueurs, contacts, indisponibilités, blessures, matchs,
 * entraînements, compositions, tournois, covoiturages, sondages,
 * notifications…). Le mode local étant le DÉFAUT, c'est là que vivent les
 * données de tout le monde.
 *
 * Le cast était le piège : `as AppState` ne vérifie rien à l'exécution. Une
 * évolution du modèle — une collection ajoutée, un champ renommé — rendait
 * une donnée à moitié lisible, sans que rien ne le dise, et le premier
 * `saveState` suivant réécrivait par-dessus. Il n'existait AUCUN import pour
 * rattraper (aucun `<input type="file">`, aucun `FileReader` dans `src/`) : la
 * seule sortie était l'export RGPD d'un joueur, qui ne se réimporte pas.
 *
 * CE QUE LE SOCLE APPORTE, et qu'on ne réécrit pas ici. `versioned-store`
 * tient l'enveloppe `{ v, data }`, la chaîne de migrations indexée par version
 * SOURCE, la persistance de la migration réussie — et la règle qui compte :
 * AVANT toute perte possible, une copie de côté (`{clé}.backup-…`), APRÈS
 * seulement le repli sur le seed. Jamais de destruction silencieuse.
 *
 * LA CLÉ NE CHANGE PAS. Le préfixe `mister-footcoach-` et la clé `data` se
 * recomposent très exactement en `mister-footcoach-data`, celle d'aujourd'hui :
 * la migration 0 → 1 lit donc l'instantané en place, sans manœuvre de reprise.
 * Le socle considère toute valeur SANS enveloppe comme une version 0 — c'est
 * précisément le chemin d'adoption prévu.
 *
 * DEUX RÔLES DISTINCTS, ET C'EST VOULU :
 *  - la migration COMPLÈTE sans jamais rien retirer (une collection absente
 *    d'un instantané plus ancien devient un tableau vide) ;
 *  - la validation REFUSE (elle ne répare pas) : c'est elle qui distingue un
 *    instantané de cette application du fichier d'une autre, et qui fait
 *    qu'un import se solde par un message plutôt que par une app vidée.
 */
import { createStore } from '@mister-guiiug/dev-pwa-config/storage';
import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import type { AppData } from '../types';
import { MOCK_DATA } from '../data/mock';

/** L'état applicatif : le modèle métier, plus l'équipe en cours de lecture. */
export interface AppState extends AppData {
  selectedTeamId: string;
}

/** La clé historique, inchangée — c'est ce qui rend la migration indolore. */
export const STORAGE_KEY = 'mister-footcoach-data';

/** Version du schéma persisté. 1 = adoption de l'enveloppe du socle. */
export const SCHEMA_VERSION = 1;

const STORE_PREFIX = 'mister-footcoach-';
const SNAPSHOT_KEY = 'data';

/** Les 20 collections d'`AppData` stockées en tableau. */
const COLLECTIONS = [
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
  'unavailabilities',
  'injuries',
] as const satisfies readonly (keyof AppData)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Migration 0 → 1 : l'instantané NU d'aujourd'hui entre dans l'enveloppe.
 *
 * Elle ne transforme pas la donnée, elle la COMPLÈTE : une collection absente
 * — le cas d'un instantané écrit avant que `injuries` ou `unavailabilities`
 * n'existent — devient un tableau vide. Tout le reste est recopié tel quel, y
 * compris les clés que cette version ne connaît pas : ce qu'on ne comprend pas
 * n'est pas ce qu'on doit jeter.
 *
 * Une valeur PRÉSENTE mais du mauvais type n'est jamais écrasée : elle
 * traverse, et c'est la validation qui refuse. Écraser ici reviendrait à
 * perdre en silence, ce que ce fichier existe pour empêcher.
 */
export function completeSnapshot(data: unknown): unknown {
  if (!isRecord(data)) return data;
  const filled: Record<string, unknown> = { ...data };

  for (const key of COLLECTIONS) {
    if (filled[key] === undefined || filled[key] === null) filled[key] = [];
  }
  if (filled.notificationPreferences == null)
    filled.notificationPreferences = {};
  if (filled.clubSettings == null)
    filled.clubSettings = { autoSurveyOnMatch: true };
  if (typeof filled.selectedTeamId !== 'string') {
    const teams = Array.isArray(filled.teams) ? filled.teams : [];
    const first: unknown = teams[0];
    filled.selectedTeamId =
      isRecord(first) && typeof first.id === 'string' ? first.id : '';
  }
  return filled;
}

/**
 * Est-ce un instantané de CETTE application ? Rend la donnée, ou LÈVE.
 *
 * Injectée dans le magasin (le socle ne dépend d'aucun validateur), elle sert
 * deux moments : au chargement, elle envoie une donnée devenue illisible à la
 * copie de côté plutôt qu'à l'écran ; à l'import, elle est le seul rempart
 * entre le fichier d'une autre application et l'effacement de la saison en
 * cours.
 *
 * Le critère est la SIGNATURE du modèle, pas son exhaustivité : une saison
 * nommée et les vingt collections. Un export de miss-genius ou de mister-doc
 * n'en porte aucune.
 */
export function assertAppState(data: unknown): AppState {
  if (!isRecord(data)) {
    throw new TypeError('instantané illisible : ce n’est pas un objet');
  }
  const season = data.season;
  if (
    !isRecord(season) ||
    typeof season.id !== 'string' ||
    typeof season.name !== 'string'
  ) {
    throw new TypeError(
      'ce fichier ne vient pas de Mister Footcoach : aucune saison'
    );
  }
  for (const key of COLLECTIONS) {
    if (!Array.isArray(data[key])) {
      throw new TypeError(`collection « ${key} » absente ou illisible`);
    }
  }
  if (!isRecord(data.notificationPreferences)) {
    throw new TypeError('préférences de notification illisibles');
  }
  if (!isRecord(data.clubSettings)) {
    throw new TypeError('réglages du club illisibles');
  }
  if (typeof data.selectedTeamId !== 'string') {
    throw new TypeError('équipe sélectionnée illisible');
  }
  return data as unknown as AppState;
}

/** L'état de départ : les données de démonstration, comme avant. */
export function seedState(): AppState {
  return { ...MOCK_DATA, selectedTeamId: MOCK_DATA.teams[0]!.id };
}

const store = createVersionedStore<AppState>({
  store: createStore(STORE_PREFIX),
  key: SNAPSHOT_KEY,
  version: SCHEMA_VERSION,
  migrations: { 0: completeSnapshot },
  validate: assertAppState,
  seed: seedState,
});

/** Lit l'état persisté — migré, validé. Retombe sur la démo si rien d'utilisable. */
export function loadState(): AppState {
  return store.load();
}

/** Écrit l'état sous son enveloppe. `false` si le stockage a refusé. */
export function saveState(state: AppState): boolean {
  return store.save(state);
}

/**
 * L'état courant en JSON indenté, ENVELOPPE COMPRISE : le fichier réimporté
 * par une version ultérieure repassera par ses migrations.
 *
 * JAMAIS `null`, contrairement à la signature du socle : celui-ci ne rend rien
 * que si le magasin n'a pas de seed. Celui-ci en a un — les données de
 * démonstration —, donc `load()` rend toujours un état. Le dire ici évite à
 * l'appelant une branche qu'aucun test ne pourrait atteindre.
 */
export function exportState(): string {
  return store.export()!;
}

/**
 * Relit un fichier — enveloppe du socle ou instantané nu d'avant. N'écrit QUE
 * si tout a réussi ; lève une erreur lisible sinon, que l'écran affiche.
 */
export function importState(json: string): AppState {
  return store.import(json);
}
