import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Spinner } from './components/ui/Spinner';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));
const TeamDetailPage = lazy(() => import('./pages/TeamDetailPage'));
const PlayerDetailPage = lazy(() => import('./pages/PlayerDetailPage'));
const MatchesPage = lazy(() => import('./pages/MatchesPage'));
const MatchDetailPage = lazy(() => import('./pages/MatchDetailPage'));
const MatchLivePage = lazy(() => import('./pages/MatchLivePage'));
const TrainingsPage = lazy(() => import('./pages/TrainingsPage'));
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
