import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import TeamsPage from './TeamsPage';

describe('TeamsPage', () => {
  beforeEach(() => localStorage.clear());

  it('renders page title', () => {
    renderWithProviders(<TeamsPage />);
    expect(screen.getByText('Équipes')).toBeInTheDocument();
  });

  it('renders all teams from mock data', () => {
    renderWithProviders(<TeamsPage />);
    expect(screen.getByText('U13 A')).toBeInTheDocument();
    expect(screen.getByText('U13 B')).toBeInTheDocument();
  });

  it('shows player count for each team', () => {
    renderWithProviders(<TeamsPage />);
    // U13 A has 9 primary players in mock data
    expect(screen.getAllByText(/joueurs principaux/i).length).toBeGreaterThan(0);
  });

  it('shows secondary (renfort) count when applicable', () => {
    renderWithProviders(<TeamsPage />);
    // p18 has secondaryTeamId = t1
    expect(screen.getAllByText(/renfort/i).length).toBeGreaterThan(0);
  });
});
