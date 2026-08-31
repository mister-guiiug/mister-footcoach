import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import ContactsPage from './ContactsPage';

/**
 * SUPPRIMER UN CONTACT AVEC LE BACKEND SUPABASE, HORS CONNEXION.
 *
 * Sans garde, `SupabaseAppProvider` applique la suppression EN LOCAL d'abord :
 * la fiche disparaît, puis l'écriture échoue, un toast rouge s'affiche et
 * `reload()` la fait revenir. L'utilisateur a vu son geste réussir, puis
 * s'annuler tout seul. C'est exactement « laisser croire que ça a marché ».
 *
 * CE QUI EST DOUBLÉ, ET POURQUOI CELUI-LÀ. Pas `BACKEND` : `AppProvider` lit
 * la MÊME constante pour choisir entre le magasin local et Supabase, et la
 * forcer à `'supabase'` monterait un vrai client réseau dans un test
 * d'interface. Pas non plus `useRemoteWriteGuard` : c'est LUI qu'on éprouve,
 * avec son `iconProps`. On double donc l'étage du dessous — `useActionGuard`
 * du socle — en lui imposant `online: true`. Tout le reste est le vrai code :
 * le vrai garde, le vrai `iconProps`, la vraie page. Les deux branches de
 * `useRemoteWriteGuard` (local inerte / Supabase bloquant) sont éprouvées à
 * part, dans `hooks/useRemoteWriteGuard.test.tsx`.
 */
vi.mock('@mister-guiiug/dev-wpa-config/react/use-action-guard', async orig => {
  const mod =
    await orig<
      typeof import('@mister-guiiug/dev-wpa-config/react/use-action-guard')
    >();
  return { ...mod, useActionGuard: () => mod.useActionGuard({ online: true }) };
});

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
}

/** La carte du contact nommé, pour viser SA corbeille et pas une autre. */
function cardOf(name: string): HTMLElement {
  return screen.getByText(name).closest('div.rounded-2xl') as HTMLElement;
}

beforeEach(() => {
  localStorage.clear();
  setNavigatorOnline(true);
});

afterEach(() => {
  localStorage.clear();
  setNavigatorOnline(true);
});

describe('ContactsPage — suppression hors connexion', () => {
  it('la corbeille est désactivée ET porte son motif à la place du libellé', () => {
    // Avant le rendu : `useOnline` lit `navigator.onLine` à l'initialisation.
    setNavigatorOnline(false);
    renderWithProviders(<ContactsPage />);

    const card = cardOf('Pierre Dupont');
    const trash = within(card).getByLabelText('Indisponible hors ligne');
    expect(trash).toHaveAttribute('aria-disabled', 'true');
    expect(trash).toHaveAttribute('title', 'Indisponible hors ligne');
    // `aria-disabled`, pas `disabled` : le bouton reste atteignable au
    // clavier, donc le motif reste DÉCOUVRABLE.
    expect(trash).not.toBeDisabled();
    expect(within(card).queryByLabelText('Supprimer')).not.toBeInTheDocument();
  });

  it('le clic n’ouvre aucune confirmation et ne supprime rien', async () => {
    setNavigatorOnline(false);
    renderWithProviders(<ContactsPage />);

    const card = cardOf('Pierre Dupont');
    await userEvent.click(
      within(card).getByLabelText('Indisponible hors ligne')
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('Pierre Dupont')).toBeInTheDocument();
  });

  it('en ligne, la corbeille garde son libellé et ouvre la confirmation', async () => {
    renderWithProviders(<ContactsPage />);

    const card = cardOf('Pierre Dupont');
    const trash = within(card).getByLabelText('Supprimer');
    expect(trash).not.toHaveAttribute('aria-disabled');

    await userEvent.click(trash);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
