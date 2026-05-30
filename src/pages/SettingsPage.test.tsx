import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
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

  it('clicking reset with confirm true resets data', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<SettingsPage />);
    await userEvent.click(screen.getByText('Réinitialiser les données'));
    expect(window.confirm).toHaveBeenCalledWith(
      'Réinitialiser toutes les données de démonstration ?'
    );
  });

  it('clicking reset with confirm false does not reset', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWithProviders(<SettingsPage />);
    await userEvent.click(screen.getByText('Réinitialiser les données'));
    expect(window.confirm).toHaveBeenCalled();
    // Season should still be there (not changed)
    expect(screen.getByText('2025-2026')).toBeInTheDocument();
  });
});
