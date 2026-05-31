-- Mister Footcoach — Row Level Security (specs §3 roles, §18 RGPD)
-- Role model: admin (all), coach (own teams), parent (own children).
-- A public anon-key bundle (GitHub Pages) is safe because every table is
-- protected here, never by the client.

-- ── Helper functions (SECURITY DEFINER bypasses RLS to avoid recursion) ──

create or replace function app_current_user_id()
returns text language sql stable security definer set search_path = public as $$
  select id from users where "authId" = auth.uid() limit 1
$$;

create or replace function app_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select 'admin' = any(roles) from users where "authId" = auth.uid()), false)
$$;

create or replace function app_coach_team_ids()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce((select "teamIds" from users where "authId" = auth.uid()), '{}')
$$;

create or replace function app_is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select roles && array['admin','coach']
                   from users where "authId" = auth.uid()), false)
$$;

create or replace function app_parent_player_ids()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array(
    select distinct p
    from contacts c, unnest(c."playerIds") as p
    where c."userId" = app_current_user_id()
  ), '{}')
$$;

create or replace function app_parent_team_ids()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array(
    select distinct t
    from players pl,
      unnest(array[pl."primaryTeamId", pl."secondaryTeamId"]) as t
    where pl.id = any(app_parent_player_ids()) and t is not null
  ), '{}')
$$;

create or replace function app_can_access_team(tid text)
returns boolean language sql stable security definer set search_path = public as $$
  select app_is_admin()
      or tid = any(app_coach_team_ids())
      or tid = any(app_parent_team_ids())
$$;

create or replace function app_can_manage_team(tid text)
returns boolean language sql stable security definer set search_path = public as $$
  select app_is_admin() or tid = any(app_coach_team_ids())
$$;

create or replace function app_can_access_player(pid text)
returns boolean language sql stable security definer set search_path = public as $$
  select app_is_admin()
      or pid = any(app_parent_player_ids())
      or exists (
        select 1 from players p
        where p.id = pid
          and (app_can_access_team(p."primaryTeamId")
               or app_can_access_team(p."secondaryTeamId"))
      )
$$;

create or replace function app_can_manage_player(pid text)
returns boolean language sql stable security definer set search_path = public as $$
  select app_is_admin()
      or exists (
        select 1 from players p
        where p.id = pid
          and (app_can_manage_team(p."primaryTeamId")
               or app_can_manage_team(p."secondaryTeamId"))
      )
$$;

-- ── Enable RLS on every table ────────────────────────────────────────
do $$
declare t text;
begin
  for t in select unnest(array[
    'clubs','seasons','users','teams','players','contacts','matches',
    'match_events','trainings','training_blocks','exercises','attendances',
    'lineups','position_history','tournaments','tournament_groups',
    'carpool_offers','surveys','survey_responses','notifications',
    'notification_preferences','club_settings','unavailabilities','injuries'
  ]) loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ── Reference data: authenticated read, admin write ──────────────────
create policy clubs_read on clubs for select to authenticated using (true);
create policy clubs_admin on clubs for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

create policy seasons_read on seasons for select to authenticated using (true);
create policy seasons_admin on seasons for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

create policy teams_read on teams for select to authenticated using (true);
create policy teams_admin on teams for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

create policy club_settings_read on club_settings for select to authenticated using (true);
create policy club_settings_admin on club_settings for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

-- Users: read within club (names/roles), self or admin can write.
create policy users_read on users for select to authenticated using (true);
create policy users_self on users for update to authenticated
  using (id = app_current_user_id() or app_is_admin())
  with check (id = app_current_user_id() or app_is_admin());
create policy users_admin_ins on users for insert to authenticated
  with check (app_is_admin());

-- Exercise library: shared, coaches and admins manage.
create policy exercises_read on exercises for select to authenticated using (true);
create policy exercises_write on exercises for all to authenticated
  using (app_is_staff()) with check (app_is_staff());

-- ── Player-scoped data ───────────────────────────────────────────────
create policy players_read on players for select to authenticated
  using (app_can_access_player(id));
create policy players_write on players for all to authenticated
  using (app_can_manage_team("primaryTeamId"))
  with check (app_can_manage_team("primaryTeamId"));

create policy attendances_read on attendances for select to authenticated
  using (app_can_access_player("playerId"));
create policy attendances_write on attendances for all to authenticated
  using (app_can_manage_player("playerId"))
  with check (app_can_manage_player("playerId"));

create policy position_history_read on position_history for select to authenticated
  using (app_can_access_player("playerId"));
create policy position_history_write on position_history for all to authenticated
  using (app_can_manage_player("playerId"))
  with check (app_can_manage_player("playerId"));

-- Injuries: coach/admin only (RG-BLESS-04 — parents never see details).
create policy injuries_manage on injuries for all to authenticated
  using (app_can_manage_player("playerId"))
  with check (app_can_manage_player("playerId"));

-- Unavailabilities: parents see and may declare for their child.
create policy unavailabilities_read on unavailabilities for select to authenticated
  using (app_can_access_player("playerId"));
create policy unavailabilities_write on unavailabilities for all to authenticated
  using (
    app_can_manage_player("playerId")
    or "playerId" = any(app_parent_player_ids())
  )
  with check (
    app_can_manage_player("playerId")
    or "playerId" = any(app_parent_player_ids())
  );

-- ── Team-scoped data ─────────────────────────────────────────────────
create policy matches_read on matches for select to authenticated
  using (app_can_access_team("teamId"));
create policy matches_write on matches for all to authenticated
  using (app_can_manage_team("teamId"))
  with check (app_can_manage_team("teamId"));

create policy trainings_read on trainings for select to authenticated
  using (app_can_access_team("teamId"));
create policy trainings_write on trainings for all to authenticated
  using (app_can_manage_team("teamId"))
  with check (app_can_manage_team("teamId"));

create policy lineups_read on lineups for select to authenticated
  using (app_can_access_team("teamId"));
create policy lineups_write on lineups for all to authenticated
  using (app_can_manage_team("teamId"))
  with check (app_can_manage_team("teamId"));

create policy surveys_read on surveys for select to authenticated
  using (app_can_access_team("teamId"));
create policy surveys_write on surveys for all to authenticated
  using (app_can_manage_team("teamId"))
  with check (app_can_manage_team("teamId"));

-- Match events / training blocks: scoped through their parent row.
create policy match_events_read on match_events for select to authenticated
  using (exists (select 1 from matches m where m.id = "matchId"
                 and app_can_access_team(m."teamId")));
create policy match_events_write on match_events for all to authenticated
  using (exists (select 1 from matches m where m.id = "matchId"
                 and app_can_manage_team(m."teamId")))
  with check (exists (select 1 from matches m where m.id = "matchId"
                 and app_can_manage_team(m."teamId")));

create policy training_blocks_read on training_blocks for select to authenticated
  using (exists (select 1 from trainings t where t.id = "trainingId"
                 and app_can_access_team(t."teamId")));
create policy training_blocks_write on training_blocks for all to authenticated
  using (exists (select 1 from trainings t where t.id = "trainingId"
                 and app_can_manage_team(t."teamId")))
  with check (exists (select 1 from trainings t where t.id = "trainingId"
                 and app_can_manage_team(t."teamId")));

-- Survey responses: parents answer for their child; coaches manage their team.
create policy survey_responses_read on survey_responses for select to authenticated
  using (app_can_access_player("playerId"));
create policy survey_responses_write on survey_responses for all to authenticated
  using (
    app_can_manage_player("playerId")
    or "playerId" = any(app_parent_player_ids())
  )
  with check (
    app_can_manage_player("playerId")
    or "playerId" = any(app_parent_player_ids())
  );

-- Carpool: visible to the team; parents may submit their own offer.
create policy carpool_read on carpool_offers for select to authenticated
  using (exists (select 1 from matches m where m.id = "matchId"
                 and app_can_access_team(m."teamId")));
create policy carpool_write on carpool_offers for all to authenticated
  using (
    "offeredBy" = app_current_user_id()
    or exists (select 1 from matches m where m.id = "matchId"
               and app_can_manage_team(m."teamId"))
  )
  with check (
    "offeredBy" = app_current_user_id()
    or exists (select 1 from matches m where m.id = "matchId"
               and app_can_manage_team(m."teamId"))
  );

-- Tournaments: accessible if any participating team is accessible.
create policy tournaments_read on tournaments for select to authenticated
  using (
    app_is_admin()
    or "teamIds" && app_coach_team_ids()
    or "teamIds" && app_parent_team_ids()
  );
create policy tournaments_write on tournaments for all to authenticated
  using (app_is_admin() or "teamIds" && app_coach_team_ids())
  with check (app_is_admin() or "teamIds" && app_coach_team_ids());

create policy tournament_groups_read on tournament_groups for select to authenticated
  using (exists (select 1 from tournaments t where t.id = "tournamentId"
                 and (app_is_admin() or t."teamIds" && app_coach_team_ids()
                      or t."teamIds" && app_parent_team_ids())));
create policy tournament_groups_write on tournament_groups for all to authenticated
  using (exists (select 1 from tournaments t where t.id = "tournamentId"
                 and (app_is_admin() or t."teamIds" && app_coach_team_ids())))
  with check (exists (select 1 from tournaments t where t.id = "tournamentId"
                 and (app_is_admin() or t."teamIds" && app_coach_team_ids())));

-- ── Contacts: coaches read their players' contacts; owner edits self ──
create policy contacts_read on contacts for select to authenticated
  using (
    app_is_admin()
    or "userId" = app_current_user_id()
    or exists (select 1 from unnest("playerIds") pid
               where app_can_manage_player(pid))
  );
create policy contacts_write on contacts for all to authenticated
  using (app_is_admin() or "userId" = app_current_user_id())
  with check (app_is_admin() or "userId" = app_current_user_id());

-- ── Per-user data: notifications & preferences ───────────────────────
create policy notifications_own on notifications for select to authenticated
  using ("userId" = app_current_user_id());
create policy notifications_update on notifications for update to authenticated
  using ("userId" = app_current_user_id())
  with check ("userId" = app_current_user_id());
create policy notifications_insert on notifications for insert to authenticated
  with check (true);

create policy notif_prefs_own on notification_preferences for all to authenticated
  using ("userId" = app_current_user_id())
  with check ("userId" = app_current_user_id());
