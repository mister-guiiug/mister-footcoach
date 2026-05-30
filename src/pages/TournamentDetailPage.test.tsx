import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAtRoute } from '../test/helpers';
import TournamentDetailPage from './TournamentDetailPage';

function render() {
  return renderAtRoute(<TournamentDetailPage />, {
    initialPath: '/tournois/to1',
    routePattern: '/tournois/:id',
  });
}

describe('TournamentDetailPage', () => {
  beforeEach(() => localStorage.clear());

  it('renders the tournament header and info', () => {
    render();
    expect(screen.getByText('Tournoi de Printemps U13')).toBeInTheDocument();
    expect(screen.getByText('Organisateur')).toBeInTheDocument();
    expect(screen.getByText('Google Maps')).toBeInTheDocument();
  });

  it('shows the seeded groups', () => {
    render();
    expect(screen.getByText('Poule A')).toBeInTheDocument();
    expect(screen.getByText('Demi-finale')).toBeInTheDocument();
  });

  it('renders group matches with scores', () => {
    render();
    // The match appears in the group list and the by-pitch schedule.
    expect(screen.getAllByText(/U13 A — FC Lyon/).length).toBeGreaterThan(0);
    expect(screen.getByText('3 - 1')).toBeInTheDocument();
    // the unscored match shows "à jouer"
    expect(screen.getByText('à jouer')).toBeInTheDocument();
  });

  it('computes the poule standings', () => {
    render();
    // U13 A: 1 win + 1 draw = 4 points across 2 played matches.
    const rows = screen.getAllByRole('row');
    const u13aRow = rows.find(r => within(r).queryByText('U13 A'));
    expect(u13aRow).toBeTruthy();
    expect(within(u13aRow!).getByText('4')).toBeInTheDocument();
  });

  it('shows the home-tournament pitch schedule and invited teams (§12.5)', () => {
    render();
    expect(screen.getByText('Planning par terrain')).toBeInTheDocument();
    expect(screen.getByText('Terrain 1')).toBeInTheDocument();
    expect(screen.getByText('Terrain 2')).toBeInTheDocument();
    expect(screen.getByText('Équipes invitées')).toBeInTheDocument();
    expect(screen.getByText('US Ouest')).toBeInTheDocument();
  });

  it('shows a not-found state for an unknown tournament', () => {
    renderAtRoute(<TournamentDetailPage />, {
      initialPath: '/tournois/nope',
      routePattern: '/tournois/:id',
    });
    expect(screen.getByText('Tournoi introuvable')).toBeInTheDocument();
  });

  it('adds a new group via the dialog', async () => {
    render();
    await userEvent.click(screen.getByRole('button', { name: /Groupe/ }));
    expect(screen.getByText('Nouveau groupe')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nom'), 'Poule B');
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));
    expect(screen.getByText('Poule B')).toBeInTheDocument();
  });

  it('adds a match to a group via the dialog', async () => {
    render();
    const addButtons = screen.getAllByRole('button', {
      name: /Ajouter un match/,
    });
    await userEvent.click(addButtons[0]!);
    expect(screen.getByText(/Nouveau match/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Adversaire'), 'RC Sud');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(screen.getByText(/U13 A — RC Sud/)).toBeInTheDocument();
  });
});
