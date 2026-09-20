import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme/ThemeContext';
import { AppProvider } from './store/AppContext';
import App from './App';

/**
 * LE PRÉCHARGEMENT DES PAGES DE LA BARRE — le contrat, pas la mécanique.
 *
 * Ce qui est tenu ici : RIEN n'est demandé avant que le navigateur souffle (le
 * découpage garde son sens), puis, au repos, les TROIS pages visibles de la
 * barre sont demandées — et seulement elles : une page repliée sous « Plus »
 * ne l'est pas. La mécanique — `requestIdleCallback`, son délai de repli,
 * l'annulation au démontage, la garde `saveData` — est celle du socle, prouvée
 * chez lui (`test/prefetch.test.mjs` de dev-pwa-config).
 *
 * Les morceaux se comptent par la fabrique de leur module moqué : elle n'est
 * appelée qu'au PREMIER import, exactement comme un `import()` ne télécharge
 * un morceau qu'une fois.
 */
const demandes = vi.hoisted(() => ({
  teams: 0,
  matches: 0,
  trainings: 0,
  stats: 0,
}));
vi.mock('./pages/TeamsPage', () => {
  demandes.teams += 1;
  return { default: () => null };
});
vi.mock('./pages/MatchesPage', () => {
  demandes.matches += 1;
  return { default: () => null };
});
vi.mock('./pages/TrainingsPage', () => {
  demandes.trainings += 1;
  return { default: () => null };
});
// Repliée sous « Plus » : elle ne doit PAS être préchargée.
vi.mock('./pages/StatsPage', () => {
  demandes.stats += 1;
  return { default: () => null };
});

describe('préchargement des pages de la barre', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('demande les trois pages visibles au repos du navigateur — et seulement elles', async () => {
    // Le repos est entre les mains du test : le rappel est capturé, pas joué.
    const auRepos = vi.fn<(rappel: IdleRequestCallback) => number>(() => 1);
    vi.stubGlobal('requestIdleCallback', auRepos);
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    window.history.pushState({}, '', '/');

    render(
      <I18nProvider>
        <ThemeProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </ThemeProvider>
      </I18nProvider>
    );
    expect(await screen.findByRole('main')).toBeInTheDocument();

    // Rien avant le repos : sinon autant ne pas découper.
    expect(demandes).toEqual({ teams: 0, matches: 0, trainings: 0, stats: 0 });
    expect(auRepos).toHaveBeenCalled();

    await act(async () => {
      for (const [rappel] of auRepos.mock.calls) {
        rappel({ didTimeout: false, timeRemaining: () => 50 });
      }
    });

    await vi.waitFor(() =>
      expect(demandes).toEqual({ teams: 1, matches: 1, trainings: 1, stats: 0 })
    );
  });
});
