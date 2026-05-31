-- Mister Footcoach — Supabase schema (specs §19 data model)
-- Columns use quoted camelCase to mirror the TypeScript types 1:1, so a
-- `select *` row maps directly onto the app's domain types. Ids and dates are
-- text (the app uses string ids and ISO date strings).

-- ── Clubs & seasons ──────────────────────────────────────────────────
create table if not exists clubs (
  id text primary key,
  name text not null,
  "logoStorageId" text
);

create table if not exists seasons (
  id text primary key,
  "clubId" text references clubs(id) on delete cascade,
  name text not null,
  "startDate" text not null,
  "endDate" text not null,
  active boolean not null default false
);

-- ── Users (app profile linked to auth.users) ─────────────────────────
create table if not exists users (
  id text primary key,
  "authId" uuid unique,
  email text not null,
  "firstName" text not null,
  "lastName" text not null,
  roles text[] not null default '{}',
  "teamIds" text[] not null default '{}',
  "contactId" text
);

-- ── Teams ────────────────────────────────────────────────────────────
create table if not exists teams (
  id text primary key,
  "clubId" text,
  "seasonId" text references seasons(id) on delete set null,
  name text not null,
  category text not null,
  "coachId" text,
  "adjointCoachId" text,
  color text
);
create index if not exists teams_by_season on teams("seasonId");

-- ── Players ──────────────────────────────────────────────────────────
create table if not exists players (
  id text primary key,
  "firstName" text not null,
  "lastName" text not null,
  "dateOfBirth" text not null,
  "primaryTeamId" text references teams(id) on delete cascade,
  "secondaryTeamId" text references teams(id) on delete set null,
  "preferredPosition" text not null,
  appetences jsonb not null default '{}',
  number integer,
  active boolean not null default true,
  "photoStorageId" text
);
create index if not exists players_by_primary_team on players("primaryTeamId");
create index if not exists players_by_secondary_team on players("secondaryTeamId");

-- ── Contacts & filiation ─────────────────────────────────────────────
create table if not exists contacts (
  id text primary key,
  "firstName" text not null,
  "lastName" text not null,
  phone text not null,
  email text not null,
  type text not null,
  "playerIds" text[] not null default '{}',
  "userId" text,
  "consentDate" text,
  "consentVersion" text
);
create index if not exists contacts_by_email on contacts(email);

-- ── Matches ──────────────────────────────────────────────────────────
create table if not exists matches (
  id text primary key,
  "teamId" text references teams(id) on delete cascade,
  "seasonId" text,
  "tournamentId" text,
  "tournamentGroupId" text,
  field text,
  date text not null,
  time text not null,
  location text not null,
  address text not null,
  "isHome" boolean not null,
  opponent text not null,
  status text not null,
  phase text not null,
  "scoreHome" integer,
  "scoreAway" integer,
  note text,
  "liveActive" boolean not null default false,
  "meetingAddress" text,
  "meetingTime" text,
  "meetingNote" text
);
create index if not exists matches_by_team on matches("teamId");
create index if not exists matches_by_date on matches(date);

-- ── Live match events ────────────────────────────────────────────────
create table if not exists match_events (
  id text primary key,
  "matchId" text references matches(id) on delete cascade,
  type text not null,
  minute integer,
  "playerId" text,
  "player2Id" text,
  note text
);
create index if not exists match_events_by_match on match_events("matchId");

-- ── Trainings & session content ──────────────────────────────────────
create table if not exists trainings (
  id text primary key,
  "teamId" text references teams(id) on delete cascade,
  date text not null,
  time text not null,
  duration integer not null,
  type text not null,
  cancelled boolean not null default false,
  theme text,
  note text,
  "seriesId" text
);
create index if not exists trainings_by_team on trainings("teamId");

create table if not exists training_blocks (
  id text primary key,
  "trainingId" text references trainings(id) on delete cascade,
  "order" integer not null,
  duration integer not null,
  title text not null,
  description text,
  "exerciseId" text
);
create index if not exists training_blocks_by_training on training_blocks("trainingId");

-- ── Exercise library ─────────────────────────────────────────────────
create table if not exists exercises (
  id text primary key,
  title text not null,
  description text,
  category text not null,
  "suggestedDuration" integer,
  tags text[] not null default '{}'
);

-- ── Attendance ───────────────────────────────────────────────────────
create table if not exists attendances (
  id text primary key,
  "sessionType" text not null,
  "sessionId" text not null,
  "playerId" text references players(id) on delete cascade,
  status text not null,
  note text,
  "recordedBy" text
);
create index if not exists attendances_by_session on attendances("sessionType", "sessionId");
create index if not exists attendances_by_player on attendances("playerId");

-- ── Lineups ──────────────────────────────────────────────────────────
create table if not exists lineups (
  id text primary key,
  "teamId" text references teams(id) on delete cascade,
  "matchId" text,
  name text not null,
  formation text not null,
  slots jsonb not null default '[]',
  "substituteIds" text[] not null default '{}',
  "createdAt" text not null
);
create index if not exists lineups_by_team on lineups("teamId");

-- ── Position history ─────────────────────────────────────────────────
create table if not exists position_history (
  id text primary key,
  "playerId" text references players(id) on delete cascade,
  "matchId" text,
  "matchDate" text not null,
  opponent text not null,
  period text not null,
  position text not null
);
create index if not exists position_history_by_player on position_history("playerId");

-- ── Tournaments ──────────────────────────────────────────────────────
create table if not exists tournaments (
  id text primary key,
  "seasonId" text,
  name text not null,
  "dateStart" text not null,
  "dateEnd" text,
  location text not null,
  address text not null,
  organizer text not null,
  "isOrganizedByClub" boolean not null default false,
  "teamIds" text[] not null default '{}',
  "invitedTeams" text[],
  format text not null,
  status text not null
);
create index if not exists tournaments_by_season on tournaments("seasonId");

create table if not exists tournament_groups (
  id text primary key,
  "tournamentId" text references tournaments(id) on delete cascade,
  name text not null,
  type text not null,
  "order" integer not null
);
create index if not exists tournament_groups_by_tournament on tournament_groups("tournamentId");

-- ── Carpool ──────────────────────────────────────────────────────────
create table if not exists carpool_offers (
  id text primary key,
  "matchId" text references matches(id) on delete cascade,
  "offeredBy" text not null,
  seats integer not null,
  "departureLocation" text,
  "departureTime" text,
  "playerIds" text[] not null default '{}',
  note text
);
create index if not exists carpool_offers_by_match on carpool_offers("matchId");

-- ── Surveys ──────────────────────────────────────────────────────────
create table if not exists surveys (
  id text primary key,
  "teamId" text references teams(id) on delete cascade,
  "sessionType" text not null,
  "sessionId" text,
  question text not null,
  deadline text not null,
  status text not null,
  "sendNotification" boolean not null default false,
  "createdBy" text
);
create index if not exists surveys_by_team on surveys("teamId");

create table if not exists survey_responses (
  id text primary key,
  "surveyId" text references surveys(id) on delete cascade,
  "playerId" text references players(id) on delete cascade,
  "intentionJoueur" text,
  "dateIntentionJoueur" text,
  "confirmationParent" text,
  "dateConfirmationParent" text,
  "parentUserId" text,
  "tutorResponses" jsonb,
  note text
);
create index if not exists survey_responses_by_survey on survey_responses("surveyId");

-- ── Notifications & preferences ──────────────────────────────────────
create table if not exists notifications (
  id text primary key,
  "userId" text not null,
  type text not null,
  message text not null,
  read boolean not null default false,
  "relatedId" text,
  "relatedType" text,
  "createdAt" text not null
);
create index if not exists notifications_by_user on notifications("userId");

create table if not exists notification_preferences (
  "userId" text primary key,
  enabled boolean not null default true,
  "mutedCategories" text[] not null default '{}',
  "reminderDelay" text not null default 'J-1'
);

-- ── Club settings (single row) ───────────────────────────────────────
create table if not exists club_settings (
  id text primary key default 'default',
  "autoSurveyOnMatch" boolean not null default true,
  "federationLastSync" text
);

-- ── Unavailabilities & injuries ──────────────────────────────────────
create table if not exists unavailabilities (
  id text primary key,
  "playerId" text references players(id) on delete cascade,
  "startDate" text not null,
  "endDate" text,
  motif text not null,
  "declaredBy" text,
  note text,
  "injuryId" text
);
create index if not exists unavailabilities_by_player on unavailabilities("playerId");

create table if not exists injuries (
  id text primary key,
  "playerId" text references players(id) on delete cascade,
  zone text not null,
  nature text not null,
  "startDate" text not null,
  "estimatedReturnDate" text,
  "actualReturnDate" text,
  status text not null,
  "noteCoach" text
);
create index if not exists injuries_by_player on injuries("playerId");
