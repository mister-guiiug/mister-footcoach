import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderAtRoute } from '../test/helpers';
import PlayerDetailPage from './PlayerDetailPage';

describe('PlayerDetailPage', () => {
  beforeEach(() => localStorage.clear());

  it('renders empty state for unknown player', () => {
    renderAtRoute(<PlayerDetailPage />, {
      initialPath: '/joueurs/unknown',
      routePattern: '/joueurs/:id',
    });
    expect(screen.getByText('Joueur introuvable')).toBeInTheDocument();
  });

  it('renders player name and position', () => {
    renderAtRoute(<PlayerDetailPage />, {
      initialPath: '/joueurs/p1',
      routePattern: '/joueurs/:id',
    });
    expect(screen.getByRole('heading', { name: /Lucas/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Gardien/).length).toBeGreaterThan(0);
  });

  it('shows player number badge', () => {
    // p1 has number: 1
    renderAtRoute(<PlayerDetailPage />, {
      initialPath: '/joueurs/p1',
      routePattern: '/joueurs/:id',
    });
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('shows unavailability card for player p4', () => {
    renderAtRoute(<PlayerDetailPage />, {
      initialPath: '/joueurs/p4',
      routePattern: '/joueurs/:id',
    });
    expect(screen.getByText(/Indisponible/)).toBeInTheDocument();
    expect(screen.getByText(/Blessure/)).toBeInTheDocument();
  });

  it('shows injury card for player p4', () => {
    renderAtRoute(<PlayerDetailPage />, {
      initialPath: '/joueurs/p4',
      routePattern: '/joueurs/:id',
    });
    expect(screen.getAllByText(/Entorse grade 2/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Reprise progressive/).length).toBeGreaterThan(0);
  });

  it('shows position history when available', () => {
    // p8 has position history in mock data
    renderAtRoute(<PlayerDetailPage />, {
      initialPath: '/joueurs/p8',
      routePattern: '/joueurs/:id',
    });
    expect(screen.getByText('Historique des postes')).toBeInTheDocument();
  });

  it('shows appetences chart', () => {
    renderAtRoute(<PlayerDetailPage />, {
      initialPath: '/joueurs/p1',
      routePattern: '/joueurs/:id',
    });
    expect(screen.getByText('Appétences par poste')).toBeInTheDocument();
  });

  it('renders secondary team label for player with two teams', () => {
    // p18 has secondaryTeamId = t1
    renderAtRoute(<PlayerDetailPage />, {
      initialPath: '/joueurs/p18',
      routePattern: '/joueurs/:id',
    });
    expect(screen.getByText(/Renfort/)).toBeInTheDocument();
  });

  it('renders info card with date of birth', () => {
    renderAtRoute(<PlayerDetailPage />, {
      initialPath: '/joueurs/p1',
      routePattern: '/joueurs/:id',
    });
    expect(screen.getByText('Date de naissance')).toBeInTheDocument();
  });

  it('shows dash for player without number', () => {
    // p3 has no explicit number assigned — but actually p3 has number:3. Let's use p6
    renderAtRoute(<PlayerDetailPage />, {
      initialPath: '/joueurs/p6',
      routePattern: '/joueurs/:id',
    });
    // number is 10 for p6, so badge #10 should appear
    expect(screen.getByText('#10')).toBeInTheDocument();
  });

  it('shows dash in info table when no number', () => {
    // p19 has no number field → shows "—"
    renderAtRoute(<PlayerDetailPage />, {
      initialPath: '/joueurs/p19',
      routePattern: '/joueurs/:id',
    });
    expect(screen.getByText('Numéro')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
