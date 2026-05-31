-- Mister Footcoach — minimal seed. Enough to boot a non-empty app; the rest
-- is created from the UI. Replace the admin "authId" with the uuid of the
-- Supabase auth user you create in the dashboard (Authentication → Users).

insert into clubs (id, name) values ('club1', 'FC Exemple')
  on conflict (id) do nothing;

insert into seasons (id, "clubId", name, "startDate", "endDate", active)
  values ('s1', 'club1', '2025-2026', '2025-08-01', '2026-06-30', true)
  on conflict (id) do nothing;

insert into club_settings (id, "autoSurveyOnMatch") values ('default', true)
  on conflict (id) do nothing;

-- Admin profile — set "authId" to your Supabase auth user's uuid to log in.
insert into users (id, "authId", email, "firstName", "lastName", roles, "teamIds")
  values ('u3', null, 'admin@fc-exemple.fr', 'Admin', 'Club',
          array['admin'], array['t1','t2'])
  on conflict (id) do nothing;

insert into teams (id, "clubId", "seasonId", name, category, "coachId", color) values
  ('t1', 'club1', 's1', 'U13 A', 'U13', 'u3', '#16a34a'),
  ('t2', 'club1', 's1', 'U13 B', 'U13', 'u3', '#2563eb')
  on conflict (id) do nothing;

insert into players (id, "firstName", "lastName", "dateOfBirth", "primaryTeamId", "preferredPosition", appetences, number, active) values
  ('p1', 'Lucas', 'Dupont', '2012-03-15', 't1', 'GK', '{"GK":5}', 1, true),
  ('p2', 'Théo', 'Martin', '2012-07-22', 't1', 'DD', '{"DD":5}', 2, true),
  ('p3', 'Mathis', 'Bernard', '2012-11-05', 't1', 'DC', '{"DC":5}', 3, true),
  ('p5', 'Hugo', 'Petit', '2012-05-30', 't1', 'MC', '{"MC":5}', 6, true)
  on conflict (id) do nothing;
