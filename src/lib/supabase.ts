import {
  createSupabaseClientFactory,
  type SupabaseClientFactory,
} from '@mister-guiiug/dev-pwa-config/supabase-client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * LE SDK NE S'EMBARQUE QUE SI LES VARIABLES SONT LÀ AU BUILD. Vite remplace
 * `import.meta.env.VITE_SUPABASE_URL` par sa valeur littérale — `undefined`
 * quand elle manque —, et le bundler replie alors le ternaire ci-dessous : la
 * fabrique n'est jamais construite, `createClient` n'est référencé nulle
 * part, et `@supabase/supabase-js` sort du bundle. C'est exactement ce que
 * faisait l'ancienne copie sans le dire : son `throw` sur variable absente
 * rendait `createClient(…)` inatteignable, donc supprimé — le `vendor`
 * déployé ne contient aucune trace du SDK. Or le build de ce dépôt
 * (`deploy.yml`) ne pose ni l'URL ni la clé. Mesuré sans ce garde : 218,6 kB
 * préchargés au lieu de 163,4, pour un budget de 172.
 */
const configure = !!(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Le client Supabase : la fabrique du SOCLE, avec EXACTEMENT les options de
 * l'ancienne copie — `createClient(url, anonKey, { auth: { persistSession:
 * true, autoRefreshToken: true, flowType: 'pkce' } })`. La fabrique fusionne
 * `auth` sur `{ persistSession: true, autoRefreshToken: true }` : il ne reste
 * à passer que `flowType`. Ni `fetch`, ni `correlated`, ni `clientOptions` :
 * rien de plus qu'avant.
 *
 * `flowType: 'pkce'` : le lien de connexion renvoie `?code=` dans la query au
 * lieu d'un jeton dans le fragment — inoffensif sous BrowserRouter, et le même
 * réglage que le reste de la famille.
 *
 * LE SDK RESTE DANS LE MORCEAU D'ENTRÉE, et c'est un choix. Le défaut de la
 * fabrique est un `import('@supabase/supabase-js')` au premier `getClient()` —
 * le motif de mister-molkky, où la plupart des utilisateurs ne synchronisent
 * jamais. Ici, en mode `supabase`, le client est demandé dès le montage :
 * `AuthProvider` lit la session avant tout écran, `SupabaseAppProvider`
 * hydrate. Un import différé ajouterait un aller-retour AVANT l'écran de
 * connexion, à chaque première visite — et le `manualChunks` de vite.config.ts
 * rangerait de toute façon le SDK dans `vendor`, préchargé. `loader` remet
 * donc à la fabrique `createClient`, importé statiquement — seulement lui, pas
 * l'espace de noms entier, que le bundler ne saurait plus élaguer.
 *
 * RIEN NE S'EXÉCUTE À L'IMPORT (doctrine anti-écran-blanc du socle) : la
 * configuration est lue sans lever, et une variable manquante ne se voit qu'au
 * premier `getClient()`, sous forme de REJET — dans un contexte qu'une
 * frontière d'erreur sait afficher.
 *
 * La clé anon est faite pour le bundle (public) de GitHub Pages : chaque table
 * est protégée par RLS, jamais par le client.
 */
export const supabase: SupabaseClientFactory<SupabaseClient> | null = configure
  ? createSupabaseClientFactory<SupabaseClient>({
      env: import.meta.env,
      auth: { flowType: 'pkce' },
      loader: () => Promise.resolve({ createClient }),
    })
  : null;

/**
 * Le client partagé, créé au premier appel — une PROMESSE désormais, la
 * fabrique du socle étant asynchrone. Rejette si `VITE_SUPABASE_URL` ou
 * `VITE_SUPABASE_ANON_KEY` manque : le même message qu'avant, pour la même
 * cause.
 */
export function getSupabase(): Promise<SupabaseClient> {
  if (!supabase) {
    return Promise.reject(
      new Error(
        'Supabase non configuré : définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.'
      )
    );
  }
  return supabase.getClient();
}
