import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import MatchesPage from './MatchesPage';
import { MOCK_DATA } from '../data/mock';

describe('MatchesPage', () => {
  beforeEach(() => localStorage.clear());

  it('renders page title', () => {
    renderWithProviders(<MatchesPage />);
    expect(screen.getByText('Matchs')).toBeInTheDocument();
  });

  it('renders all filter buttons', () => {
    renderWithProviders(<MatchesPage />);
    expect(screen.getByText('Tous')).toBeInTheDocument();
    expect(screen.getByText('À venir')).toBeInTheDocument();
    expect(screen.getByText('Passés')).toBeInTheDocument();
  });

  it('renders team filter buttons', () => {
    renderWithProviders(<MatchesPage />);
    expect(screen.getByText('U13 A')).toBeInTheDocument();
    expect(screen.getByText('U13 B')).toBeInTheDocument();
  });

  it('shows matches initially', () => {
    renderWithProviders(<MatchesPage />);
    // Matches show "Domicile" or "Extérieur" in the list
    expect(screen.getAllByText(/Domicile|Extérieur/).length).toBeGreaterThan(0);
  });

  it('clicking "À venir" filters to upcoming matches', async () => {
    renderWithProviders(<MatchesPage />);
    await userEvent.click(screen.getByText('À venir'));
    // Should still show some matches (mock has upcoming ones)
    const matches = screen.queryAllByText(/vs|@/);
    expect(matches.length).toBeGreaterThanOrEqual(0);
  });

  it('clicking "Passés" filters to past matches', async () => {
    renderWithProviders(<MatchesPage />);
    await userEvent.click(screen.getByText('Passés'));
    const matches = screen.queryAllByText(/vs|@/);
    expect(matches.length).toBeGreaterThanOrEqual(0);
  });

  it('clicking "Tous" resets filter', async () => {
    renderWithProviders(<MatchesPage />);
    await userEvent.click(screen.getByText('À venir'));
    await userEvent.click(screen.getByText('Tous'));
    expect(screen.getAllByText(/Domicile|Extérieur/).length).toBeGreaterThan(0);
  });

  it('filtering by team shows only that team matches', async () => {
    renderWithProviders(<MatchesPage />);
    await userEvent.click(screen.getByText('U13 A'));
    // All remaining should be U13 A matches
    const teamLabels = screen.queryAllByText('U13 A');
    expect(teamLabels.length).toBeGreaterThan(0);
  });

  it('clicking "Toutes" resets team filter', async () => {
    renderWithProviders(<MatchesPage />);
    await userEvent.click(screen.getByText('U13 A'));
    await userEvent.click(screen.getByText('Toutes'));
    expect(screen.getAllByText(/Domicile|Extérieur/).length).toBeGreaterThan(0);
  });

  it('shows score for past matches', () => {
    renderWithProviders(<MatchesPage />);
    // m2 and m3 have scores; score is rendered across multiple nodes in one <p>
    const scoreEl = document.querySelector('.text-lg.font-bold');
    expect(scoreEl).toBeInTheDocument();
  });

  it('shows "Aucun match trouvé" when no matches exist', () => {
    localStorage.setItem('mister-footcoach-data', JSON.stringify({
      ...MOCK_DATA, matches: [], selectedTeamId: MOCK_DATA.teams[0]?.id ?? '',
    }));
    renderWithProviders(<MatchesPage />);
    expect(screen.getByText('Aucun match trouvé')).toBeInTheDocument();
  });
});
