import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from '../../i18n';
import { ThemeProvider } from '../../theme/ThemeContext';
import { AppProvider } from '../../store/AppContext';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders TopBar, BottomNav and Outlet content', () => {
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
    // TopBar is present (logo)
    expect(screen.getByText('Mister Footcoach')).toBeInTheDocument();
    // Outlet content
    expect(screen.getByText('Page content')).toBeInTheDocument();
    // BottomNav
    expect(screen.getByText('Accueil')).toBeInTheDocument();
  });
});
