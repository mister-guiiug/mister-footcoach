/**
 * La logique PURE de l'Edge Function `push` : ni Deno, ni réseau, ni
 * dépendance. `index.ts` l'importe pour décider et bâtir le message ; un test
 * Vitest de l'application (`src/utils/pushLogic.test.ts`) l'importe aussi, et
 * vérifie qu'elle trie les notifications EXACTEMENT comme le client — une
 * catégorie coupée dans les réglages ne doit pas continuer d'arriver sur le
 * téléphone.
 */

/** La ligne de `notifications` telle que la relit la fonction. */
export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  message: string;
  relatedId?: string | null;
  relatedType?: string | null;
}

/** Les préférences du destinataire (`notification_preferences`). */
export interface PreferencesRow {
  enabled: boolean;
  mutedCategories: string[] | null;
}

/** Ce que reçoit le service worker (`public/push-sw.js`). */
export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/**
 * La catégorie d'un type de notification — la table de
 * `notificationCategory` (`src/utils/notifications.ts`), recopiée parce que
 * Deno ne lit pas le code de l'application. Le test de parité la tient.
 */
export function notificationCategory(type: string): string {
  if (type.startsWith('match')) return 'match';
  if (type.startsWith('entrainement')) return 'entrainement';
  if (type.startsWith('tournoi')) return 'tournoi';
  if (type.startsWith('sondage')) return 'sondage';
  if (type.startsWith('point_rdv') || type.startsWith('covoiturage'))
    return 'logistique';
  if (type.startsWith('indispo') || type.startsWith('blessure')) return 'sante';
  if (type.startsWith('rappel')) return 'rappel';
  return 'autre';
}

/**
 * Pousser, ou pas, selon les préférences du destinataire (§ 16.3) : rien si
 * tout est coupé, rien pour une catégorie décochée. Sans ligne de
 * préférences, les défauts du client s'appliquent — tout est permis.
 */
export function isPushAllowed(
  prefs: PreferencesRow | null | undefined,
  type: string
): boolean {
  if (!prefs) return true;
  if (!prefs.enabled) return false;
  return !(prefs.mutedCategories ?? []).includes(notificationCategory(type));
}

/** La page à ouvrir au clic — les routes du `BrowserRouter` de l'app. */
export function targetPath(
  relatedType?: string | null,
  relatedId?: string | null
): string {
  const id = relatedId ? encodeURIComponent(relatedId) : '';
  switch (relatedType) {
    case 'match':
      return id ? `matchs/${id}` : 'matchs';
    case 'training':
      return id ? `entrainements/${id}` : 'entrainements';
    case 'tournament':
      return id ? `tournois/${id}` : 'tournois';
    case 'player':
      return id ? `joueurs/${id}` : 'notifications';
    case 'survey':
      return 'sondages';
    default:
      return 'notifications';
  }
}

/**
 * Le message poussé. Le texte est celui de la ligne, écrit par le client dans
 * la langue de qui l'a déclenché. `tag` regroupe par OBJET : une deuxième
 * modification du même match remplace la première sur l'écran, au lieu de
 * s'y empiler.
 */
export function buildPayload(
  row: NotificationRow,
  appUrl: string
): PushPayload {
  const base = appUrl.endsWith('/') ? appUrl : `${appUrl}/`;
  return {
    title: 'Mister Footcoach',
    body: row.message,
    url: `${base}${targetPath(row.relatedType, row.relatedId)}`,
    tag: `${row.type}:${row.relatedId ?? row.id}`,
  };
}

/**
 * L'origine d'un point de livraison (`https://fcm.googleapis.com`) : de quoi
 * savoir QUEL service a refusé, sans journaliser l'adresse complète, qui
 * identifie un appareil.
 */
export function originOf(endpoint: string): string {
  try {
    return new URL(endpoint).origin;
  } catch {
    return 'inconnu';
  }
}

/** Comparaison à temps constant : pas d'oracle temporel sur le secret. */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const left = enc.encode(a);
  const right = enc.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i]! ^ right[i]!;
  return diff === 0;
}
