import type { Attendance, AttendanceStatus } from '../types';

/**
 * Le statut que donne un toucher sur la feuille de présence. Un joueur NON
 * SAISI devient présent : c'est le premier geste attendu. Il devenait absent
 * tant que l'écran affichait « Présent » pour un joueur qu'aucun
 * enregistrement ne comptait (relevé du 25/09/2026).
 */
export const NEXT_ATTENDANCE: Record<
  AttendanceStatus | 'unset',
  AttendanceStatus
> = {
  unset: 'present',
  present: 'absent',
  absent: 'excuse',
  excuse: 'present',
};

/**
 * L'identifiant d'une présence : la séance et le joueur, qui en sont déjà la
 * clé naturelle (le magasin remplace l'enregistrement de même séance et de
 * même joueur). Stable, donc sans horloge ni hasard pendant le rendu.
 */
export function attendanceId(
  sessionType: Attendance['sessionType'],
  sessionId: string,
  playerId: string
): string {
  return `att-${sessionType}-${sessionId}-${playerId}`;
}
