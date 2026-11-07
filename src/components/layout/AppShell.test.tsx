import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from '../../i18n';
import { ThemeProvider } from '../../theme/ThemeContext';
import { AppContext, AppProvider } from '../../store/AppContext';
import { emptyState, seedState, STORAGE_KEY } from '../../store/storage';
import { AppShell } from './AppShell';

/*
 * `BACKEND` est lu au rendu : le double est un GETTER (modèle de
 * `ConnectionBanner.test.tsx`), chaque test choisit son backend.
 */
const backend = vi.hoisted(() => ({
  current: 'local' as 'local' | 'supabase',
}));

vi.mock('../../backend/config', () => ({
  get BACKEND() {
    return backend.current;
  },
}));

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

describe('AppShell — le bandeau de démonstration', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    backend.current = 'local';
  });

  it('en mode local, sur les données de la démo, dit qu’elles sont fictives', () => {
    renderShell();
    expect(screen.getByRole('note')).toHaveTextContent(
      'Données fictives, enregistrées sur cet appareil seulement.'
    );
  });

  it('après « Repartir de zéro », ne dit plus « fictives » — mais toujours « sur cet appareil »', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, data: emptyState() })
    );
    renderShell();
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent(
      'Vos données restent sur cet appareil seulement : ni compte, ni partage.'
    );
    expect(note).not.toHaveTextContent(/fictives/);
  });

  it('avec le backend Supabase, ne rend aucun bandeau : il y a un compte et un serveur', () => {
    backend.current = 'supabase';
    render(
      <MemoryRouter initialEntries={['/']}>
        <I18nProvider>
          <ThemeProvider>
            <AppContext.Provider
              value={{ state: seedState(), dispatch: () => {} }}
            >
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<div>Page content</div>} />
                </Route>
              </Routes>
            </AppContext.Provider>
          </ThemeProvider>
        </I18nProvider>
      </MemoryRouter>
    );
    // Garde anti-test-creux : la coquille est bien montée.
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.queryByRole('note')).toBeNull();
  });
});
