// Edge Function « push » — la notification sort de l'application.
//
// Déclenchée par un WEBHOOK DE BASE sur INSERT dans `public.notifications`
// (Supabase → Database → Webhooks). Pour chaque ligne : les abonnements push
// de SON destinataire, et de lui seul, reçoivent un message chiffré (VAPID) —
// si ses préférences le permettent. Les abonnements expirés (404/410) sont
// purgés. Référence du parc : mister-doc, `supabase/functions/push`.
//
// Déploiement : `supabase functions deploy push` — `verify_jwt = false` est
// posé dans `supabase/config.toml` : un webhook n'a pas de session.
// Secrets (`supabase secrets set`), aucun dans le dépôt :
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY   la paire VAPID
//   VAPID_SUBJECT                         ex. mailto:contact@votre-club.fr
//   APP_URL                               ex. https://mister-guiiug.github.io/mister-footcoach/
//   WEBHOOK_SECRET                        OBLIGATOIRE : sans lui, tout est refusé
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis par la plateforme.
//
// Procédure complète : docs/supabase.md, « Notifications push ».

import webpush from 'npm:web-push@3.6.7';
import {
  buildPayload,
  isPushAllowed,
  originOf,
  timingSafeEqual,
  type NotificationRow,
  type PreferencesRow,
} from './logic.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? '';
const APP_URL = Deno.env.get('APP_URL') ?? '';
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? '';

if (VAPID_PUBLIC && VAPID_PRIVATE && VAPID_SUBJECT) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

// Journal en JSON sur une ligne, interrogeable dans les logs de la fonction.
// JAMAIS de donnée identifiante : ni nom, ni e-mail, ni message, ni point de
// livraison complet — des compteurs et des origines suffisent au diagnostic.
type Fields = Record<string, string | number | boolean | null>;
function log(
  level: 'info' | 'warn' | 'error',
  event: string,
  fields: Fields = {}
) {
  const line = JSON.stringify({ level, fn: 'push', event, ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** L'API REST de la base, avec la clé de service : elle lit par-delà la RLS. */
async function rest<T>(path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`REST ${res.status}`);
  return res.status === 204 ? null : ((await res.json()) as T);
}

interface Subscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('ok'); // sonde de santé

  // FERMÉE PAR DÉFAUT. Déployée sans vérification de JWT, la fonction n'a
  // que ce secret pour savoir que c'est le webhook qui l'appelle : sans lui,
  // n'importe quel POST anonyme ferait sonner des téléphones.
  if (!WEBHOOK_SECRET) {
    log('error', 'config_missing', { secret: 'WEBHOOK_SECRET' });
    return new Response('WEBHOOK_SECRET non configuré', { status: 500 });
  }
  if (
    !timingSafeEqual(req.headers.get('x-webhook-secret') ?? '', WEBHOOK_SECRET)
  ) {
    log('warn', 'forbidden');
    return new Response('forbidden', { status: 401 });
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !VAPID_SUBJECT || !APP_URL) {
    log('error', 'config_missing', { secret: 'VAPID_*/APP_URL' });
    return new Response('VAPID ou APP_URL non configuré', { status: 500 });
  }

  let id: string | undefined;
  try {
    const body = await req.json();
    id = (body?.record ?? body)?.id;
  } catch {
    log('warn', 'bad_request');
    return new Response('bad request', { status: 400 });
  }
  if (typeof id !== 'string' || !id) {
    log('warn', 'no_record');
    return json({ sent: 0, reason: 'no_record' });
  }

  try {
    // LA LIGNE EST RELUE EN BASE, pas prise dans le corps de la requête : la
    // fonction ne pousse que ce qui EST dans `notifications` — une ligne
    // que la RLS a laissé écrire (migration 0007). Même avec le secret, on
    // ne fait pas dire n'importe quoi à un téléphone.
    const rows =
      (await rest<NotificationRow[]>(
        `notifications?id=eq.${encodeURIComponent(id)}` +
          '&select=id,userId,type,message,relatedId,relatedType'
      )) ?? [];
    const notification = rows[0];
    if (!notification) {
      log('info', 'unknown_notification');
      return json({ sent: 0, reason: 'unknown' });
    }

    // Le destinataire, et lui seul : `users.id` → son identité d'auth.
    const users =
      (await rest<{ authId: string | null }[]>(
        `users?id=eq.${encodeURIComponent(notification.userId)}&select=authId`
      )) ?? [];
    const authId = users[0]?.authId;
    if (!authId) {
      log('info', 'no_account', { type: notification.type });
      return json({ sent: 0, reason: 'no_account' });
    }

    // Ses préférences (§ 16.3) : tout coupé, ou cette catégorie décochée.
    const prefs =
      (await rest<PreferencesRow[]>(
        `notification_preferences?userId=eq.${encodeURIComponent(notification.userId)}` +
          '&select=enabled,mutedCategories'
      )) ?? [];
    if (!isPushAllowed(prefs[0], notification.type)) {
      log('info', 'muted', { type: notification.type });
      return json({ sent: 0, reason: 'muted' });
    }

    const subs =
      (await rest<Subscription[]>(
        `push_subscriptions?user_id=eq.${encodeURIComponent(authId)}` +
          '&select=endpoint,p256dh,auth'
      )) ?? [];
    const payload = JSON.stringify(buildPayload(notification, APP_URL));

    let sent = 0;
    let expired = 0;
    let failed = 0;
    await Promise.all(
      subs.map(async sub => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sent++;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            // L'appareil a retiré l'abonnement : purge normale, pas une panne.
            expired++;
            await rest(
              `push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
              { method: 'DELETE' }
            ).catch(() => log('warn', 'purge_failed'));
          } else {
            failed++;
            log('error', 'send_failed', {
              status: status ?? null,
              origin: originOf(sub.endpoint),
            });
          }
        }
      })
    );

    log('info', 'delivered', {
      type: notification.type,
      subs: subs.length,
      sent,
      expired,
      failed,
    });
    return json({ sent, expired, failed });
  } catch (error) {
    log('error', 'failed', {
      reason: error instanceof Error ? error.message : String(error),
    });
    return new Response('erreur', { status: 500 });
  }
});
