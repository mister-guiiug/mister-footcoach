import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BottomNav } from './BottomNav';

function renderNav(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<BottomNav />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BottomNav', () => {
  it('renders all main tab labels', () => {
    renderNav();
    expect(screen.getByText('Accueil')).toBeInTheDocument();
    expect(screen.getByText('Équipes')).toBeInTheDocument();
    expect(screen.getByText('Matchs')).toBeInTheDocument();
    expect(screen.getByText('Entraîn.')).toBeInTheDocument();
    expect(screen.getByText('Plus')).toBeInTheDocument();
  });

  it('drawer is hidden initially', () => {
    renderNav();
    expect(screen.queryByText('Tournois')).not.toBeInTheDocument();
  });

  it('clicking "Plus" opens the drawer with more tabs', async () => {
    renderNav();
    await userEvent.click(screen.getByText('Plus'));
    expect(screen.getByText('Tournois')).toBeInTheDocument();
    expect(screen.getByText('Sondages')).toBeInTheDocument();
    expect(screen.getByText('Compositions')).toBeInTheDocument();
    expect(screen.getByText('Paramètres')).toBeInTheDocument();
  });

  it('clicking the overlay closes the drawer', async () => {
    renderNav();
    await userEvent.click(screen.getByText('Plus'));
    expect(screen.getByText('Tournois')).toBeInTheDocument();
    // click the dark overlay (first child of fixed inset-0)
    const overlay = document.querySelector(
      '.fixed.inset-0.z-40'
    ) as HTMLElement;
    await userEvent.click(overlay);
    expect(screen.queryByText('Tournois')).not.toBeInTheDocument();
  });

  it('clicking "Fermer" button closes the drawer', async () => {
    renderNav();
    await userEvent.click(screen.getByText('Plus'));
    await userEvent.click(screen.getByText('Fermer'));
    expect(screen.queryByText('Tournois')).not.toBeInTheDocument();
  });

  it('clicking a drawer item navigates and closes drawer', async () => {
    renderNav();
    await userEvent.click(screen.getByText('Plus'));
    await userEvent.click(screen.getByText('Tournois'));
    expect(screen.queryByText('Tournois')).not.toBeInTheDocument();
  });
});
