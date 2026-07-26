import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider, useTrainings } from '../../../store/AppContext';
import { I18nProvider } from '../../../i18n';
import { TrainingFormDialog } from './TrainingFormDialog';

function Harness() {
  const trainings = useTrainings('t1');
  return (
    <>
      <div data-testid="count">{trainings.length}</div>
      <TrainingFormDialog open onClose={() => {}} teamId="t1" />
    </>
  );
}

function renderHarness() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <AppProvider>
          <Harness />
        </AppProvider>
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('TrainingFormDialog — recurrence (§8.2)', () => {
  beforeEach(() => localStorage.clear());

  it('creates a single training by default', async () => {
    renderHarness();
    const before = Number(screen.getByTestId('count').textContent);
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));
    expect(Number(screen.getByTestId('count').textContent)).toBe(before + 1);
  });

  it('generates a weekly series of N occurrences', async () => {
    renderHarness();
    const before = Number(screen.getByTestId('count').textContent);
    const occ = screen.getByLabelText(/Répéter chaque semaine/);
    await userEvent.clear(occ);
    await userEvent.type(occ, '4');
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));
    expect(Number(screen.getByTestId('count').textContent)).toBe(before + 4);
  });
});
