import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import StatsPage from './StatsPage';

describe('StatsPage', () => {
  beforeEach(() => localStorage.clear());

  it('renders the title and team summary', () => {
    renderWithProviders(<StatsPage />);
    expect(screen.getByText('Statistiques')).toBeInTheDocument();
    expect(screen.getByText("Bilan de l'équipe")).toBeInTheDocument();
    expect(screen.getByText('Victoires')).toBeInTheDocument();
  });

  it('shows the per-player stats table', () => {
    renderWithProviders(<StatsPage />);
    expect(screen.getByText('Statistiques par joueur')).toBeInTheDocument();
    expect(screen.getByText('Lucas Dupont')).toBeInTheDocument();
  });

  it('switches team via the filter', async () => {
    renderWithProviders(<StatsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'U13 B' }));
    // Still renders the summary for the other team
    expect(screen.getByText("Bilan de l'équipe")).toBeInTheDocument();
  });
});
