/**
 * Le nom du club, dans les réglages : il est imprimé en tête des exports PDF.
 * Enregistré à la sortie du champ (ou sur Entrée), pas à chaque frappe.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MOCK_DATA } from '../data/mock';
import { renderWithProviders } from '../test/helpers';
import { STORAGE_KEY } from '../store/storage';
import SettingsPage from './SettingsPage';

/** Le nom du club tel que le magasin local l'a écrit. */
function storedClubName(): unknown {
  const raw = localStorage.getItem(STORAGE_KEY);
  return (JSON.parse(raw!) as { data: { clubSettings: { clubName?: string } } })
    .data.clubSettings.clubName;
}

beforeEach(() => localStorage.clear());

describe('SettingsPage — nom du club', () => {
  it('montre le nom enregistré et dit où il sert', () => {
    renderWithProviders(<SettingsPage />);
    const input = screen.getByLabelText('Nom du club');
    expect(input).toHaveValue('FC Exemple');
    expect(input).toHaveAccessibleDescription(
      "Imprimé en tête de la feuille de match et du rapport d'assiduité."
    );
  });

  it('enregistre le nouveau nom à la sortie du champ, sans les espaces', async () => {
    renderWithProviders(<SettingsPage />);
    const input = screen.getByLabelText('Nom du club');
    await userEvent.clear(input);
    await userEvent.type(input, '  AS Nouvelle Vague ');
    // Pas à chaque frappe : rien n'est écrit tant qu'on tape.
    expect(storedClubName()).toBe('FC Exemple');
    await userEvent.tab();
    expect(storedClubName()).toBe('AS Nouvelle Vague');
    expect(screen.getByLabelText('Nom du club')).toHaveValue(
      'AS Nouvelle Vague'
    );
  });

  it('n’écrit rien quand on traverse le champ sans le changer', async () => {
    renderWithProviders(<SettingsPage />);
    const before = localStorage.getItem(STORAGE_KEY);
    await userEvent.click(screen.getByLabelText('Nom du club'));
    await userEvent.tab();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });

  it('part d’un champ vide pour une base d’avant ce réglage', () => {
    // Un instantané écrit avant que le nom du club n'existe : pas de clé.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...MOCK_DATA,
        clubSettings: { autoSurveyOnMatch: true },
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderWithProviders(<SettingsPage />);
    expect(screen.getByLabelText('Nom du club')).toHaveValue('');
  });

  it('enregistre aussi sur Entrée, et un nom effacé comme une chaîne vide', async () => {
    renderWithProviders(<SettingsPage />);
    const input = screen.getByLabelText('Nom du club');
    await userEvent.clear(input);
    await userEvent.type(input, '{Enter}');
    expect(storedClubName()).toBe('');
    expect(screen.getByLabelText('Nom du club')).toHaveValue('');
  });
});
