/**
 * Créer et renommer une équipe ; retirer et réintégrer un joueur. Relevé du
 * 25/09/2026 : rien de tout cela n'était possible, et l'app restait aux deux
 * équipes U13 fictives du jeu de démonstration.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from '../i18n';
import { ThemeProvider } from '../theme/ThemeContext';
import { AppProvider } from '../store/AppContext';
import TeamsPage from './TeamsPage';
import TeamDetailPage from './TeamDetailPage';
import PlayerDetailPage from './PlayerDetailPage';

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <I18nProvider>
        <ThemeProvider>
          <AppProvider>
            <Routes>
              <Route path="/equipes" element={<TeamsPage />} />
              <Route path="/equipes/:id" element={<TeamDetailPage />} />
              <Route path="/joueurs/:id" element={<PlayerDetailPage />} />
            </Routes>
          </AppProvider>
        </ThemeProvider>
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('équipes', () => {
  beforeEach(() => localStorage.clear());

  it('creates a team, lands on its page, then renames it', async () => {
    renderApp('/equipes');
    await userEvent.click(screen.getByRole('button', { name: /Équipe/ }));
    await userEvent.type(screen.getByLabelText('Nom'), 'U15 A');
    await userEvent.type(screen.getByLabelText('Catégorie'), 'U15');
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'U15 A' })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Modifier/ }));
    const name = screen.getByLabelText('Nom');
    await userEvent.clear(name);
    await userEvent.type(name, 'U15 Élite');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'U15 Élite' })
    ).toBeInTheDocument();
  });

  it('refuses a team without a name or a category', async () => {
    renderApp('/equipes');
    await userEvent.click(screen.getByRole('button', { name: /Équipe/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));
    expect(
      screen.getByText('Le nom et la catégorie sont obligatoires.')
    ).toBeInTheDocument();
  });
});

describe('retirer un joueur de l’effectif, réversible', () => {
  beforeEach(() => localStorage.clear());

  it('removes a player after confirmation, then reinstates them', async () => {
    renderApp('/joueurs/p1');
    await userEvent.click(
      screen.getByRole('button', { name: /Retirer de l'effectif/ })
    );
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/Lucas Dupont/)).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: /Retirer de l'effectif/ })
    );

    expect(screen.getByText("Retiré de l'effectif")).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Réintégrer/ }));
    expect(screen.queryByText("Retiré de l'effectif")).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Retirer de l'effectif/ })
    ).toBeInTheDocument();
  });

  it('a removed player leaves the squad and can be reinstated from the team page', async () => {
    const data = await import('../data/mock');
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...data.MOCK_DATA,
        players: data.MOCK_DATA.players.map(p =>
          p.id === 'p1' ? { ...p, active: false } : p
        ),
      })
    );
    renderApp('/equipes/t1');
    const removed = screen
      .getByRole('heading', { name: 'Joueurs retirés' })
      .closest('section')!;
    expect(within(removed).getByText('Lucas Dupont')).toBeInTheDocument();
    // Not in the squad any more.
    expect(screen.getAllByText('Lucas Dupont')).toHaveLength(1);

    await userEvent.click(
      within(removed).getByRole('button', { name: 'Réintégrer' })
    );
    expect(
      screen.queryByRole('heading', { name: 'Joueurs retirés' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Lucas Dupont').closest('a')).toHaveAttribute(
      'href',
      '/joueurs/p1'
    );
  });
});
