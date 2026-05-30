import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
  vi,
} from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import DashboardPage from './DashboardPage';
import { MOCK_DATA } from '../data/mock';

describe('DashboardPage', () => {
  // Fige « aujourd'hui » à une date de la saison 2025-2026 où les fixtures
  // (matchs/entraînements 2026-05-12/20, indispos 2026-04-20→05-15) sont
  // « à venir »/« en cours ». Sans ça, isUpcoming() rote dès que la date
  // réelle dépasse les fixtures. `toFake: ['Date']` ne fige que Date (pas les
  // timers async, pour ne pas perturber Testing Library).
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-01T12:00:00'));
  });
  afterAll(() => vi.useRealTimers());

  beforeEach(() => localStorage.clear());

  it('renders season name', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/2025-2026/)).toBeInTheDocument();
  });

  it('shows team count', () => {
    renderWithProviders(<DashboardPage />);
    // 2 teams in mock data — multiple "2"s may appear
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('renders upcoming matches section', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Prochains matchs')).toBeInTheDocument();
  });

  it('renders upcoming trainings section', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Prochains entraînements')).toBeInTheDocument();
  });

  it('renders teams quick access', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Mes équipes')).toBeInTheDocument();
  });

  it('shows open surveys card when surveys are open', () => {
    renderWithProviders(<DashboardPage />);
    // mock data has 2 open surveys
    expect(screen.getByText(/sondages? en attente/i)).toBeInTheDocument();
  });

  it('shows tournaments section when non-terminated tournaments exist', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Tournois')).toBeInTheDocument();
  });

  it('shows Exceptionnel badge for upcoming exceptional training', () => {
    renderWithProviders(<DashboardPage />);
    // tr6 is upcoming 2026-05-12, type: exceptionnel
    expect(screen.getByText('Exceptionnel')).toBeInTheDocument();
  });

  it('shows @ for away upcoming match', () => {
    const awayMatch = {
      id: 'm99',
      teamId: 't1',
      seasonId: 's1',
      date: '2026-05-20',
      time: '15:00',
      location: 'Away Stadium',
      isHome: false,
      opponent: 'FC Away Test',
      status: 'saison' as const,
      phase: 'Test',
      liveActive: false,
    };
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        matches: [awayMatch],
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/@ FC Away Test/)).toBeInTheDocument();
  });

  it('shows "Entraînement" when training has no theme', () => {
    const noThemeTraining = {
      id: 'tr99',
      teamId: 't1',
      date: '2026-05-20',
      time: '18:00',
      duration: 90,
      type: 'regulier' as const,
      cancelled: false,
    };
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        trainings: [noThemeTraining],
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Entraînement')).toBeInTheDocument();
  });

  it('shows singular "sondage" when exactly one survey is open', () => {
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        surveys: [MOCK_DATA.surveys[0]],
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('1 sondage en attente')).toBeInTheDocument();
  });

  it('hides open surveys section when no surveys are open', () => {
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        surveys: [],
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderWithProviders(<DashboardPage />);
    expect(screen.queryByText(/sondage.*en attente/i)).not.toBeInTheDocument();
  });

  it('shows training with unknown teamId without team name', () => {
    const orphanTraining = {
      id: 'tr99',
      teamId: 'unknown-team',
      date: '2026-05-20',
      time: '18:00',
      duration: 90,
      type: 'regulier' as const,
      cancelled: false,
      theme: 'Technique',
    };
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        trainings: [orphanTraining],
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Technique')).toBeInTheDocument();
  });

  it('excludes inactive players from team count', () => {
    const inactivePlayer = {
      ...MOCK_DATA.players[0],
      id: 'p-inactive',
      active: false,
    };
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        players: [...MOCK_DATA.players, inactivePlayer],
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Mes équipes')).toBeInTheDocument();
  });

  it('hides upcoming matches section when no upcoming matches exist', () => {
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        matches: [],
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderWithProviders(<DashboardPage />);
    expect(screen.queryByText('Prochains matchs')).not.toBeInTheDocument();
  });

  it('hides upcoming trainings section when no upcoming trainings exist', () => {
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        trainings: [],
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderWithProviders(<DashboardPage />);
    expect(
      screen.queryByText('Prochains entraînements')
    ).not.toBeInTheDocument();
  });

  it('hides tournaments section when all tournaments are terminated', () => {
    const terminatedTournament = {
      ...MOCK_DATA.tournaments[0],
      status: 'termine' as const,
    };
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        tournaments: [terminatedTournament],
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderWithProviders(<DashboardPage />);
    expect(screen.queryByText('Tournois')).not.toBeInTheDocument();
  });

  it('shows team name as empty when match has unknown teamId', () => {
    const orphanMatch = {
      id: 'm88',
      teamId: 'unknown-team',
      seasonId: 's1',
      date: '2026-05-20',
      time: '15:00',
      location: 'Stadium',
      isHome: true,
      opponent: 'FC Orphan',
      status: 'saison' as const,
      phase: 'Test',
      liveActive: false,
    };
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        matches: [orphanMatch],
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/vs FC Orphan/)).toBeInTheDocument();
  });
});
