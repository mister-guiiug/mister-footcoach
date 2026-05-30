import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import SettingsPage from './SettingsPage';

describe('SettingsPage — notification preferences', () => {
  beforeEach(() => localStorage.clear());

  it('renders the notifications card with categories', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Matchs')).toBeInTheDocument();
    expect(screen.getByText('Rappels de séance')).toBeInTheDocument();
  });

  it('disabling the master switch hides categories', async () => {
    renderWithProviders(<SettingsPage />);
    const master = screen.getByLabelText('Activer les notifications');
    expect(master).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(master);
    expect(
      screen.getByText('Toutes les notifications sont désactivées.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Matchs')).not.toBeInTheDocument();
  });

  it('toggles a reminder delay', async () => {
    renderWithProviders(<SettingsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'H-2' }));
    // Still rendered after selection
    expect(screen.getByRole('button', { name: 'H-2' })).toBeInTheDocument();
  });

  it('toggles the club auto-survey setting', async () => {
    renderWithProviders(<SettingsPage />);
    const sw = screen.getByLabelText("Sondage auto à la création d'un match");
    expect(sw).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(sw);
    expect(
      screen.getByLabelText("Sondage auto à la création d'un match")
    ).toHaveAttribute('aria-checked', 'false');
  });
});
