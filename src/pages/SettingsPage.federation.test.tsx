import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import SettingsPage from './SettingsPage';

describe('SettingsPage — federation sync (§17)', () => {
  beforeEach(() => localStorage.clear());

  it('renders the federation card', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Intégration fédération')).toBeInTheDocument();
  });

  it('reconciles the sample feed and shows a summary', async () => {
    renderWithProviders(<SettingsPage />);
    await userEvent.click(
      screen.getByRole('button', { name: /Synchroniser la fédération/ })
    );
    // Sample feed vs seeded U13 A matches: 1 update, 1 create, 1 conflict.
    expect(screen.getByText('1 mis à jour')).toBeInTheDocument();
    expect(screen.getByText('1 créés')).toBeInTheDocument();
    expect(screen.getByText('1 conflit')).toBeInTheDocument();
    expect(screen.getByText(/Conflit date/)).toBeInTheDocument();
  });
});
