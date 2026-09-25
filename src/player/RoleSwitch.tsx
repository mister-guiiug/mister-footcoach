import { lazy, Suspense, type ReactNode } from 'react';
import { useCurrentUser } from '../store/AppContext';
import { Spinner } from '../components/ui/Spinner';
import { hasClubRole, isPlayerOnly } from '../utils/playerAccount';

// Chacune dans son morceau : l'entraîneur ne télécharge pas la page du
// joueur, ni personne celle du rattachement une fois rattaché.
//
// LA CONDITION PORTE SUR `import.meta.env`, ET PAS SUR `BACKEND` — c'est
// voulu. Vite remplace `import.meta.env.*` dans CE module, à la
// transformation : dans un build local, la condition est fausse avant même
// que le bundler ne lise les `import()`, et il n'émet pas ces morceaux. Une
// condition sur `BACKEND`, constante d'un AUTRE module, n'est repliée
// qu'ensuite : le code partait, mais les morceaux restaient — précachés par le
// service worker, et leurs dépendances rangées dans `vendor`, que chaque
// visiteur précharge. Mesuré au build local du 25/09/2026 : +0,5 kB gzip
// préchargés et 4 fichiers de plus au précache pour ces deux pages ; +1,4 kB
// et 8 fichiers avec les deux réglages de `SettingsPage`, qui suivent la même
// règle. `MODE === 'test'` : Vitest les construit, et chaque test choisit son
// mode.
const PlayerHomePage =
  import.meta.env.VITE_BACKEND === 'supabase' || import.meta.env.MODE === 'test'
    ? lazy(() => import('./PlayerHomePage'))
    : null;
const LinkAccountPage =
  import.meta.env.VITE_BACKEND === 'supabase' || import.meta.env.MODE === 'test'
    ? lazy(() => import('./LinkAccountPage'))
    : null;

/**
 * L'aiguillage par RÔLE, en mode `supabase` (monté par
 * `SupabaseAppProvider`, une fois la base lue).
 *
 * - Un membre du club (admin, entraîneur, parent) : l'application entière,
 *   comme avant — les politiques RLS décident de ce qu'elle contient.
 * - Un compte QUE joueur : sa page, et rien d'autre. Il n'a aucune raison de
 *   voir des menus « Équipes » ou « Contacts » vides : ce serait lui montrer
 *   l'existence de ce qu'on lui cache.
 * - Un compte sans fiche — l'enfant qui vient de s'inscrire, l'adulte que
 *   l'administrateur n'a pas encore rattaché — ou dont la fiche n'a aucun
 *   rôle : l'écran de rattachement, qui dit quoi faire.
 *
 * Ce n'est PAS une barrière de sécurité : un compte joueur qui contournerait
 * cet écran trouverait une base qui ne lui rend que ses données (0006).
 */
export function RoleSwitch({ children }: { children: ReactNode }) {
  const me = useCurrentUser();

  // Hors d'un build connecté, ce composant n'est jamais monté (son seul
  // parent, `SupabaseAppProvider`, n'existe qu'en mode `supabase`) : sans
  // pages, il laisse passer.
  if (!PlayerHomePage || !LinkAccountPage) return <>{children}</>;
  if (me && hasClubRole(me) && !isPlayerOnly(me)) return <>{children}</>;

  return (
    <Suspense fallback={<Spinner fullscreen />}>
      {me && isPlayerOnly(me) ? (
        <PlayerHomePage />
      ) : (
        <LinkAccountPage hasProfile={Boolean(me)} />
      )}
    </Suspense>
  );
}
