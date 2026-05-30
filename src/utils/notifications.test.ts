import { describe, it, expect } from 'vitest';
import {
  notificationCategory,
  isNotificationAllowed,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './notifications';

describe('notificationCategory', () => {
  it.each([
    ['match_nouveau', 'match'],
    ['match_modifie', 'match'],
    ['entrainement_annule', 'entrainement'],
    ['tournoi_nouveau', 'tournoi'],
    ['sondage_nouveau', 'sondage'],
    ['point_rdv_modifie', 'logistique'],
    ['covoiturage_nouvelle_offre', 'logistique'],
    ['indispo_declaree', 'sante'],
    ['blessure_declaree', 'sante'],
    ['rappel_veille', 'rappel'],
    ['unknown_type', 'autre'],
  ])('maps %s to %s', (type, expected) => {
    expect(notificationCategory(type)).toBe(expected);
  });
});

describe('isNotificationAllowed', () => {
  it('allows everything when there are no preferences', () => {
    expect(isNotificationAllowed(undefined, 'match_nouveau')).toBe(true);
  });

  it('allows everything with default preferences', () => {
    expect(
      isNotificationAllowed(DEFAULT_NOTIFICATION_PREFERENCES, 'sondage_nouveau')
    ).toBe(true);
  });

  it('blocks all when the master switch is off', () => {
    expect(
      isNotificationAllowed(
        { enabled: false, mutedCategories: [], reminderDelay: 'J-1' },
        'match_nouveau'
      )
    ).toBe(false);
  });

  it('blocks a muted category but allows others', () => {
    const prefs = {
      enabled: true,
      mutedCategories: ['logistique'],
      reminderDelay: 'J-1' as const,
    };
    expect(isNotificationAllowed(prefs, 'covoiturage_nouvelle_offre')).toBe(
      false
    );
    expect(isNotificationAllowed(prefs, 'match_nouveau')).toBe(true);
  });
});
