import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  it('en mode local, le push et le compte joueur n’existent pas — et l’écran le dit, sobrement', () => {
    // Là où le réglage push apparaîtrait (sous les catégories) et là où
    // apparaîtraient les invitations : une ligne chacun, rien à cliquer.
    renderWithProviders(<SettingsPage />);
    expect(
      screen.getByText(
        "Notifications push : elles n'existent qu'avec un compte du club (mode connecté)."
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Compte joueur')).toBeInTheDocument();
    expect(screen.getByText(/la fonction n'y existe pas/)).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /appareil/ })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /code d'invitation/ })
    ).toBeNull();
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

/**
 * DANS UN BUILD LOCAL, les deux réglages du mode connecté ne sont même pas
 * référencés (la condition sur `import.meta.env` est repliée à la
 * transformation). L'écran, lui, est le même : la ligne sobre.
 */
describe('SettingsPage dans un build local', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('dit la même chose, sans rien référencer du mode connecté', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_BACKEND', 'local');
    vi.resetModules();
    const { default: SettingsPageLocal } = await import('./SettingsPage');
    const { renderWithProviders: render } = await import('../test/helpers');
    render(<SettingsPageLocal />);
    expect(
      screen.getByText(
        "Notifications push : elles n'existent qu'avec un compte du club (mode connecté)."
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/la fonction n'y existe pas/)).toBeInTheDocument();
  });
});
