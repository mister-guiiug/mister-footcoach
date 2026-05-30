import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAtRoute } from '../test/helpers';
import PlayerDetailPage from './PlayerDetailPage';

function render() {
  return renderAtRoute(<PlayerDetailPage />, {
    initialPath: '/joueurs/p1',
    routePattern: '/joueurs/:id',
  });
}

describe('PlayerDetailPage — health management', () => {
  beforeEach(() => localStorage.clear());

  it('declares an unavailability for the player', async () => {
    render();
    await userEvent.click(
      screen.getByRole('button', { name: /Indisponibilité/ })
    );
    expect(
      screen.getByText('Déclarer une indisponibilité')
    ).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Motif'), 'vacances');
    await userEvent.click(screen.getByRole('button', { name: 'Déclarer' }));

    // The active unavailability alert now shows the motif.
    expect(screen.getByText(/Indisponible —/)).toBeInTheDocument();
  });

  it('declaring an injury creates a linked unavailability', async () => {
    render();
    await userEvent.click(screen.getByRole('button', { name: /Blessure/ }));
    expect(screen.getByText('Déclarer une blessure')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Nature'), 'entorse');
    await userEvent.click(screen.getByRole('button', { name: 'Déclarer' }));

    // Injury card + auto-created blessure unavailability both appear.
    expect(screen.getByText(/entorse/)).toBeInTheDocument();
    expect(screen.getByText('En rééducation')).toBeInTheDocument();
    expect(screen.getByText(/Indisponible —/)).toBeInTheDocument();
  });

  it('closing an injury as apte removes the active injury card', async () => {
    render();
    // Create an injury first.
    await userEvent.click(screen.getByRole('button', { name: /Blessure/ }));
    await userEvent.type(screen.getByLabelText('Nature'), 'élongation');
    await userEvent.click(screen.getByRole('button', { name: 'Déclarer' }));
    expect(screen.getByText(/élongation/)).toBeInTheDocument();

    // Re-open the injury tracking and mark apte.
    await userEvent.click(screen.getByRole('button', { name: 'Suivre' }));
    expect(screen.getByText('Suivi de blessure')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Statut'), 'apte');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    // The active-injury card filters out apte injuries.
    expect(screen.queryByText(/élongation/)).not.toBeInTheDocument();
  });
});
