import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme/ThemeContext';
import { AppProvider } from './store/AppContext';
import App from './App';

function renderApp() {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

describe('App', () => {
  beforeEach(() => {
    // BrowserRouter lit window.location ; sous Vitest, BASE_URL vaut '/'.
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders without crashing', () => {
    const { container } = renderApp();
    expect(container.firstChild).toBeTruthy();
  });

  // Régression : avec un basename codé en dur ('/mister-footcoach'), le routeur
  // ne matchait pas la racine et l'app ne peignait rien — d'où l'échec NO_FCP de
  // Lighthouse CI, qui sert `dist/` à la racine. Les deux base paths réellement
  // déployés sont couverts pour que le correctif ne casse pas GitHub Pages.
  it('renders the app shell when served from the root', async () => {
    renderApp();
    expect(await screen.findByRole('main')).toBeInTheDocument();
  });

  it('renders the app shell under the GitHub Pages base path', async () => {
    vi.stubEnv('BASE_URL', '/mister-footcoach/');
    window.history.pushState({}, '', '/mister-footcoach/');
    renderApp();
    expect(await screen.findByRole('main')).toBeInTheDocument();
    // Les liens sont préfixés : prouve que le basename vient bien de BASE_URL
    // (sans ça, le catch-all redirigerait vers '/' et le test passerait à tort).
    // Le nom accessible porte en plus le « Page actuelle » masqué visuellement
    // que pose le BottomNav du socle, d'où la comparaison sur le début du nom.
    const home = screen.getByRole('link', {
      name: name => name.startsWith('Accueil'),
    });
    expect(home).toHaveAttribute('href', '/mister-footcoach/');
    // Et l'onglet est bien reconnu comme courant MALGRÉ le préfixe : le socle
    // compare des chemins débarrassés du basename par `useLocation()`.
    expect(home).toHaveAttribute('aria-current', 'page');
  });
});
