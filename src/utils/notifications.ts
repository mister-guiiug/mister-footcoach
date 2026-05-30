import type { NotificationPreferences } from '../types';

/** User-facing notification categories (specs §16.3). */
export interface NotificationCategory {
  key: string;
  label: string;
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  { key: 'match', label: 'Matchs' },
  { key: 'entrainement', label: 'Entraînements' },
  { key: 'tournoi', label: 'Tournois' },
  { key: 'sondage', label: 'Sondages' },
  { key: 'logistique', label: 'Logistique (RDV, covoiturage)' },
  { key: 'sante', label: 'Disponibilité & blessures' },
  { key: 'rappel', label: 'Rappels de séance' },
];

/** Maps an internal notification type to its user-facing category. */
export function notificationCategory(notifType: string): string {
  if (notifType.startsWith('match')) return 'match';
  if (notifType.startsWith('entrainement')) return 'entrainement';
  if (notifType.startsWith('tournoi')) return 'tournoi';
  if (notifType.startsWith('sondage')) return 'sondage';
  if (notifType.startsWith('point_rdv') || notifType.startsWith('covoiturage'))
    return 'logistique';
  if (notifType.startsWith('indispo') || notifType.startsWith('blessure'))
    return 'sante';
  if (notifType.startsWith('rappel')) return 'rappel';
  return 'autre';
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  mutedCategories: [],
  reminderDelay: 'J-1',
};

/** Whether a notification of the given type should reach a user with these prefs. */
export function isNotificationAllowed(
  prefs: NotificationPreferences | undefined,
  notifType: string
): boolean {
  if (!prefs) return true;
  if (!prefs.enabled) return false;
  return !prefs.mutedCategories.includes(notificationCategory(notifType));
}
