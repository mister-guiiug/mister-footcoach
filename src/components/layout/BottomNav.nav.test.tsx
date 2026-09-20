import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Suspense, lazy, type ComponentType } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '../../i18n';
import { BottomNav } from './BottomNav';

/**
 * LE DÉFAUT QUE CES TESTS VERROUILLENT : un clic sans aucun effet visible.
 *
 * Diagnostiqué sur miss-badminton le 20/09/2026 (PR #80), puis retrouvé sur
 * onze dépôts du parc. Mesuré à froid sur deux sites publiés, première visite,
 * service worker pas encore installé : 133 ms d'écran figé sur mister-settle,
 * 161 ms sur mister-molkky, pendant lesquelles l'URL indiquait déjà la nouvelle
 * route et l'écran affichait encore l'ancien, `aria-busy` faux d'un bout à
 * l'autre.
 *
 * La cause n'est pas une lenteur anormale : react-router 7 enveloppe tout
 * changement d'URL dans `startTransition`, et React 19 garde alors
 * délibérément l'écran déjà affiché plutôt que de montrer le repli de
 * `Suspense`. Le repli d'`App` existait bien — il n'a simplement jamais pu
 * paraître sur un clic.
 *
 * Ces tests tiennent le CONTRAT, pas la mise en forme : tant que la page n'est
 * pas là, l'entrée cliquée se dit occupée et la barre reste à l'écran pour le
 * montrer.
 */

/** Monte la barre face à une page dont on décide nous-même de l'arrivée. */
function monterFaceAUnePageLente() {
  let resous!: () => void;
  const PageLente = lazy(
    () =>
      new Promise<{ default: ComponentType }>(resolve => {
        resous = () => resolve({ default: () => <h1>Mes équipes</h1> });
      })
  );

  render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
        <Suspense fallback={<p>repli de route</p>}>
          <Routes>
            <Route path="/" element={<h1>Accueil</h1>} />
            <Route path="/equipes" element={<PageLente />} />
          </Routes>
        </Suspense>
      </MemoryRouter>
    </I18nProvider>
  );

  return {
    // Une expression régulière, pas une chaîne : le socle ajoute « Page
    // actuelle » au nom accessible de l'entrée courante.
    entree: (nom: RegExp) => screen.getByRole('link', { name: nom }),
    livreLaPage: async () => {
      await act(async () => {
        resous();
      });
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  // Force la locale FR : jsdom rapporte `navigator.language = en-US`.
  localStorage.setItem('footcoach_locale', 'fr');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('le clic sur une entrée de la barre répond avant que la page soit là', () => {
  it("dit l'entrée occupée tant que le morceau n'est pas arrivé", async () => {
    const { entree, livreLaPage } = monterFaceAUnePageLente();

    fireEvent.click(entree(/Équipes/));

    expect(entree(/Équipes/)).toHaveAttribute('aria-busy', 'true');
    // Les autres entrées ne se disent pas occupées : c'est celle qu'on a
    // cliquée qui travaille, pas la barre entière.
    expect(entree(/Matchs/)).not.toHaveAttribute('aria-busy');

    await livreLaPage();

    expect(
      screen.getByRole('heading', { name: 'Mes équipes' })
    ).toBeInTheDocument();
    expect(entree(/Équipes/)).not.toHaveAttribute('aria-busy');
  });

  it('annonce le chargement dans une zone vive, hors des liens', async () => {
    const { entree, livreLaPage } = monterFaceAUnePageLente();

    fireEvent.click(entree(/Équipes/));

    // HORS des liens : le nom accessible d'« Équipes » ne doit pas changer en
    // cours de route sous le doigt d'un lecteur d'écran.
    expect(
      screen.getAllByRole('status').some(z => z.textContent === 'Chargement…')
    ).toBe(true);
    expect(entree(/Équipes/)).toHaveAccessibleName('Équipes');

    await livreLaPage();

    expect(
      screen.getAllByRole('status').some(z => z.textContent === 'Chargement…')
    ).toBe(false);
  });

  it("garde l'écran précédent ET la barre pendant l'attente", async () => {
    const { entree, livreLaPage } = monterFaceAUnePageLente();

    fireEvent.click(entree(/Équipes/));

    // CE QUE LE REPLI DE `Suspense` NE FERA PAS. React 19 garde l'écran déjà
    // affiché pendant la transition : l'accueil est toujours là, et le repli de
    // route n'a pas paru. C'est exactement pourquoi la barre doit parler —
    // elle seule le peut.
    expect(
      screen.getByRole('heading', { name: 'Accueil' })
    ).toBeInTheDocument();
    expect(screen.queryByText('repli de route')).toBeNull();

    // Et la barre reste sous les yeux pour le montrer : ce qui dit « je
    // charge » doit survivre au clic.
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(entree(/Équipes/)).toHaveAttribute('aria-busy', 'true');

    await livreLaPage();

    expect(screen.queryByRole('heading', { name: 'Accueil' })).toBeNull();
  });

  it('laisse le navigateur faire quand le clic porte un modificateur', () => {
    const { entree } = monterFaceAUnePageLente();

    fireEvent.click(entree(/Équipes/), { ctrlKey: true });

    // Ouvrir dans un nouvel onglet n'est pas une navigation de cette page :
    // rien ne doit être mis en attente ici.
    expect(entree(/Équipes/)).not.toHaveAttribute('aria-busy');
    expect(
      screen.getByRole('heading', { name: 'Accueil' })
    ).toBeInTheDocument();
  });
});
