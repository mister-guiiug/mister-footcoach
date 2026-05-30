import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TopBar } from './TopBar';
import { AppProvider } from '../../store/AppContext';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderTopBar(path: string, props = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <Routes>
          <Route path="*" element={<TopBar {...props} />} />
        </Routes>
      </AppProvider>
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
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
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
