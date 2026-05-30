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
  Contact,
  Match,
  MatchEvent,
  Training,
  TrainingBlock,
  Attendance,
  Lineup,
  Survey,
  SurveyResponse,
  Tournament,
  TournamentGroup,
  Exercise,
  CarpoolOffer,
  Unavailability,
  Injury,
  NotificationPreferences,
  ClubSettings,
} from '../types';
import { MOCK_DATA } from '../data/mock';
import { genId, nowIso } from '../utils/id';
import { CURRENT_USER_ID } from '../constants/session';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationAllowed,
} from '../utils/notifications';

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
  | { type: 'ADD_CONTACT'; contact: Contact }
  | { type: 'UPDATE_CONTACT'; contact: Contact }
  | { type: 'DELETE_CONTACT'; contactId: string }
  | { type: 'ADD_MATCH'; match: Match }
  | { type: 'UPDATE_MATCH'; match: Match }
  | { type: 'ADD_MATCH_EVENT'; event: MatchEvent }
  | { type: 'SET_MATCH_LIVE'; matchId: string; active: boolean }
  | {
      type: 'UPDATE_MATCH_SCORE';
      matchId: string;
      scoreHome: number;
      scoreAway: number;
    }
  | { type: 'ADD_TRAINING'; training: Training }
  | { type: 'UPDATE_TRAINING'; training: Training }
  | { type: 'SET_TRAINING_BLOCKS'; trainingId: string; blocks: TrainingBlock[] }
  | { type: 'SET_ATTENDANCE'; attendance: Attendance }
  | { type: 'SAVE_LINEUP'; lineup: Lineup }
  | { type: 'ADD_SURVEY'; survey: Survey }
  | { type: 'ADD_SURVEY_RESPONSE'; response: SurveyResponse }
  | { type: 'UPDATE_SURVEY_RESPONSE'; response: SurveyResponse }
  | { type: 'ADD_TOURNAMENT'; tournament: Tournament }
  | { type: 'UPDATE_TOURNAMENT'; tournament: Tournament }
  | { type: 'ADD_TOURNAMENT_GROUP'; group: TournamentGroup }
  | { type: 'UPDATE_TOURNAMENT_GROUP'; group: TournamentGroup }
  | { type: 'DELETE_TOURNAMENT_GROUP'; groupId: string }
  | { type: 'ADD_EXERCISE'; exercise: Exercise }
  | { type: 'UPDATE_EXERCISE'; exercise: Exercise }
  | { type: 'DELETE_EXERCISE'; exerciseId: string }
  | { type: 'ADD_CARPOOL_OFFER'; offer: CarpoolOffer }
  | { type: 'DELETE_CARPOOL_OFFER'; offerId: string }
  | { type: 'ADD_UNAVAILABILITY'; unavailability: Unavailability }
  | { type: 'UPDATE_UNAVAILABILITY'; unavailability: Unavailability }
  | { type: 'ADD_INJURY'; injury: Injury }
  | { type: 'UPDATE_INJURY'; injury: Injury }
  | {
      type: 'NOTIFY';
      teamId: string;
      notifType: string;
      message: string;
      relatedId?: string;
      relatedType?: string;
    }
  | { type: 'MARK_NOTIFICATION_READ'; notificationId: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ'; userId: string }
  | {
      type: 'SET_NOTIFICATION_PREFERENCES';
      userId: string;
      preferences: NotificationPreferences;
    }
  | { type: 'SET_CLUB_SETTINGS'; settings: ClubSettings }
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
        players: state.players.map(p =>
          p.id === action.player.id ? action.player : p
        ),
      };

    case 'ADD_CONTACT':
      return { ...state, contacts: [...state.contacts, action.contact] };

    case 'UPDATE_CONTACT':
      return {
        ...state,
        contacts: state.contacts.map(c =>
          c.id === action.contact.id ? action.contact : c
        ),
      };

    case 'DELETE_CONTACT':
      return {
        ...state,
        contacts: state.contacts.filter(c => c.id !== action.contactId),
      };

    case 'ADD_MATCH':
      return { ...state, matches: [...state.matches, action.match] };

    case 'UPDATE_MATCH':
      return {
        ...state,
        matches: state.matches.map(m =>
          m.id === action.match.id ? action.match : m
        ),
      };

    case 'ADD_MATCH_EVENT':
      return { ...state, matchEvents: [...state.matchEvents, action.event] };

    case 'SET_MATCH_LIVE':
      return {
        ...state,
        matches: state.matches.map(m =>
          m.id === action.matchId ? { ...m, liveActive: action.active } : m
        ),
      };

    case 'UPDATE_MATCH_SCORE':
      return {
        ...state,
        matches: state.matches.map(m =>
          m.id === action.matchId
            ? { ...m, scoreHome: action.scoreHome, scoreAway: action.scoreAway }
            : m
        ),
      };

    case 'ADD_TRAINING':
      return { ...state, trainings: [...state.trainings, action.training] };

    case 'UPDATE_TRAINING':
      return {
        ...state,
        trainings: state.trainings.map(t =>
          t.id === action.training.id ? action.training : t
        ),
      };

    case 'SET_TRAINING_BLOCKS':
      return {
        ...state,
        trainingBlocks: [
          ...state.trainingBlocks.filter(
            b => b.trainingId !== action.trainingId
          ),
          ...action.blocks,
        ],
      };

    case 'SET_ATTENDANCE': {
      const existing = state.attendances.findIndex(
        a =>
          a.sessionType === action.attendance.sessionType &&
          a.sessionId === action.attendance.sessionId &&
          a.playerId === action.attendance.playerId
      );
      if (existing >= 0) {
        const updated = [...state.attendances];
        updated[existing] = action.attendance;
        return { ...state, attendances: updated };
      }
      return {
        ...state,
        attendances: [...state.attendances, action.attendance],
      };
    }

    case 'SAVE_LINEUP': {
      const existing = state.lineups.findIndex(l => l.id === action.lineup.id);
      if (existing >= 0) {
        const updated = [...state.lineups];
        updated[existing] = action.lineup;
        return { ...state, lineups: updated };
      }
      return { ...state, lineups: [...state.lineups, action.lineup] };
    }

    case 'ADD_SURVEY':
      return { ...state, surveys: [...state.surveys, action.survey] };

    case 'ADD_SURVEY_RESPONSE':
      return {
        ...state,
        surveyResponses: [...state.surveyResponses, action.response],
      };

    case 'UPDATE_SURVEY_RESPONSE':
      return {
        ...state,
        surveyResponses: state.surveyResponses.map(r =>
          r.id === action.response.id ? action.response : r
        ),
      };

    case 'ADD_UNAVAILABILITY':
      return {
        ...state,
        unavailabilities: [...state.unavailabilities, action.unavailability],
      };

    case 'UPDATE_UNAVAILABILITY':
      return {
        ...state,
        unavailabilities: state.unavailabilities.map(u =>
          u.id === action.unavailability.id ? action.unavailability : u
        ),
      };

    case 'ADD_INJURY':
      return {
        ...state,
        injuries: [...state.injuries, action.injury],
      };

    case 'UPDATE_INJURY':
      return {
        ...state,
        injuries: state.injuries.map(i =>
          i.id === action.injury.id ? action.injury : i
        ),
      };

    case 'ADD_TOURNAMENT':
      return {
        ...state,
        tournaments: [...state.tournaments, action.tournament],
      };

    case 'UPDATE_TOURNAMENT':
      return {
        ...state,
        tournaments: state.tournaments.map(t =>
          t.id === action.tournament.id ? action.tournament : t
        ),
      };

    case 'ADD_TOURNAMENT_GROUP':
      return {
        ...state,
        tournamentGroups: [...state.tournamentGroups, action.group],
      };

    case 'UPDATE_TOURNAMENT_GROUP':
      return {
        ...state,
        tournamentGroups: state.tournamentGroups.map(g =>
          g.id === action.group.id ? action.group : g
        ),
      };

    case 'DELETE_TOURNAMENT_GROUP':
      return {
        ...state,
        tournamentGroups: state.tournamentGroups.filter(
          g => g.id !== action.groupId
        ),
      };

    case 'ADD_EXERCISE':
      return { ...state, exercises: [...state.exercises, action.exercise] };

    case 'UPDATE_EXERCISE':
      return {
        ...state,
        exercises: state.exercises.map(e =>
          e.id === action.exercise.id ? action.exercise : e
        ),
      };

    case 'DELETE_EXERCISE':
      return {
        ...state,
        exercises: state.exercises.filter(e => e.id !== action.exerciseId),
      };

    case 'ADD_CARPOOL_OFFER':
      return {
        ...state,
        carpoolOffers: [...state.carpoolOffers, action.offer],
      };

    case 'DELETE_CARPOOL_OFFER':
      return {
        ...state,
        carpoolOffers: state.carpoolOffers.filter(o => o.id !== action.offerId),
      };

    case 'NOTIFY': {
      // Recipients: coaches and admins attached to the team (specs §16.1),
      // filtered by each user's notification preferences (specs §16.3).
      const recipients = state.users.filter(
        u =>
          u.teamIds.includes(action.teamId) &&
          isNotificationAllowed(
            state.notificationPreferences[u.id],
            action.notifType
          )
      );
      const ts = nowIso();
      const created = recipients.map(u => ({
        id: genId('notif'),
        userId: u.id,
        type: action.notifType,
        message: action.message,
        read: false,
        relatedId: action.relatedId,
        relatedType: action.relatedType,
        createdAt: ts,
      }));
      return { ...state, notifications: [...created, ...state.notifications] };
    }

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.notificationId ? { ...n, read: true } : n
        ),
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.userId === action.userId ? { ...n, read: true } : n
        ),
      };

    case 'SET_NOTIFICATION_PREFERENCES':
      return {
        ...state,
        notificationPreferences: {
          ...state.notificationPreferences,
          [action.userId]: action.preferences,
        },
      };

    case 'SET_CLUB_SETTINGS':
      return { ...state, clubSettings: action.settings };

    case 'RESET_TO_MOCK':
      /* istanbul ignore next */
      return { ...MOCK_DATA, selectedTeamId: MOCK_DATA.teams[0]!.id };

    /* c8 ignore next */
    default:
      return state;
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
  return state.teams.find(t => t.id === state.selectedTeamId) ?? state.teams[0];
}

export function useTeam(teamId: string) {
  const { state } = useAppContext();
  return state.teams.find(t => t.id === teamId);
}

export function usePlayers(teamId?: string) {
  const { state } = useAppContext();
  if (!teamId) return state.players.filter(p => p.active);
  return state.players.filter(
    p =>
      p.active && (p.primaryTeamId === teamId || p.secondaryTeamId === teamId)
  );
}

export function usePlayer(playerId: string) {
  const { state } = useAppContext();
  return state.players.find(p => p.id === playerId);
}

export function useMatches(teamId?: string) {
  const { state } = useAppContext();
  const all = [...state.matches].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  if (!teamId) return all;
  return all.filter(m => m.teamId === teamId);
}

export function useMatch(matchId: string) {
  const { state } = useAppContext();
  return state.matches.find(m => m.id === matchId);
}

export function useMatchEvents(matchId: string) {
  const { state } = useAppContext();
  return state.matchEvents
    .filter(e => e.matchId === matchId)
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
}

export function useTrainings(teamId?: string) {
  const { state } = useAppContext();
  const all = [...state.trainings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  if (!teamId) return all;
  return all.filter(t => t.teamId === teamId);
}

export function useTraining(trainingId: string) {
  const { state } = useAppContext();
  return state.trainings.find(t => t.id === trainingId);
}

export function useAttendances(
  sessionType: 'match' | 'training',
  sessionId: string
) {
  const { state } = useAppContext();
  return state.attendances.filter(
    a => a.sessionType === sessionType && a.sessionId === sessionId
  );
}

export function useLineups(teamId: string) {
  const { state } = useAppContext();
  return state.lineups.filter(l => l.teamId === teamId);
}

export function useSurveys(teamId?: string) {
  const { state } = useAppContext();
  if (!teamId) return state.surveys;
  return state.surveys.filter(s => s.teamId === teamId);
}

export function useSurveyResponses(surveyId: string) {
  const { state } = useAppContext();
  return state.surveyResponses.filter(r => r.surveyId === surveyId);
}

export function useTournaments() {
  const { state } = useAppContext();
  return state.tournaments;
}

export function useTournament(tournamentId: string) {
  const { state } = useAppContext();
  return state.tournaments.find(t => t.id === tournamentId);
}

export function useTournamentGroups(tournamentId: string) {
  const { state } = useAppContext();
  return state.tournamentGroups
    .filter(g => g.tournamentId === tournamentId)
    .sort((a, b) => a.order - b.order);
}

export function useTournamentMatches(tournamentId: string) {
  const { state } = useAppContext();
  return state.matches.filter(m => m.tournamentId === tournamentId);
}

export function useUnavailabilities(playerId?: string) {
  const { state } = useAppContext();
  if (!playerId) return state.unavailabilities;
  return state.unavailabilities.filter(u => u.playerId === playerId);
}

export function useInjuries(playerId?: string) {
  const { state } = useAppContext();
  if (!playerId) return state.injuries;
  return state.injuries.filter(i => i.playerId === playerId);
}

export function usePositionHistory(playerId: string) {
  const { state } = useAppContext();
  return state.positionHistory.filter(h => h.playerId === playerId);
}

export function useExercises() {
  const { state } = useAppContext();
  return state.exercises;
}

export function useTrainingBlocks(trainingId: string) {
  const { state } = useAppContext();
  return state.trainingBlocks
    .filter(b => b.trainingId === trainingId)
    .sort((a, b) => a.order - b.order);
}

export function useCarpoolOffers(matchId: string) {
  const { state } = useAppContext();
  return state.carpoolOffers.filter(o => o.matchId === matchId);
}

export function useContacts() {
  const { state } = useAppContext();
  return state.contacts;
}

export function useContactsForPlayer(playerId: string) {
  const { state } = useAppContext();
  return state.contacts.filter(c => c.playerIds.includes(playerId));
}

export function useCurrentUser() {
  const { state } = useAppContext();
  return state.users.find(u => u.id === CURRENT_USER_ID) ?? state.users[0];
}

export function useNotifications(userId?: string) {
  const { state } = useAppContext();
  const target = userId ?? CURRENT_USER_ID;
  return [...state.notifications]
    .filter(n => n.userId === target)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function useUnreadNotificationCount(userId?: string) {
  const { state } = useAppContext();
  const target = userId ?? CURRENT_USER_ID;
  return state.notifications.filter(n => n.userId === target && !n.read).length;
}

export function useNotificationPreferences(userId?: string) {
  const { state } = useAppContext();
  const target = userId ?? CURRENT_USER_ID;
  return (
    state.notificationPreferences[target] ?? DEFAULT_NOTIFICATION_PREFERENCES
  );
}

export function useClubSettings() {
  const { state } = useAppContext();
  return state.clubSettings;
}
