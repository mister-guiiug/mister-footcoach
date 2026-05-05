import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  AppData,
  Player,
  Match,
  MatchEvent,
  Training,
  Attendance,
  Lineup,
  Survey,
  SurveyResponse,
  Unavailability,
  Injury,
} from '../types';
import { MOCK_DATA } from '../data/mock';

const STORAGE_KEY = 'mister-footcoach-data';

// ── State ────────────────────────────────────────────────────────────

interface AppState extends AppData {
  selectedTeamId: string;
}

// ── Actions ──────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_SELECTED_TEAM'; teamId: string }
  | { type: 'ADD_PLAYER'; player: Player }
  | { type: 'UPDATE_PLAYER'; player: Player }
  | { type: 'ADD_MATCH_EVENT'; event: MatchEvent }
  | { type: 'SET_MATCH_LIVE'; matchId: string; active: boolean }
  | { type: 'UPDATE_MATCH_SCORE'; matchId: string; scoreHome: number; scoreAway: number }
  | { type: 'ADD_TRAINING'; training: Training }
  | { type: 'UPDATE_TRAINING'; training: Training }
  | { type: 'SET_ATTENDANCE'; attendance: Attendance }
  | { type: 'SAVE_LINEUP'; lineup: Lineup }
  | { type: 'ADD_SURVEY_RESPONSE'; response: SurveyResponse }
  | { type: 'UPDATE_SURVEY_RESPONSE'; response: SurveyResponse }
  | { type: 'ADD_UNAVAILABILITY'; unavailability: Unavailability }
  | { type: 'ADD_INJURY'; injury: Injury }
  | { type: 'RESET_TO_MOCK' };

// ── Reducer ───────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SELECTED_TEAM':
      return { ...state, selectedTeamId: action.teamId };

    case 'ADD_PLAYER':
      return { ...state, players: [...state.players, action.player] };

    case 'UPDATE_PLAYER':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.player.id ? action.player : p,
        ),
      };

    case 'ADD_MATCH_EVENT':
      return { ...state, matchEvents: [...state.matchEvents, action.event] };

    case 'SET_MATCH_LIVE':
      return {
        ...state,
        matches: state.matches.map((m) =>
          m.id === action.matchId ? { ...m, liveActive: action.active } : m,
        ),
      };

    case 'UPDATE_MATCH_SCORE':
      return {
        ...state,
        matches: state.matches.map((m) =>
          m.id === action.matchId
            ? { ...m, scoreHome: action.scoreHome, scoreAway: action.scoreAway }
            : m,
        ),
      };

    case 'ADD_TRAINING':
      return { ...state, trainings: [...state.trainings, action.training] };

    case 'UPDATE_TRAINING':
      return {
        ...state,
        trainings: state.trainings.map((t) =>
          t.id === action.training.id ? action.training : t,
        ),
      };

    case 'SET_ATTENDANCE': {
      const existing = state.attendances.findIndex(
        (a) =>
          a.sessionType === action.attendance.sessionType &&
          a.sessionId === action.attendance.sessionId &&
          a.playerId === action.attendance.playerId,
      );
      if (existing >= 0) {
        const updated = [...state.attendances];
        updated[existing] = action.attendance;
        return { ...state, attendances: updated };
      }
      return { ...state, attendances: [...state.attendances, action.attendance] };
    }

    case 'SAVE_LINEUP': {
      const existing = state.lineups.findIndex((l) => l.id === action.lineup.id);
      if (existing >= 0) {
        const updated = [...state.lineups];
        updated[existing] = action.lineup;
        return { ...state, lineups: updated };
      }
      return { ...state, lineups: [...state.lineups, action.lineup] };
    }

    case 'ADD_SURVEY_RESPONSE':
      return {
        ...state,
        surveyResponses: [...state.surveyResponses, action.response],
      };

    case 'UPDATE_SURVEY_RESPONSE':
      return {
        ...state,
        surveyResponses: state.surveyResponses.map((r) =>
          r.id === action.response.id ? action.response : r,
        ),
      };

    case 'ADD_UNAVAILABILITY':
      return {
        ...state,
        unavailabilities: [...state.unavailabilities, action.unavailability],
      };

    case 'ADD_INJURY':
      return {
        ...state,
        injuries: [...state.injuries, action.injury],
      };

    case 'RESET_TO_MOCK':
      /* istanbul ignore next */
      return { ...MOCK_DATA, selectedTeamId: MOCK_DATA.teams[0]!.id };

    /* c8 ignore next */
    default: return state;
  }
}

// ── Persistence ───────────────────────────────────────────────────────

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      return parsed;
    }
  } catch {
    // ignore
  }
  return { ...MOCK_DATA, selectedTeamId: MOCK_DATA.teams[0]!.id };
}

function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// ── Context ───────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

// ── Selector hooks ────────────────────────────────────────────────────

export function useTeams() {
  const { state } = useAppContext();
  return state.teams;
}

export function useSelectedTeam() {
  const { state } = useAppContext();
  return state.teams.find((t) => t.id === state.selectedTeamId) ?? state.teams[0];
}

export function useTeam(teamId: string) {
  const { state } = useAppContext();
  return state.teams.find((t) => t.id === teamId);
}

export function usePlayers(teamId?: string) {
  const { state } = useAppContext();
  if (!teamId) return state.players.filter((p) => p.active);
  return state.players.filter(
    (p) => p.active && (p.primaryTeamId === teamId || p.secondaryTeamId === teamId),
  );
}

export function usePlayer(playerId: string) {
  const { state } = useAppContext();
  return state.players.find((p) => p.id === playerId);
}

export function useMatches(teamId?: string) {
  const { state } = useAppContext();
  const all = [...state.matches].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  if (!teamId) return all;
  return all.filter((m) => m.teamId === teamId);
}

export function useMatch(matchId: string) {
  const { state } = useAppContext();
  return state.matches.find((m) => m.id === matchId);
}

export function useMatchEvents(matchId: string) {
  const { state } = useAppContext();
  return state.matchEvents
    .filter((e) => e.matchId === matchId)
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
}

export function useTrainings(teamId?: string) {
  const { state } = useAppContext();
  const all = [...state.trainings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  if (!teamId) return all;
  return all.filter((t) => t.teamId === teamId);
}

export function useTraining(trainingId: string) {
  const { state } = useAppContext();
  return state.trainings.find((t) => t.id === trainingId);
}

export function useAttendances(sessionType: 'match' | 'training', sessionId: string) {
  const { state } = useAppContext();
  return state.attendances.filter(
    (a) => a.sessionType === sessionType && a.sessionId === sessionId,
  );
}

export function useLineups(teamId: string) {
  const { state } = useAppContext();
  return state.lineups.filter((l) => l.teamId === teamId);
}

export function useSurveys(teamId?: string) {
  const { state } = useAppContext();
  if (!teamId) return state.surveys;
  return state.surveys.filter((s) => s.teamId === teamId);
}

export function useSurveyResponses(surveyId: string) {
  const { state } = useAppContext();
  return state.surveyResponses.filter((r) => r.surveyId === surveyId);
}

export function useTournaments() {
  const { state } = useAppContext();
  return state.tournaments;
}

export function useUnavailabilities(playerId?: string) {
  const { state } = useAppContext();
  if (!playerId) return state.unavailabilities;
  return state.unavailabilities.filter((u) => u.playerId === playerId);
}

export function useInjuries(playerId?: string) {
  const { state } = useAppContext();
  if (!playerId) return state.injuries;
  return state.injuries.filter((i) => i.playerId === playerId);
}

export function usePositionHistory(playerId: string) {
  const { state } = useAppContext();
  return state.positionHistory.filter((h) => h.playerId === playerId);
}

export function useExercises() {
  const { state } = useAppContext();
  return state.exercises;
}
