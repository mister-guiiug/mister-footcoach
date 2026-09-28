import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAtRoute } from '../test/helpers';
import TrainingDetailPage from './TrainingDetailPage';

/** The figure shown above a counter label of the attendance sheet. */
function counter(label: string): string | null | undefined {
  return screen.getByText(label, { selector: 'p' }).previousElementSibling
    ?.textContent;
}

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

  it('cycles attendance status on player click, starting from « Non saisi »', async () => {
    renderAtRoute(<TrainingDetailPage />, {
      initialPath: '/entrainements/tr1',
      routePattern: '/entrainements/:id',
    });
    const lucasBtn = screen.getByText('Lucas Dupont').closest('button')!;
    // tr1 has no attendance: nothing is shown as present.
    expect(within(lucasBtn).getByText('Non saisi')).toBeInTheDocument();
    // Non saisi → présent (it used to jump straight to absent)
    await userEvent.click(lucasBtn);
    expect(within(lucasBtn).getByText('Présent')).toBeInTheDocument();
    // présent → absent → excusé → présent
    await userEvent.click(lucasBtn);
    expect(within(lucasBtn).getByText('Absent')).toBeInTheDocument();
    await userEvent.click(lucasBtn);
    expect(within(lucasBtn).getByText('Excusé')).toBeInTheDocument();
    await userEvent.click(lucasBtn);
    expect(within(lucasBtn).getByText('Présent')).toBeInTheDocument();
  });

  it('shows unrecorded players as « Non saisi », counted apart', () => {
    renderAtRoute(<TrainingDetailPage />, {
      initialPath: '/entrainements/tr1',
      routePattern: '/entrainements/:id',
    });
    const rows = screen.getAllByRole('listitem');
    expect(rows.length).toBe(11);
    expect(screen.queryAllByText('Présent')).toHaveLength(0);
    expect(screen.getAllByText('Non saisi')).toHaveLength(11);
    expect(counter('Non saisis')).toBe('11');
    expect(counter('Présents')).toBe('0');
  });

  it('marks the others present in one gesture, after the absentees', async () => {
    renderAtRoute(<TrainingDetailPage />, {
      initialPath: '/entrainements/tr1',
      routePattern: '/entrainements/:id',
    });
    // The coach taps only the absentee: présent, then absent.
    const lucasBtn = screen.getByText('Lucas Dupont').closest('button')!;
    await userEvent.click(lucasBtn);
    await userEvent.click(lucasBtn);
    expect(within(lucasBtn).getByText('Absent')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Marquer les autres présents (10)' })
    );
    expect(counter('Présents')).toBe('10');
    expect(counter('Absents')).toBe('1');
    expect(counter('Non saisis')).toBe('0');
    expect(within(lucasBtn).getByText('Absent')).toBeInTheDocument();
    // Nothing left to mark: the button goes away.
    expect(
      screen.queryByRole('button', { name: /Marquer les autres présents/ })
    ).not.toBeInTheDocument();
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
