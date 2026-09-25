import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../i18n';
import { AppContext, EMPTY_APP_STATE } from '../store/AppContext';

/**
 * UN COMPTE RATTACHÉ À RIEN — l'enfant qui saisit le code de son parent, et
 * l'adulte à qui l'écran dit que ce code n'est pas pour lui.
 *
 * La RPC est doublée : ses refus sont éprouvés en base
 * (`supabase/tests/compte-joueur.test.sql`). Ici : ce qui part (le code
 * NORMALISÉ), ce qui suit un succès (relire la base), ce qui se dit d'un
 * refus.
 */
vi.mock('../backend/config', () => ({ BACKEND: 'supabase' }));
const { signOut, deleteAccount } = vi.hoisted(() => ({
  signOut: vi.fn(() => Promise.resolve()),
  deleteAccount: vi.fn(() => Promise.resolve({})),
}));
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'auth-lucas', email: 'lucas@exemple.fr' } },
    signOut,
    deleteAccount,
  }),
}));
const redeemInvitation = vi.hoisted(() =>
  vi.fn<(code: string) => Promise<string>>(() => Promise.resolve('p1'))
);
vi.mock('../backend/playerAccounts', async importOriginal => ({
  ...(await importOriginal<typeof import('../backend/playerAccounts')>()),
  redeemInvitation,
}));

import LinkAccountPage from './LinkAccountPage';
import { PlayerAccountError } from '../backend/playerAccounts';

const refresh = vi.fn(() => Promise.resolve());

function monter(hasProfile = false) {
  return render(
    <I18nProvider>
      <AppContext.Provider
        value={{ state: EMPTY_APP_STATE, dispatch: vi.fn(), refresh }}
      >
        <LinkAccountPage hasProfile={hasProfile} />
      </AppContext.Provider>
    </I18nProvider>
  );
}

async function saisir(code: string) {
  await userEvent.type(screen.getByLabelText("Code d'invitation"), code);
  await userEvent.click(
    screen.getByRole('button', { name: 'Rattacher mon compte' })
  );
}

describe('rattacher un compte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redeemInvitation.mockImplementation(() => Promise.resolve('p1'));
  });

  it('envoie le code tel que la base le relira, puis relit la base', async () => {
    monter();
    await saisir('k7pq-9xmr 2dnb');
    expect(redeemInvitation).toHaveBeenCalledWith('K7PQ9XMR2DNB');
    // La fiche vient d'être créée : relire la base fait passer à la page du
    // joueur.
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('un code incomplet ne part pas, et la faute est dite', async () => {
    monter();
    await saisir('K7PQ-9XM');
    expect(redeemInvitation).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Le code compte 12 caractères'
    );
  });

  it('un code refusé : le motif, en clair', async () => {
    redeemInvitation.mockRejectedValueOnce(
      new PlayerAccountError('invitation_invalide', 'invitation_invalide')
    );
    monter();
    await saisir('K7PQ9XMR2DNB');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Code inconnu, expiré, déjà utilisé ou retiré'
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it('une panne sans motif : la demande a échoué, sans inventer', async () => {
    redeemInvitation.mockRejectedValueOnce(new Error('Failed to fetch'));
    monter();
    await saisir('K7PQ9XMR2DNB');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La demande a échoué'
    );
  });

  it('dit à l’adulte que ce code n’est pas pour lui', () => {
    monter();
    expect(screen.getByText(/Ce code n'est pas pour vous/)).toBeInTheDocument();
  });

  it('une fiche sans rôle : pas de code, et qui peut agir', () => {
    monter(true);
    expect(screen.queryByLabelText("Code d'invitation")).toBeNull();
    expect(
      screen.getByText(/aucun rôle ne lui est attribué/)
    ).toBeInTheDocument();
  });

  it('dit avec quel compte on est connecté, et laisse partir', async () => {
    monter();
    expect(
      screen.getByText('Connecté avec lucas@exemple.fr')
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Se déconnecter' })
    );
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('offre de supprimer ce compte, qui ne sert à rien sans rattachement', () => {
    monter();
    expect(screen.getByText('Zone dangereuse')).toBeInTheDocument();
  });
});
