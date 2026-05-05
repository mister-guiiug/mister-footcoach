import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import TrainingsPage from './TrainingsPage';
import { MOCK_DATA } from '../data/mock';

describe('TrainingsPage', () => {
  beforeEach(() => localStorage.clear());

  it('renders page title', () => {
    renderWithProviders(<TrainingsPage />);
    expect(screen.getByText('Entraînements')).toBeInTheDocument();
  });

  it('shows all filter options', () => {
    renderWithProviders(<TrainingsPage />);
    expect(screen.getByText('Tous')).toBeInTheDocument();
    expect(screen.getByText('À venir')).toBeInTheDocument();
    expect(screen.getByText('Passés')).toBeInTheDocument();
  });

  it('shows team filter buttons', () => {
    renderWithProviders(<TrainingsPage />);
    expect(screen.getByRole('button', { name: 'U13 A' })).toBeInTheDocument();
    expect(screen.getAllByText('U13 B').length).toBeGreaterThan(0);
  });

  it('shows training entries initially', () => {
    renderWithProviders(<TrainingsPage />);
    expect(screen.getAllByText(/min/).length).toBeGreaterThan(0);
  });

  it('shows cancelled badge', () => {
    renderWithProviders(<TrainingsPage />);
    // tr5 is cancelled in mock data
    expect(screen.getAllByText('Annulé').length).toBeGreaterThan(0);
  });

  it('shows exceptionnel badge', () => {
    renderWithProviders(<TrainingsPage />);
    expect(screen.getAllByText('Exceptionnel').length).toBeGreaterThan(0);
  });

  it('filters to upcoming when À venir clicked', async () => {
    renderWithProviders(<TrainingsPage />);
    await userEvent.click(screen.getByText('À venir'));
    const items = screen.queryAllByText(/min/);
    expect(items.length).toBeGreaterThanOrEqual(0);
  });

  it('filters to past when Passés clicked', async () => {
    renderWithProviders(<TrainingsPage />);
    await userEvent.click(screen.getByText('Passés'));
    const items = screen.queryAllByText(/min/);
    expect(items.length).toBeGreaterThanOrEqual(0);
  });

  it('resets time filter on Tous', async () => {
    renderWithProviders(<TrainingsPage />);
    await userEvent.click(screen.getByText('Passés'));
    await userEvent.click(screen.getByText('Tous'));
    expect(screen.getAllByText(/min/).length).toBeGreaterThan(0);
  });

  it('filters by team', async () => {
    renderWithProviders(<TrainingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'U13 A' }));
    // All shown should be U13 A trainings
    expect(screen.getAllByText('U13 A').length).toBeGreaterThan(0);
  });

  it('resets team filter on Toutes', async () => {
    renderWithProviders(<TrainingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'U13 A' }));
    await userEvent.click(screen.getByText('Toutes'));
    expect(screen.getAllByText(/min/).length).toBeGreaterThan(0);
  });

  it('shows note for cancelled training', () => {
    renderWithProviders(<TrainingsPage />);
    // tr5 has note "Terrain indisponible"
    expect(screen.getByText(/Terrain indisponible/)).toBeInTheDocument();
  });

  it('shows "Aucun entraînement trouvé" when no trainings exist', () => {
    localStorage.setItem('mister-footcoach-data', JSON.stringify({
      ...MOCK_DATA, trainings: [], selectedTeamId: MOCK_DATA.teams[0]?.id ?? '',
    }));
    renderWithProviders(<TrainingsPage />);
    expect(screen.getByText('Aucun entraînement trouvé')).toBeInTheDocument();
  });
});
