import {
  createPushClient,
  permissionState,
  pushSupport,
  type PushSupport,
} from '@mister-guiiug/dev-pwa-config/push';
import {
  supabasePushTransport,
  type SupabasePushOptions,
} from '@mister-guiiug/dev-pwa-config/push/supabase';
import { getSupabase } from './supabase';

/**
 * Web Push côté client (mode `supabase` seulement) — la référence du parc est
 * `mister-doc/src/lib/push.ts`.
 *
 * LA MÉCANIQUE VIENT DU SOCLE : détection du support AVEC SA RAISON (le cas
 * iPhone hors écran d'accueil), permission qu'on ne redemande pas, cycle de
 * vie de l'abonnement, conversion de la clé VAPID. Et, ici, le TRANSPORT du
 * socle aussi : la table `push_subscriptions` (migration 0007) a exactement
 * le schéma qu'il attend, `user_id` compris — l'identité d'authentification,
 * que la session connaît. mister-doc a dû écrire le sien, sa table étant
 * indexée sur une autre identité ; pas nous.
 *
 * TOUT EST INERTE SANS CLÉ PUBLIQUE (`VITE_VAPID_PUBLIC_KEY`, lue au build) :
 * l'écran le dit, et rien ne part.
 *
 * Ce module n'est importé que par l'écran des réglages et, à la déconnexion,
 * par un `import()` : il n'entre pas dans le premier chargement.
 */

/** La clé publique VAPID du déploiement, ou la chaîne vide. */
export function vapidPublicKey(): string {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';
}

/** Le push est-il prévu sur ce déploiement ? */
export function pushDeployed(): boolean {
  return vapidPublicKey().length > 0;
}

/** Ce que ce navigateur sait faire — et, sinon, POURQUOI. */
export function pushBrowserSupport(env: unknown = globalThis): PushSupport {
  return pushSupport(env);
}

/** La permission a-t-elle déjà été refusée ? Elle ne se redemande pas. */
export function pushPermissionDenied(env: unknown = globalThis): boolean {
  return permissionState(env) === 'denied';
}

/**
 * Un service worker est-il enregistré ? Le client du socle attend
 * `serviceWorker.ready`, qui ne se résout JAMAIS sans worker — en `npm run
 * dev`, par exemple. Sans cette garde, l'écran tournerait sans fin, et la
 * déconnexion avec lui.
 */
async function hasWorker(env: unknown): Promise<boolean> {
  const sw = (
    env as {
      navigator?: {
        serviceWorker?: { getRegistration?: () => Promise<unknown> };
      };
    }
  ).navigator?.serviceWorker;
  if (!sw?.getRegistration) return false;
  try {
    return Boolean(await sw.getRegistration());
  } catch {
    return false;
  }
}

/** Le client du socle, branché sur SON transport Supabase et sur notre client. */
async function client(env: unknown) {
  const sb = await getSupabase();
  return createPushClient({
    transport: supabasePushTransport({
      // Le type du socle ne dépend pas du SDK (peer optionnel) : il décrit la
      // forme qu'il utilise, et `SupabaseClient` la porte.
      client: sb as unknown as SupabasePushOptions['client'],
      vapidKey: vapidPublicKey(),
    }),
    env,
  });
}

/** L'abonnement de CET appareil, ou `null`. N'en crée aucun. */
export async function currentPushEndpoint(
  env: unknown = globalThis
): Promise<string | null> {
  if (!(await hasWorker(env))) return null;
  const subscription = await (await client(env)).current();
  return subscription?.endpoint ?? null;
}

/**
 * `denied` couvre le refus ET la fenêtre d'autorisation fermée sans réponse ;
 * `error` est une vraie panne — qu'on n'annonce pas comme un refus.
 */
export type PushEnableResult = 'on' | 'denied' | 'error';

/**
 * Abonne cet appareil et l'enregistre au nom de `userId` — l'identité
 * d'AUTHENTIFICATION, celle que la politique RLS compare à `auth.uid()`.
 */
export async function enablePush(
  userId: string,
  env: unknown = globalThis
): Promise<PushEnableResult> {
  if (!(await hasWorker(env))) return 'error';
  const { ok, reason } = await (await client(env)).subscribe({ userId });
  if (ok) return 'on';
  return reason?.startsWith('permission-') ? 'denied' : 'error';
}

/**
 * Désabonne cet appareil : la base D'ABORD, le navigateur ensuite — l'ordre
 * du socle, sans quoi le serveur perdrait l'adresse qu'il doit oublier.
 * Lève en cas d'échec, plutôt que d'annoncer un arrêt qui n'a pas eu lieu.
 */
export async function disablePush(env: unknown = globalThis): Promise<void> {
  if (!(await hasWorker(env))) return;
  const { ok, reason } = await (await client(env)).unsubscribe();
  if (!ok) {
    throw new Error(`push : désabonnement impossible (${reason ?? '?'})`);
  }
}
