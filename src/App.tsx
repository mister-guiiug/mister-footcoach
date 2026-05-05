import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AppShell } from './components/layout/AppShell';
import { Spinner } from './components/ui/Spinner';

const DashboardPage     = lazy(() => import('./pages/DashboardPage'));
const TeamsPage         = lazy(() => import('./pages/TeamsPage'));
const TeamDetailPage    = lazy(() => import('./pages/TeamDetailPage'));
const PlayerDetailPage  = lazy(() => import('./pages/PlayerDetailPage'));
const MatchesPage       = lazy(() => import('./pages/MatchesPage'));
const MatchDetailPage   = lazy(() => import('./pages/MatchDetailPage'));
const MatchLivePage     = lazy(() => import('./pages/MatchLivePage'));
const TrainingsPage     = lazy(() => import('./pages/TrainingsPage'));
const TrainingDetailPage = lazy(() => import('./pages/TrainingDetailPage'));
const LineupPage        = lazy(() => import('./pages/LineupPage'));
const TournamentsPage   = lazy(() => import('./pages/TournamentsPage'));
const SurveysPage       = lazy(() => import('./pages/SurveysPage'));
const SettingsPage      = lazy(() => import('./pages/SettingsPage'));

export default function App() {
  return (
    <BrowserRouter basename="/mister-footcoach">
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
            <Route path="sondages" element={<SurveysPage />} />
            <Route path="parametres" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
