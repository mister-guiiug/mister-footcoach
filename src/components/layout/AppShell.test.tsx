import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from '../../i18n';
import { ThemeProvider } from '../../theme/ThemeContext';
import { AppProvider } from '../../store/AppContext';
import { AppShell } from './AppShell';

function renderShell() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <I18nProvider>
        <ThemeProvider>
          <AppProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<div>Page content</div>} />
              </Route>
            </Routes>
          </AppProvider>
        </ThemeProvider>
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('AppShell', () => {
  it('renders TopBar, BottomNav and Outlet content', () => {
    renderShell();
    // TopBar is present (logo)
    expect(screen.getByText('Mister Footcoach')).toBeInTheDocument();
    // Outlet content
    expect(screen.getByText('Page content')).toBeInTheDocument();
    // BottomNav
    expect(screen.getByText('Accueil')).toBeInTheDocument();
  });

  // La règle famille en veut DEUX écrans, pas onze. La coquille ne porte donc
  // plus le pied de page, et c'est ce que ce test fige : les assertions sur
  // les liens sont passées dans `DashboardPage.test.tsx` et
  // `SettingsPage.test.tsx`, les deux écrans qui les portent vraiment.
  //
  // Ce n'est pas une absence décorative : rendu par la coquille, « M’offrir un
  // café » s'affichait sous le plateau du match en direct et sous chaque
  // formulaire.
  it('ne rend AUCUN lien de pied de page : ce n’est plus le rôle de la coquille', () => {
    renderShell();
    expect(
      screen.queryByRole('link', { name: 'Code source' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'M’offrir un café' })
    ).not.toBeInTheDocument();
  });
});
