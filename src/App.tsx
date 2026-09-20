import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Spinner } from './components/ui/Spinner';

// CHAQUE IMPORT D'UNE PAGE PRÉCHARGÉE EST NOMMÉ, parce qu'il sert DEUX FOIS : à
// `lazy` ci-dessous, et au préchargement à l'inactivité de
// `usePrechargeLesPagesDeLaBarre`. Deux `import()` du même spécificateur ne
// téléchargent qu'une fois — le registre de modules dédoublonne — mais encore
// faut-il que ce soit LITTÉRALEMENT le même spécificateur, sinon le bundler
// émet deux morceaux et le préchargement ne sert plus à rien.
const chargeTeams = () => import('./pages/TeamsPage');
const chargeMatches = () => import('./pages/MatchesPage');
const chargeTrainings = () => import('./pages/TrainingsPage');

/**
 * Les trois destinations VISIBLES de la barre basse, hors l'accueil — celles
 * qui sont sous le pouce sans ouvrir « Plus ».
 *
 * Les sept autres restent dehors À DESSEIN : le socle les replie sous un bouton
 * (`maxVisible` vaut 5, dont une place pour « Plus »), et les précharger
 * ferait payer à tout le monde onze morceaux pour un menu qui n'en montre que
 * quatre. Pour celles-là, c'est la pastille qui tourne qui répond au clic.
 */
const CHARGEURS_DE_LA_BARRE = [chargeTeams, chargeMatches, chargeTrainings];

/** `navigator.connection` n'est pas dans les types du DOM : il reste un brouillon. */
type NavigateurEconome = Navigator & { connection?: { saveData?: boolean } };

/**
 * PRÉCHARGE LES PAGES DE LA BARRE DÈS QUE LE FIL PRINCIPAL SOUFFLE.
 *
 * Sans préchargement, le morceau d'une page n'est demandé qu'AU CLIC : un
 * aller-retour réseau complet, payé au pire moment — pendant que le reste du
 * bundle arrive et que le service worker précharge ses entrées. Mesuré à froid
 * le 20/09/2026 sur deux sites publiés du parc, première visite : 133 ms sur
 * mister-settle, 161 ms sur mister-molkky, pendant lesquelles l'URL indique
 * déjà la nouvelle route et l'écran affiche encore l'ancien.
 *
 * N'entre PAS dans `bundleBudget.preloadGzipKb` : ce budget ne compte que ce
 * qui est `modulepreload` dans le document, et un `import()` tardif n'y entre
 * pas.
 */
function usePrechargeLesPagesDeLaBarre() {
  useEffect(() => {
    // `saveData` : le visiteur a demandé qu'on épargne son forfait. On ne
    // télécharge alors que ce qu'il demande vraiment — et c'est précisément
    // pour ce cas-là que la barre, elle, sait désormais dire qu'elle charge.
    if ((navigator as NavigateurEconome).connection?.saveData) return;

    let annule = false;
    const precharge = () => {
      if (annule) return;
      // Un échec ici est sans conséquence : au clic, `lazy` redemandera le
      // morceau et c'est LUI qui portera l'erreur, dans son propre `Suspense`.
      for (const charge of CHARGEURS_DE_LA_BARRE) void charge().catch(() => {});
    };

    // `requestIdleCallback` manque encore à Safari avant la 17 ; le repli
    // minuté vaut mieux que rien.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(precharge, { timeout: 3000 });
      return () => {
        annule = true;
        window.cancelIdleCallback?.(id);
      };
    }
    const id = window.setTimeout(precharge, 1200);
    return () => {
      annule = true;
      window.clearTimeout(id);
    };
  }, []);
}

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TeamsPage = lazy(chargeTeams);
const TeamDetailPage = lazy(() => import('./pages/TeamDetailPage'));
const PlayerDetailPage = lazy(() => import('./pages/PlayerDetailPage'));
const MatchesPage = lazy(chargeMatches);
const MatchDetailPage = lazy(() => import('./pages/MatchDetailPage'));
const MatchLivePage = lazy(() => import('./pages/MatchLivePage'));
const TrainingsPage = lazy(chargeTrainings);
const TrainingDetailPage = lazy(() => import('./pages/TrainingDetailPage'));
const LineupPage = lazy(() => import('./pages/LineupPage'));
const TournamentsPage = lazy(() => import('./pages/TournamentsPage'));
const TournamentDetailPage = lazy(() => import('./pages/TournamentDetailPage'));
const SurveysPage = lazy(() => import('./pages/SurveysPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const ExercisesPage = lazy(() => import('./pages/ExercisesPage'));
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function App() {
  usePrechargeLesPagesDeLaBarre();
  return (
    // Basename dérivé de `BASE_URL` (donc de `VITE_BASE_PATH`) : `/mister-footcoach/`
    // pour GitHub Pages, `/` quand `dist/` est servi à la racine (Lighthouse CI,
    // e2e Playwright). En dur, l'app ne rendait rien hors GitHub Pages.
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<Spinner fullscreen />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="equipes" element={<TeamsPage />} />
            <Route path="equipes/:id" element={<TeamDetailPage />} />
            <Route path="joueurs/:id" element={<PlayerDetailPage />} />
            <Route path="matchs" element={<MatchesPage />} />
            <Route path="matchs/:id" element={<MatchDetailPage />} />
            <Route path="matchs/:id/live" element={<MatchLivePage />} />
            <Route path="entrainements" element={<TrainingsPage />} />
            <Route path="entrainements/:id" element={<TrainingDetailPage />} />
            <Route path="compositions" element={<LineupPage />} />
            <Route path="tournois" element={<TournamentsPage />} />
            <Route path="tournois/:id" element={<TournamentDetailPage />} />
            <Route path="sondages" element={<SurveysPage />} />
            <Route path="statistiques" element={<StatsPage />} />
            <Route path="exercices" element={<ExercisesPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="parametres" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
