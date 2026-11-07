import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TopBar } from './TopBar';
import { AppProvider } from '../../store/AppContext';
import { I18nProvider } from '../../i18n';
import { emptyState, seedState } from '../../store/storage';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderTopBar(path: string, props = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>
        <AppProvider>
          <Routes>
            <Route path="*" element={<TopBar {...props} />} />
          </Routes>
        </AppProvider>
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('TopBar', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    localStorage.clear();
  });

  it('shows logo and bell icon on root path', () => {
    renderTopBar('/');
    expect(screen.getByText('Mister Footcoach')).toBeInTheDocument();
    // Deux notifications non lues dans les données de démonstration : le nom
    // accessible porte le chiffre que montre la pastille (WCAG 2.5.3).
    expect(
      screen.getByRole('button', { name: 'Notifications, non lues : 2' })
    ).toHaveTextContent('2');
  });

  it('sans notification non lue, le bouton se nomme sobrement', () => {
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({ v: 1, data: emptyState() })
    );
    renderTopBar('/');
    expect(
      screen.getByRole('button', { name: 'Notifications' })
    ).toHaveTextContent('');
  });

  it('au-delà de neuf, le nom dit « 9+ » comme la pastille', () => {
    const state = seedState();
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `n-many-${i}`,
      userId: 'u1',
      type: 'match',
      message: 'm',
      read: false,
      createdAt: '2026-05-01T12:00:00.000Z',
    }));
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({ v: 1, data: { ...state, notifications: many } })
    );
    renderTopBar('/');
    expect(
      screen.getByRole('button', { name: 'Notifications, non lues : 9+' })
    ).toHaveTextContent('9+');
  });

  it('does not show back button on root path', () => {
    renderTopBar('/');
    expect(screen.queryByLabelText('Retour')).not.toBeInTheDocument();
  });

  it('shows back button on non-root path', () => {
    renderTopBar('/equipes');
    expect(screen.getByLabelText('Retour')).toBeInTheDocument();
  });

  it('shows title on non-root path when provided', () => {
    renderTopBar('/equipes', { title: 'Mon titre' });
    expect(screen.getByText('Mon titre')).toBeInTheDocument();
  });

  it('does not show title on root path even when provided', () => {
    renderTopBar('/', { title: 'Hidden' });
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('renders custom actions slot', () => {
    renderTopBar('/equipes', { actions: <button>Custom</button> });
    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument();
  });

  it('back button calls navigate(-1)', async () => {
    renderTopBar('/equipes');
    await userEvent.click(screen.getByLabelText('Retour'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('showBack=false hides back button even on non-root', () => {
    renderTopBar('/equipes', { showBack: false });
    expect(screen.queryByLabelText('Retour')).not.toBeInTheDocument();
  });
});
