import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import NotificationsPage from './NotificationsPage';
import { MOCK_DATA } from '../data/mock';

describe('NotificationsPage', () => {
  beforeEach(() => localStorage.clear());

  it('renders seeded notifications for the current user', () => {
    renderWithProviders(<NotificationsPage />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText(/Réponse tardive/)).toBeInTheDocument();
    expect(screen.getByText(/Indisponibilité déclarée/)).toBeInTheDocument();
  });

  it('marks a single notification as read', async () => {
    renderWithProviders(<NotificationsPage />);
    const readButtons = screen.getAllByLabelText('Marquer comme lu');
    const initial = readButtons.length;
    await userEvent.click(readButtons[0]!);
    expect(screen.getAllByLabelText('Marquer comme lu').length).toBe(
      initial - 1
    );
  });

  it('marks all notifications as read', async () => {
    renderWithProviders(<NotificationsPage />);
    await userEvent.click(screen.getByRole('button', { name: /Tout lire/ }));
    expect(screen.queryByLabelText('Marquer comme lu')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Tout lire/ })
    ).not.toBeInTheDocument();
  });

  it('shows empty state when the user has no notifications', () => {
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        notifications: [],
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderWithProviders(<NotificationsPage />);
    expect(screen.getByText('Aucune notification')).toBeInTheDocument();
  });
});
