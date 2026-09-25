import type { PlayerInvitation, User } from '../types';

/**
 * Le compte joueur, côté client — ce qui se calcule sans réseau.
 *
 * La SÉCURITÉ n'est pas ici : elle est en base (migration 0006), et ces
 * fonctions ne décident que de ce que l'écran montre. Deux d'entre elles
 * reprennent pourtant, mot pour mot, une définition SQL — pour que l'écran
 * et la base ne se contredisent pas.
 *
 * AUCUNE DÉPENDANCE, à dessein : `RoleSwitch` importe ce module, et il vit
 * dans le morceau d'entrée d'un build connecté. Le code d'invitation, qui
 * tire le module `pairing` du socle, est à part (`invitationCode.ts`), chargé
 * avec les seuls écrans qui s'en servent.
 */

/**
 * Un compte qui n'est QUE joueur. Un rôle cumulé (§ 3.2) garde l'union de ses
 * droits, donc l'application complète. Même définition que
 * `app_is_player_only()` en base.
 */
export function isPlayerOnly(user: Pick<User, 'roles'>): boolean {
  return (
    user.roles.includes('player') &&
    !user.roles.some(r => r === 'admin' || r === 'coach' || r === 'parent')
  );
}

/** Au moins un rôle du club : sinon, la fiche n'ouvre rien (`app_is_member`). */
export function hasClubRole(user: Pick<User, 'roles'>): boolean {
  return user.roles.some(
    r => r === 'admin' || r === 'coach' || r === 'parent' || r === 'player'
  );
}

/**
 * Où en est le compte d'un joueur, lu dans ses invitations.
 *
 * `active` se lit `redeemedBy` non nul et non révoqué : la base remet
 * `redeemedBy` à `null` dès que le compte ouvert par ce code est fermé — par
 * révocation, ou parce que l'enfant l'a lui-même supprimé.
 */
export type InvitationStatus =
  | { kind: 'none' }
  | { kind: 'pending'; expiresAt: string }
  | { kind: 'expired'; expiresAt: string }
  | { kind: 'active'; since: string; consentedBy: string };

export function invitationStatus(
  invitations: PlayerInvitation[],
  playerId: string,
  now: Date
): InvitationStatus {
  const own = invitations.filter(i => i.playerId === playerId);
  const active = own.find(i => i.redeemedBy && !i.revokedAt);
  if (active) {
    return {
      kind: 'active',
      since: active.redeemedAt ?? active.consentedAt,
      consentedBy: active.createdBy,
    };
  }
  // Les codes jamais utilisés ni révoqués, du plus récent au plus ancien.
  const unused = own
    .filter(i => !i.redeemedAt && !i.revokedAt)
    .sort((a, b) => (a.expiresAt < b.expiresAt ? 1 : -1));
  const latest = unused[0];
  if (!latest) return { kind: 'none' };
  return new Date(latest.expiresAt) > now
    ? { kind: 'pending', expiresAt: latest.expiresAt }
    : { kind: 'expired', expiresAt: latest.expiresAt };
}
