-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Notifications push — pgTAP. Lancement : `supabase test db`.              ║
-- ║                                                                          ║
-- ║ DEUX CHOSES, PARCE QUE LE PUSH EN DÉPEND DEUX FOIS.                      ║
-- ║                                                                          ║
-- ║  1. LES ABONNEMENTS (`push_subscriptions`). Un abonnement est un point   ║
-- ║     de livraison vers un appareil : chacun ne voit, ne crée, ne modifie  ║
-- ║     et ne retire QUE les siens. Ni `anon`, ni un compte sans fiche, ni   ║
-- ║     un joueur n'en créent. Et la suppression d'un compte les emporte.    ║
-- ║  2. QUI PEUT NOTIFIER QUI. L'Edge Function pousse chaque ligne insérée   ║
-- ║     dans `notifications` : une insertion libre serait un message libre  ║
-- ║     sur l'écran verrouillé de n'importe qui. On vérifie que les deux     ║
-- ║     gestes du client (l'entraîneur prévient son encadrement, le parent   ║
-- ║     prévient l'encadrement de l'équipe de son enfant) passent, et que    ║
-- ║     tout le reste est refusé.                                            ║
-- ║                                                                          ║
-- ║ Comme `compte-joueur.test.sql` : chaque identité est jouée par           ║
-- ║ `set local role` + claims, et les résultats se lisent sous `postgres`.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create extension if not exists pgtap with schema extensions;

begin;
select plan(26);

-- ── Décor ─────────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('a1000000-0000-0000-0000-000000000001', 'coach-a@exemple.test'),
  ('b2000000-0000-0000-0000-000000000002', 'coach-b@exemple.test'),
  ('c3000000-0000-0000-0000-000000000003', 'parent@exemple.test'),
  ('d4000000-0000-0000-0000-000000000004', 'joueur@exemple.test'),
  ('e5000000-0000-0000-0000-000000000005', 'inconnu@exemple.test'),
  ('f6000000-0000-0000-0000-000000000006', 'admin@exemple.test');

insert into clubs (id, name) values ('c_np', 'FC Test') on conflict (id) do nothing;
insert into seasons (id, "clubId", name, "startDate", "endDate", active)
  values ('sa_np', 'c_np', '2025-2026', '2025-08-01', '2026-06-30', true);
insert into teams (id, "clubId", "seasonId", name, category, "coachId", color)
values ('t_np_a', 'c_np', 'sa_np', 'U13 A', 'U13', 'u_np_coach_a', '#16a34a'),
       ('t_np_b', 'c_np', 'sa_np', 'U13 B', 'U13', 'u_np_coach_b', '#2563eb');
insert into players (id, "firstName", "lastName", "dateOfBirth", "primaryTeamId",
                     "preferredPosition", appetences, number, active)
values ('p_np_kid', 'Lucas', 'Dupont', '2013-03-15', 't_np_a', 'GK', '{}', 1, true);

insert into users (id, "authId", email, "firstName", "lastName", roles,
                   "teamIds", "playerId")
values
  ('u_np_coach_a', 'a1000000-0000-0000-0000-000000000001',
   'coach-a@exemple.test', 'Éric', 'A', array['coach'], array['t_np_a'], null),
  ('u_np_coach_b', 'b2000000-0000-0000-0000-000000000002',
   'coach-b@exemple.test', 'Stéphane', 'B', array['coach'], array['t_np_b'], null),
  ('u_np_parent', 'c3000000-0000-0000-0000-000000000003',
   'parent@exemple.test', 'Pierre', 'Dupont', array['parent'], '{}', null),
  ('u_np_kid', 'd4000000-0000-0000-0000-000000000004',
   'joueur@exemple.test', 'Lucas', 'Dupont', array['player'], '{}', 'p_np_kid'),
  ('u_np_admin', 'f6000000-0000-0000-0000-000000000006',
   'admin@exemple.test', 'Admin', 'Club', array['admin'], '{}', null);

insert into contacts (id, "firstName", "lastName", phone, email, type,
                      "playerIds", "userId")
values ('ct_np_parent', 'Pierre', 'Dupont', '0600000001', 'parent@exemple.test',
        'père', array['p_np_kid'], 'u_np_parent');

-- L'abonnement de l'entraîneur B, pour vérifier que personne d'autre n'y
-- touche.
insert into push_subscriptions (endpoint, user_id, p256dh, auth)
values ('https://push.exemple.test/b', 'b2000000-0000-0000-0000-000000000002',
        'cle-b', 'auth-b');

-- ── 1. Le mécanisme ───────────────────────────────────────────────────────

select ok(
  (select relrowsecurity from pg_class
    where oid = 'public.push_subscriptions'::regclass),
  'la table des abonnements est sous RLS');
select ok(
  not has_table_privilege('anon', 'push_subscriptions', 'select')
  and not has_table_privilege('anon', 'push_subscriptions', 'insert')
  and not has_table_privilege('authenticated', 'push_subscriptions', 'truncate'),
  'anon n’y a aucun droit, et personne ne la vide d’un TRUNCATE (qui ignore la RLS)');
select ok(
  not has_function_privilege('anon', 'app_can_notify(text)', 'execute'),
  'anon n’exécute pas la fonction d’aide');
select ok(
  (select prosecdef from pg_proc where oid = 'app_can_notify(text)'::regprocedure),
  'app_can_notify est « security definer » : elle lit users sans récursion de RLS');

set local role anon;
select throws_ok($$ select * from push_subscriptions $$,
  '42501', null, 'anon ne lit aucun abonnement');
select throws_ok(
  $$ insert into push_subscriptions (endpoint, user_id, p256dh, auth)
     values ('https://push.exemple.test/anon',
             'a1000000-0000-0000-0000-000000000001', 'k', 'a') $$,
  '42501', null, 'anon n’en crée aucun');
reset role;

-- ── 2. Chacun les siens ───────────────────────────────────────────────────

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated"}';

select lives_ok(
  $$ insert into push_subscriptions (endpoint, user_id, p256dh, auth, user_agent)
     values ('https://push.exemple.test/a',
             'a1000000-0000-0000-0000-000000000001', 'cle-a', 'auth-a',
             'Firefox') $$,
  'un membre enregistre l’abonnement de son appareil');
-- L'`upsert` du transport du socle, tel qu'il part : conflit sur `endpoint`.
select lives_ok(
  $$ insert into push_subscriptions (endpoint, user_id, p256dh, auth)
     values ('https://push.exemple.test/a',
             'a1000000-0000-0000-0000-000000000001', 'cle-a2', 'auth-a2')
     on conflict (endpoint) do update
       set p256dh = excluded.p256dh, auth = excluded.auth $$,
  'et le renouvelle par l’upsert du socle');
select throws_ok(
  $$ insert into push_subscriptions (endpoint, user_id, p256dh, auth)
     values ('https://push.exemple.test/pour-b',
             'b2000000-0000-0000-0000-000000000002', 'k', 'a') $$,
  '42501', null, 'mais n’en crée pas au nom d’un autre');
select throws_ok(
  $$ insert into push_subscriptions (endpoint, user_id, p256dh, auth)
     values ('https://push.exemple.test/b',
             'a1000000-0000-0000-0000-000000000001', 'k', 'a')
     on conflict (endpoint) do update set user_id = excluded.user_id $$,
  '42501', null,
  'ni ne s’approprie, par un upsert, l’appareil d’un autre');
select is(
  (select string_agg(endpoint, ',') from push_subscriptions),
  'https://push.exemple.test/a',
  'il ne voit que les siens');

update push_subscriptions set p256dh = 'vole' where endpoint = 'https://push.exemple.test/b';
delete from push_subscriptions where endpoint = 'https://push.exemple.test/b';
reset role;

select is(
  (select p256dh from push_subscriptions where endpoint = 'https://push.exemple.test/b'),
  'cle-b',
  'l’abonnement d’un autre n’est ni modifié ni supprimé');
select is(
  (select p256dh from push_subscriptions where endpoint = 'https://push.exemple.test/a'),
  'cle-a2', 'le sien a bien été renouvelé');

-- Ni un compte sans fiche, ni un joueur : aucun des deux ne reçoit rien.
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"e5000000-0000-0000-0000-000000000005","role":"authenticated"}';
select throws_ok(
  $$ insert into push_subscriptions (endpoint, user_id, p256dh, auth)
     values ('https://push.exemple.test/e',
             'e5000000-0000-0000-0000-000000000005', 'k', 'a') $$,
  '42501', null, 'un compte sans fiche ne s’abonne pas');
set local request.jwt.claims to
  '{"sub":"d4000000-0000-0000-0000-000000000004","role":"authenticated"}';
select throws_ok(
  $$ insert into push_subscriptions (endpoint, user_id, p256dh, auth)
     values ('https://push.exemple.test/d',
             'd4000000-0000-0000-0000-000000000004', 'k', 'a') $$,
  '42501', null, 'un joueur ne s’abonne pas');

set local request.jwt.claims to
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated"}';
select lives_ok(
  $$ delete from push_subscriptions where endpoint = 'https://push.exemple.test/a' $$,
  'chacun retire le sien');
reset role;
select is(
  (select count(*)::int from push_subscriptions
    where endpoint = 'https://push.exemple.test/a'),
  0, '… et il est bien parti');

-- ── 3. Qui peut notifier qui ──────────────────────────────────────────────

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated"}';
select lives_ok(
  $$ insert into notifications (id, "userId", type, message, "createdAt")
     values ('n_np_1', 'u_np_coach_a', 'match_nouveau', 'Nouveau match',
             '2026-03-01') $$,
  'l’entraîneur prévient l’encadrement de SON équipe (le geste NOTIFY du client)');
select throws_ok(
  $$ insert into notifications (id, "userId", type, message, "createdAt")
     values ('n_np_2', 'u_np_coach_b', 'match_nouveau', 'Nouveau match',
             '2026-03-01') $$,
  '42501', null, 'mais pas celui d’une autre équipe');
select throws_ok(
  $$ insert into notifications (id, "userId", type, message, "createdAt")
     values ('n_np_3', 'u_np_parent', 'match_nouveau', 'Cliquez ici',
             '2026-03-01') $$,
  '42501', null, 'ni un parent, que le client ne notifie pas');

set local request.jwt.claims to
  '{"sub":"c3000000-0000-0000-0000-000000000003","role":"authenticated"}';
select lives_ok(
  $$ insert into notifications (id, "userId", type, message, "createdAt")
     values ('n_np_4', 'u_np_coach_a', 'indispo_declaree', 'Indisponibilité',
             '2026-03-01') $$,
  'le parent prévient l’encadrement de l’équipe de son enfant');
select throws_ok(
  $$ insert into notifications (id, "userId", type, message, "createdAt")
     values ('n_np_5', 'u_np_coach_b', 'indispo_declaree', 'Indisponibilité',
             '2026-03-01') $$,
  '42501', null, 'mais pas celui d’une équipe qui n’est pas la sienne');

set local request.jwt.claims to
  '{"sub":"e5000000-0000-0000-0000-000000000005","role":"authenticated"}';
select throws_ok(
  $$ insert into notifications (id, "userId", type, message, "createdAt")
     values ('n_np_6', 'u_np_coach_a', 'match_nouveau', 'Spam', '2026-03-01') $$,
  '42501', null, 'un compte sans fiche ne notifie personne');

set local request.jwt.claims to
  '{"sub":"d4000000-0000-0000-0000-000000000004","role":"authenticated"}';
select throws_ok(
  $$ insert into notifications (id, "userId", type, message, "createdAt")
     values ('n_np_7', 'u_np_coach_a', 'match_nouveau', 'Blague', '2026-03-01') $$,
  '42501', null, 'un joueur non plus');

set local request.jwt.claims to
  '{"sub":"f6000000-0000-0000-0000-000000000006","role":"authenticated"}';
select lives_ok(
  $$ insert into notifications (id, "userId", type, message, "createdAt")
     values ('n_np_8', 'u_np_coach_b', 'match_nouveau', 'Info club',
             '2026-03-01') $$,
  'l’administrateur notifie qui il veut');
reset role;

-- ── 4. Un compte supprimé emporte ses abonnements ─────────────────────────

delete from auth.users where id = 'b2000000-0000-0000-0000-000000000002';
select is(
  (select count(*)::int from push_subscriptions
    where user_id = 'b2000000-0000-0000-0000-000000000002'),
  0, 'la suppression d’un compte emporte ses abonnements (cascade)');

select * from finish();
rollback;
