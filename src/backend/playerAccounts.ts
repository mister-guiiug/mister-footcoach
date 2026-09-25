import { getSupabase } from '../lib/supabase';
import type { PlayerInvitation } from '../types';

/**
 * Le compte joueur, côté réseau : les quatre appels que l'écran fait à la
 * base (mode `supabase` seulement). Tout ce qui décide est dans les RPC de
 * `supabase/migrations/0006_compte_joueur.sql`, qui vérifient elles-mêmes
 * leur appelant ; ce module ne fait que les appeler et traduire leurs refus.
 */

/**
 * Les colonnes LISIBLES d'une invitation. `select *` échouerait : le haché du
 * code (`codeHash`) n'est pas accordé à `authenticated`, et c'est voulu.
 */
export const INVITATION_COLUMNS =
  'id,playerId,createdBy,consentedAt,expiresAt,redeemedAt,redeemedBy,revokedAt,revokedBy';

/** Les motifs de refus que la base nomme — et que l'écran traduit. */
export const PLAYER_ACCOUNT_ERRORS = [
  'session_requise',
  'parent_non_lie',
  'joueur_inactif',
  'compte_deja_actif',
  'invitation_invalide',
  'compte_deja_rattache',
  'compte_joueur_requis',
  'sondage_ferme',
  'sondage_inaccessible',
  'intention_invalide',
] as const;

export type PlayerAccountErrorCode =
  (typeof PLAYER_ACCOUNT_ERRORS)[number] | 'inconnue';

/**
 * Un refus de la base, avec son motif. `inconnue` couvre le reste — réseau
 * coupé, migration absente : l'écran le dit sans prétendre savoir pourquoi.
 */
export class PlayerAccountError extends Error {
  readonly code: PlayerAccountErrorCode;
  constructor(code: PlayerAccountErrorCode, message: string) {
    super(message);
    this.name = 'PlayerAccountError';
    this.code = code;
  }
}

/** Le motif d'une erreur PostgREST : son message EST le code, en base. */
export function toPlayerAccountError(error: {
  message?: string;
}): PlayerAccountError {
  const message = error.message ?? '';
  const code = (PLAYER_ACCOUNT_ERRORS as readonly string[]).includes(message)
    ? (message as PlayerAccountErrorCode)
    : 'inconnue';
  return new PlayerAccountError(code, message);
}

/** Les invitations que l'appelant peut lire : celles de ses enfants, ou toutes pour l'admin. */
export async function listInvitations(): Promise<PlayerInvitation[]> {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from('player_invitations')
    .select(INVITATION_COLUMNS);
  if (error) throw toPlayerAccountError(error);
  return (data ?? []) as unknown as PlayerInvitation[];
}

export interface IssuedInvitation {
  id: string;
  /** En clair, rendu UNE fois : la base n'en garde que le haché. */
  code: string;
  expiresAt: string;
}

/** Créer un code : le geste de consentement du parent. */
export async function createInvitation(
  playerId: string
): Promise<IssuedInvitation> {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc('create_player_invitation', {
    p_player_id: playerId,
  });
  if (error) throw toPlayerAccountError(error);
  return data as IssuedInvitation;
}

/** Rattacher le compte connecté au joueur du code. Rend l'id du joueur. */
export async function redeemInvitation(code: string): Promise<string> {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc('redeem_player_invitation', {
    p_code: code,
  });
  if (error) throw toPlayerAccountError(error);
  return data as string;
}

/** Retirer le consentement : ferme le code en attente ET le compte ouvert. */
export async function revokePlayerAccess(playerId: string): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.rpc('revoke_player_access', {
    p_player_id: playerId,
  });
  if (error) throw toPlayerAccountError(error);
}
