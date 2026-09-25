import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../i18n';
import { EMPTY_APP_STATE, useAppContext } from './AppContext';
import { ALL_TABLES } from '../backend/tables';

/**
 * LE FOURNISSEUR SUPABASE, MAINTENANT QUE LE CLIENT EST UNE PROMESSE.
 *
 * La fabrique du socle rend le client de façon asynchrone ; l'abonnement
 * temps réel, qui se posait au montage d'un trait, se pose désormais quand le
 * client arrive. Ce que ces tests verrouillent : l'hydratation ouvre l'app,
 * UN canal écoute TOUTES les tables et se ferme au démontage, un changement en
 * base réhydrate (après 300 ms de silence), un échec d'écriture est annoncé
 * puis réconcilié — et un démontage qui devance le client ne laisse aucun
 * canal orphelin.
 */
const { canal, client, getSupabase, loadAllFromSupabase, persistAction } =
  vi.hoisted(() => {
    const canal = { on: vi.fn(), subscribe: vi.fn() };
    const client = {
      channel: vi.fn(() => canal),
      removeChannel: vi.fn(() => Promise.resolve('ok' as const)),
    };
    return {
      canal,
      client,
      getSupabase: vi.fn(() => Promise.resolve(client)),
      // Implémentations posées dans `beforeEach` : ce bloc est hissé au-dessus
      // des imports, `EMPTY_APP_STATE` n'existe pas encore ici.
      loadAllFromSupabase: vi.fn(),
      persistAction: vi.fn(),
    };
  });
vi.mock('../lib/supabase', () => ({ getSupabase }));
vi.mock('../backend/tables', async importOriginal => ({
  ...(await importOriginal<typeof import('../backend/tables')>()),
  loadAllFromSupabase,
}));
vi.mock('./persistAction', () => ({ persistAction }));
// L'aiguillage par rôle a ses propres tests (`RoleSwitch.test.tsx`). Ici, on
// ne vérifie que QUAND le fournisseur le pose : un marqueur suffit.
vi.mock('../player/RoleSwitch', () => ({
  RoleSwitch: ({ children }: { children: ReactNode }) => (
    <div data-testid="role-switch">{children}</div>
  ),
}));

import { SupabaseAppProvider } from './SupabaseAppProvider';

function Sonde() {
  const { state, dispatch, refresh } = useAppContext();
  return (
    <>
      <p>équipes : {state.teams.length}</p>
      <button
        onClick={() => dispatch({ type: 'SET_SELECTED_TEAM', teamId: 't1' })}
      >
        écrire
      </button>
      <button onClick={() => void refresh?.()}>relire</button>
    </>
  );
}

function monter() {
  return render(
    <I18nProvider>
      <ToastProvider>
        <SupabaseAppProvider>
          <Sonde />
        </SupabaseAppProvider>
      </ToastProvider>
    </I18nProvider>
  );
}

describe('SupabaseAppProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabase.mockImplementation(() => Promise.resolve(client));
    loadAllFromSupabase.mockImplementation(() =>
      Promise.resolve({ ...EMPTY_APP_STATE })
    );
    persistAction.mockImplementation(() => Promise.resolve());
  });

  it('hydrate, puis UN canal écoute toutes les tables — fermé au démontage', async () => {
    const { unmount } = monter();
    expect(await screen.findByText('équipes : 0')).toBeInTheDocument();
    await waitFor(() => expect(canal.subscribe).toHaveBeenCalledOnce());

    expect(client.channel).toHaveBeenCalledOnce();
    expect(client.channel).toHaveBeenCalledWith('app-changes');
    expect(
      canal.on.mock.calls.map(
        ([, filtre]) => (filtre as { table: string }).table
      )
    ).toEqual(ALL_TABLES);

    unmount();
    expect(client.removeChannel).toHaveBeenCalledWith(canal);
  });

  it('un changement en base réhydrate, une fois, après 300 ms de silence', async () => {
    monter();
    await waitFor(() => expect(canal.subscribe).toHaveBeenCalledOnce());
    expect(loadAllFromSupabase).toHaveBeenCalledOnce();

    const onChange = canal.on.mock.calls[0]?.[2] as () => void;
    // Deux notifications rapprochées : une seule réhydratation.
    onChange();
    onChange();
    await waitFor(() => expect(loadAllFromSupabase).toHaveBeenCalledTimes(2));
    expect(loadAllFromSupabase).toHaveBeenCalledTimes(2);
  });

  it('un échec d’écriture est annoncé, puis l’état revient à la vérité du serveur', async () => {
    persistAction.mockImplementationOnce(() =>
      Promise.reject(new Error('permission denied for table teams'))
    );
    // Le journal du store passe par la console : bruit attendu.
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    monter();
    await screen.findByText('équipes : 0');

    await userEvent.click(screen.getByRole('button', { name: 'écrire' }));

    expect(
      await screen.findByText(
        "Échec de l'enregistrement. La modification a été annulée."
      )
    ).toBeInTheDocument();
    await waitFor(() => expect(loadAllFromSupabase).toHaveBeenCalledTimes(2));
    journal.mockRestore();
  });

  it('une base qui a répondu : l’aiguillage par rôle entoure l’application', async () => {
    monter();
    await screen.findByText('équipes : 0');
    expect(screen.getByTestId('role-switch')).toBeInTheDocument();
  });

  it('une base muette : PAS d’aiguillage — un entraîneur hors ligne n’est pas un compte sans fiche', async () => {
    loadAllFromSupabase.mockImplementationOnce(() =>
      Promise.reject(new Error('Failed to fetch'))
    );
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    monter();
    expect(await screen.findByText('équipes : 0')).toBeInTheDocument();
    expect(screen.queryByTestId('role-switch')).not.toBeInTheDocument();

    // La relecture qu'un écran demande (`refresh`) rétablit l'aiguillage dès
    // que la base répond.
    await userEvent.click(screen.getByRole('button', { name: 'relire' }));
    expect(await screen.findByTestId('role-switch')).toBeInTheDocument();
    expect(loadAllFromSupabase).toHaveBeenCalledTimes(2);
    journal.mockRestore();
  });

  it('démonté avant que le client n’arrive : aucun canal n’est ouvert', async () => {
    let livrer: (c: typeof client) => void = () => {};
    getSupabase.mockImplementationOnce(
      () =>
        new Promise<typeof client>(resolve => {
          livrer = resolve;
        })
    );
    const { unmount } = monter();
    unmount();

    livrer(client);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(client.channel).not.toHaveBeenCalled();
    expect(client.removeChannel).not.toHaveBeenCalled();
  });
});
