import { describe, it, expect, beforeEach } from 'vitest';
import type { ComponentType } from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import { emptyState, STORAGE_KEY } from '../store/storage';
import DashboardPage from './DashboardPage';
import TeamsPage from './TeamsPage';
import MatchesPage from './MatchesPage';
import TrainingsPage from './TrainingsPage';
import LineupPage from './LineupPage';
import TournamentsPage from './TournamentsPage';
import SurveysPage from './SurveysPage';
import StatsPage from './StatsPage';
import ExercisesPage from './ExercisesPage';
import ContactsPage from './ContactsPage';
import NotificationsPage from './NotificationsPage';
import SettingsPage from './SettingsPage';

/*
 * « REPARTIR DE ZÉRO » NE DOIT RIEN CASSER.
 *
 * La démonstration a toujours fourni deux équipes, et des écrans s'y sont
 * adossés sans le dire : la composition prenait `teams[0]!.id`, ce qui lève
 * dès qu'il n'y a plus d'équipe. Chaque écran de la barre et du menu « Plus »
 * est donc monté sur la saison VIDE que le bouton écrit — celle de
 * `emptyState`, pas une copie de test.
 */
const PAGES: [string, ComponentType][] = [
  ['accueil', DashboardPage],
  ['équipes', TeamsPage],
  ['matchs', MatchesPage],
  ['entraînements', TrainingsPage],
  ['composition', LineupPage],
  ['tournois', TournamentsPage],
  ['sondages', SurveysPage],
  ['statistiques', StatsPage],
  ['exercices', ExercisesPage],
  ['contacts', ContactsPage],
  ['notifications', NotificationsPage],
  ['réglages', SettingsPage],
];

describe('saison vide (« Repartir de zéro »)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, data: emptyState() })
    );
  });

  it.each(PAGES)("l'écran « %s » se monte sans équipe", (_, Page) => {
    renderWithProviders(<Page />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
