import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAtRoute } from '../test/helpers';
import TrainingDetailPage from './TrainingDetailPage';

describe('TrainingDetailPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows empty state for unknown id', () => {
    renderAtRoute(<TrainingDetailPage />, {
      initialPath: '/entrainements/unknown',
      routePattern: '/entrainements/:id',
    });
    expect(screen.getByText('Entraînement introuvable')).toBeInTheDocument();
  });

  it('renders training theme', () => {
    renderAtRoute(<TrainingDetailPage />, {
      initialPath: '/entrainements/tr1',
      routePattern: '/entrainements/:id',
    });
    expect(
      screen.getByText('Pressing et récupération haute')
    ).toBeInTheDocument();
  });

  it('shows Annulé badge for cancelled training', () => {
    renderAtRoute(<TrainingDetailPage />, {
      initialPath: '/entrainements/tr5',
      routePattern: '/entrainements/:id',
    });
    expect(screen.getAllByText('Annulé').length).toBeGreaterThan(0);
  });

  it('shows Exceptionnel badge for exceptional training', () => {
    renderAtRoute(<TrainingDetailPage />, {
      initialPath: '/entrainements/tr3',
      routePattern: '/entrainements/:id',
    });
    expect(screen.getAllByText('Exceptionnel').length).toBeGreaterThan(0);
  });

  it('renders attendance summary when attendances exist', () => {
    renderAtRoute(<TrainingDetailPage />, {
      initialPath: '/entrainements/tr2',
      routePattern: '/entrainements/:id',
    });
    // tr2 has attendances in mock data
    expect(screen.getByText('Présents')).toBeInTheDocument();
    expect(screen.getByText('Absents')).toBeInTheDocument();
    expect(screen.getByText('Excusés')).toBeInTheDocument();
  });

  it('renders player list with tap instructions', () => {
    renderAtRoute(<TrainingDetailPage />, {
      initialPath: '/entrainements/tr1',
      routePattern: '/entrainements/:id',
    });
    expect(screen.getByText('Feuille de présence')).toBeInTheDocument();
    expect(
      screen.getByText('Toucher pour changer le statut')
    ).toBeInTheDocument();
  });

  it('cycles attendance status on player click', async () => {
    renderAtRoute(<TrainingDetailPage />, {
      initialPath: '/entrainements/tr1',
      routePattern: '/entrainements/:id',
    });
    // Click Lucas to cycle: present → absent
    const lucasBtn = screen.getByText('Lucas Dupont').closest('button')!;
    await userEvent.click(lucasBtn);
    expect(screen.getByText('Absent')).toBeInTheDocument();
    // Click again: absent → excusé
    await userEvent.click(lucasBtn);
    expect(screen.getByText('Excusé')).toBeInTheDocument();
    // Click again: excusé → présent
    await userEvent.click(lucasBtn);
    expect(screen.getAllByText('Présent').length).toBeGreaterThan(0);
  });

  it('toggles existing attendance status', async () => {
    // tr2 has existing attendance for p1 as present → click should cycle to absent
    renderAtRoute(<TrainingDetailPage />, {
      initialPath: '/entrainements/tr2',
      routePattern: '/entrainements/:id',
    });
    const lucasBtn = screen.getByText('Lucas Dupont').closest('button')!;
    await userEvent.click(lucasBtn);
    // Should have updated to absent
    expect(screen.getAllByText('Absent').length).toBeGreaterThan(0);
  });

  it('shows training note', () => {
    renderAtRoute(<TrainingDetailPage />, {
      initialPath: '/entrainements/tr3',
      routePattern: '/entrainements/:id',
    });
    expect(screen.getByText(/Séance complémentaire/)).toBeInTheDocument();
  });

  it('falls back to "Entraînement" when no theme', () => {
    // No training in mock has no theme, tr5 has no theme
    renderAtRoute(<TrainingDetailPage />, {
      initialPath: '/entrainements/tr5',
      routePattern: '/entrainements/:id',
    });
    // tr5 has no theme — shows generic "Entraînement"
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Entraînement'
    );
  });
});
