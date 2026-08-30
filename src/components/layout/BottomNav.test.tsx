import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from '../../i18n';
import { BottomNav } from './BottomNav';

/**
 * Ces tests ne vérifient plus la MÉCANIQUE du tiroir (voile cliquable, bouton
 * « Fermer ») : elle appartient maintenant au socle, qui la teste chez lui et
 * la rend autrement (attribut `hidden`, fermeture à Échap).
 *
 * Ils vérifient l'USAGE, c'est-à-dire la seule chose que la migration pouvait
 * casser en silence : une barre VIDE. `<BottomNav />` sans `items` compile,
 * passe le lint, et ne rend aucune destination. D'où un test par destination
 * attendue, visible ou rangée sous « Plus ».
 */

function renderNav(path = '/', basename?: string) {
  return render(
    <MemoryRouter initialEntries={[path]} basename={basename}>
      <I18nProvider>
        <Routes>
          <Route path="*" element={<BottomNav />} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>
  );
}

const VISIBLE = ['Accueil', 'Équipes', 'Matchs', 'Entraîn.'];
const DRAWER = [
  'Tournois',
  'Sondages',
  'Compositions',
  'Statistiques',
  'Exercices',
  'Contacts',
  'Paramètres',
];

describe('BottomNav', () => {
  it('la barre n’est pas vide : les quatre destinations principales et « Plus »', () => {
    renderNav();
    const nav = screen.getByRole('navigation', {
      name: 'Navigation principale',
    });
    // Le nom accessible de l'onglet courant porte en plus le « Page actuelle »
    // masqué visuellement, d'où la comparaison sur le début du nom.
    for (const label of VISIBLE) {
      expect(
        within(nav).getByRole('link', { name: name => name.startsWith(label) })
      ).toBeVisible();
    }
    expect(within(nav).getByRole('button', { name: 'Plus' })).toBeVisible();
  });

  it('les onze destinations pointent vers les bonnes routes', async () => {
    renderNav();
    await userEvent.click(screen.getByRole('button', { name: 'Plus' }));
    const hrefs = screen
      .getAllByRole('link')
      .map(link => link.getAttribute('href'));
    expect(hrefs).toEqual([
      '/',
      '/equipes',
      '/matchs',
      '/entrainements',
      '/tournois',
      '/sondages',
      '/compositions',
      '/statistiques',
      '/exercices',
      '/contacts',
      '/parametres',
    ]);
  });

  it('le tiroir est replié au départ, et « Plus » l’annonce', () => {
    renderNav();
    const more = screen.getByRole('button', { name: 'Plus' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    for (const label of DRAWER) {
      expect(
        screen.queryByRole('link', { name: label })
      ).not.toBeInTheDocument();
    }
  });

  it('« Plus » déplie les sept destinations restantes, en liens', async () => {
    renderNav();
    await userEvent.click(screen.getByRole('button', { name: 'Plus' }));
    expect(screen.getByRole('button', { name: 'Plus' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    for (const label of DRAWER) {
      expect(screen.getByRole('link', { name: label })).toBeVisible();
    }
  });

  it('choisir une destination du tiroir le referme', async () => {
    renderNav();
    await userEvent.click(screen.getByRole('button', { name: 'Plus' }));
    await userEvent.click(screen.getByRole('link', { name: 'Tournois' }));
    expect(
      screen.queryByRole('link', { name: 'Tournois' })
    ).not.toBeInTheDocument();
  });

  it('l’onglet courant n’est pas signalé que par la couleur', () => {
    renderNav('/equipes');
    const current = screen.getByRole('link', { name: /Équipes/ });
    expect(current).toHaveAttribute('aria-current', 'page');
    // Lu mais non vu : le socle double l'encre d'un texte, WCAG 1.4.1.
    expect(current).toHaveTextContent('Page actuelle');
    expect(screen.getByRole('link', { name: 'Matchs' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('« Accueil » n’est courant que sur la racine', () => {
    renderNav('/equipes');
    expect(screen.getByRole('link', { name: 'Accueil' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('une sous-route garde son onglet parent courant', () => {
    renderNav('/matchs/42');
    expect(screen.getByRole('link', { name: /Matchs/ })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('l’onglet courant survit à un basename (régression production)', () => {
    // Le routeur est monté sur `basename={BASE_URL}` : en production le chemin
    // du navigateur porte le préfixe `/mister-footcoach`, pas les `href` des
    // destinations. Sans `currentPath` venu de `useLocation()`, AUCUN onglet ne
    // serait courant — et seulement une fois déployé.
    renderNav('/mister-footcoach/equipes', '/mister-footcoach');
    const current = screen.getByRole('link', { name: /Équipes/ });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveAttribute('href', '/mister-footcoach/equipes');
  });
});
