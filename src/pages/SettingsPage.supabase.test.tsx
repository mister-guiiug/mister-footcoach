import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../i18n';
import { ThemeProvider } from '../theme/ThemeContext';
import { AppContext } from '../store/AppContext';
import { MOCK_DATA } from '../data/mock';
import SettingsPage from './SettingsPage';

/**
 * L'ÉCRAN DES RÉGLAGES AVEC UN COMPTE — ce qu'il ne promet pas, et ce qu'il
 * ose enfin.
 *
 * 1. LA CARTE « MES DONNÉES » DISPARAÎT. Exporter et importer agissent sur le
 *    magasin LOCAL — la clé `mister-footcoach-data`. En mode `supabase`, ce
 *    n'est pas là que vit la vérité : `SupabaseAppProvider` hydrate depuis la
 *    base et y renvoie chaque `dispatch`. Une carte « sauvegardez vos
 *    données » y exporterait un miroir périmé, et un import remplacerait un
 *    état que le prochain rechargement écraserait sans prévenir. Pire
 *    qu'inutile : mensonger.
 *
 * 2. LA ZONE DANGEREUSE APPARAÎT. C'est l'inverse exact : sans compte, un
 *    « supprimer mon compte » n'effacerait rien. Avec compte, son absence
 *    était un droit non outillé (specs § 21.2) sur une application qui
 *    manipule des données de mineurs.
 *
 * CE QUI EST DOUBLÉ, ET POURQUOI. `BACKEND`, la constante qui porte la
 * décision, et `useAuth`, dont le vrai fournisseur construirait un client
 * Supabase à partir de variables d'environnement absentes. Ce qu'on NE monte
 * pas, c'est `AppProvider` : il lit la même constante et brancherait lui aussi
 * un vrai client. L'écran reçoit donc son contexte applicatif à la main —
 * exactement ce que `AppProvider` lui donnerait.
 */
vi.mock('../backend/config', () => ({ BACKEND: 'supabase' }));

const deleteAccount = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({
  session: { user: { email: 'coach@fc-exemple.fr' } } as {
    user: { email: string };
  } | null,
}));
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    session: auth.session,
    loading: false,
    signIn: vi.fn(),
    signInWithLink: vi.fn(),
    signOut: vi.fn(),
    deleteAccount,
  }),
}));

function renderWithSupabaseBackend() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <ThemeProvider>
          <AppContext.Provider
            value={{
              state: { ...MOCK_DATA, selectedTeamId: MOCK_DATA.teams[0]!.id },
              dispatch: vi.fn(),
            }}
          >
            <SettingsPage />
          </AppContext.Provider>
        </ThemeProvider>
      </I18nProvider>
    </MemoryRouter>
  );
}

/** Ouvre la zone dangereuse et rend le champ de confirmation. */
async function openDangerZone(): Promise<HTMLElement> {
  await userEvent.click(
    screen.getByRole('button', { name: 'Supprimer mon compte' })
  );
  return screen.getByLabelText('Retapez votre adresse e-mail pour confirmer');
}

describe('Réglages avec le backend Supabase', () => {
  beforeEach(() => {
    deleteAccount.mockReset();
    deleteAccount.mockResolvedValue({});
    auth.session = { user: { email: 'coach@fc-exemple.fr' } };
  });

  it('ne propose ni export ni import de la base locale', () => {
    renderWithSupabaseBackend();

    expect(screen.queryByText('Mes données')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Exporter/ })
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Importer')).not.toBeInTheDocument();
  });

  it('rend le reste de l’écran comme d’habitude', () => {
    // La garde anti-test-creux : l'écran s'est bien rendu, la carte manque
    // parce qu'elle est conditionnée — pas parce que rien n'a été monté.
    renderWithSupabaseBackend();
    expect(screen.getByText('Paramètres')).toBeInTheDocument();
    expect(screen.getByText('Données de démonstration')).toBeInTheDocument();
  });

  it('offre la zone dangereuse, fermée', () => {
    renderWithSupabaseBackend();

    expect(screen.getByText('Zone dangereuse')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Supprimer mon compte' })
    ).toBeInTheDocument();
    // Fermée : le champ de confirmation n'est pas là tant qu'on n'a rien
    // demandé, et RIEN n'a encore été appelé.
    expect(
      screen.queryByLabelText('Retapez votre adresse e-mail pour confirmer')
    ).not.toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('annonce ce qui part ET ce qui reste au club avant de demander', async () => {
    renderWithSupabaseBackend();
    await openDangerZone();

    // Un compte de coach n'emporte pas la saison : le dire AVANT est la
    // moitié du travail.
    expect(screen.getByText(/Seront effacés/)).toBeInTheDocument();
    expect(screen.getByText(/Resteront au club/)).toBeInTheDocument();
  });

  it('REFUSE tant que l’adresse n’est pas retapée — et ne supprime rien', async () => {
    renderWithSupabaseBackend();
    const field = await openDangerZone();

    // Le geste qu'on regrette : cliquer deux fois de suite. Une barrière à
    // « OK » ne l'arrêterait pas ; retaper son adresse, si.
    await userEvent.click(
      screen.getByRole('button', { name: 'Supprimer définitivement' })
    );
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      "L'adresse saisie ne correspond pas"
    );

    // Une adresse VOISINE ne passe pas non plus.
    await userEvent.type(field, 'coach@fc-exemple.com');
    await userEvent.click(
      screen.getByRole('button', { name: 'Supprimer définitivement' })
    );
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('supprime quand l’adresse correspond, aux espaces et à la casse près', async () => {
    renderWithSupabaseBackend();
    const field = await openDangerZone();

    await userEvent.type(field, '  Coach@FC-Exemple.fr  ');
    await userEvent.click(
      screen.getByRole('button', { name: 'Supprimer définitivement' })
    );

    expect(deleteAccount).toHaveBeenCalledOnce();
    // Rien à afficher : la session est fermée par `deleteAccount`, et
    // `AuthGate` reprend la main.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('un échec AFFICHE le motif et laisse la carte ouverte', async () => {
    deleteAccount.mockResolvedValue({ error: 'permission denied' });
    renderWithSupabaseBackend();
    const field = await openDangerZone();

    await userEvent.type(field, 'coach@fc-exemple.fr');
    await userEvent.click(
      screen.getByRole('button', { name: 'Supprimer définitivement' })
    );

    expect(screen.getByRole('alert')).toHaveTextContent('permission denied');
    // Ce qui compte : on peut réessayer. Une carte refermée sur un échec
    // laisserait croire que c'est fait.
    expect(
      screen.getByLabelText('Retapez votre adresse e-mail pour confirmer')
    ).toBeInTheDocument();
  });

  it('sans session, un champ VIDE ne vaut pas une confirmation', async () => {
    // Le cas qui ne tomberait qu'en production : la session n'est pas encore
    // là (ou vient d'expirer), l'adresse attendue est donc la chaîne vide.
    // Sans la garde, « rien » égalerait « rien » et le compte partirait sur un
    // seul clic.
    auth.session = null;
    renderWithSupabaseBackend();
    await openDangerZone();

    await userEvent.click(
      screen.getByRole('button', { name: 'Supprimer définitivement' })
    );

    expect(deleteAccount).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('« Annuler » referme la carte et oublie la saisie', async () => {
    renderWithSupabaseBackend();
    const field = await openDangerZone();
    await userEvent.type(field, 'coach@fc-exemple.fr');

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(
      screen.queryByLabelText('Retapez votre adresse e-mail pour confirmer')
    ).not.toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();

    // Rouverte, elle est vide : une adresse laissée dans le champ ferait du
    // clic suivant une suppression en un geste.
    const reopened = await openDangerZone();
    expect(reopened).toHaveValue('');
  });
});
