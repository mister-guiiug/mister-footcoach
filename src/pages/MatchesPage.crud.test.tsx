import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import MatchesPage from './MatchesPage';

describe('MatchesPage — create flow', () => {
  beforeEach(() => localStorage.clear());

  it('opens the new-match dialog', async () => {
    renderWithProviders(<MatchesPage />);
    await userEvent.click(screen.getByRole('button', { name: /Nouveau/ }));
    expect(screen.getByText('Nouveau match')).toBeInTheDocument();
  });

  it('validates required opponent', async () => {
    renderWithProviders(<MatchesPage />);
    await userEvent.click(screen.getByRole('button', { name: /Nouveau/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));
    expect(screen.getByText(/adversaire est obligatoire/i)).toBeInTheDocument();
  });

  it('creates a match and shows it in the list', async () => {
    renderWithProviders(<MatchesPage />);
    await userEvent.click(screen.getByRole('button', { name: /Nouveau/ }));

    await userEvent.type(
      screen.getByLabelText('Adversaire'),
      'Étoile Sportive'
    );
    await userEvent.type(
      screen.getByLabelText('Lieu / terrain'),
      'Stade des Tests'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));

    expect(screen.getByText('Étoile Sportive')).toBeInTheDocument();
    expect(screen.getByText(/Stade des Tests/)).toBeInTheDocument();
  });
});
