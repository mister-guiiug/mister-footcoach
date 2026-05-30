export type Role = 'admin' | 'coach' | 'parent';

export type Position =
  | 'GK'
  | 'DD'
  | 'DC'
  | 'DG'
  | 'MD'
  | 'MC'
  | 'MO'
  | 'ATD'
  | 'ATG'
  | 'AT';

export const POSITION_LABELS: Record<Position, string> = {
  GK: 'Gardien',
  DD: 'Défenseur Droit',
  DC: 'Défenseur Central',
  DG: 'Défenseur Gauche',
  MD: 'Milieu Défensif',
  MC: 'Milieu Central',
  MO: 'Meneur de Jeu',
  ATD: 'Ailier Droit',
  ATG: 'Ailier Gauche',
  AT: 'Attaquant',
};

export type ContactType =
  | 'père'
  | 'mère'
  | 'beau-père'
  | 'belle-mère'
  | 'tuteur'
  | 'autre';

export type MatchStatus =
  | 'previsionnel'
  | 'engage'
  | 'saison'
  | 'tournoi'
  | 'annule';

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  previsionnel: 'Prévisionnel',
  engage: 'Engagé',
  saison: 'Saison',
  tournoi: 'Tournoi',
  annule: 'Annulé',
};

export type AttendanceStatus = 'present' | 'absent' | 'excuse';

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Présent',
  absent: 'Absent',
  excuse: 'Excusé',
};

export type TrainingType = 'regulier' | 'exceptionnel';

export type InjuryStatus = 'en_reeduc' | 'reprise_progressive' | 'apte';

export const INJURY_STATUS_LABELS: Record<InjuryStatus, string> = {
  en_reeduc: 'En rééducation',
  reprise_progressive: 'Reprise progressive',
  apte: 'Apte',
};

export type UnavailabilityMotif =
  | 'blessure'
  | 'maladie'
  | 'vacances'
  | 'suspension'
  | 'personnel'
  | 'autre';

export const UNAVAILABILITY_MOTIF_LABELS: Record<UnavailabilityMotif, string> =
  {
    blessure: 'Blessure',
    maladie: 'Maladie',
    vacances: 'Vacances',
    suspension: 'Suspension',
    personnel: 'Personnel',
    autre: 'Autre',
  };

export type SurveyResponseValue = 'present' | 'absent' | 'incertain';

export const SURVEY_RESPONSE_LABELS: Record<SurveyResponseValue, string> = {
  present: 'Présent',
  absent: 'Absent',
  incertain: 'Incertain',
};

export type SurveyStatus = 'ouvert' | 'ferme' | 'archive';

export type TournamentStatus = 'planifie' | 'en_cours' | 'termine';

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  planifie: 'Planifié',
  en_cours: 'En cours',
  termine: 'Terminé',
};

export type TournamentFormat =
  | 'poules'
  | 'elimination_directe'
  | 'poules_finale';

export type MatchEventType =
  | 'but'
  | 'but_csc'
  | 'carton_jaune'
  | 'carton_rouge'
  | 'remplacement'
  | 'blessure_live'
  | 'arret_mi_temps';

export const MATCH_EVENT_LABELS: Record<MatchEventType, string> = {
  but: 'But',
  but_csc: 'CSC',
  carton_jaune: 'Carton jaune',
  carton_rouge: 'Carton rouge',
  remplacement: 'Remplacement',
  blessure_live: 'Blessure',
  arret_mi_temps: 'Mi-temps',
};

export type ExerciseCategory =
  | 'echauffement'
  | 'technique'
  | 'physique'
  | 'tactique'
  | 'jeu'
  | 'retour_au_calme';

export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  echauffement: 'Échauffement',
  technique: 'Technique',
  physique: 'Physique',
  tactique: 'Tactique',
  jeu: 'Jeu',
  retour_au_calme: 'Retour au calme',
};

// ── Core entities ────────────────────────────────────────────────────

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface Team {
  id: string;
  name: string;
  category: string;
  coachId: string;
  seasonId: string;
  color: string;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  primaryTeamId: string;
  secondaryTeamId?: string;
  preferredPosition: Position;
  appetences: Partial<Record<Position, number>>;
  number?: number;
  active: boolean;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  type: ContactType;
  playerIds: string[];
  userId?: string;
  consentDate?: string;
  consentVersion?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  teamIds: string[];
  contactId?: string;
}

// ── Unavailabilities & Injuries ──────────────────────────────────────

export interface Unavailability {
  id: string;
  playerId: string;
  startDate: string;
  endDate?: string;
  motif: UnavailabilityMotif;
  declaredBy: string;
  note?: string;
  injuryId?: string;
}

export interface Injury {
  id: string;
  playerId: string;
  zone: string;
  nature: string;
  startDate: string;
  estimatedReturnDate?: string;
  actualReturnDate?: string;
  status: InjuryStatus;
  noteCoach?: string;
}

// ── Matches ──────────────────────────────────────────────────────────

export interface Match {
  id: string;
  teamId: string;
  seasonId: string;
  tournamentId?: string;
  tournamentGroupId?: string;
  date: string;
  time: string;
  location: string;
  address: string;
  isHome: boolean;
  opponent: string;
  status: MatchStatus;
  phase: string;
  scoreHome?: number;
  scoreAway?: number;
  note?: string;
  liveActive: boolean;
  meetingAddress?: string;
  meetingTime?: string;
  meetingNote?: string;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  type: MatchEventType;
  minute?: number;
  playerId?: string;
  player2Id?: string;
  note?: string;
}

// ── Trainings ────────────────────────────────────────────────────────

export interface Training {
  id: string;
  teamId: string;
  date: string;
  time: string;
  duration: number;
  type: TrainingType;
  cancelled: boolean;
  theme?: string;
  note?: string;
  seriesId?: string;
}

export interface TrainingBlock {
  id: string;
  trainingId: string;
  order: number;
  duration: number;
  title: string;
  description?: string;
  exerciseId?: string;
}

export interface Exercise {
  id: string;
  title: string;
  description?: string;
  category: ExerciseCategory;
  suggestedDuration?: number;
  tags: string[];
}

// ── Attendance ───────────────────────────────────────────────────────

export interface Attendance {
  id: string;
  sessionType: 'match' | 'training';
  sessionId: string;
  playerId: string;
  status: AttendanceStatus;
  note?: string;
  recordedBy?: string;
}

// ── Lineup ───────────────────────────────────────────────────────────

export interface LineupSlot {
  position: Position;
  playerId?: string;
  x: number;
  y: number;
}

export interface Lineup {
  id: string;
  teamId: string;
  matchId?: string;
  name: string;
  formation: string;
  slots: LineupSlot[];
  substituteIds: string[];
  createdAt: string;
}

export interface PositionHistory {
  id: string;
  playerId: string;
  matchId: string;
  matchDate: string;
  opponent: string;
  period: string;
  position: Position;
}

// ── Tournaments ──────────────────────────────────────────────────────

export interface Tournament {
  id: string;
  seasonId: string;
  name: string;
  dateStart: string;
  dateEnd?: string;
  location: string;
  address: string;
  organizer: string;
  isOrganizedByClub: boolean;
  teamIds: string[];
  format: TournamentFormat;
  status: TournamentStatus;
}

export interface TournamentGroup {
  id: string;
  tournamentId: string;
  name: string;
  type: 'poule' | 'elimination';
  order: number;
}

// ── Logistics & Surveys ──────────────────────────────────────────────

export interface CarpoolOffer {
  id: string;
  matchId: string;
  offeredBy: string;
  seats: number;
  departureLocation?: string;
  departureTime?: string;
  playerIds: string[];
  note?: string;
}

export interface Survey {
  id: string;
  teamId: string;
  sessionType: 'match' | 'training' | 'tournament' | 'libre';
  sessionId?: string;
  question: string;
  deadline: string;
  status: SurveyStatus;
  sendNotification: boolean;
  createdBy: string;
}

/** A single legal tutor's answer, kept to detect divergences (specs §15.8). */
export interface TutorResponse {
  userId: string;
  value: SurveyResponseValue;
  date: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  playerId: string;
  intentionJoueur?: SurveyResponseValue;
  dateIntentionJoueur?: string;
  confirmationParent?: SurveyResponseValue;
  dateConfirmationParent?: string;
  parentUserId?: string;
  /** Per-tutor answers when several legal tutors hold an account. */
  tutorResponses?: TutorResponse[];
  note?: string;
}

// ── Notifications ────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
}

export type ReminderDelay = 'J-1' | 'J-2' | 'H-2';

export interface NotificationPreferences {
  /** Master switch — when false, no in-app notification is delivered. */
  enabled: boolean;
  /** Notification categories the user has muted (see utils/notifications). */
  mutedCategories: string[];
  reminderDelay: ReminderDelay;
}

// ── Club-level settings ───────────────────────────────────────────────

export interface ClubSettings {
  /** Auto-create a presence survey when a match is created (RG-SONDAGE-04). */
  autoSurveyOnMatch: boolean;
}

// ── App state ────────────────────────────────────────────────────────

export interface AppData {
  season: Season;
  teams: Team[];
  players: Player[];
  contacts: Contact[];
  users: User[];
  matches: Match[];
  matchEvents: MatchEvent[];
  trainings: Training[];
  trainingBlocks: TrainingBlock[];
  exercises: Exercise[];
  attendances: Attendance[];
  lineups: Lineup[];
  positionHistory: PositionHistory[];
  tournaments: Tournament[];
  tournamentGroups: TournamentGroup[];
  carpoolOffers: CarpoolOffer[];
  surveys: Survey[];
  surveyResponses: SurveyResponse[];
  notifications: Notification[];
  notificationPreferences: Record<string, NotificationPreferences>;
  clubSettings: ClubSettings;
  unavailabilities: Unavailability[];
  injuries: Injury[];
}

// ── Formations foot à 8 ───────────────────────────────────────────────

export interface Formation {
  id: string;
  label: string;
  slots: Omit<LineupSlot, 'playerId'>[];
}

export const FORMATIONS: Formation[] = [
  {
    id: '2-3-2',
    label: '2-3-2',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'DD', x: 75, y: 78 },
      { position: 'DG', x: 25, y: 78 },
      { position: 'MD', x: 50, y: 65 },
      { position: 'MC', x: 25, y: 50 },
      { position: 'MO', x: 75, y: 50 },
      { position: 'ATD', x: 70, y: 22 },
      { position: 'ATG', x: 30, y: 22 },
    ],
  },
  {
    id: '3-2-2',
    label: '3-2-2',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'DD', x: 80, y: 75 },
      { position: 'DC', x: 50, y: 75 },
      { position: 'DG', x: 20, y: 75 },
      { position: 'MC', x: 30, y: 52 },
      { position: 'MO', x: 70, y: 52 },
      { position: 'ATD', x: 70, y: 22 },
      { position: 'ATG', x: 30, y: 22 },
    ],
  },
  {
    id: '3-3-1',
    label: '3-3-1',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'DD', x: 80, y: 75 },
      { position: 'DC', x: 50, y: 75 },
      { position: 'DG', x: 20, y: 75 },
      { position: 'MD', x: 20, y: 52 },
      { position: 'MC', x: 50, y: 52 },
      { position: 'MO', x: 80, y: 52 },
      { position: 'AT', x: 50, y: 18 },
    ],
  },
  {
    id: '2-4-1',
    label: '2-4-1',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'DD', x: 75, y: 78 },
      { position: 'DG', x: 25, y: 78 },
      { position: 'ATD', x: 80, y: 50 },
      { position: 'MC', x: 60, y: 50 },
      { position: 'MD', x: 40, y: 50 },
      { position: 'ATG', x: 20, y: 50 },
      { position: 'AT', x: 50, y: 18 },
    ],
  },
];
