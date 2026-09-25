import { normalizeCode } from '@mister-guiiug/dev-pwa-config/pairing';

/**
 * Le code d'invitation d'un compte joueur, côté client : sa saisie et son
 * affichage. Le tirage, lui, est en base (`create_player_invitation`, 0006).
 *
 * À part de `playerAccount.ts` pour une raison de POIDS : il tire le module
 * `pairing` du socle, que seuls l'écran de rattachement et la carte des
 * invitations — deux morceaux chargés à la demande — ont à connaître.
 */

/** Longueur d'un code : 12 caractères de l'alphabet sans 0/O ni 1/I. */
export const INVITATION_CODE_LENGTH = 12;

/**
 * La saisie d'un code, telle que la base la relira : majuscules, et tout
 * caractère hors de l'alphabet écarté — tirets et espaces compris. C'est la
 * normalisation du socle ; `redeem_player_invitation` applique la même.
 */
export function normalizeInvitationCode(input: string): string {
  return normalizeCode(input, {
    alphabet: 'antiConfusion',
    maxLength: INVITATION_CODE_LENGTH,
  });
}

/** `K7PQ9XMR2DNB` → `K7PQ-9XMR-2DNB` : trois blocs, lisibles à voix haute. */
export function formatInvitationCode(code: string): string {
  return (code.match(/.{1,4}/g) ?? []).join('-');
}
