import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import DashboardPage from './DashboardPage';

describe('DashboardPage', () => {
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
});
