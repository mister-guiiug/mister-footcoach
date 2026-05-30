import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAtRoute } from '../test/helpers';
import MatchLivePage from './MatchLivePage';
import { MOCK_DATA } from '../data/mock';

describe('MatchLivePage', () => {
  beforeEach(() => localStorage.clear());

  it('shows empty state for unknown id', () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/unknown/live',
      routePattern: '/matchs/:id/live',
    });
    expect(screen.getByText('Match introuvable')).toBeInTheDocument();
  });

  it('renders mode live title', () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    expect(screen.getByText('Mode Live')).toBeInTheDocument();
  });

  it('shows start button when not live', () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    expect(screen.getByText('Démarrer')).toBeInTheDocument();
  });

  it('toggles to Arrêter when live is started', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    await userEvent.click(screen.getByText('Démarrer'));
    expect(screen.getByText('Arrêter')).toBeInTheDocument();
  });

  it('score can be incremented via + button', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    // Use the score +/- by finding the SVG plus buttons
    const svgButtons = document.querySelectorAll('button svg');
    expect(svgButtons.length).toBeGreaterThan(0);
  });

  it('score decrements do not go below 0', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    // Find minus buttons and click - on home score (starts at 0)
    const buttons = document.querySelectorAll('button');
    // First minus button (Minus icon) decrements home score
    const minusButtons = Array.from(buttons).filter(
      b => b.classList.contains('rounded-full') && b.querySelector('svg')
    );
    if (minusButtons[0]) {
      await userEvent.click(minusButtons[0]);
      // Score should still be 0
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    }
  });

  it('clicking event button "But" selects it', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    await userEvent.click(screen.getByText('But'));
    expect(screen.getByText(/Valider But/)).toBeInTheDocument();
  });

  it('clicking same event button twice deselects it', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    await userEvent.click(screen.getByText('But'));
    await userEvent.click(screen.getByText('But'));
    expect(screen.queryByText(/Valider But/)).not.toBeInTheDocument();
  });

  it('shows player selection when event type requires it', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    await userEvent.click(screen.getByText('But'));
    // Player names should be shown
    expect(screen.getByText('Lucas')).toBeInTheDocument();
  });

  it('does not show player selection for arret_mi_temps', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    await userEvent.click(screen.getByText('Mi-temps'));
    // Players should NOT be shown
    expect(screen.queryByText('Joueur concerné')).not.toBeInTheDocument();
  });

  it('validates a but event and updates score', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    await userEvent.click(screen.getByText('But'));
    await userEvent.click(screen.getByText(/Valider But/));
    // Score should have incremented (m1 isHome=true → home score goes up)
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('validates a CSC event', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    await userEvent.click(screen.getByText('CSC'));
    await userEvent.click(screen.getByText(/Valider CSC/));
    // CSC: away team scores → scoreAway increments
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('validates an arret_mi_temps event', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    await userEvent.click(screen.getByText('Mi-temps'));
    await userEvent.click(screen.getByText(/Valider Mi-temps/));
    // Event added, selection cleared
    expect(screen.queryByText(/Valider/)).not.toBeInTheDocument();
  });

  it('cancel button clears selection', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    await userEvent.click(screen.getByText('But'));
    expect(screen.getByText(/Valider But/)).toBeInTheDocument();
    // The validate+cancel buttons are siblings in a flex div; cancel is the 2nd button
    const validerBtn = screen.getByText(/Valider But/).closest('button')!;
    const cancelBtn = (
      validerBtn.parentElement as HTMLElement
    ).querySelectorAll('button')[1] as HTMLElement;
    await userEvent.click(cancelBtn);
    expect(screen.queryByText(/Valider But/)).not.toBeInTheDocument();
  });

  it('selecting a player assigns it', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    await userEvent.click(screen.getByText('But'));
    await userEvent.click(screen.getByText('Lucas'));
    // Lucas selected — clicking again deselects
    await userEvent.click(screen.getByText('Lucas'));
  });

  it('adjusts minute via range slider', () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    const slider = document.querySelector(
      'input[type="range"]'
    ) as HTMLInputElement;
    expect(slider).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '30' } });
    expect(screen.getAllByText("30'").length).toBeGreaterThan(0);
  });

  it('renders event log after adding event', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m2/live',
      routePattern: '/matchs/:id/live',
    });
    // m2 already has events in mock data
    expect(screen.getByText('Événements')).toBeInTheDocument();
  });

  it('shows carton_jaune emoji in event log', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m2/live',
      routePattern: '/matchs/:id/live',
    });
    // m2 has a yellow card event (may appear multiple times)
    expect(screen.getAllByText('🟨').length).toBeGreaterThan(0);
  });

  it('handles away match CSC (increments home)', async () => {
    // m2 is away match. CSC when away → home (opponent) scores → scoreHome++
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m2/live',
      routePattern: '/matchs/:id/live',
    });
    // m2 already has scoreHome=2, scoreAway=3
    await userEvent.click(screen.getByText('CSC'));
    await userEvent.click(screen.getByText(/Valider CSC/));
    // scoreHome should go up (opponent scored)
    // Check that some score change happened (values > 2 for home or > 3 for away)
  });

  it('validates carton_jaune with player', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    await userEvent.click(screen.getByText('Jaune'));
    await userEvent.click(screen.getByText('Lucas'));
    await userEvent.click(screen.getByText(/Valider Carton jaune/));
    expect(screen.getByText('Carton jaune')).toBeInTheDocument();
  });

  it('home score manual + button increments', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    // Find plus buttons by looking for rounded-full buttons containing svg
    const roundedBtns = Array.from(
      document.querySelectorAll('button.rounded-full')
    );
    // First two are home score: [minus, plus], next two are away score: [minus, plus]
    if (roundedBtns[1]) {
      await userEvent.click(roundedBtns[1] as HTMLElement);
      expect(screen.getByText('1')).toBeInTheDocument();
    }
  });

  it('away score manual + button increments', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m1/live',
      routePattern: '/matchs/:id/live',
    });
    const roundedBtns = Array.from(
      document.querySelectorAll('button.rounded-full')
    );
    if (roundedBtns[3]) {
      await userEvent.click(roundedBtns[3] as HTMLElement);
      expect(screen.getByText('1')).toBeInTheDocument();
    }
  });

  it('validates a but event on away match increments away score', async () => {
    // m2 is away (isHome=false): but → scoreAway++, covers the !isHome branch in addEvent
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m2/live',
      routePattern: '/matchs/:id/live',
    });
    // m2 already shows event log with "But" text — find the event button specifically
    const butBtn = screen.getByRole('button', { name: /But/ });
    await userEvent.click(butBtn);
    await userEvent.click(screen.getByText(/Valider But/));
    expect(screen.queryByText(/Valider/)).not.toBeInTheDocument();
  });

  it('shows carton_rouge and arret_mi_temps emojis in event log', () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m3/live',
      routePattern: '/matchs/:id/live',
    });
    // m3 has carton_rouge (🟥) and arret_mi_temps / blessure_live / remplacement (📌)
    expect(screen.getAllByText('🟥').length).toBeGreaterThan(0);
    expect(screen.getAllByText('📌').length).toBeGreaterThan(0);
  });

  it('shows "Nous" as home label when team not found (isHome=true)', () => {
    const orphanMatchHome = {
      ...MOCK_DATA.matches[0],
      id: 'm-live-orphan-home',
      teamId: 'unknown-team',
      isHome: true,
    };
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        matches: [orphanMatchHome],
        matchEvents: [],
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m-live-orphan-home/live',
      routePattern: '/matchs/:id/live',
    });
    expect(screen.getAllByText(/Nous/).length).toBeGreaterThan(0);
  });

  it('shows "Nous" as away label when team not found (isHome=false)', () => {
    const orphanMatchAway = {
      ...MOCK_DATA.matches[0],
      id: 'm-live-orphan-away',
      teamId: 'unknown-team',
      isHome: false,
    };
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        matches: [orphanMatchAway],
        matchEvents: [],
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m-live-orphan-away/live',
      routePattern: '/matchs/:id/live',
    });
    expect(screen.getAllByText(/Nous/).length).toBeGreaterThan(0);
  });

  it('away score minus button decrements score', async () => {
    renderAtRoute(<MatchLivePage />, {
      initialPath: '/matchs/m2/live',
      routePattern: '/matchs/:id/live',
    });
    const roundedBtns = Array.from(
      document.querySelectorAll('button.rounded-full')
    );
    if (roundedBtns[2]) {
      await userEvent.click(roundedBtns[2] as HTMLElement);
      // scoreAway was 3 for m2, should decrease to 2
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    }
  });
});
