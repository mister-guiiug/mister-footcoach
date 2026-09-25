import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../../i18n';
import {
  AppContext,
  EMPTY_APP_STATE,
  type AppState,
} from '../../../store/AppContext';
import type { PlayerInvitation } from '../../../types';

/**
 * LE COMPTE JOUEUR, CÔTÉ PARENT ET CÔTÉ ADMINISTRATEUR.
 *
 * Les appels réseau sont doublés : ce qu'ils valent est prouvé en base
 * (`supabase/tests/compte-joueur.test.sql`). Ici, les deux gestes du parent
 * — CONSENTIR (le code) et RETIRER (l'accès) — et ce que l'administrateur
 * voit.
 */
vi.mock('../../../backend/config', () => ({ BACKEND: 'supabase' }));
const session = vi.hoisted(() => ({ userId: 'auth-parent' as string | null }));
vi.mock('../../../auth/AuthContext', () => ({
  useSessionUserId: () => session.userId,
}));
const api = vi.hoisted(() => ({
  listInvitations: vi.fn<() => Promise<PlayerInvitation[]>>(),
  createInvitation: vi.fn(),
  revokePlayerAccess: vi.fn<(playerId: string) => Promise<void>>(),
}));
vi.mock('../../../backend/playerAccounts', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../backend/playerAccounts')>()),
  listInvitations: () => api.listInvitations(),
  createInvitation: (playerId: string) => api.createInvitation(playerId),
  revokePlayerAccess: (playerId: string) => api.revokePlayerAccess(playerId),
}));
const copyToClipboard = vi.hoisted(() =>
  vi.fn<(text: string) => Promise<boolean>>(() => Promise.resolve(true))
);
vi.mock('@mister-guiiug/dev-pwa-config/share', async importOriginal => ({
  ...(await importOriginal<
    typeof import('@mister-guiiug/dev-pwa-config/share')
  >()),
  copyToClipboard,
}));

import { PlayerAccountsCard } from './PlayerAccountsCard';
import { PlayerAccountError } from '../../../backend/playerAccounts';

const STATE: AppState = {
  ...EMPTY_APP_STATE,
  users: [
    {
      id: 'u-parent',
      authId: 'auth-parent',
      email: 'pierre@exemple.fr',
      firstName: 'Pierre',
      lastName: 'Dupont',
      roles: ['parent'],
      teamIds: [],
    },
    {
      id: 'u-admin',
      authId: 'auth-admin',
      email: 'admin@exemple.fr',
      firstName: 'Admin',
      lastName: 'Club',
      roles: ['admin'],
      teamIds: [],
    },
    {
      id: 'u-coach',
      authId: 'auth-coach',
      email: 'coach@exemple.fr',
      firstName: 'Éric',
      lastName: 'Coach',
      roles: ['coach'],
      teamIds: ['t1'],
    },
    {
      id: 'u-kid',
      authId: 'auth-kid',
      email: 'lucas@exemple.fr',
      firstName: 'Lucas',
      lastName: 'Dupont',
      roles: ['player'],
      teamIds: [],
      playerId: 'p1',
    },
    {
      id: 'u-kid2',
      authId: 'auth-kid2',
      email: 'inconnu@exemple.fr',
      firstName: 'Compte',
      lastName: 'Orphelin',
      roles: ['player'],
      teamIds: [],
      playerId: 'p-disparu',
    },
  ],
  players: [
    {
      id: 'p1',
      firstName: 'Lucas',
      lastName: 'Dupont',
      dateOfBirth: '2013-03-15',
      primaryTeamId: 't1',
      preferredPosition: 'GK',
      appetences: {},
      active: true,
    },
    {
      id: 'p2',
      firstName: 'Emma',
      lastName: 'Dupont',
      dateOfBirth: '2015-06-01',
      primaryTeamId: 't1',
      preferredPosition: 'DC',
      appetences: {},
      active: true,
    },
  ],
  contacts: [
    {
      id: 'c-parent',
      firstName: 'Pierre',
      lastName: 'Dupont',
      phone: '0600000000',
      email: 'pierre@exemple.fr',
      type: 'père',
      playerIds: ['p1', 'p2'],
      userId: 'u-parent',
    },
  ],
};

const ACTIVE: PlayerInvitation = {
  id: 'i1',
  playerId: 'p1',
  createdBy: 'u-parent',
  consentedAt: '2026-09-01T10:00:00+00:00',
  expiresAt: '2026-09-08T10:00:00+00:00',
  redeemedAt: '2026-09-02T18:00:00+00:00',
  redeemedBy: 'u-kid',
  revokedAt: null,
  revokedBy: null,
};
const PENDING: PlayerInvitation = {
  ...ACTIVE,
  id: 'i2',
  playerId: 'p2',
  expiresAt: '2099-01-01T00:00:00+00:00',
  redeemedAt: null,
  redeemedBy: null,
};

const refresh = vi.fn(() => Promise.resolve());

function monter() {
  return render(
    <I18nProvider>
      <ToastProvider>
        <AppContext.Provider
          value={{ state: STATE, dispatch: vi.fn(), refresh }}
        >
          <PlayerAccountsCard />
        </AppContext.Provider>
      </ToastProvider>
    </I18nProvider>
  );
}

/** La ligne d'un enfant dans la liste du parent. */
function ligneDe(prenom: string): HTMLElement {
  return screen.getByText(`${prenom} Dupont`).closest('li') as HTMLElement;
}

describe('le compte joueur, côté parent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.userId = 'auth-parent';
    api.listInvitations.mockResolvedValue([ACTIVE, PENDING]);
    api.revokePlayerAccess.mockResolvedValue(undefined);
    copyToClipboard.mockResolvedValue(true);
  });

  it('invisible pour qui n’est ni parent lié, ni administrateur', () => {
    session.userId = 'auth-coach';
    monter();
    expect(screen.queryByRole('heading', { name: 'Compte joueur' })).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(api.listInvitations).not.toHaveBeenCalled();
  });

  it('chaque enfant, et où en est son compte', async () => {
    monter();
    expect(
      screen.getByRole('heading', { name: 'Compte joueur' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(ligneDe('Lucas')).getByText(/Compte actif depuis le/)
      ).toBeInTheDocument()
    );
    // Un compte actif ne se double pas : seulement de quoi couper.
    expect(
      within(ligneDe('Lucas')).queryByRole('button', {
        name: "Créer un code d'invitation",
      })
    ).toBeNull();
    expect(
      within(ligneDe('Lucas')).getByRole('button', { name: "Couper l'accès" })
    ).toBeInTheDocument();

    expect(
      within(ligneDe('Emma')).getByText(/Code en attente, valable jusqu'au/)
    ).toBeInTheDocument();
    expect(
      within(ligneDe('Emma')).getByRole('button', { name: 'Nouveau code' })
    ).toBeInTheDocument();
  });

  it('créer un code : le consentement en toutes lettres, puis le code — une fois', async () => {
    api.listInvitations.mockResolvedValue([ACTIVE]);
    api.createInvitation.mockResolvedValue({
      id: 'i3',
      code: 'K7PQ9XMR2DNB',
      expiresAt: '2099-01-01T00:00:00+00:00',
    });
    monter();
    await waitFor(() =>
      expect(
        within(ligneDe('Emma')).getByText('Pas de compte')
      ).toBeInTheDocument()
    );

    await userEvent.click(
      within(ligneDe('Emma')).getByRole('button', {
        name: "Créer un code d'invitation",
      })
    );
    const dialogue = screen.getByRole('alertdialog', {
      name: 'Autoriser un compte pour Emma ?',
    });
    expect(dialogue).toHaveTextContent(/vous consentez/);
    expect(dialogue).toHaveTextContent(/le retirer ici à tout moment/);
    expect(api.createInvitation).not.toHaveBeenCalled();

    await userEvent.click(
      within(dialogue).getByRole('button', { name: "J'autorise" })
    );

    expect(api.createInvitation).toHaveBeenCalledWith('p2');
    expect(await screen.findByText('K7PQ-9XMR-2DNB')).toBeInTheDocument();
    expect(screen.getByText('Code pour Emma')).toBeInTheDocument();
    expect(screen.getByText(/Il ne sera plus affiché/)).toBeInTheDocument();
    // Les invitations sont relues : la base seule dit où on en est.
    expect(api.listInvitations).toHaveBeenCalledTimes(2);

    await userEvent.click(
      screen.getByRole('button', { name: 'Copier le code' })
    );
    expect(copyToClipboard).toHaveBeenCalledWith('K7PQ-9XMR-2DNB');
    expect(await screen.findByText('Code copié.')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: "C'est transmis" })
    );
    expect(screen.queryByText('K7PQ-9XMR-2DNB')).toBeNull();
  });

  it('refuser le consentement ne crée rien', async () => {
    monter();
    await userEvent.click(
      await within(ligneDe('Emma')).findByRole('button', {
        name: 'Nouveau code',
      })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(api.createInvitation).not.toHaveBeenCalled();
  });

  it('un refus de la base est dit en clair', async () => {
    api.createInvitation.mockRejectedValue(
      new PlayerAccountError('compte_deja_actif', 'compte_deja_actif')
    );
    monter();
    await userEvent.click(
      await within(ligneDe('Emma')).findByRole('button', {
        name: 'Nouveau code',
      })
    );
    await userEvent.click(screen.getByRole('button', { name: "J'autorise" }));
    expect(
      await screen.findByText(/Ce joueur a déjà un compte/)
    ).toHaveAttribute('role', 'alert');
  });

  it('une panne sans motif ne se déguise pas', async () => {
    api.createInvitation.mockRejectedValue(new Error('Failed to fetch'));
    monter();
    await userEvent.click(
      await within(ligneDe('Emma')).findByRole('button', {
        name: 'Nouveau code',
      })
    );
    await userEvent.click(screen.getByRole('button', { name: "J'autorise" }));
    expect(await screen.findByText(/La demande a échoué/)).toHaveAttribute(
      'role',
      'alert'
    );
  });

  it('une copie impossible est dite', async () => {
    api.listInvitations.mockResolvedValue([]);
    api.createInvitation.mockResolvedValue({
      id: 'i3',
      code: 'K7PQ9XMR2DNB',
      expiresAt: '2099-01-01T00:00:00+00:00',
    });
    copyToClipboard.mockResolvedValue(false);
    monter();
    await userEvent.click(
      await within(ligneDe('Lucas')).findByRole('button', {
        name: "Créer un code d'invitation",
      })
    );
    await userEvent.click(screen.getByRole('button', { name: "J'autorise" }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Copier le code' })
    );
    expect(await screen.findByText(/Copie impossible/)).toBeInTheDocument();
  });

  it('couper l’accès : une confirmation, la base, puis tout est relu', async () => {
    monter();
    await userEvent.click(
      await within(ligneDe('Lucas')).findByRole('button', {
        name: "Couper l'accès",
      })
    );
    const dialogue = screen.getByRole('alertdialog', {
      name: "Couper l'accès de Lucas ?",
    });
    expect(dialogue).toHaveTextContent(
      /Ses réponses déjà données restent au club/
    );
    await userEvent.click(
      within(dialogue).getByRole('button', { name: "Couper l'accès" })
    );

    expect(api.revokePlayerAccess).toHaveBeenCalledWith('p1');
    expect(await screen.findByText('Accès coupé.')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
    expect(api.listInvitations).toHaveBeenCalledTimes(2);
  });

  it('un refus de couper est dit', async () => {
    api.revokePlayerAccess.mockRejectedValue(
      new PlayerAccountError('parent_non_lie', 'parent_non_lie')
    );
    monter();
    await userEvent.click(
      await within(ligneDe('Lucas')).findByRole('button', {
        name: "Couper l'accès",
      })
    );
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: "Couper l'accès",
      })
    );
    expect(
      await screen.findByText(
        'Seul un parent rattaché à ce joueur peut le faire.'
      )
    ).toHaveAttribute('role', 'alert');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('un code expiré se dit, et se remplace', async () => {
    api.listInvitations.mockResolvedValue([
      { ...PENDING, expiresAt: '2000-01-01T00:00:00+00:00' },
    ]);
    monter();
    expect(
      await within(ligneDe('Emma')).findByText(/Code expiré le/)
    ).toBeInTheDocument();
    expect(
      within(ligneDe('Emma')).getByRole('button', {
        name: "Créer un code d'invitation",
      })
    ).toBeInTheDocument();
    // Un code expiré ne se coupe pas : il n'ouvre déjà plus rien.
    expect(
      within(ligneDe('Emma')).queryByRole('button', { name: "Couper l'accès" })
    ).toBeNull();
  });

  it('renoncer à couper ne coupe rien', async () => {
    monter();
    await userEvent.click(
      await within(ligneDe('Lucas')).findByRole('button', {
        name: "Couper l'accès",
      })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(api.revokePlayerAccess).not.toHaveBeenCalled();
  });

  it('couper l’accès retire aussi le code affiché de cet enfant', async () => {
    // Avant le code : Emma n'a rien. Après : son code est en attente.
    api.listInvitations
      .mockResolvedValueOnce([ACTIVE])
      .mockResolvedValue([ACTIVE, PENDING]);
    api.createInvitation.mockResolvedValue({
      id: 'i3',
      code: 'K7PQ9XMR2DNB',
      expiresAt: '2099-01-01T00:00:00+00:00',
    });
    monter();
    await userEvent.click(
      await within(ligneDe('Emma')).findByRole('button', {
        name: "Créer un code d'invitation",
      })
    );
    await userEvent.click(screen.getByRole('button', { name: "J'autorise" }));
    expect(await screen.findByText('K7PQ-9XMR-2DNB')).toBeInTheDocument();

    await userEvent.click(
      await within(ligneDe('Emma')).findByRole('button', {
        name: "Couper l'accès",
      })
    );
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: "Couper l'accès",
      })
    );
    await waitFor(() =>
      expect(screen.queryByText('K7PQ-9XMR-2DNB')).toBeNull()
    );
  });

  it('une relecture qui échoue après un geste est dite', async () => {
    api.listInvitations
      .mockResolvedValueOnce([ACTIVE, PENDING])
      .mockRejectedValueOnce(new Error('offline'));
    monter();
    await userEvent.click(
      await within(ligneDe('Lucas')).findByRole('button', {
        name: "Couper l'accès",
      })
    );
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: "Couper l'accès",
      })
    );
    expect(
      await screen.findByText(/Impossible de lire les invitations/)
    ).toHaveAttribute('role', 'alert');
  });

  it('démontée avant la réponse : rien n’est écrit dans un écran parti', async () => {
    let livrer: (rows: PlayerInvitation[]) => void = () => {};
    let refuser: (error: Error) => void = () => {};
    api.listInvitations
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            livrer = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            refuser = reject;
          })
      );
    const premier = monter();
    premier.unmount();
    const second = monter();
    second.unmount();
    livrer([ACTIVE]);
    refuser(new Error('offline'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByText(/Impossible de lire/)).toBeNull();
  });

  it('une session sans fiche ne voit rien', () => {
    session.userId = 'auth-inconnu';
    monter();
    expect(screen.queryByRole('heading', { name: 'Compte joueur' })).toBeNull();
  });

  it('des invitations illisibles : il le dit', async () => {
    api.listInvitations.mockRejectedValue(new Error('offline'));
    monter();
    expect(
      await screen.findByText(/Impossible de lire les invitations/)
    ).toHaveAttribute('role', 'alert');
  });
});

describe('le compte joueur, côté administrateur', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.userId = 'auth-admin';
    api.listInvitations.mockResolvedValue([ACTIVE]);
    api.revokePlayerAccess.mockResolvedValue(undefined);
  });

  it('voit les comptes joueurs du club, et qui y a consenti', async () => {
    monter();
    expect(screen.getByText('Comptes joueurs du club')).toBeInTheDocument();
    expect(screen.getByText('Lucas Dupont')).toBeInTheDocument();
    expect(screen.getByText('lucas@exemple.fr')).toBeInTheDocument();
    expect(
      await screen.findByText(/Consentement de Pierre Dupont le/)
    ).toBeInTheDocument();
    // Un compte dont la trace manque : dit, pas inventé.
    expect(screen.getByText('Compte Orphelin')).toBeInTheDocument();
    expect(
      screen.getByText('Trace du consentement introuvable')
    ).toBeInTheDocument();
    // Il ne crée pas de code : il ne consent pas à la place d'un parent.
    expect(
      screen.queryByRole('button', { name: "Créer un code d'invitation" })
    ).toBeNull();
  });

  it('peut couper un accès — le recours quand le parent n’est plus joignable', async () => {
    monter();
    await userEvent.click(
      screen.getByRole('button', { name: "Couper l'accès" })
    );
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: "Couper l'accès",
      })
    );
    expect(api.revokePlayerAccess).toHaveBeenCalledWith('p1');
  });

  it('un administrateur qui est aussi parent voit les deux listes', async () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <AppContext.Provider
            value={{
              state: {
                ...STATE,
                contacts: [
                  { ...STATE.contacts[0]!, id: 'c-admin', userId: 'u-admin' },
                ],
              },
              dispatch: vi.fn(),
            }}
          >
            <PlayerAccountsCard />
          </AppContext.Provider>
        </ToastProvider>
      </I18nProvider>
    );
    expect(screen.getByText('Comptes joueurs du club')).toBeInTheDocument();
    expect(
      await screen.findAllByText(/Votre enfant peut indiquer/)
    ).toHaveLength(1);
  });

  it('une invitation dont le parent n’est plus dans l’annuaire : trace introuvable', async () => {
    api.listInvitations.mockResolvedValue([
      { ...ACTIVE, createdBy: 'u-parti' },
    ]);
    monter();
    await waitFor(() =>
      expect(
        screen.getAllByText('Trace du consentement introuvable')
      ).toHaveLength(2)
    );
  });

  it('aucun compte joueur : il le lit', () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <AppContext.Provider
            value={{
              state: {
                ...STATE,
                users: STATE.users.filter(u => !u.roles.includes('player')),
              },
              dispatch: vi.fn(),
            }}
          >
            <PlayerAccountsCard />
          </AppContext.Provider>
        </ToastProvider>
      </I18nProvider>
    );
    expect(screen.getByText('Aucun compte joueur.')).toBeInTheDocument();
  });
});
