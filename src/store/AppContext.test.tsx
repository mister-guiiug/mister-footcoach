import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';
import {
  AppProvider,
  useAppContext,
  useTeams,
  useSelectedTeam,
  useTeam,
  usePlayers,
  usePlayer,
  useMatches,
  useMatch,
  useMatchEvents,
  useTrainings,
  useTraining,
  useAttendances,
  useLineups,
  useSurveys,
  useSurveyResponses,
  useTournaments,
  useUnavailabilities,
  useInjuries,
  usePositionHistory,
  useExercises,
} from './AppContext';
import { MOCK_DATA } from '../data/mock';
import { SCHEMA_VERSION } from './storage';

const STORAGE_KEY = 'mister-footcoach-data';

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

// ── loadState ────────────────────────────────────────────────────────

describe('loadState', () => {
  beforeEach(() => localStorage.clear());

  it('returns mock data when localStorage is empty', () => {
    const { result } = renderHook(() => useTeams(), { wrapper });
    expect(result.current.length).toBe(MOCK_DATA.teams.length);
  });

  it('returns parsed state when localStorage has valid data', () => {
    const stored = {
      ...MOCK_DATA,
      selectedTeamId: 't2',
      teams: [
        {
          id: 'tx',
          name: 'Stored Team',
          category: 'U11',
          coachId: 'u1',
          seasonId: 's1',
          color: '#000',
        },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const { result } = renderHook(() => useTeams(), { wrapper });
    expect(result.current[0]?.id).toBe('tx');
  });

  it('falls back to mock data when localStorage has invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    const { result } = renderHook(() => useTeams(), { wrapper });
    expect(result.current.length).toBe(MOCK_DATA.teams.length);
  });
});

// ── saveState ────────────────────────────────────────────────────────

describe('saveState', () => {
  beforeEach(() => localStorage.clear());

  // La clé n'a pas bougé, ce qu'elle CONTIENT si : l'état n'est plus écrit nu,
  // il est enveloppé par le magasin versionné (`{ v, data }`). Cette assertion
  // est le seul endroit de la suite qui lisait l'écriture brute — elle lit
  // maintenant l'enveloppe, et le numéro de version avec.
  it('persists state to localStorage on dispatch, inside the versioned envelope', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_SELECTED_TEAM', teamId: 't2' });
    });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as {
      v: number;
      data: { selectedTeamId: string };
    };
    expect(saved.v).toBe(SCHEMA_VERSION);
    expect(saved.data.selectedTeamId).toBe('t2');
  });

  it('silently ignores localStorage write errors', () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    const { result } = renderHook(() => useAppContext(), { wrapper });
    expect(() =>
      act(() =>
        result.current.dispatch({ type: 'SET_SELECTED_TEAM', teamId: 't2' })
      )
    ).not.toThrow();
    setItemSpy.mockRestore();
  });
});

// ── useAppContext outside provider ────────────────────────────────────

describe('useAppContext outside provider', () => {
  it('throws an error', () => {
    // Suppress the expected React error boundary log
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAppContext())).toThrow(
      'useAppContext must be used within AppProvider'
    );
    spy.mockRestore();
  });
});

// ── Reducer actions ───────────────────────────────────────────────────

describe('reducer: SET_SELECTED_TEAM', () => {
  it('changes selectedTeamId', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    act(() =>
      result.current.dispatch({ type: 'SET_SELECTED_TEAM', teamId: 't2' })
    );
    expect(result.current.state.selectedTeamId).toBe('t2');
  });
});

describe('reducer: ADD_PLAYER / UPDATE_PLAYER', () => {
  beforeEach(() => localStorage.clear());

  it('ADD_PLAYER appends a new player', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const before = result.current.state.players.length;
    act(() =>
      result.current.dispatch({
        type: 'ADD_PLAYER',
        player: {
          id: 'pNEW',
          firstName: 'Test',
          lastName: 'Player',
          dateOfBirth: '2013-01-01',
          primaryTeamId: 't1',
          preferredPosition: 'AT',
          appetences: {},
          active: true,
        },
      })
    );
    expect(result.current.state.players).toHaveLength(before + 1);
  });

  it('UPDATE_PLAYER replaces an existing player', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const existing = result.current.state.players[0];
    if (!existing) throw new Error('fixture : aucun joueur seedé');
    act(() =>
      result.current.dispatch({
        type: 'UPDATE_PLAYER',
        player: { ...existing, firstName: 'Updated' },
      })
    );
    expect(result.current.state.players[0]?.firstName).toBe('Updated');
  });
});

describe('reducer: ADD_MATCH_EVENT', () => {
  it('appends a new event', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const before = result.current.state.matchEvents.length;
    act(() =>
      result.current.dispatch({
        type: 'ADD_MATCH_EVENT',
        event: { id: 'evNEW', matchId: 'm1', type: 'but', minute: 5 },
      })
    );
    expect(result.current.state.matchEvents).toHaveLength(before + 1);
  });
});

describe('reducer: SET_MATCH_LIVE / UPDATE_MATCH_SCORE', () => {
  it('SET_MATCH_LIVE toggles liveActive', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    act(() =>
      result.current.dispatch({
        type: 'SET_MATCH_LIVE',
        matchId: 'm1',
        active: true,
      })
    );
    expect(
      result.current.state.matches.find(m => m.id === 'm1')?.liveActive
    ).toBe(true);
  });

  it('UPDATE_MATCH_SCORE sets both scores', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    act(() =>
      result.current.dispatch({
        type: 'UPDATE_MATCH_SCORE',
        matchId: 'm1',
        scoreHome: 3,
        scoreAway: 1,
      })
    );
    const m = result.current.state.matches.find(m => m.id === 'm1');
    expect(m?.scoreHome).toBe(3);
    expect(m?.scoreAway).toBe(1);
  });
});

describe('reducer: ADD_TRAINING / UPDATE_TRAINING', () => {
  it('ADD_TRAINING appends', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const before = result.current.state.trainings.length;
    act(() =>
      result.current.dispatch({
        type: 'ADD_TRAINING',
        training: {
          id: 'trNEW',
          teamId: 't1',
          date: '2026-06-01',
          time: '18:00',
          duration: 90,
          type: 'regulier',
          cancelled: false,
        },
      })
    );
    expect(result.current.state.trainings).toHaveLength(before + 1);
  });

  it('UPDATE_TRAINING replaces existing', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const existing = result.current.state.trainings[0];
    if (!existing) throw new Error('fixture : aucun entraînement seedé');
    act(() =>
      result.current.dispatch({
        type: 'UPDATE_TRAINING',
        training: { ...existing, theme: 'Updated theme' },
      })
    );
    expect(
      result.current.state.trainings.find(t => t.id === existing.id)?.theme
    ).toBe('Updated theme');
  });
});

describe('reducer: SET_ATTENDANCE', () => {
  it('adds new attendance when none exists', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const before = result.current.state.attendances.length;
    act(() =>
      result.current.dispatch({
        type: 'SET_ATTENDANCE',
        attendance: {
          id: 'attNEW',
          sessionType: 'training',
          sessionId: 'trNEW',
          playerId: 'p1',
          status: 'present',
        },
      })
    );
    expect(result.current.state.attendances).toHaveLength(before + 1);
  });

  it('updates existing attendance (same session + player)', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    // First add an attendance
    act(() =>
      result.current.dispatch({
        type: 'SET_ATTENDANCE',
        attendance: {
          id: 'attUPD',
          sessionType: 'training',
          sessionId: 'tr2',
          playerId: 'p1',
          status: 'present',
        },
      })
    );
    const before = result.current.state.attendances.length;
    // Update same session/player combo
    act(() =>
      result.current.dispatch({
        type: 'SET_ATTENDANCE',
        attendance: {
          id: 'attUPD',
          sessionType: 'training',
          sessionId: 'tr2',
          playerId: 'p1',
          status: 'absent',
        },
      })
    );
    expect(result.current.state.attendances).toHaveLength(before);
    expect(
      result.current.state.attendances.find(
        a =>
          a.sessionType === 'training' &&
          a.sessionId === 'tr2' &&
          a.playerId === 'p1'
      )?.status
    ).toBe('absent');
  });
});

describe('reducer: SAVE_LINEUP', () => {
  const newLineup = {
    id: 'lNEW',
    teamId: 't1',
    name: 'New',
    formation: '2-3-2',
    slots: [],
    substituteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('adds new lineup when id does not exist', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const before = result.current.state.lineups.length;
    act(() =>
      result.current.dispatch({ type: 'SAVE_LINEUP', lineup: newLineup })
    );
    expect(result.current.state.lineups).toHaveLength(before + 1);
  });

  it('updates existing lineup when id matches', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    act(() =>
      result.current.dispatch({ type: 'SAVE_LINEUP', lineup: newLineup })
    );
    const before = result.current.state.lineups.length;
    act(() =>
      result.current.dispatch({
        type: 'SAVE_LINEUP',
        lineup: { ...newLineup, name: 'Updated Name' },
      })
    );
    expect(result.current.state.lineups).toHaveLength(before);
    expect(result.current.state.lineups.find(l => l.id === 'lNEW')?.name).toBe(
      'Updated Name'
    );
  });
});

describe('reducer: survey responses', () => {
  it('ADD_SURVEY_RESPONSE appends', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const before = result.current.state.surveyResponses.length;
    act(() =>
      result.current.dispatch({
        type: 'ADD_SURVEY_RESPONSE',
        response: { id: 'srNEW', surveyId: 'sv1', playerId: 'p5' },
      })
    );
    expect(result.current.state.surveyResponses).toHaveLength(before + 1);
  });

  it('UPDATE_SURVEY_RESPONSE replaces existing', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const existing = result.current.state.surveyResponses[0];
    if (!existing)
      throw new Error('fixture : aucune réponse de sondage seedée');
    act(() =>
      result.current.dispatch({
        type: 'UPDATE_SURVEY_RESPONSE',
        response: { ...existing, confirmationParent: 'absent' },
      })
    );
    expect(
      result.current.state.surveyResponses.find(r => r.id === existing.id)
        ?.confirmationParent
    ).toBe('absent');
  });
});

describe('reducer: ADD_UNAVAILABILITY / ADD_INJURY', () => {
  it('ADD_UNAVAILABILITY appends', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const before = result.current.state.unavailabilities.length;
    act(() =>
      result.current.dispatch({
        type: 'ADD_UNAVAILABILITY',
        unavailability: {
          id: 'uvNEW',
          playerId: 'p5',
          startDate: '2026-05-01',
          motif: 'maladie',
          declaredBy: 'u1',
        },
      })
    );
    expect(result.current.state.unavailabilities).toHaveLength(before + 1);
  });

  it('ADD_INJURY appends', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    const before = result.current.state.injuries.length;
    act(() =>
      result.current.dispatch({
        type: 'ADD_INJURY',
        injury: {
          id: 'injNEW',
          playerId: 'p5',
          zone: 'Genou',
          nature: 'Contusion',
          startDate: '2026-05-01',
          status: 'apte',
        },
      })
    );
    expect(result.current.state.injuries).toHaveLength(before + 1);
  });
});

describe('reducer: RESET_TO_MOCK', () => {
  it('restores original mock data', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    act(() =>
      result.current.dispatch({ type: 'SET_SELECTED_TEAM', teamId: 't2' })
    );
    act(() => result.current.dispatch({ type: 'RESET_TO_MOCK' }));
    expect(result.current.state.selectedTeamId).toBe(MOCK_DATA.teams[0]?.id);
    expect(result.current.state.teams).toHaveLength(MOCK_DATA.teams.length);
  });
});

// ── Selector hooks ────────────────────────────────────────────────────

describe('selector hooks', () => {
  beforeEach(() => localStorage.clear());

  it('useTeams returns all teams', () => {
    const { result } = renderHook(() => useTeams(), { wrapper });
    expect(result.current).toHaveLength(MOCK_DATA.teams.length);
  });

  it('useSelectedTeam returns the currently selected team', () => {
    const { result } = renderHook(() => useSelectedTeam(), { wrapper });
    expect(result.current?.id).toBe(MOCK_DATA.teams[0]?.id);
  });

  it('useSelectedTeam falls back to first team when selectedTeamId not found', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...MOCK_DATA,
        selectedTeamId: 'nonexistent',
      })
    );
    const { result } = renderHook(() => useSelectedTeam(), { wrapper });
    expect(result.current?.id).toBe(MOCK_DATA.teams[0]?.id);
  });

  it('useTeam returns undefined for unknown id', () => {
    const { result } = renderHook(() => useTeam('unknown'), { wrapper });
    expect(result.current).toBeUndefined();
  });

  it('usePlayers without teamId returns all active players', () => {
    const { result } = renderHook(() => usePlayers(), { wrapper });
    expect(result.current.length).toBeGreaterThan(0);
    result.current.forEach(p => expect(p.active).toBe(true));
  });

  it('usePlayers with teamId returns primary + secondary players', () => {
    const { result } = renderHook(() => usePlayers('t2'), { wrapper });
    result.current.forEach(p =>
      expect(p.primaryTeamId === 't2' || p.secondaryTeamId === 't2').toBe(true)
    );
  });

  it('usePlayer returns undefined for unknown id', () => {
    const { result } = renderHook(() => usePlayer('unknown'), { wrapper });
    expect(result.current).toBeUndefined();
  });

  it('useMatches without teamId returns all matches sorted descending', () => {
    const { result } = renderHook(() => useMatches(), { wrapper });
    expect(result.current.length).toBeGreaterThan(0);
    for (let i = 1; i < result.current.length; i++) {
      expect(
        (result.current[i - 1]?.date ?? '') >= (result.current[i]?.date ?? '')
      ).toBe(true);
    }
  });

  it('useMatches with teamId filters to that team', () => {
    const { result } = renderHook(() => useMatches('t1'), { wrapper });
    result.current.forEach(m => expect(m.teamId).toBe('t1'));
  });

  it('useMatch returns undefined for unknown id', () => {
    const { result } = renderHook(() => useMatch('unknown'), { wrapper });
    expect(result.current).toBeUndefined();
  });

  it('useMatchEvents filters by matchId and sorts by minute', () => {
    const { result } = renderHook(() => useMatchEvents('m2'), { wrapper });
    for (let i = 1; i < result.current.length; i++) {
      expect(
        (result.current[i - 1]?.minute ?? 0) <= (result.current[i]?.minute ?? 0)
      ).toBe(true);
    }
  });

  it('useTrainings without teamId returns all sorted descending', () => {
    const { result } = renderHook(() => useTrainings(), { wrapper });
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('useTrainings with teamId filters', () => {
    const { result } = renderHook(() => useTrainings('t1'), { wrapper });
    result.current.forEach(t => expect(t.teamId).toBe('t1'));
  });

  it('useTraining returns undefined for unknown id', () => {
    const { result } = renderHook(() => useTraining('unknown'), { wrapper });
    expect(result.current).toBeUndefined();
  });

  it('useAttendances filters by sessionType and sessionId', () => {
    const { result } = renderHook(() => useAttendances('training', 'tr2'), {
      wrapper,
    });
    result.current.forEach(a => {
      expect(a.sessionType).toBe('training');
      expect(a.sessionId).toBe('tr2');
    });
  });

  it('useLineups filters by teamId', () => {
    const { result } = renderHook(() => useLineups('t1'), { wrapper });
    result.current.forEach(l => expect(l.teamId).toBe('t1'));
  });

  it('useSurveys without teamId returns all', () => {
    const { result } = renderHook(() => useSurveys(), { wrapper });
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('useSurveys with teamId filters', () => {
    const { result } = renderHook(() => useSurveys('t1'), { wrapper });
    result.current.forEach(s => expect(s.teamId).toBe('t1'));
  });

  it('useSurveyResponses filters by surveyId', () => {
    const { result } = renderHook(() => useSurveyResponses('sv1'), { wrapper });
    result.current.forEach(r => expect(r.surveyId).toBe('sv1'));
  });

  it('useTournaments returns all tournaments', () => {
    const { result } = renderHook(() => useTournaments(), { wrapper });
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('useUnavailabilities without playerId returns all', () => {
    const { result } = renderHook(() => useUnavailabilities(), { wrapper });
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('useUnavailabilities with playerId filters', () => {
    const { result } = renderHook(() => useUnavailabilities('p4'), { wrapper });
    result.current.forEach(u => expect(u.playerId).toBe('p4'));
  });

  it('useInjuries without playerId returns all', () => {
    const { result } = renderHook(() => useInjuries(), { wrapper });
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('useInjuries with playerId filters', () => {
    const { result } = renderHook(() => useInjuries('p4'), { wrapper });
    result.current.forEach(i => expect(i.playerId).toBe('p4'));
  });

  it('usePositionHistory filters by playerId', () => {
    const { result } = renderHook(() => usePositionHistory('p8'), { wrapper });
    result.current.forEach(h => expect(h.playerId).toBe('p8'));
  });

  it('useExercises returns all exercises', () => {
    const { result } = renderHook(() => useExercises(), { wrapper });
    expect(result.current.length).toBeGreaterThan(0);
  });
});
