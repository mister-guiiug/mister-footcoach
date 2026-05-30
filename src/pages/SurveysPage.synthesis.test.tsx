import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import SurveysPage from './SurveysPage';

describe('SurveysPage — synthesis view', () => {
  beforeEach(() => localStorage.clear());

  it('shows the status filter chips when expanded', async () => {
    renderWithProviders(<SurveysPage />);
    await userEvent.click(screen.getAllByText('Voir les réponses')[0]!);
    expect(screen.getByRole('button', { name: 'Tous' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Présents' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Absents' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Non répondus' })
    ).toBeInTheDocument();
  });

  it('filters players by retained status', async () => {
    renderWithProviders(<SurveysPage />);
    await userEvent.click(screen.getAllByText('Voir les réponses')[0]!);
    // sv1: Lucas Dupont (p1) is parent-confirmed present.
    expect(screen.getByText(/Lucas Dupont/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Absents' }));
    // Confirmed-present Lucas disappears from the "Absents" filter.
    expect(screen.queryByText(/Lucas Dupont/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Présents' }));
    expect(screen.getByText(/Lucas Dupont/)).toBeInTheDocument();
  });

  it('flags divergence between legal tutors (§15.8)', async () => {
    renderWithProviders(<SurveysPage />);
    await userEvent.click(screen.getAllByText('Voir les réponses')[0]!);
    // sv1 / p1 has two tutors who answered differently (present vs absent).
    expect(
      screen.getByText('Réponses divergentes entre tuteurs')
    ).toBeInTheDocument();
    // Both tutors are listed with a "Retenir" action.
    expect(
      screen.getAllByRole('button', { name: 'Retenir' }).length
    ).toBeGreaterThanOrEqual(2);
  });
});
