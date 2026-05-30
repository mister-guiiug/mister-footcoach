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
import { renderAtRoute } from '../test/helpers';
import TeamDetailPage from './TeamDetailPage';
import { MOCK_DATA } from '../data/mock';

describe('TeamDetailPage', () => {
  // Fige « aujourd'hui » dans la saison 2025-2026 pour que les sections
  // « à venir » (matchs/entraînements MOCK + fixtures 2026-05-20) s'affichent
  // sans rotation temporelle. `toFake: ['Date']` ne fige que Date.
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-01T12:00:00'));
  });
  afterAll(() => vi.useRealTimers());

  beforeEach(() => localStorage.clear());

  it('renders team name for known id', () => {
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('U13 A')).toBeInTheDocument();
  });

  it('shows empty state for unknown id', () => {
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/unknown',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Équipe introuvable')).toBeInTheDocument();
  });

  it('renders player list', () => {
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Effectif')).toBeInTheDocument();
    // Lucas Dupont is a player in t1
    expect(screen.getByText('Lucas Dupont')).toBeInTheDocument();
  });

  it('shows unavailability warning icon for unavailable player', () => {
    // p4 (Enzo Thomas) has an active unavailability in mock data
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    // AlertTriangle appears for p4
    const listItems = document.querySelectorAll('li');
    const hasWarning = Array.from(listItems).some(li =>
      li.querySelector('svg')
    );
    expect(hasWarning).toBe(true);
  });

  it('shows upcoming matches section when matches exist', () => {
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Prochains matchs')).toBeInTheDocument();
  });

  it('shows upcoming trainings section when trainings exist', () => {
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Prochains entraînements')).toBeInTheDocument();
  });

  it('shows action buttons for compositions and surveys', () => {
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Compositions')).toBeInTheDocument();
    expect(screen.getByText('Sondages')).toBeInTheDocument();
  });

  it('shows secondary team label for renfort player', () => {
    // p18 has t2 as primary and t1 as secondary
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText(/Renfort/i)).toBeInTheDocument();
  });

  it('shows empty player list when team has no players', () => {
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        players: MOCK_DATA.players.filter(
          p => p.primaryTeamId !== 't1' && p.secondaryTeamId !== 't1'
        ),
        selectedTeamId: 't1',
      })
    );
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Aucun joueur')).toBeInTheDocument();
  });

  it('shows @ for away upcoming match', () => {
    const awayMatch = {
      id: 'm99',
      teamId: 't1',
      seasonId: 's1',
      date: '2026-05-20',
      time: '15:00',
      location: 'Away',
      isHome: false,
      opponent: 'FC Away',
      status: 'saison',
      phase: 'Test',
      liveActive: false,
    };
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        matches: [awayMatch],
        selectedTeamId: 't1',
      })
    );
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText(/@ FC Away/)).toBeInTheDocument();
  });

  it('shows "Entraînement" fallback when training has no theme', () => {
    const noThemeTraining = {
      id: 'tr99',
      teamId: 't1',
      date: '2026-05-20',
      time: '18:00',
      duration: 90,
      type: 'regulier',
      cancelled: false,
    };
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        trainings: [noThemeTraining],
        selectedTeamId: 't1',
      })
    );
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Entraînement')).toBeInTheDocument();
  });
});
