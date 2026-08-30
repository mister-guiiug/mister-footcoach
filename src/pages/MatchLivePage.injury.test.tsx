// L'offre d'ouvrir la fiche du joueur après une blessure en direct (§7.5.5).
//
// Fichier à part : la vérification demande de mocker `useNavigate`, et le
// reste de MatchLivePage.test.tsx s'appuie sur le routeur réel.
//
// Ce chemin n'était couvert par AUCUN test : `window.confirm` bloquait le fil
// d'exécution et jsdom ne l'implémente pas, donc valider une blessure aurait
// fait échouer la suite. La boîte du socle est du DOM ordinaire.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAtRoute } from '../test/helpers';
import MatchLivePage from './MatchLivePage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

/** Enregistre une blessure pour Lucas (p1) et rend la boîte de confirmation. */
async function recordInjuryForLucas(): Promise<HTMLElement> {
  renderAtRoute(<MatchLivePage />, {
    initialPath: '/matchs/m1/live',
    routePattern: '/matchs/:id/live',
  });
  await userEvent.click(screen.getByText('Blessure'));
  await userEvent.click(screen.getByText('Lucas'));
  await userEvent.click(screen.getByText(/Valider Blessure/));
  return screen.getByRole('alertdialog');
}

describe('MatchLivePage — blessure en direct (§7.5.5)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  it('offers to open the player file instead of calling window.confirm', async () => {
    const dialog = await recordInjuryForLucas();
    expect(
      within(dialog).getByText(
        'Créer un suivi de blessure pour ce joueur ? (ouvre sa fiche)'
      )
    ).toBeInTheDocument();
    // L'événement est enregistré quoi qu'il arrive : seule la navigation est
    // en suspens.
    expect(screen.getAllByText('Blessure').length).toBeGreaterThan(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to the player file once the offer is accepted', async () => {
    const dialog = await recordInjuryForLucas();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Confirmer' })
    );
    expect(mockNavigate).toHaveBeenCalledWith('/joueurs/p1');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('stays on the live page when the offer is declined', async () => {
    const dialog = await recordInjuryForLucas();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Annuler' })
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
