/**
 * Les présences d'un MATCH se saisissent. Relevé du 25/09/2026 : seuls les
 * entraînements écrivaient l'assiduité ; la fiche du match n'affichait que des
 * présences que rien ne permettait d'enregistrer, et « Clôturer et saisir
 * l'assiduité », au direct, y menait les mains vides.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { renderAtRoute } from '../test/helpers';
import { I18nProvider } from '../i18n';
import { ThemeProvider } from '../theme/ThemeContext';
import { AppProvider } from '../store/AppContext';
import MatchDetailPage from './MatchDetailPage';
import MatchLivePage from './MatchLivePage';
import { MOCK_DATA } from '../data/mock';

describe('MatchDetailPage — feuille de présence', () => {
  beforeEach(() => localStorage.clear());

  it('the coach records a player’s attendance on the match sheet', async () => {
    renderAtRoute(<MatchDetailPage />, {
      initialPath: '/matchs/m1',
      routePattern: '/matchs/:id',
    });
    expect(screen.getByText('Présences')).toBeInTheDocument();
    const lucasBtn = screen.getByText('Lucas Dupont').closest('button')!;
    expect(within(lucasBtn).getByText('Non saisi')).toBeInTheDocument();
    await userEvent.click(lucasBtn);
    expect(within(lucasBtn).getByText('Présent')).toBeInTheDocument();

    // Written to the store as a MATCH attendance, for this match. The store
    // keeps its data in a versioned envelope `{ v, data }`.
    const saved = JSON.parse(localStorage.getItem('mister-footcoach-data')!);
    expect(saved.data.attendances).toContainEqual(
      expect.objectContaining({
        sessionType: 'match',
        sessionId: 'm1',
        playerId: 'p1',
        status: 'present',
      })
    );
  });

  it('a cancelled match has no attendance sheet', () => {
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        matches: MOCK_DATA.matches.map(m =>
          m.id === 'm1' ? { ...m, status: 'annule' } : m
        ),
      })
    );
    renderAtRoute(<MatchDetailPage />, {
      initialPath: '/matchs/m1',
      routePattern: '/matchs/:id',
    });
    expect(screen.queryByText('Présences')).not.toBeInTheDocument();
  });
});

describe('MatchLivePage — Clôturer et saisir l’assiduité', () => {
  beforeEach(() => localStorage.clear());

  function Destination() {
    const { pathname, hash } = useLocation();
    return <p>{`${pathname}${hash}`}</p>;
  }

  it('leads straight to the attendance sheet of the match', async () => {
    render(
      <MemoryRouter initialEntries={['/matchs/m1/live']}>
        <I18nProvider>
          <ThemeProvider>
            <AppProvider>
              <Routes>
                <Route path="/matchs/:id/live" element={<MatchLivePage />} />
                <Route path="/matchs/:id" element={<Destination />} />
              </Routes>
            </AppProvider>
          </ThemeProvider>
        </I18nProvider>
      </MemoryRouter>
    );
    await userEvent.click(
      screen.getByRole('button', { name: "Clôturer et saisir l'assiduité" })
    );
    expect(screen.getByText('/matchs/m1#presences')).toBeInTheDocument();
  });
});
