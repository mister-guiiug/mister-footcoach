import type {
  AppData,
  Season,
  Team,
  Player,
  Contact,
  User,
  Match,
  MatchEvent,
  Training,
  Attendance,
  Lineup,
  PositionHistory,
  Tournament,
  Survey,
  SurveyResponse,
  Unavailability,
  Injury,
  Exercise,
} from '../types';

// ── Season ───────────────────────────────────────────────────────────

const season: Season = {
  id: 's1',
  name: '2025-2026',
  startDate: '2025-08-01',
  endDate: '2026-06-30',
  active: true,
};

// ── Teams ────────────────────────────────────────────────────────────

const teams: Team[] = [
  {
    id: 't1',
    name: 'U13 A',
    category: 'U13',
    coachId: 'u1',
    seasonId: 's1',
    color: '#16a34a',
  },
  {
    id: 't2',
    name: 'U13 B',
    category: 'U13',
    coachId: 'u2',
    seasonId: 's1',
    color: '#2563eb',
  },
];

// ── Players ──────────────────────────────────────────────────────────

const players: Player[] = [
  // U13 A
  {
    id: 'p1',
    firstName: 'Lucas',
    lastName: 'Dupont',
    dateOfBirth: '2012-03-15',
    primaryTeamId: 't1',
    preferredPosition: 'GK',
    appetences: { GK: 5, DC: 2 },
    number: 1,
    active: true,
  },
  {
    id: 'p2',
    firstName: 'Théo',
    lastName: 'Martin',
    dateOfBirth: '2012-07-22',
    primaryTeamId: 't1',
    preferredPosition: 'DD',
    appetences: { DD: 5, DC: 4, DG: 3 },
    number: 2,
    active: true,
  },
  {
    id: 'p3',
    firstName: 'Mathis',
    lastName: 'Bernard',
    dateOfBirth: '2012-11-05',
    primaryTeamId: 't1',
    preferredPosition: 'DC',
    appetences: { DC: 5, DG: 4, MD: 3 },
    number: 3,
    active: true,
  },
  {
    id: 'p4',
    firstName: 'Enzo',
    lastName: 'Thomas',
    dateOfBirth: '2013-01-18',
    primaryTeamId: 't1',
    preferredPosition: 'DG',
    appetences: { DG: 5, DD: 3, ATG: 2 },
    number: 4,
    active: true,
  },
  {
    id: 'p5',
    firstName: 'Hugo',
    lastName: 'Petit',
    dateOfBirth: '2012-05-30',
    primaryTeamId: 't1',
    preferredPosition: 'MC',
    appetences: { MC: 5, MD: 4, MO: 3 },
    number: 6,
    active: true,
  },
  {
    id: 'p6',
    firstName: 'Nathan',
    lastName: 'Richard',
    dateOfBirth: '2012-09-12',
    primaryTeamId: 't1',
    preferredPosition: 'MO',
    appetences: { MO: 5, AT: 4, MC: 3 },
    number: 10,
    active: true,
  },
  {
    id: 'p7',
    firstName: 'Axel',
    lastName: 'Durand',
    dateOfBirth: '2013-02-28',
    primaryTeamId: 't1',
    preferredPosition: 'ATD',
    appetences: { ATD: 5, AT: 4, MO: 2 },
    number: 7,
    active: true,
  },
  {
    id: 'p8',
    firstName: 'Tom',
    lastName: 'Moreau',
    dateOfBirth: '2012-08-14',
    primaryTeamId: 't1',
    preferredPosition: 'AT',
    appetences: { AT: 5, ATG: 4, ATD: 3 },
    number: 9,
    active: true,
  },
  {
    id: 'p9',
    firstName: 'Lilian',
    lastName: 'Simon',
    dateOfBirth: '2013-04-06',
    primaryTeamId: 't1',
    preferredPosition: 'ATG',
    appetences: { ATG: 5, AT: 3, DG: 2 },
    number: 11,
    active: true,
  },
  // U13 B
  {
    id: 'p10',
    firstName: 'Antoine',
    lastName: 'Laurent',
    dateOfBirth: '2012-06-17',
    primaryTeamId: 't2',
    preferredPosition: 'GK',
    appetences: { GK: 5 },
    number: 1,
    active: true,
  },
  {
    id: 'p11',
    firstName: 'Maxime',
    lastName: 'Lefebvre',
    dateOfBirth: '2012-12-03',
    primaryTeamId: 't2',
    preferredPosition: 'DC',
    appetences: { DC: 5, DD: 4, DG: 3 },
    number: 5,
    active: true,
  },
  {
    id: 'p12',
    firstName: 'Romain',
    lastName: 'Michel',
    dateOfBirth: '2013-03-21',
    primaryTeamId: 't2',
    preferredPosition: 'DD',
    appetences: { DD: 5, MC: 3 },
    number: 2,
    active: true,
  },
  {
    id: 'p13',
    firstName: 'Julien',
    lastName: 'Garcia',
    dateOfBirth: '2012-10-09',
    primaryTeamId: 't2',
    preferredPosition: 'DG',
    appetences: { DG: 5, ATG: 3 },
    number: 3,
    active: true,
  },
  {
    id: 'p14',
    firstName: 'Kylian',
    lastName: 'David',
    dateOfBirth: '2013-05-14',
    primaryTeamId: 't2',
    preferredPosition: 'MD',
    appetences: { MD: 5, MC: 4, DC: 3 },
    number: 8,
    active: true,
  },
  {
    id: 'p15',
    firstName: 'Baptiste',
    lastName: 'Bertrand',
    dateOfBirth: '2012-07-07',
    primaryTeamId: 't2',
    preferredPosition: 'MC',
    appetences: { MC: 5, MO: 4 },
    number: 6,
    active: true,
  },
  {
    id: 'p16',
    firstName: 'Florian',
    lastName: 'Roux',
    dateOfBirth: '2013-01-25',
    primaryTeamId: 't2',
    preferredPosition: 'AT',
    appetences: { AT: 5, ATD: 4, ATG: 4 },
    number: 9,
    active: true,
  },
  {
    id: 'p17',
    firstName: 'Noé',
    lastName: 'Blanc',
    dateOfBirth: '2012-04-18',
    primaryTeamId: 't2',
    preferredPosition: 'ATD',
    appetences: { ATD: 5, MO: 3 },
    number: 7,
    active: true,
  },
  // Joueur double équipe
  {
    id: 'p18',
    firstName: 'Sacha',
    lastName: 'Guerin',
    dateOfBirth: '2013-06-02',
    primaryTeamId: 't2',
    secondaryTeamId: 't1',
    preferredPosition: 'MC',
    appetences: { MC: 5, MD: 4, MO: 3 },
    number: 15,
    active: true,
  },
];

// ── Contacts ─────────────────────────────────────────────────────────

const contacts: Contact[] = [
  {
    id: 'c1',
    firstName: 'Pierre',
    lastName: 'Dupont',
    phone: '06 12 34 56 78',
    email: 'pierre.dupont@email.fr',
    type: 'père',
    playerIds: ['p1'],
    consentDate: '2025-09-01',
  },
  {
    id: 'c2',
    firstName: 'Sophie',
    lastName: 'Dupont',
    phone: '06 23 45 67 89',
    email: 'sophie.dupont@email.fr',
    type: 'mère',
    playerIds: ['p1'],
    consentDate: '2025-09-01',
  },
  {
    id: 'c3',
    firstName: 'Jean',
    lastName: 'Martin',
    phone: '06 34 56 78 90',
    email: 'jean.martin@email.fr',
    type: 'père',
    playerIds: ['p2', 'p3'],
    consentDate: '2025-09-02',
  },
];

// ── Users ────────────────────────────────────────────────────────────

const users: User[] = [
  {
    id: 'u1',
    email: 'coach.a@fc-exemple.fr',
    firstName: 'Éric',
    lastName: 'Coaching',
    roles: ['coach'],
    teamIds: ['t1'],
  },
  {
    id: 'u2',
    email: 'coach.b@fc-exemple.fr',
    firstName: 'Stéphane',
    lastName: 'Entrainement',
    roles: ['coach'],
    teamIds: ['t2'],
  },
  {
    id: 'u3',
    email: 'admin@fc-exemple.fr',
    firstName: 'Admin',
    lastName: 'Club',
    roles: ['admin'],
    teamIds: ['t1', 't2'],
  },
];

// ── Matches ──────────────────────────────────────────────────────────

const matches: Match[] = [
  {
    id: 'm1',
    teamId: 't1',
    seasonId: 's1',
    date: '2026-05-10',
    time: '15:00',
    location: 'Stade Municipal',
    address: '1 Rue du Stade, 75000 Paris',
    isHome: true,
    opponent: 'FC Rivale',
    status: 'saison',
    phase: 'Phase retour',
    scoreHome: undefined,
    scoreAway: undefined,
    liveActive: false,
    meetingTime: '14:30',
    meetingAddress: 'Stade Municipal, entrée principale',
  },
  {
    id: 'm2',
    teamId: 't1',
    seasonId: 's1',
    date: '2026-04-26',
    time: '14:00',
    location: 'Terrain Adversaire',
    address: '5 Avenue des Sports, 75001 Paris',
    isHome: false,
    opponent: 'AS Belleville',
    status: 'saison',
    phase: 'Phase retour',
    scoreHome: 2,
    scoreAway: 3,
    liveActive: false,
    meetingTime: '12:45',
    meetingAddress: 'Parking du club, rue principale',
    meetingNote: 'Covoiturage organisé',
  },
  {
    id: 'm3',
    teamId: 't1',
    seasonId: 's1',
    date: '2026-04-12',
    time: '15:30',
    location: 'Stade Municipal',
    address: '1 Rue du Stade, 75000 Paris',
    isHome: true,
    opponent: 'US Montmartre',
    status: 'saison',
    phase: 'Phase aller',
    scoreHome: 4,
    scoreAway: 1,
    liveActive: false,
  },
  {
    id: 'm4',
    teamId: 't2',
    seasonId: 's1',
    date: '2026-05-11',
    time: '10:00',
    location: 'Stade Municipal',
    address: '1 Rue du Stade, 75000 Paris',
    isHome: true,
    opponent: 'Olympique Jeunes',
    status: 'saison',
    phase: 'Phase retour',
    scoreHome: undefined,
    scoreAway: undefined,
    liveActive: false,
  },
  {
    id: 'm5',
    teamId: 't2',
    seasonId: 's1',
    date: '2026-04-27',
    time: '11:00',
    location: 'Terrain Adversaire',
    address: '8 Chemin du Parc, 75003 Paris',
    isHome: false,
    opponent: 'FC Est Jeunes',
    status: 'saison',
    phase: 'Phase retour',
    scoreHome: 1,
    scoreAway: 1,
    liveActive: false,
  },
];

// ── Match events ─────────────────────────────────────────────────────

const matchEvents: MatchEvent[] = [
  { id: 'me1', matchId: 'm2', type: 'but', minute: 12, playerId: 'p8' },
  { id: 'me2', matchId: 'm2', type: 'but', minute: 34, playerId: 'p6' },
  { id: 'me3', matchId: 'm2', type: 'carton_jaune', minute: 28, playerId: 'p3' },
  { id: 'me4', matchId: 'm3', type: 'but', minute: 8, playerId: 'p7' },
  { id: 'me5', matchId: 'm3', type: 'but', minute: 22, playerId: 'p8' },
  { id: 'me6', matchId: 'm3', type: 'but', minute: 31, playerId: 'p8' },
  { id: 'me7', matchId: 'm3', type: 'but', minute: 40, playerId: 'p6' },
];

// ── Trainings ────────────────────────────────────────────────────────

const trainings: Training[] = [
  {
    id: 'tr1',
    teamId: 't1',
    date: '2026-05-06',
    time: '18:00',
    duration: 90,
    type: 'regulier',
    cancelled: false,
    theme: 'Pressing et récupération haute',
  },
  {
    id: 'tr2',
    teamId: 't1',
    date: '2026-04-29',
    time: '18:00',
    duration: 90,
    type: 'regulier',
    cancelled: false,
    theme: 'Jeu en transition',
  },
  {
    id: 'tr3',
    teamId: 't1',
    date: '2026-04-24',
    time: '19:00',
    duration: 60,
    type: 'exceptionnel',
    cancelled: false,
    theme: 'Préparation match retour',
    note: 'Séance complémentaire avant le match',
  },
  {
    id: 'tr4',
    teamId: 't2',
    date: '2026-05-07',
    time: '17:30',
    duration: 90,
    type: 'regulier',
    cancelled: false,
    theme: 'Travail technique individuel',
  },
  {
    id: 'tr5',
    teamId: 't2',
    date: '2026-04-30',
    time: '17:30',
    duration: 90,
    type: 'regulier',
    cancelled: true,
    note: 'Terrain indisponible — intempéries',
  },
];

// ── Exercises ────────────────────────────────────────────────────────

const exercises: Exercise[] = [
  {
    id: 'ex1',
    title: 'Jeu de passes 3 contre 1',
    description: 'Triangle de 3 joueurs avec un défenseur central. Garder la balle 10 passes.',
    category: 'technique',
    suggestedDuration: 10,
    tags: ['passes', 'technique', 'pression'],
  },
  {
    id: 'ex2',
    title: 'Jonglerie et conduite de balle',
    description: 'Jonglerie individuelle 2 min, puis slalom avec conduite.',
    category: 'technique',
    suggestedDuration: 8,
    tags: ['technique', 'individuel'],
  },
  {
    id: 'ex3',
    title: 'Course avec ballon relayé',
    description: 'Montée progressive de rythme. 3 séries de 100m.',
    category: 'echauffement',
    suggestedDuration: 12,
    tags: ['échauffement', 'endurance'],
  },
  {
    id: 'ex4',
    title: 'Jeu à thème — pressing collectif',
    description: '4 contre 4 + gardiens. Trigger de pressing défini : passe en arrière du porteur.',
    category: 'tactique',
    suggestedDuration: 20,
    tags: ['pressing', 'tactique', 'collectif'],
  },
  {
    id: 'ex5',
    title: 'Petits matchs 4v4',
    description: 'Application des principes vus en séance. Buts de 2m.',
    category: 'jeu',
    suggestedDuration: 25,
    tags: ['match', 'application'],
  },
];

// ── Attendance ───────────────────────────────────────────────────────

const attendances: Attendance[] = [
  { id: 'a1', sessionType: 'training', sessionId: 'tr2', playerId: 'p1', status: 'present' },
  { id: 'a2', sessionType: 'training', sessionId: 'tr2', playerId: 'p2', status: 'present' },
  { id: 'a3', sessionType: 'training', sessionId: 'tr2', playerId: 'p3', status: 'absent' },
  { id: 'a4', sessionType: 'training', sessionId: 'tr2', playerId: 'p4', status: 'excuse' },
  { id: 'a5', sessionType: 'training', sessionId: 'tr2', playerId: 'p5', status: 'present' },
  { id: 'a6', sessionType: 'training', sessionId: 'tr2', playerId: 'p6', status: 'present' },
  { id: 'a7', sessionType: 'training', sessionId: 'tr2', playerId: 'p7', status: 'present' },
  { id: 'a8', sessionType: 'training', sessionId: 'tr2', playerId: 'p8', status: 'present' },
  { id: 'a9', sessionType: 'match', sessionId: 'm2', playerId: 'p1', status: 'present' },
  { id: 'a10', sessionType: 'match', sessionId: 'm2', playerId: 'p2', status: 'present' },
  { id: 'a11', sessionType: 'match', sessionId: 'm2', playerId: 'p3', status: 'present' },
  { id: 'a12', sessionType: 'match', sessionId: 'm2', playerId: 'p4', status: 'absent' },
  { id: 'a13', sessionType: 'match', sessionId: 'm2', playerId: 'p5', status: 'present' },
  { id: 'a14', sessionType: 'match', sessionId: 'm2', playerId: 'p6', status: 'present' },
  { id: 'a15', sessionType: 'match', sessionId: 'm2', playerId: 'p7', status: 'excuse' },
  { id: 'a16', sessionType: 'match', sessionId: 'm2', playerId: 'p8', status: 'present' },
];

// ── Lineups ───────────────────────────────────────────────────────────

const lineups: Lineup[] = [
  {
    id: 'l1',
    teamId: 't1',
    name: 'Compo type 2-3-2',
    formation: '2-3-2',
    slots: [
      { position: 'GK',  x: 50, y: 92, playerId: 'p1' },
      { position: 'DD',  x: 75, y: 78, playerId: 'p2' },
      { position: 'DG',  x: 25, y: 78, playerId: 'p4' },
      { position: 'MD',  x: 50, y: 65, playerId: 'p3' },
      { position: 'MC',  x: 25, y: 50, playerId: 'p5' },
      { position: 'MO',  x: 75, y: 50, playerId: 'p6' },
      { position: 'ATD', x: 70, y: 22, playerId: 'p7' },
      { position: 'ATG', x: 30, y: 22, playerId: 'p9' },
    ],
    substituteIds: ['p8'],
    createdAt: '2026-04-20T10:00:00.000Z',
  },
];

// ── Position history ──────────────────────────────────────────────────

const positionHistory: PositionHistory[] = [
  { id: 'ph1', playerId: 'p8', matchId: 'm3', matchDate: '2026-04-12', opponent: 'US Montmartre', period: '1ère mi-temps', position: 'AT' },
  { id: 'ph2', playerId: 'p8', matchId: 'm3', matchDate: '2026-04-12', opponent: 'US Montmartre', period: '2ème mi-temps', position: 'AT' },
  { id: 'ph3', playerId: 'p6', matchId: 'm3', matchDate: '2026-04-12', opponent: 'US Montmartre', period: '1ère mi-temps', position: 'MO' },
  { id: 'ph4', playerId: 'p7', matchId: 'm3', matchDate: '2026-04-12', opponent: 'US Montmartre', period: '1ère mi-temps', position: 'ATD' },
  { id: 'ph5', playerId: 'p8', matchId: 'm2', matchDate: '2026-04-26', opponent: 'AS Belleville', period: '1ère mi-temps', position: 'AT' },
  { id: 'ph6', playerId: 'p6', matchId: 'm2', matchDate: '2026-04-26', opponent: 'AS Belleville', period: '2ème mi-temps', position: 'MO' },
];

// ── Tournaments ──────────────────────────────────────────────────────

const tournaments: Tournament[] = [
  {
    id: 'to1',
    seasonId: 's1',
    name: 'Tournoi de Printemps U13',
    dateStart: '2026-05-23',
    dateEnd: '2026-05-23',
    location: 'Complexe Sportif Nord',
    address: '12 Allée des Lilas, 75019 Paris',
    organizer: 'FC Exemple',
    isOrganizedByClub: true,
    teamIds: ['t1', 't2'],
    format: 'poules_finale',
    status: 'planifie',
  },
];

// ── Surveys ──────────────────────────────────────────────────────────

const surveys: Survey[] = [
  {
    id: 'sv1',
    teamId: 't1',
    sessionType: 'match',
    sessionId: 'm1',
    question: 'Votre enfant sera-t-il présent au match du 10 mai ?',
    deadline: '2026-05-08',
    status: 'ouvert',
    sendNotification: true,
    createdBy: 'u1',
  },
  {
    id: 'sv2',
    teamId: 't2',
    sessionType: 'match',
    sessionId: 'm4',
    question: 'Votre enfant sera-t-il présent au match du 11 mai ?',
    deadline: '2026-05-09',
    status: 'ouvert',
    sendNotification: true,
    createdBy: 'u2',
  },
];

const surveyResponses: SurveyResponse[] = [
  {
    id: 'sr1',
    surveyId: 'sv1',
    playerId: 'p1',
    intentionJoueur: 'present',
    dateIntentionJoueur: '2026-05-06',
    confirmationParent: 'present',
    dateConfirmationParent: '2026-05-06',
    parentUserId: 'c1',
  },
  {
    id: 'sr2',
    surveyId: 'sv1',
    playerId: 'p2',
    intentionJoueur: 'present',
    dateIntentionJoueur: '2026-05-05',
    confirmationParent: 'absent',
    dateConfirmationParent: '2026-05-06',
    note: 'Anniversaire en famille',
  },
  {
    id: 'sr3',
    surveyId: 'sv1',
    playerId: 'p3',
    intentionJoueur: 'incertain',
    dateIntentionJoueur: '2026-05-05',
  },
];

// ── Unavailabilities & Injuries ───────────────────────────────────────

const unavailabilities: Unavailability[] = [
  {
    id: 'uv1',
    playerId: 'p4',
    startDate: '2026-04-20',
    endDate: '2026-05-15',
    motif: 'blessure',
    declaredBy: 'u1',
    note: 'Entorse cheville droite',
    injuryId: 'inj1',
  },
];

const injuries: Injury[] = [
  {
    id: 'inj1',
    playerId: 'p4',
    zone: 'Cheville droite',
    nature: 'Entorse grade 2',
    startDate: '2026-04-20',
    estimatedReturnDate: '2026-05-15',
    status: 'reprise_progressive',
    noteCoach: 'Kinésithérapeute vu 2x/semaine. Reprise progressive autorisée.',
  },
];

// ── AppData ──────────────────────────────────────────────────────────

export const MOCK_DATA: AppData = {
  season,
  teams,
  players,
  contacts,
  users,
  matches,
  matchEvents,
  trainings,
  trainingBlocks: [],
  exercises,
  attendances,
  lineups,
  positionHistory,
  tournaments,
  tournamentGroups: [],
  carpoolOffers: [],
  surveys,
  surveyResponses,
  notifications: [],
  unavailabilities,
  injuries,
};
