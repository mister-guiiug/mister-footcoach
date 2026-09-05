import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import { MOCK_DATA } from '../data/mock';
import SettingsPage from './SettingsPage';

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders page title', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Paramètres')).toBeInTheDocument();
  });

  it('renders theme options', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Clair')).toBeInTheDocument();
    expect(screen.getByText('Sombre')).toBeInTheDocument();
    expect(screen.getByText('Système')).toBeInTheDocument();
  });

  it('clicking Clair sets light theme', async () => {
    renderWithProviders(<SettingsPage />);
    await userEvent.click(screen.getByText('Clair'));
    expect(screen.getByText('Clair').closest('button')).toHaveClass(
      'border-primary'
    );
  });

  it('clicking Sombre sets dark theme', async () => {
    renderWithProviders(<SettingsPage />);
    await userEvent.click(screen.getByText('Sombre'));
    expect(screen.getByText('Sombre').closest('button')).toHaveClass(
      'border-primary'
    );
  });

  it('clicking Système sets system theme', async () => {
    renderWithProviders(<SettingsPage />);
    await userEvent.click(screen.getByText('Système'));
    expect(screen.getByText('Système').closest('button')).toHaveClass(
      'border-primary'
    );
  });

  it('shows season info', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Saison active')).toBeInTheDocument();
    expect(screen.getByText('2025-2026')).toBeInTheDocument();
  });

  it('shows team and player counts', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Équipes')).toBeInTheDocument();
    expect(screen.getByText('Joueurs actifs')).toBeInTheDocument();
  });

  it('shows data management card', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Données de démonstration')).toBeInTheDocument();
    expect(screen.getByText('Réinitialiser les données')).toBeInTheDocument();
  });

  it('shows app info card', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Mister Footcoach')).toBeInTheDocument();
    expect(screen.getByText(/Version MVP/)).toBeInTheDocument();
  });

  // ── Réinitialisation : la boîte du socle, pas `window.confirm` ───────
  // L'ancien test ne pouvait vérifier que « l'appel natif a eu lieu avec ce
  // texte » : la remise à zéro elle-même n'était jamais observée. On part
  // ici d'une saison renommée pour VOIR les données d'exemple revenir.

  /** Charge un état où la saison ne porte plus le nom des données d'exemple. */
  function seedRenamedSeason(): void {
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        season: { ...MOCK_DATA.season, name: 'Saison bricolée' },
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
  }

  /** Demande la réinitialisation et rend la boîte de confirmation. */
  async function askReset(): Promise<HTMLElement> {
    await userEvent.click(
      screen.getByRole('button', { name: /Réinitialiser les données/ })
    );
    return screen.getByRole('alertdialog');
  }

  it('asks for confirmation before resetting the demo data', async () => {
    seedRenamedSeason();
    renderWithProviders(<SettingsPage />);
    const dialog = await askReset();
    expect(
      within(dialog).getByText(
        'Réinitialiser toutes les données de démonstration ?'
      )
    ).toBeInTheDocument();
    // Rien n'est réinitialisé tant que rien n'est confirmé.
    expect(screen.getByText('Saison bricolée')).toBeInTheDocument();
  });

  it('resets the data once the confirmation is accepted', async () => {
    seedRenamedSeason();
    renderWithProviders(<SettingsPage />);
    const dialog = await askReset();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Réinitialiser les données' })
    );
    expect(screen.getByText('2025-2026')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('keeps the data when the confirmation is cancelled', async () => {
    seedRenamedSeason();
    renderWithProviders(<SettingsPage />);
    const dialog = await askReset();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Annuler' })
    );
    expect(screen.getByText('Saison bricolée')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  // Les deux liens de la règle famille ne sont plus rendus par cet écran : ils
  // viennent du pied de page de la COQUILLE, donc de tous les écrans. Leurs
  // assertions ont suivi, dans `components/layout/AppShell.test.tsx` — les
  // laisser ici n'aurait prouvé que le cas d'un seul écran, celui qui n'a
  // jamais manqué.
});
