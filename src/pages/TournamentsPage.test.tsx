import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import TournamentsPage from './TournamentsPage';
import { MOCK_DATA } from '../data/mock';

describe('TournamentsPage', () => {
  beforeEach(() => localStorage.clear());

  it('renders page title', () => {
    renderWithProviders(<TournamentsPage />);
    expect(screen.getByText('Tournois')).toBeInTheDocument();
  });

  it('renders tournament name', () => {
    renderWithProviders(<TournamentsPage />);
    expect(screen.getByText('Tournoi de Printemps U13')).toBeInTheDocument();
  });

  it('shows organisateur badge for club-organized tournament', () => {
    renderWithProviders(<TournamentsPage />);
    expect(screen.getByText('Organisateur')).toBeInTheDocument();
  });

  it('shows tournament status badge', () => {
    renderWithProviders(<TournamentsPage />);
    // to1 is 'planifie' → 'Planifié'
    expect(screen.getAllByText('Planifié').length).toBeGreaterThan(0);
  });

  it('shows tournament location', () => {
    renderWithProviders(<TournamentsPage />);
    expect(screen.getByText('Complexe Sportif Nord')).toBeInTheDocument();
  });

  it('shows tournament format', () => {
    renderWithProviders(<TournamentsPage />);
    expect(screen.getByText(/Poules \+ finale/)).toBeInTheDocument();
  });

  it('shows participating team names', () => {
    renderWithProviders(<TournamentsPage />);
    // Both U13 A and U13 B participate in to1
    expect(screen.getAllByText(/U13 A/).length).toBeGreaterThan(0);
    expect(screen.getByText(/U13 B/)).toBeInTheDocument();
  });

  it('shows tournament date', () => {
    renderWithProviders(<TournamentsPage />);
    // formatDateShort omits year: "23 mai"
    expect(screen.getByText(/23 mai/)).toBeInTheDocument();
  });

  it('shows date range for multi-day tournament', () => {
    renderWithProviders(<TournamentsPage />);
    // to2: dateStart=2026-06-14 dateEnd=2026-06-15 → "14 juin — 15 juin"
    expect(screen.getByText(/14 juin/)).toBeInTheDocument();
    expect(screen.getByText(/15 juin/)).toBeInTheDocument();
  });

  it('shows elimination directe format', () => {
    renderWithProviders(<TournamentsPage />);
    expect(screen.getByText(/Élimination directe/)).toBeInTheDocument();
  });

  it('shows empty state when no tournaments', () => {
    localStorage.setItem('mister-footcoach-data', JSON.stringify({
      ...MOCK_DATA, tournaments: [], selectedTeamId: MOCK_DATA.teams[0]?.id ?? '',
    }));
    renderWithProviders(<TournamentsPage />);
    expect(screen.getByText('Aucun tournoi')).toBeInTheDocument();
  });
});
