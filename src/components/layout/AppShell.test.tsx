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

  // Règle famille : les deux liens sont visibles sur le PREMIER écran comme
  // sur les Réglages. C'est la coquille qui le garantit — les assertions
  // vivaient dans `SettingsPage.test.tsx`, où elles ne prouvaient que le cas
  // d'un seul écran. Ici, la route rendue est l'accueil.
  //
  // On relit les `href` RENDUS, pas les constantes : un identifiant d'app faux
  // passerait la compilation et le type check pour ne donner qu'un 404.
  it('shows the source link on the first screen, pointing at this repository', () => {
    renderShell();
    expect(screen.getByRole('link', { name: 'Code source' })).toHaveAttribute(
      'href',
      'https://github.com/mister-guiiug/mister-footcoach'
    );
  });

  // L'APOSTROPHE EST TYPOGRAPHIQUE (U+2019), et c'est celle du socle : ses
  // libellés par défaut écrivent « M’offrir un café ». L'ancienne assertion,
  // écrite sur le libellé maison de l'app, portait une apostrophe droite
  // (U+0027) — deux caractères qui se ressemblent et qu'aucun diff ne montre.
  it('shows the sponsor link on the first screen, pointing at the family Buy Me a Coffee page', () => {
    renderShell();
    expect(
      screen.getByRole('link', { name: 'M’offrir un café' })
    ).toHaveAttribute('href', 'https://buymeacoffee.com/mister.guiiug');
  });
});
