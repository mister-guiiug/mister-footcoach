import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nProvider } from '../i18n';

/**
 * LE LIEN D'ABORD, LE MOT DE PASSE EN OPTION — ce que l'écran promet.
 *
 * `useAuth` est simulé : ces tests tiennent l'écran, pas Supabase. Le contrat
 * du contexte est éprouvé à part (`AuthContext.test.tsx`).
 */
const signIn = vi.fn<() => Promise<{ error?: string }>>(() =>
  Promise.resolve({ error: undefined })
);
const signInWithLink = vi.fn<() => Promise<{ error?: string }>>(() =>
  Promise.resolve({ error: undefined })
);
const signUp = vi.fn<
  (
    email: string,
    password: string
  ) => Promise<{ error?: string; confirmationSent?: boolean }>
>(() => Promise.resolve({ confirmationSent: true }));
vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    session: null,
    loading: false,
    signIn,
    signInWithLink,
    signUp,
  }),
}));
// L'écran de connexion n'existe qu'en mode connecté : son catalogue aussi.
vi.mock('../backend/config', () => ({ BACKEND: 'supabase' }));

const { LoginPage } = await import('./LoginPage');

function renderPage() {
  return render(
    <I18nProvider>
      <LoginPage />
    </I18nProvider>
  );
}

afterEach(() => {
  cleanup();
  signIn.mockClear();
  signInWithLink.mockClear();
  signInWithLink.mockImplementation(() =>
    Promise.resolve({ error: undefined })
  );
  signUp.mockClear();
  signUp.mockImplementation(() => Promise.resolve({ confirmationSent: true }));
});

describe('la page de connexion', () => {
  it('propose le lien d’abord : pas de mot de passe demandé', () => {
    renderPage();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByLabelText('Mot de passe')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Recevoir un lien de connexion' })
    ).toBeInTheDocument();
  });

  it('envoie le lien à l’adresse saisie, puis le dit', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: ' coach@exemple.fr ' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Recevoir un lien de connexion' })
    );

    // L'adresse est nettoyée avant de partir.
    expect(signInWithLink).toHaveBeenCalledWith('coach@exemple.fr');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('coach@exemple.fr')
    );
    expect(signIn).not.toHaveBeenCalled();

    // « Recevoir un autre lien » ramène au formulaire.
    fireEvent.click(
      screen.getByRole('button', { name: 'Recevoir un autre lien' })
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('dit quand le lien ne part pas, sans changer d’écran', async () => {
    signInWithLink.mockImplementationOnce(() =>
      Promise.resolve({ error: 'Signups not allowed for otp' })
    );
    renderPage();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'inconnu@exemple.fr' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Recevoir un lien de connexion' })
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Envoi impossible/)
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('garde le mot de passe à un clic, et revient au lien', async () => {
    renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'Se connecter avec un mot de passe' })
    );
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'coach@exemple.fr' },
    });
    fireEvent.change(screen.getByLabelText('Mot de passe'), {
      target: { value: 'motdepasse1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(signIn).toHaveBeenCalledWith('coach@exemple.fr', 'motdepasse1');
    expect(signInWithLink).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Recevoir un lien plutôt' })
    );
    expect(screen.queryByLabelText('Mot de passe')).toBeNull();
  });

  it('traduit un refus de mot de passe sans exposer le message brut', async () => {
    signIn.mockImplementationOnce(() =>
      Promise.resolve({ error: 'Invalid login credentials' })
    );
    renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'Se connecter avec un mot de passe' })
    );
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'coach@exemple.fr' },
    });
    fireEvent.change(screen.getByLabelText('Mot de passe'), {
      target: { value: 'faux' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Identifiants invalides.'
      )
    );
  });
});

/**
 * L'INSCRIPTION DU JOUEUR — la seule que l'écran propose. Elle demande un mot
 * de passe (un enfant se reconnecte plus souvent qu'il ne relève ses
 * e-mails), et dit quoi faire ensuite : ouvrir le lien de confirmation, ou
 * rien si la session est déjà là.
 */
describe('l’inscription du joueur', () => {
  async function ouvrirInscription() {
    renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: "J'ai un code d'invitation joueur" })
    );
    expect(
      screen.getByRole('heading', { name: 'Créer mon compte joueur' })
    ).toBeInTheDocument();
  }

  it('demande une adresse et un nouveau mot de passe, puis crée le compte', async () => {
    await ouvrirInscription();
    const motDePasse = screen.getByLabelText(
      'Mot de passe (8 caractères au moins)'
    );
    expect(motDePasse).toHaveAttribute('autocomplete', 'new-password');
    expect(motDePasse).toHaveAttribute('minlength', '8');

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: ' lucas@exemple.fr ' },
    });
    fireEvent.change(motDePasse, { target: { value: 'unmotdepasse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(signUp).toHaveBeenCalledWith('lucas@exemple.fr', 'unmotdepasse');
    expect(signIn).not.toHaveBeenCalled();
    // Un lien de confirmation est parti : l'écran le dit, avec l'adresse.
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('lucas@exemple.fr')
    );

    // « Retour à la connexion » ramène au mot de passe, pour se connecter une
    // fois l'adresse confirmée.
    fireEvent.click(
      screen.getByRole('button', { name: 'Retour à la connexion' })
    );
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
  });

  it('une session tout de suite : pas d’écran de confirmation', async () => {
    signUp.mockImplementationOnce(() =>
      Promise.resolve({ confirmationSent: false })
    );
    await ouvrirInscription();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'lucas@exemple.fr' },
    });
    fireEvent.change(
      screen.getByLabelText('Mot de passe (8 caractères au moins)'),
      { target: { value: 'unmotdepasse' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('un refus est dit, sans exposer le message brut', async () => {
    signUp.mockImplementationOnce(() =>
      Promise.resolve({ error: 'User already registered' })
    );
    await ouvrirInscription();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'lucas@exemple.fr' },
    });
    fireEvent.change(
      screen.getByLabelText('Mot de passe (8 caractères au moins)'),
      { target: { value: 'unmotdepasse' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Création impossible/)
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('already');
  });

  it('« Retour à la connexion » ramène au lien', async () => {
    await ouvrirInscription();
    fireEvent.click(
      screen.getByRole('button', { name: 'Retour à la connexion' })
    );
    expect(
      screen.getByRole('button', { name: 'Recevoir un lien de connexion' })
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Mot de passe (8 caractères au moins)')
    ).toBeNull();
  });
});
