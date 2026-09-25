-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Le compte joueur — pgTAP. Lancement : `supabase test db`.                ║
-- ║                                                                          ║
-- ║ CE QUE CE FICHIER PROUVE, DANS L'ORDRE OÙ ÇA COMPTE.                     ║
-- ║                                                                          ║
-- ║  1. LE MÉCANISME. Les RPC sont `security definer` et appartiennent à     ║
-- ║     `postgres` ; AUCUNE fonction neuve n'est exécutable par `anon` ; les ║
-- ║     fonctions internes ne le sont pas non plus par `authenticated` ; le  ║
-- ║     haché du code ne se lit pas.                                         ║
-- ║  2. LE CONSENTEMENT. Seul un parent LIÉ crée un code — ni l'entraîneur,  ║
-- ║     ni l'administrateur, ni un autre parent, ni un inconnu — et ce lien  ║
-- ║     ne se fabrique pas : un parent ne s'ajoute pas un enfant, et un      ║
-- ║     compte ne se donne pas de rôle. Sans ces deux assertions, « un       ║
-- ║     parent non lié ne peut pas inviter » serait vrai… jusqu'à ce qu'il   ║
-- ║     se lie lui-même.                                                     ║
-- ║     Et un lien ou un identifiant NUL n'ouvre rien : il est refusé.       ║
-- ║  3. LE CODE. Haché, jamais en clair ; refusé expiré, déjà utilisé ou     ║
-- ║     révoqué, d'un même message.                                          ║
-- ║  4. LA MINIMISATION. Le joueur lit sa fiche, les matchs, entraînements   ║
-- ║     et sondages de SES équipes, et sa réponse — rien d'autre : ni        ║
-- ║     contacts, ni blessures, ni indisponibilités, ni coéquipiers, ni note ║
-- ║     du coach.                                                            ║
-- ║  5. L'ÉCRITURE. Aucune directe ; son intention par la RPC, pour lui      ║
-- ║     seul, sur un sondage ouvert de son équipe — et la confirmation du    ║
-- ║     parent n'en bouge pas.                                               ║
-- ║  6. LA RÉVOCATION COUPE L'ACCÈS, et la suppression d'un compte (parent   ║
-- ║     ou enfant) laisse la base dans un état qui se relit.                 ║
-- ║                                                                          ║
-- ║ CHAQUE IDENTITÉ EST JOUÉE POUR DE VRAI : `set local role` + les claims   ║
-- ║ du JWT. Sous `postgres`, qui ignore la RLS, ce fichier ne prouverait     ║
-- ║ rien. Les vérifications de RÉSULTAT, elles, se lisent sous `postgres` :  ║
-- ║ elles doivent voir ce que l'appelant, justement, ne voit pas.            ║
-- ║                                                                          ║
-- ║ Les comptages portent sur les lignes de CE fichier (`_cj`) : `0003` sème ║
-- ║ déjà des équipes et des joueurs, qu'un `count(*)` global compterait.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create extension if not exists pgtap with schema extensions;

begin;
select plan(104);

-- ── Décor ─────────────────────────────────────────────────────────────────
--
-- Deux équipes. Dans l'équipe A : Lucas (l'enfant qu'on invite) et Théo, son
-- coéquipier — blessé, indisponible, noté par le coach : tout ce que Lucas ne
-- doit pas lire. Dans l'équipe B : Hugo, l'enfant d'un AUTRE parent.

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'admin@exemple.test'),
  ('20000000-0000-0000-0000-000000000002', 'coach@exemple.test'),
  ('30000000-0000-0000-0000-000000000003', 'parent@exemple.test'),
  ('40000000-0000-0000-0000-000000000004', 'autre-parent@exemple.test'),
  ('50000000-0000-0000-0000-000000000005', 'lucas@exemple.test'),
  ('60000000-0000-0000-0000-000000000006', 'hugo@exemple.test'),
  ('70000000-0000-0000-0000-000000000007', 'inconnu@exemple.test');

insert into clubs (id, name) values ('c_cj', 'FC Test') on conflict (id) do nothing;
insert into seasons (id, "clubId", name, "startDate", "endDate", active)
  values ('sa_cj', 'c_cj', '2025-2026', '2025-08-01', '2026-06-30', true);

insert into teams (id, "clubId", "seasonId", name, category, "coachId", color)
values ('t_cj_a', 'c_cj', 'sa_cj', 'U13 A', 'U13', 'u_cj_coach', '#16a34a'),
       ('t_cj_b', 'c_cj', 'sa_cj', 'U13 B', 'U13', null, '#2563eb');

insert into players (id, "firstName", "lastName", "dateOfBirth", "primaryTeamId",
                     "preferredPosition", appetences, number, active)
values ('p_cj_kid', 'Lucas', 'Dupont', '2013-03-15', 't_cj_a', 'GK', '{}', 1, true),
       ('p_cj_mate', 'Théo', 'Martin', '2013-07-22', 't_cj_a', 'DD', '{}', 2, true),
       ('p_cj_other', 'Hugo', 'Petit', '2013-05-30', 't_cj_b', 'MC', '{}', 6, true);

insert into users (id, "authId", email, "firstName", "lastName", roles, "teamIds")
values
  ('u_cj_admin', '10000000-0000-0000-0000-000000000001', 'admin@exemple.test',
   'Admin', 'Club', array['admin'], '{}'),
  ('u_cj_coach', '20000000-0000-0000-0000-000000000002', 'coach@exemple.test',
   'Éric', 'Coach', array['coach'], array['t_cj_a']),
  ('u_cj_parent', '30000000-0000-0000-0000-000000000003', 'parent@exemple.test',
   'Pierre', 'Dupont', array['parent'], '{}'),
  ('u_cj_autre', '40000000-0000-0000-0000-000000000004',
   'autre-parent@exemple.test', 'Jean', 'Petit', array['parent'], '{}');

-- Les liens de filiation : Pierre → Lucas, Jean → Hugo. La mère de Théo n'a
-- pas de compte ; sa fiche porte un téléphone que Lucas ne doit pas lire.
insert into contacts (id, "firstName", "lastName", phone, email, type,
                      "playerIds", "userId")
values ('ct_cj_parent', 'Pierre', 'Dupont', '0600000001', 'parent@exemple.test',
        'père', array['p_cj_kid'], 'u_cj_parent'),
       ('ct_cj_autre', 'Jean', 'Petit', '0600000002',
        'autre-parent@exemple.test', 'père', array['p_cj_other'], 'u_cj_autre'),
       ('ct_cj_mate', 'Anne', 'Martin', '0600000003', 'anne@exemple.test',
        'mère', array['p_cj_mate'], null);

insert into matches (id, "teamId", "seasonId", date, time, location, address,
                     "isHome", opponent, status, phase)
values ('m_cj_a', 't_cj_a', 'sa_cj', '2026-03-07', '10:00', 'Stade',
        '1 rue du Stade', true, 'FC Voisin', 'saison', 'Phase 1'),
       ('m_cj_b', 't_cj_b', 'sa_cj', '2026-03-07', '14:00', 'Stade',
        '1 rue du Stade', true, 'AS Loin', 'saison', 'Phase 1');

insert into trainings (id, "teamId", date, time, duration, type)
values ('tr_cj_a', 't_cj_a', '2026-03-03', '18:00', 90, 'regulier'),
       ('tr_cj_b', 't_cj_b', '2026-03-04', '18:00', 90, 'regulier');

insert into surveys (id, "teamId", "sessionType", "sessionId", question,
                     deadline, status, "createdBy")
values ('sv_cj_open', 't_cj_a', 'match', 'm_cj_a', 'Présent samedi ?',
        '2026-03-06', 'ouvert', 'u_cj_coach'),
       ('sv_cj_new', 't_cj_a', 'training', 'tr_cj_a', 'Présent mardi ?',
        '2026-03-02', 'ouvert', 'u_cj_coach'),
       ('sv_cj_closed', 't_cj_a', 'libre', null, 'Tournoi de juin ?',
        '2026-02-01', 'ferme', 'u_cj_coach'),
       ('sv_cj_b', 't_cj_b', 'match', 'm_cj_b', 'Présent samedi ?',
        '2026-03-06', 'ouvert', null),
       -- Un sondage SANS équipe : la colonne l'autorise. Il n'est celui de
       -- personne — et surtout pas de Lucas.
       ('sv_cj_orphan', null, 'libre', null, 'Sondage sans équipe ?',
        '2026-03-06', 'ouvert', null);

-- La réponse de Lucas porte la confirmation de son père ET une note du coach.
insert into survey_responses (id, "surveyId", "playerId", "confirmationParent",
                              "dateConfirmationParent", "parentUserId", note)
values ('sr_cj_kid', 'sv_cj_open', 'p_cj_kid', 'absent', '2026-03-01',
        'u_cj_parent', 'Famille en déplacement — vu avec le père'),
       ('sr_cj_mate', 'sv_cj_open', 'p_cj_mate', 'present', '2026-03-01',
        null, null);

insert into injuries (id, "playerId", zone, nature, "startDate", status)
values ('in_cj_mate', 'p_cj_mate', 'genou', 'entorse', '2026-02-20', 'en_reeduc'),
       ('in_cj_kid', 'p_cj_kid', 'cheville', 'élongation', '2026-01-10', 'apte');
insert into unavailabilities (id, "playerId", "startDate", motif, "declaredBy")
values ('un_cj_mate', 'p_cj_mate', '2026-02-20', 'blessure', 'u_cj_coach'),
       ('un_cj_kid', 'p_cj_kid', '2026-01-10', 'blessure', 'u_cj_coach');
insert into attendances (id, "sessionType", "sessionId", "playerId", status)
values ('at_cj_mate', 'training', 'tr_cj_a', 'p_cj_mate', 'absent');
insert into position_history (id, "playerId", "matchId", "matchDate", opponent,
                              period, position)
values ('ph_cj_mate', 'p_cj_mate', 'm_cj_a', '2026-03-07', 'FC Voisin',
        'complet', 'DD');
insert into match_events (id, "matchId", type, minute, "playerId")
values ('ev_cj', 'm_cj_a', 'blessure_live', 12, 'p_cj_mate');
insert into lineups (id, "teamId", name, formation, slots, "substituteIds",
                     "createdAt")
values ('lu_cj', 't_cj_a', 'Compo', '2-3-2', '[]', '{}', '2026-03-01');
insert into carpool_offers (id, "matchId", "offeredBy", seats, "playerIds")
values ('co_cj', 'm_cj_a', 'u_cj_parent', 3, array['p_cj_mate']);
insert into tournaments (id, "seasonId", name, "dateStart", location, address,
                         organizer, "teamIds", format, status)
values ('to_cj', 'sa_cj', 'Tournoi', '2026-06-01', 'Lieu', 'Adresse', 'Org',
        array['t_cj_a'], 'poules', 'planifie');
insert into exercises (id, title, category) values ('ex_cj', 'Rondo', 'technique');
insert into notification_preferences ("userId") values ('u_cj_coach');

-- ── 1. Le mécanisme ───────────────────────────────────────────────────────

select is(
  (select count(*)::int from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('create_player_invitation', 'redeem_player_invitation',
                      'revoke_player_access', 'set_player_intention',
                      'my_survey_responses')
      and prosecdef
      and pg_get_userbyid(proowner) = 'postgres'),
  5,
  'les cinq RPC sont « security definer » et appartiennent à postgres'
);

select is(
  (select string_agg(proname, ', ' order by proname) from pg_proc p
    where pronamespace = 'public'::regnamespace
      and proname in ('app_is_member', 'app_is_player_only', 'app_player_id',
                      'app_player_team_ids', 'app_guard_users_columns',
                      'app_guard_contacts_links', 'app_close_player_account',
                      'create_player_invitation', 'redeem_player_invitation',
                      'revoke_player_access', 'set_player_intention',
                      'my_survey_responses')
      and has_function_privilege('anon', p.oid, 'execute')),
  null,
  'anon n’exécute AUCUNE des fonctions neuves (les privilèges par défaut de Supabase la lui donnaient)'
);

select is(
  (select string_agg(proname, ', ' order by proname) from pg_proc p
    where pronamespace = 'public'::regnamespace
      and proname in ('app_guard_users_columns', 'app_guard_contacts_links',
                      'app_close_player_account')
      and has_function_privilege('authenticated', p.oid, 'execute')),
  null,
  'les fonctions internes ne sont pas non plus appelables par un compte connecté'
);

select ok(
  not has_column_privilege('authenticated', 'player_invitations', 'codeHash', 'select'),
  'le haché du code ne se lit pas, même par qui lit l’invitation'
);

select ok(
  not has_table_privilege('authenticated', 'player_invitations', 'insert')
  and not has_table_privilege('authenticated', 'player_invitations', 'update')
  and not has_table_privilege('authenticated', 'player_invitations', 'delete')
  and not has_table_privilege('anon', 'player_invitations', 'select'),
  'aucune écriture directe sur les invitations, et rien pour anon : tout passe par les RPC'
);

-- `redeem_player_invitation` recopie l'adresse du compte depuis auth.users :
-- elle le peut parce que postgres a le droit de LIRE cette table (grant ou
-- propriété), pas par un privilège de superutilisateur — même raisonnement
-- que pour `delete_my_account`.
select ok(
  (select relowner = 'postgres'::regrole::oid
     from pg_class where oid = 'auth.users'::regclass)
  or exists (
    select 1
      from pg_class c, aclexplode(c.relacl) a
     where c.oid = 'auth.users'::regclass
       and a.grantee = 'postgres'::regrole::oid
       and a.privilege_type = 'SELECT'
  ),
  'postgres lit auth.users par un droit ACCORDÉ : l’adresse recopiée l’est aussi sur un projet hébergé'
);

-- ── anon n'appelle rien ───────────────────────────────────────────────────

set local role anon;
select throws_ok($$ select create_player_invitation('p_cj_kid') $$,
  '42501', null, 'anon ne crée pas de code');
select throws_ok($$ select redeem_player_invitation('ABCDEFGHJKLM') $$,
  '42501', null, 'anon n’utilise pas de code');
select throws_ok($$ select revoke_player_access('p_cj_kid') $$,
  '42501', null, 'anon ne coupe aucun accès');
select throws_ok($$ select set_player_intention('sv_cj_open', 'present') $$,
  '42501', null, 'anon ne répond à aucun sondage');
select throws_ok($$ select * from my_survey_responses() $$,
  '42501', null, 'anon ne lit aucune réponse');
reset role;

-- ── 2. Qui peut consentir ─────────────────────────────────────────────────

-- Un compte tout juste inscrit, sans fiche.
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"70000000-0000-0000-0000-000000000007","role":"authenticated"}';
select throws_ok($$ select create_player_invitation('p_cj_kid') $$,
  '42501', 'parent_non_lie', 'un compte sans fiche ne crée pas de code');

-- L'entraîneur de l'équipe : il gère le joueur, il ne consent pas pour lui.
set local request.jwt.claims to
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}';
select throws_ok($$ select create_player_invitation('p_cj_kid') $$,
  '42501', 'parent_non_lie', 'l’entraîneur ne crée pas de code pour un joueur');

-- L'administrateur non plus : le consentement est celui d'un parent.
set local request.jwt.claims to
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok($$ select create_player_invitation('p_cj_kid') $$,
  '42501', 'parent_non_lie', 'l’administrateur ne consent pas à la place d’un parent');

-- Jean, parent d'Hugo, n'est pas lié à Lucas…
set local request.jwt.claims to
  '{"sub":"40000000-0000-0000-0000-000000000004","role":"authenticated"}';
select throws_ok($$ select create_player_invitation('p_cj_kid') $$,
  '42501', 'parent_non_lie', 'un parent NON LIÉ ne peut pas inviter');

-- … et ne peut pas le devenir. C'est ce qui donne un sens à l'assertion
-- précédente : sans ces deux-là, il s'ajoutait Lucas, puis invitait.
select throws_ok(
  $$ update contacts set "playerIds" = array['p_cj_other', 'p_cj_kid']
      where id = 'ct_cj_autre' $$,
  '42501', null,
  'un parent ne s’ajoute pas un enfant sur sa fiche de contact');
select throws_ok(
  $$ insert into contacts (id, "firstName", "lastName", phone, email, type,
                           "playerIds", "userId")
     values ('ct_cj_fake', 'Jean', 'Petit', '0600000009', 'x@exemple.test',
             'père', array['p_cj_kid'], 'u_cj_autre') $$,
  '42501', null,
  'ni en créant une seconde fiche de contact liée à l’enfant');

-- Ce qu'il pouvait faire, il le peut toujours : corriger ses coordonnées,
-- y compris par l'`upsert` qu'envoie le client.
select lives_ok(
  $$ update contacts set phone = '0611111111' where id = 'ct_cj_autre' $$,
  'le titulaire corrige toujours son téléphone');
select lives_ok(
  $$ insert into contacts (id, "firstName", "lastName", phone, email, type,
                           "playerIds", "userId")
     values ('ct_cj_autre', 'Jean', 'Petit', '0622222222',
             'autre-parent@exemple.test', 'père', array['p_cj_other'],
             'u_cj_autre')
     on conflict (id) do update set phone = excluded.phone $$,
  '… et par un upsert qui ne touche pas au lien');

-- Un compte ne se donne ni rôle, ni rattachement.
select throws_ok(
  $$ update users set roles = array['admin'] where id = 'u_cj_autre' $$,
  '42501', null, 'un compte ne se donne pas le rôle admin');
select throws_ok(
  $$ update users set "playerId" = 'p_cj_kid' where id = 'u_cj_autre' $$,
  '42501', null, 'ni un rattachement à un joueur');
select lives_ok(
  $$ update users set "firstName" = 'Jean-Marc' where id = 'u_cj_autre' $$,
  'il corrige toujours son prénom');
reset role;

-- ── 3. Le code ────────────────────────────────────────────────────────────

-- Pierre, lié à Lucas, crée un code. `set_config` le garde pour la suite de
-- la transaction : c'est le parent qui le transmet à l'enfant.
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}';
select ok(
  set_config('test.code1',
             (create_player_invitation('p_cj_kid')) ->> 'code', true)
    ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$',
  'le parent lié crée un code : 12 caractères de l’alphabet sans 0/O ni 1/I'
);
select is(
  (select count(*)::int from player_invitations where "playerId" = 'p_cj_kid'),
  1, 'il voit son invitation (sans le haché)');
select throws_ok($$ select "codeHash" from player_invitations $$,
  '42501', null, 'mais ne lit pas le haché');
reset role;

select ok(
  exists (select 1 from player_invitations
           where "playerId" = 'p_cj_kid'
             and "createdBy" = 'u_cj_parent'
             and "consentedAt" = now()
             and "expiresAt" = now() + interval '7 days'),
  'la ligne garde QUI a consenti et QUAND, et expire sept jours plus tard'
);
select is(
  (select count(*)::int from player_invitations
    where "codeHash" = encode(sha256(convert_to(current_setting('test.code1'), 'UTF8')), 'hex')),
  1, 'le code est gardé HACHÉ');
select ok(
  not exists (select 1 from player_invitations i
               where i::text like '%' || current_setting('test.code1') || '%'),
  'le code en clair n’est écrit dans aucune colonne');

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"40000000-0000-0000-0000-000000000004","role":"authenticated"}';
select is(
  (select count(*)::int from player_invitations where "playerId" = 'p_cj_kid'),
  0, 'un autre parent ne voit pas l’invitation');

-- Un nouveau code remplace l'ancien : le premier est révoqué.
set local request.jwt.claims to
  '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}';
select ok(
  length(set_config('test.code2',
         (create_player_invitation('p_cj_kid')) ->> 'code', true)) = 12,
  'le parent crée un second code');
reset role;

select ok(
  exists (select 1 from player_invitations
           where "codeHash" = encode(sha256(convert_to(current_setting('test.code1'), 'UTF8')), 'hex')
             and "revokedAt" is not null and "revokedBy" = 'u_cj_parent'),
  'un seul code en attente par joueur : le nouveau révoque le précédent');

-- Lucas crée son compte (ici : sa ligne d'auth.users) et essaie les codes.
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"50000000-0000-0000-0000-000000000005","role":"authenticated"}';
select throws_ok(
  format('select redeem_player_invitation(%L)', current_setting('test.code1')),
  '22023', 'invitation_invalide', 'un code RÉVOQUÉ est refusé');
reset role;

update player_invitations set "expiresAt" = now() - interval '1 second'
 where "codeHash" = encode(sha256(convert_to(current_setting('test.code2'), 'UTF8')), 'hex');

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"50000000-0000-0000-0000-000000000005","role":"authenticated"}';
select throws_ok(
  format('select redeem_player_invitation(%L)', current_setting('test.code2')),
  '22023', 'invitation_invalide', 'un code EXPIRÉ est refusé');
select throws_ok($$ select redeem_player_invitation('ABCD-EFGH-JKLM') $$,
  '22023', 'invitation_invalide', 'un code INCONNU est refusé, du même message');

set local request.jwt.claims to
  '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}';
select ok(
  length(set_config('test.code3',
         (create_player_invitation('p_cj_kid')) ->> 'code', true)) = 12,
  'le parent crée un troisième code');

-- Saisi en minuscules et avec les tirets de l'affichage : la normalisation
-- est celle du client.
set local request.jwt.claims to
  '{"sub":"50000000-0000-0000-0000-000000000005","role":"authenticated"}';
select lives_ok(
  format('select redeem_player_invitation(%L)',
         lower(substr(current_setting('test.code3'), 1, 4) || '-'
               || substr(current_setting('test.code3'), 5, 4) || '-'
               || substr(current_setting('test.code3'), 9, 4))),
  'Lucas utilise le code valide, saisi en minuscules avec ses tirets');
select throws_ok(
  format('select redeem_player_invitation(%L)', current_setting('test.code3')),
  '22023', 'compte_deja_rattache',
  'un compte déjà rattaché ne réutilise pas de code');

set local request.jwt.claims to
  '{"sub":"60000000-0000-0000-0000-000000000006","role":"authenticated"}';
select throws_ok(
  format('select redeem_player_invitation(%L)', current_setting('test.code3')),
  '22023', 'invitation_invalide', 'un code DÉJÀ UTILISÉ est refusé');

-- Un parent qui essaierait le code avec SON compte ne devient pas joueur.
set local request.jwt.claims to
  '{"sub":"40000000-0000-0000-0000-000000000004","role":"authenticated"}';
select throws_ok($$ select redeem_player_invitation('ABCDEFGHJKLM') $$,
  '22023', 'compte_deja_rattache',
  'un compte d’adulte ne se transforme pas en compte joueur');

-- Un compte ouvert : pas de second code tant qu'il existe.
set local request.jwt.claims to
  '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}';
select throws_ok($$ select create_player_invitation('p_cj_kid') $$,
  '22023', 'compte_deja_actif', 'un seul compte par joueur');
reset role;

select ok(
  exists (select 1 from users
           where "authId" = '50000000-0000-0000-0000-000000000005'
             and roles = array['player']
             and "teamIds" = '{}'
             and "playerId" = 'p_cj_kid'
             and email = 'lucas@exemple.test'
             and "firstName" = 'Lucas'),
  'le compte de Lucas est rattaché à SA fiche, avec le seul rôle joueur');
select ok(
  exists (select 1 from player_invitations i
            join users u on u.id = i."redeemedBy"
           where i."codeHash" = encode(sha256(convert_to(current_setting('test.code3'), 'UTF8')), 'hex')
             and i."redeemedAt" = now()
             and u."authId" = '50000000-0000-0000-0000-000000000005'),
  'l’invitation dit quand, et par quel compte, elle a été utilisée');

-- ── 4. Ce que lit Lucas ───────────────────────────────────────────────────

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"50000000-0000-0000-0000-000000000005","role":"authenticated"}';

select is((select string_agg(id, ',' order by id) from players), 'p_cj_kid',
  'il lit SA fiche, et aucune autre — ni celle de son coéquipier');
select is((select count(*)::int from contacts), 0,
  'aucun contact — pas même celui de son père');
select is((select count(*)::int from injuries), 0,
  'aucune blessure — pas même la sienne');
select is((select count(*)::int from unavailabilities), 0,
  'aucune indisponibilité');
select is(
  (select count(*)::int from attendances)
  + (select count(*)::int from position_history)
  + (select count(*)::int from match_events)
  + (select count(*)::int from lineups)
  + (select count(*)::int from carpool_offers)
  + (select count(*)::int from tournaments)
  + (select count(*)::int from exercises)
  + (select count(*)::int from notification_preferences),
  0,
  'ni assiduité, ni postes, ni événements de match, ni compositions, ni covoiturage, ni tournois, ni exercices, ni préférences');
select is((select string_agg("authId"::text, ',') from users),
  '50000000-0000-0000-0000-000000000005',
  'dans l’annuaire, sa seule fiche : aucune adresse d’adulte');
select is((select string_agg(id, ',' order by id) from teams), 't_cj_a',
  'ses équipes, pas celles des autres');
select is((select string_agg(id, ',' order by id) from matches), 'm_cj_a',
  'les matchs de son équipe, pas les autres');
select is((select string_agg(id, ',' order by id) from trainings), 'tr_cj_a',
  'les entraînements de son équipe, pas les autres');
select is((select string_agg(id, ',' order by id) from surveys),
  'sv_cj_closed,sv_cj_new,sv_cj_open',
  'les sondages de son équipe, pas ceux de l’équipe B');
select is((select count(*)::int from survey_responses), 0,
  'la table des réponses ne lui est pas ouverte : elle porte la note du coach');
select is(
  (select string_agg(id || ':' || coalesce("confirmationParent", '-'), ',')
     from my_survey_responses()),
  'sr_cj_kid:absent',
  'sa réponse, par la RPC : la sienne seule, avec la confirmation de son père');

-- ── 5. Ce qu'écrit Lucas ──────────────────────────────────────────────────

select throws_ok(
  $$ insert into survey_responses (id, "surveyId", "playerId", "intentionJoueur")
     values ('sr_cj_fake', 'sv_cj_open', 'p_cj_mate', 'absent') $$,
  '42501', null, 'aucune écriture directe dans les réponses');
select throws_ok(
  $$ insert into contacts (id, "firstName", "lastName", phone, email, type,
                           "playerIds", "userId")
     values ('ct_cj_kid', 'Lucas', 'Dupont', '0', 'l@exemple.test', 'autre',
             '{}', (select id from users limit 1)) $$,
  '42501', null, 'ni fiche de contact à son nom');
select throws_ok(
  $$ insert into carpool_offers (id, "matchId", "offeredBy", seats, "playerIds")
     values ('co_cj_kid', 'm_cj_a', (select id from users limit 1), 2, '{}') $$,
  '42501', null, 'ni offre de covoiturage');
select throws_ok(
  $$ insert into notifications (id, "userId", type, message, "createdAt")
     values ('n_cj_kid', 'u_cj_coach', 'match_modifie', 'Match annulé !',
             '2026-03-01') $$,
  '42501', null, 'ni notification — donc aucun push');

-- Deux tentatives qui ne lèvent pas, parce que la ligne lui est INVISIBLE en
-- écriture : on vérifie plus bas, sous postgres, qu'elles n'ont rien changé.
update survey_responses set "confirmationParent" = 'present' where id = 'sr_cj_kid';
update users set roles = array['admin'], "playerId" = 'p_cj_mate'
 where "authId" = '50000000-0000-0000-0000-000000000005';

select lives_ok($$ select set_player_intention('sv_cj_open', 'present') $$,
  'il dit son intention sur un sondage ouvert de son équipe');
select lives_ok($$ select set_player_intention('sv_cj_new', 'absent') $$,
  '… y compris quand personne n’a encore répondu');
select lives_ok($$ select set_player_intention('sv_cj_new', 'incertain') $$,
  '… et change d’avis');
select throws_ok($$ select set_player_intention('sv_cj_closed', 'present') $$,
  '22023', 'sondage_ferme', 'un sondage FERMÉ est refusé');
select throws_ok($$ select set_player_intention('sv_cj_b', 'present') $$,
  '42501', 'sondage_inaccessible', 'un sondage d’une AUTRE équipe est refusé');
select throws_ok($$ select set_player_intention('sv_cj_orphan', 'present') $$,
  '42501', 'sondage_inaccessible',
  'un sondage SANS équipe aussi : une équipe nulle n’est pas « la sienne »');
select throws_ok($$ select set_player_intention('sv_cj_open', 'peut-etre') $$,
  '22023', 'intention_invalide', 'une valeur hors de présent / absent / incertain est refusée');
reset role;

select ok(
  exists (select 1 from survey_responses
           where id = 'sr_cj_kid'
             and "intentionJoueur" = 'present'
             and "dateIntentionJoueur" = to_char(now() at time zone 'utc', 'YYYY-MM-DD')
             and "confirmationParent" = 'absent'
             and "parentUserId" = 'u_cj_parent'
             and note = 'Famille en déplacement — vu avec le père'),
  'son intention est écrite ; la confirmation du parent, la note et le répondant n’ont pas bougé');
select is(
  (select string_agg("intentionJoueur", ',') from survey_responses
    where "surveyId" = 'sv_cj_new' and "playerId" = 'p_cj_kid'
      and "confirmationParent" is null),
  'incertain',
  'une seule ligne créée pour lui, à sa dernière valeur');
select is(
  (select count(*)::int from survey_responses
    where "playerId" = 'p_cj_mate' and "intentionJoueur" is not null),
  0, 'il ne répond jamais pour un autre : rien chez son coéquipier');
select ok(
  exists (select 1 from users
           where "authId" = '50000000-0000-0000-0000-000000000005'
             and roles = array['player'] and "playerId" = 'p_cj_kid'),
  'ses tentatives directes n’ont changé ni son rôle ni son rattachement');

-- La confirmation du parent reste le geste du parent, et prévaut.
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}';
select throws_ok($$ select set_player_intention('sv_cj_open', 'absent') $$,
  '42501', 'compte_joueur_requis', 'un parent n’emprunte pas la RPC du joueur');
select is((select count(*)::int from my_survey_responses()), 0,
  'et la lecture du joueur ne rend rien à un autre compte');
update survey_responses set "confirmationParent" = 'present' where id = 'sr_cj_kid';
select is(
  (select "confirmationParent" from survey_responses where id = 'sr_cj_kid'),
  'present', 'le parent confirme toujours pour son enfant, comme avant');

-- ── Qui voit les comptes joueurs ──────────────────────────────────────────

select is(
  (select count(*)::int from users where 'player' = any(roles)), 0,
  'le parent ne lit pas la fiche du compte de son enfant (il en voit l’invitation)');

set local request.jwt.claims to
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}';
select is(
  (select count(*)::int from users where 'player' = any(roles)), 0,
  'l’entraîneur non plus : c’est l’adresse d’un mineur');
select is(
  (select string_agg(id, ',' order by id) from users where id like 'u_cj_%'),
  'u_cj_admin,u_cj_autre,u_cj_coach,u_cj_parent',
  'mais il lit toujours l’annuaire des adultes, comme avant');
select is(
  (select count(*)::int from teams where id like 't_cj_%'), 2,
  'et toutes les équipes du club');

set local request.jwt.claims to
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';
select is(
  (select count(*)::int from users where 'player' = any(roles)), 1,
  'l’administrateur voit les comptes joueurs');
select is(
  (select count(*)::int from player_invitations where "playerId" = 'p_cj_kid'), 3,
  '… et les invitations, avec leur trace de consentement');

-- Un compte inscrit sans fiche : il ne voit rien de ce que 0002 ouvrait à
-- « tout compte authentifié ».
set local request.jwt.claims to
  '{"sub":"70000000-0000-0000-0000-000000000007","role":"authenticated"}';
select is(
  (select count(*)::int from users) + (select count(*)::int from teams)
  + (select count(*)::int from clubs) + (select count(*)::int from seasons)
  + (select count(*)::int from club_settings)
  + (select count(*)::int from exercises),
  0,
  'un compte sans fiche ne lit ni l’annuaire, ni les équipes, ni le club, ni les exercices');

-- ── Un lien nul ne vaut pas un lien ───────────────────────────────────────
--
-- Une fiche de contact ABÎMÉE : `"playerIds"` porte un élément NUL — une
-- donnée d'avant 0006, ou une erreur d'administration, puisque plus personne
-- d'autre ne l'écrit. Pour SQL, `'p' = any('{NULL}')` ne vaut pas faux mais
-- NUL, et `if not (NUL)` ne lève rien : sans garde, ce parent-là créait un
-- code pour n'importe quel enfant, et coupait l'accès de n'importe lequel.
-- Sa fiche ne porte pas le préfixe `u_cj_` : l'annuaire compté plus haut
-- reste celui du décor.
reset role;
insert into auth.users (id, email)
  values ('80000000-0000-0000-0000-000000000008', 'lien-nul@exemple.test');
insert into users (id, "authId", email, "firstName", "lastName", roles, "teamIds")
  values ('u_nul', '80000000-0000-0000-0000-000000000008',
          'lien-nul@exemple.test', 'Marc', 'Nul', array['parent'], '{}');
insert into contacts (id, "firstName", "lastName", phone, email, type,
                      "playerIds", "userId")
  values ('ct_nul', 'Marc', 'Nul', '0600000004', 'lien-nul@exemple.test',
          'père', array[null]::text[], 'u_nul');

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"80000000-0000-0000-0000-000000000008","role":"authenticated"}';
select throws_ok($$ select create_player_invitation('p_cj_kid') $$,
  '42501', 'parent_non_lie', 'un lien NUL ne fait pas un parent : pas de code');
select throws_ok($$ select revoke_player_access('p_cj_kid') $$,
  '42501', 'parent_non_lie', '… ni de coupure d’accès');

-- Un identifiant nul non plus, même pour le parent lié : refusé, pas ignoré.
set local request.jwt.claims to
  '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}';
select throws_ok($$ select create_player_invitation(null) $$,
  '42501', 'parent_non_lie', 'un joueur NUL n’est l’enfant de personne');
select throws_ok($$ select revoke_player_access(null) $$,
  '42501', 'parent_non_lie', '… et couper son accès est refusé, pas ignoré');

-- ── 6. Couper l'accès ─────────────────────────────────────────────────────

set local request.jwt.claims to
  '{"sub":"40000000-0000-0000-0000-000000000004","role":"authenticated"}';
select throws_ok($$ select revoke_player_access('p_cj_kid') $$,
  '42501', 'parent_non_lie', 'un parent non lié ne coupe pas l’accès d’un autre enfant');
set local request.jwt.claims to
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}';
select throws_ok($$ select revoke_player_access('p_cj_kid') $$,
  '42501', 'parent_non_lie', 'l’entraîneur non plus');
set local request.jwt.claims to
  '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}';
select lives_ok($$ select revoke_player_access('p_cj_kid') $$,
  'le parent lié retire son consentement');

set local request.jwt.claims to
  '{"sub":"50000000-0000-0000-0000-000000000005","role":"authenticated"}';
select is(
  (select count(*)::int from players) + (select count(*)::int from teams)
  + (select count(*)::int from matches) + (select count(*)::int from trainings)
  + (select count(*)::int from surveys)
  + (select count(*)::int from my_survey_responses()),
  0,
  'LA RÉVOCATION COUPE L’ACCÈS : plus une fiche, un match, un sondage, une réponse');
select throws_ok($$ select set_player_intention('sv_cj_open', 'absent') $$,
  '42501', 'compte_joueur_requis', 'et plus aucune écriture');
reset role;

select is(
  (select count(*)::int from users
    where "authId" = '50000000-0000-0000-0000-000000000005'),
  0, 'la fiche du compte (l’adresse d’un mineur) est effacée');
select ok(
  exists (select 1 from player_invitations
           where "codeHash" = encode(sha256(convert_to(current_setting('test.code3'), 'UTF8')), 'hex')
             and "revokedAt" = now() and "revokedBy" = 'u_cj_parent'
             and "redeemedBy" is null and "redeemedAt" is not null),
  'la trace reste : utilisée, puis révoquée par le parent, compte fermé');
select is(
  (select "intentionJoueur" from survey_responses where id = 'sr_cj_kid'),
  'present', 'ce qu’il a répondu reste au club');

-- Un nouveau consentement rouvre un compte ; l'administrateur peut aussi
-- fermer, quand le parent n'est plus joignable.
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}';
select ok(
  length(set_config('test.code4',
         (create_player_invitation('p_cj_kid')) ->> 'code', true)) = 12,
  'après révocation, le parent peut consentir de nouveau');
set local request.jwt.claims to
  '{"sub":"50000000-0000-0000-0000-000000000005","role":"authenticated"}';
select lives_ok(
  format('select redeem_player_invitation(%L)', current_setting('test.code4')),
  'et l’enfant rattache le MÊME compte d’authentification');
set local request.jwt.claims to
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';
select lives_ok($$ select revoke_player_access('p_cj_kid') $$,
  'l’administrateur peut couper l’accès');
reset role;
select is(
  (select count(*)::int from users where "playerId" = 'p_cj_kid'), 0,
  '… et le compte est fermé');

-- ── Supprimer un compte ───────────────────────────────────────────────────
--
-- Le parent qui s'en va retire son consentement avec lui : le compte ouvert
-- par son code se ferme, et ses invitations — la trace de son consentement —
-- s'effacent avec sa fiche.

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}';
select ok(
  length(set_config('test.code5',
         (create_player_invitation('p_cj_kid')) ->> 'code', true)) = 12,
  'décor : un cinquième code');
set local request.jwt.claims to
  '{"sub":"50000000-0000-0000-0000-000000000005","role":"authenticated"}';
select lives_ok(
  format('select redeem_player_invitation(%L)', current_setting('test.code5')),
  'décor : Lucas a de nouveau un compte');
set local request.jwt.claims to
  '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}';
select lives_ok($$ select delete_my_account() $$, 'le parent efface son compte');
reset role;

select is(
  (select count(*)::int from users where "playerId" = 'p_cj_kid')
  + (select count(*)::int from player_invitations where "createdBy" = 'u_cj_parent'),
  0,
  'le compte joueur ouvert par son code est fermé, et ses invitations sont effacées');
select is((select count(*)::int from players where id = 'p_cj_kid'), 1,
  'la fiche du joueur, elle, reste au registre du club');

-- L'enfant qui s'en va : l'invitation de son parent reste, détachée.
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"40000000-0000-0000-0000-000000000004","role":"authenticated"}';
select ok(
  length(set_config('test.code6',
         (create_player_invitation('p_cj_other')) ->> 'code', true)) = 12,
  'décor : Jean invite Hugo');
set local request.jwt.claims to
  '{"sub":"60000000-0000-0000-0000-000000000006","role":"authenticated"}';
select lives_ok(
  format('select redeem_player_invitation(%L)', current_setting('test.code6')),
  'décor : Hugo a un compte');
select lives_ok($$ select delete_my_account() $$, 'Hugo efface son compte');
reset role;

select ok(
  exists (select 1 from player_invitations
           where "playerId" = 'p_cj_other' and "createdBy" = 'u_cj_autre'
             and "redeemedAt" is not null and "redeemedBy" is null)
  and not exists (select 1 from users where "playerId" = 'p_cj_other')
  and not exists (select 1 from auth.users
                   where id = '60000000-0000-0000-0000-000000000006'),
  'son compte et sa fiche sont partis ; le consentement de son père reste, détaché');

select * from finish();
rollback;
