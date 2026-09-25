/*
 * Les gestionnaires Web Push, importés par le service worker que Workbox
 * engendre (vite.config.ts → `workbox.importScripts`). Référence du parc :
 * mister-doc, `public/push-sw.js`.
 *
 * INERTE TANT QU'AUCUN PUSH N'ARRIVE : il ne touche ni au précache ni à la
 * mise à jour de l'application. Un push n'arrive qu'en mode `supabase`, à un
 * appareil abonné depuis les réglages.
 *
 * Charge utile attendue (JSON), bâtie par l'Edge Function `push`
 * (`supabase/functions/push/logic.ts`, `buildPayload`) :
 *   { title, body, url, tag }
 */
/* global self */

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Mister Footcoach';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      // Relatif au service worker, donc au chemin de base de l'app.
      icon: 'icons/icon-192.png',
      // Même `tag` = la notification précédente sur le même objet est
      // REMPLACÉE : trois modifications d'un match n'empilent pas trois
      // alertes.
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: data.url || './' },
    })
  );
});

// Un clic ouvre la page concernée : dans l'onglet déjà ouvert s'il y en a un,
// sinon dans une nouvelle fenêtre.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    (async () => {
      const url = new URL(target, self.registration.scope).href;
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if ('focus' in client) {
          if ('navigate' in client) {
            try {
              await client.navigate(url);
            } catch {
              // Même document, ou navigation refusée : le focus suffit.
            }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })()
  );
});
