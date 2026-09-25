import { describe, expect, it } from 'vitest';
import {
  buildPayload,
  isPushAllowed,
  notificationCategory as pushCategory,
  originOf,
  targetPath,
  timingSafeEqual,
} from '../../supabase/functions/push/logic.ts';
import {
  NOTIFICATION_CATEGORIES,
  isNotificationAllowed,
  notificationCategory,
} from './notifications';

/**
 * L'EDGE FUNCTION `push` DÉCIDE COMME LE CLIENT.
 *
 * Sa logique est recopiée (Deno ne lit pas le code de l'app) : ce test tient
 * les deux copies ensemble. Si une catégorie coupée dans les réglages
 * continuait d'arriver sur le téléphone, ce serait ici que ça se verrait —
 * pas chez l'utilisateur.
 */

/** Tous les types que le client émet aujourd'hui (`NOTIFY`), et quelques autres. */
const TYPES = [
  'match_nouveau',
  'match_modifie',
  'sondage_nouveau',
  'blessure_declaree',
  'indispo_declaree',
  'covoiturage_nouvelle_offre',
  'point_rdv_modifie',
  'entrainement_nouveau',
  'entrainement_annule',
  'entrainement_modifie',
  'tournoi_nouveau',
  'tournoi_modifie',
  'rappel_seance',
  'inconnu',
];

describe('la parité avec le client', () => {
  it('même catégorie pour chaque type', () => {
    for (const type of TYPES) {
      expect(pushCategory(type), type).toBe(notificationCategory(type));
    }
  });

  it('même décision, pour chaque catégorie coupée et le commutateur général', () => {
    const cases = [
      undefined,
      { enabled: false, mutedCategories: [], reminderDelay: 'J-1' as const },
      ...NOTIFICATION_CATEGORIES.map(c => ({
        enabled: true,
        mutedCategories: [c.key],
        reminderDelay: 'J-1' as const,
      })),
    ];
    for (const prefs of cases) {
      for (const type of TYPES) {
        expect(
          isPushAllowed(prefs, type),
          `${type} ${JSON.stringify(prefs)}`
        ).toBe(isNotificationAllowed(prefs, type));
      }
    }
  });

  it('une ligne de préférences sans liste (null en base) ne coupe rien', () => {
    expect(
      isPushAllowed({ enabled: true, mutedCategories: null }, 'match_nouveau')
    ).toBe(true);
  });
});

describe('le message poussé', () => {
  it('ouvre la page de l’objet concerné', () => {
    expect(targetPath('match', 'm1')).toBe('matchs/m1');
    expect(targetPath('training', 'tr1')).toBe('entrainements/tr1');
    expect(targetPath('tournament', 'to1')).toBe('tournois/to1');
    expect(targetPath('player', 'p1')).toBe('joueurs/p1');
    expect(targetPath('survey', 'sv1')).toBe('sondages');
  });

  it('retombe sur la liste — ou les notifications — sans identifiant', () => {
    expect(targetPath('match', null)).toBe('matchs');
    expect(targetPath('training')).toBe('entrainements');
    expect(targetPath('tournament', '')).toBe('tournois');
    expect(targetPath('player', null)).toBe('notifications');
    expect(targetPath(null, 'x')).toBe('notifications');
    expect(targetPath('autre', 'x')).toBe('notifications');
  });

  it('échappe l’identifiant dans l’adresse', () => {
    expect(targetPath('match', 'a/b c')).toBe('matchs/a%2Fb%20c');
  });

  it('bâtit titre, texte, adresse et étiquette', () => {
    const row = {
      id: 'n1',
      userId: 'u1',
      type: 'match_modifie',
      message: 'Match vs FC Voisin modifié.',
      relatedId: 'm1',
      relatedType: 'match',
    };
    expect(buildPayload(row, 'https://exemple.test/mister-footcoach')).toEqual({
      title: 'Mister Footcoach',
      body: 'Match vs FC Voisin modifié.',
      url: 'https://exemple.test/mister-footcoach/matchs/m1',
      // Même objet, même étiquette : la deuxième modification remplace la
      // première sur l'écran.
      tag: 'match_modifie:m1',
    });
    expect(
      buildPayload(
        { ...row, relatedId: null, relatedType: null },
        'https://exemple.test/'
      )
    ).toMatchObject({
      url: 'https://exemple.test/notifications',
      tag: 'match_modifie:n1',
    });
  });
});

describe('ce que la fonction journalise, et comment elle compare', () => {
  it('l’origine d’un point de livraison, jamais l’adresse entière', () => {
    expect(originOf('https://fcm.googleapis.com/fcm/send/abc')).toBe(
      'https://fcm.googleapis.com'
    );
    expect(originOf('pas une adresse')).toBe('inconnu');
  });

  it('compare le secret sans court-circuit', () => {
    expect(timingSafeEqual('secret', 'secret')).toBe(true);
    expect(timingSafeEqual('secret', 'secreT')).toBe(false);
    expect(timingSafeEqual('secret', 'secret ')).toBe(false);
    expect(timingSafeEqual('', '')).toBe(true);
  });
});
