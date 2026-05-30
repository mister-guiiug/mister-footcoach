import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider, useSurveys } from '../../../store/AppContext';
import { MatchFormDialog } from './MatchFormDialog';

function Harness() {
  const surveys = useSurveys('t1');
  return (
    <>
      <div data-testid="survey-count">{surveys.length}</div>
      <MatchFormDialog open onClose={() => {}} teamId="t1" />
    </>
  );
}

function renderHarness() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Harness />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('MatchFormDialog — auto survey (RG-SONDAGE-04)', () => {
  beforeEach(() => localStorage.clear());

  it('checks the presence-survey box by default (club setting on)', () => {
    renderHarness();
    expect(
      screen.getByRole('checkbox', { name: /sondage de présence/i })
    ).toBeChecked();
  });

  it('creates a survey alongside the match when checked', async () => {
    renderHarness();
    const before = Number(screen.getByTestId('survey-count').textContent);

    await userEvent.type(screen.getByLabelText('Adversaire'), 'FC Test');
    await userEvent.type(screen.getByLabelText('Lieu / terrain'), 'Stade Test');
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));

    expect(Number(screen.getByTestId('survey-count').textContent)).toBe(
      before + 1
    );
  });

  it('does not create a survey when the box is unchecked', async () => {
    renderHarness();
    const before = Number(screen.getByTestId('survey-count').textContent);

    await userEvent.click(
      screen.getByRole('checkbox', { name: /sondage de présence/i })
    );
    await userEvent.type(screen.getByLabelText('Adversaire'), 'FC Test');
    await userEvent.type(screen.getByLabelText('Lieu / terrain'), 'Stade Test');
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));

    expect(Number(screen.getByTestId('survey-count').textContent)).toBe(before);
  });
});
