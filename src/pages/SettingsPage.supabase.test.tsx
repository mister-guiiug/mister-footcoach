import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../i18n';
import { ThemeProvider } from '../theme/ThemeContext';
import { AppContext } from '../store/AppContext';
import { MOCK_DATA } from '../data/mock';
import SettingsPage from './SettingsPage';

/**
 * CE QUE LA CARTE « MES DONNÉES » NE DOIT PAS PROMETTRE.
 *
 * Exporter et importer agissent sur le magasin LOCAL — la clé
 * `mister-footcoach-data`. En mode `supabase`, ce n'est pas là que vit la
 * vérité : `SupabaseAppProvider` hydrate depuis la base et y renvoie chaque
 * `dispatch`. Une carte « sauvegardez vos données » y exporterait un miroir
 * périmé, et un import remplacerait un état que le prochain rechargement
 * écraserait sans prévenir. Pire qu'inutile : mensonger.
 *
 * CE QUI EST DOUBLÉ, ET POURQUOI. Seulement `BACKEND` — la constante qui porte
 * la décision. Ce qu'on NE monte pas, c'est `AppProvider` : il lit la même
 * constante et brancherait un vrai client Supabase dans un test d'interface.
 * L'écran reçoit donc son contexte à la main, ce qui est exactement ce que
 * `AppProvider` lui donnerait.
 */
vi.mock('../backend/config', () => ({ BACKEND: 'supabase' }));

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

describe('Réglages avec le backend Supabase', () => {
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
});
