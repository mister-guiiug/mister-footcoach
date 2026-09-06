-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Supprimer son compte — pgTAP. Lancement : `supabase test db`.            ║
-- ║                                                                          ║
-- ║ CE FICHIER VÉRIFIE DEUX CHOSES, ET PAS UNE.                              ║
-- ║                                                                          ║
-- ║  1. LE MÉCANISME — la fonction appartient bien à `postgres`, elle est    ║
-- ║     bien `security definer`, l'appelant NE PEUT PAS toucher `auth.users` ║
-- ║     par lui-même, et le droit dont la fonction hérite est un GRANT (ou   ║
-- ║     la propriété de la table), pas un privilège de superutilisateur.     ║
-- ║     Sans ces assertions, un test vert ne dirait pas si l'effacement      ║
-- ║     vient de la fonction ou de la session de test, qui tourne sous       ║
-- ║     `postgres` et pourrait tout faire — et rien ne dirait si le résultat ║
-- ║     tient encore sur un projet HÉBERGÉ, où `postgres` n'est PAS          ║
-- ║     superutilisateur.                                                    ║
-- ║  2. LE RÉSULTAT — et ici il est double, parce que le métier l'est. Plus  ║
-- ║     une ligne de ce qui appartient au partant ; TOUT ce qui appartient   ║
-- ║     au club, en revanche, est encore là, simplement détaché. Une         ║
-- ║     fonction qui effacerait l'équipe avec son entraîneur passerait la    ║
-- ║     moitié de ces assertions.                                            ║
-- ║                                                                          ║
-- ║ LE DÉCOR EST COMPTÉ AVANT. « Plus une ligne » est vrai d'une base vide : ║
-- ║ sans les assertions de décor, ce fichier serait vert le jour où          ║
-- ║ l'insertion cesserait de se faire.                                       ║
-- ║                                                                          ║
-- ║ ET LE VOISIN EST COMPTÉ APRÈS. Une fonction qui efface « les données de  ║
-- ║ l'utilisateur » et se trompe de filtre est SILENCIEUSE : elle rend       ║
-- ║ `void`, et le compte d'à côté est perdu sans un message.                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create extension if not exists pgtap with schema extensions;

begin;
select plan(29);

-- ── Décor : deux comptes, une saison de club, et de quoi laisser des traces ─
--
-- Alice entraîne l'équipe t1 et a créé un sondage ; elle a aussi une fiche de
-- contact, des notifications, des préférences et une offre de covoiturage.
-- Bob est là pour qu'on vérifie qu'il ne bouge pas.

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@exemple.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@exemple.test');

insert into clubs (id, name) values ('c_test', 'FC Test')
  on conflict (id) do nothing;
insert into seasons (id, "clubId", name, "startDate", "endDate", active)
  values ('sa_test', 'c_test', '2025-2026', '2025-08-01', '2026-06-30', true)
  on conflict (id) do nothing;

insert into users (id, "authId", email, "firstName", "lastName", roles, "teamIds")
values
  ('u_alice', '11111111-1111-1111-1111-111111111111', 'alice@exemple.test',
   'Alice', 'Entraîneuse', array['coach'], array['t_test']),
  ('u_bob', '22222222-2222-2222-2222-222222222222', 'bob@exemple.test',
   'Bob', 'Adjoint', array['coach'], array['t_test']);

-- L'équipe du club : Alice l'entraîne, Bob l'assiste. Elle DOIT survivre.
insert into teams (id, "clubId", "seasonId", name, category, "coachId",
                   "adjointCoachId", color)
values ('t_test', 'c_test', 'sa_test', 'U13 A', 'U13', 'u_alice', 'u_bob',
        '#16a34a');

-- Un joueur mineur, rattaché à l'équipe. Il n'appartient à personne.
insert into players (id, "firstName", "lastName", "dateOfBirth", "primaryTeamId",
                     "preferredPosition", appetences, number, active)
values ('p_test', 'Lucas', 'Dupont', '2012-03-15', 't_test', 'GK', '{}', 1, true);

insert into matches (id, "teamId", "seasonId", date, time, location, address,
                     "isHome", opponent, status, phase)
values ('m_test', 't_test', 'sa_test', '2026-03-01', '10:00', 'Stade',
        '1 rue du Stade', true, 'FC Voisin', 'saison', 'Phase 1');

-- Ce qui est à Alice, et à elle seule.
insert into contacts (id, "firstName", "lastName", phone, email, type,
                      "playerIds", "userId", "consentDate", "consentVersion")
values ('ct_alice', 'Alice', 'Entraîneuse', '0600000000', 'alice@exemple.test',
        'coach', array['p_test'], 'u_alice', '2026-01-01', 'v1');
insert into contacts (id, "firstName", "lastName", phone, email, type,
                      "playerIds", "userId")
values ('ct_bob', 'Bob', 'Adjoint', '0611111111', 'bob@exemple.test', 'coach',
        array['p_test'], 'u_bob');

insert into notifications (id, "userId", type, message, read, "createdAt")
values ('n_alice', 'u_alice', 'match', 'Match samedi', false, '2026-02-01'),
       ('n_bob', 'u_bob', 'match', 'Match samedi', false, '2026-02-01');

insert into notification_preferences ("userId", enabled, "mutedCategories",
                                      "reminderDelay")
values ('u_alice', true, '{}', 'J-1'), ('u_bob', true, '{}', 'J-1');

insert into carpool_offers (id, "matchId", "offeredBy", seats, "playerIds")
values ('co_alice', 'm_test', 'u_alice', 3, '{}');

insert into surveys (id, "teamId", "sessionType", "sessionId", question,
                     deadline, status, "createdBy")
values ('sv_test', 't_test', 'match', 'm_test', 'Présent samedi ?',
        '2026-02-28', 'ouvert', 'u_alice');

-- Une indisponibilité déclarée PAR Alice, et une réponse au sondage saisie
-- par elle : deux lignes qui concernent un joueur mineur et doivent rester au
-- club, détachées de leur auteur.
insert into unavailabilities (id, "playerId", "startDate", motif, "declaredBy")
values ('un_test', 'p_test', '2026-02-10', 'blessure', 'u_alice');
insert into survey_responses (id, "surveyId", "playerId", "parentUserId")
values ('sr_test', 'sv_test', 'p_test', 'u_alice');

-- LES COMPTAGES SONT PORTÉS SUR NOS PROPRES LIGNES, pas sur les tables : la
-- migration `0003_seed.sql` peuple déjà `users`, `teams` et `players` quand la
-- pile démarre. Un `count(*)` global rendrait un chiffre juste pour une
-- mauvaise raison, et le jour où le seed change, ce fichier rougirait sans
-- qu'une seule ligne de la fonction ait bougé. `auth.users` fait exception —
-- le seed n'y touche pas, et le total est justement ce qu'on veut voir passer
-- de deux à un.
select is((select count(*)::int from auth.users), 2,
  'décor : deux comptes existent avant l’effacement');
select is((select count(*)::int from users where id in ('u_alice', 'u_bob')), 2,
  'décor : deux fiches applicatives');
select is(
  (select count(*)::int from contacts where id in ('ct_alice', 'ct_bob')), 2,
  'décor : deux fiches de contact, dont celle d’Alice');
select is(
  (select count(*)::int from notifications where id in ('n_alice', 'n_bob')), 2,
  'décor : deux notifications');
select is((select count(*)::int from carpool_offers where id = 'co_alice'), 1,
  'décor : Alice a proposé un covoiturage');

-- ── Le mécanisme : d'où vient le droit d'écrire dans auth.users ───────────

select is(
  (select pg_get_userbyid(proowner)::text
     from pg_proc where oid = 'public.delete_my_account()'::regprocedure),
  'postgres',
  'la fonction appartient à postgres — c’est de LUI qu’elle emprunte le droit d’écrire dans auth.users'
);

select ok(
  (select prosecdef
     from pg_proc where oid = 'public.delete_my_account()'::regprocedure),
  'elle est « security definer » : sans cela elle s’exécuterait avec les droits de l’appelant, qui n’en a aucun'
);

-- CE QUE CES DEUX ASSERTIONS FERMENT. La question n'a jamais été « est-ce que
-- ça marche ici » : c'est « est-ce que ça marchera sur un projet HÉBERGÉ »,
-- où `postgres` n'est PAS superutilisateur. Voir la fonction réussir sur une
-- pile locale plus permissive ne prouverait rien si elle réussissait par
-- contournement. On nomme donc d'où vient le droit : `bypassrls` pour les
-- tables applicatives, un GRANT explicite — ou la propriété de la table —
-- pour `auth.users`. Ni l'un ni l'autre n'est un privilège de
-- superutilisateur.

select ok(
  (select rolbypassrls from pg_roles where rolname = 'postgres'),
  'postgres porte bypassrls : la fonction traverse la RLS des 24 tables applicatives'
);

select ok(
  (select relowner = 'postgres'::regrole::oid
     from pg_class where oid = 'auth.users'::regclass)
  or exists (
    select 1
      from pg_class c, aclexplode(c.relacl) a
     where c.oid = 'auth.users'::regclass
       and a.grantee = 'postgres'::regrole::oid
       and a.privilege_type = 'DELETE'
  ),
  'le droit d’effacer dans auth.users est ACCORDÉ à postgres (grant explicite, ou propriété de la table) — ce n’est pas un privilège de superutilisateur, donc ce qui est prouvé ici vaut sur un projet hébergé'
);

-- ── `anon` ne l'atteint pas ──────────────────────────────────────────────
--
-- L'appel lèverait de toute façon (`auth.uid()` est nul), mais une fonction
-- qui efface des comptes n'a pas à être atteignable par la clé publique d'un
-- bundle servi par GitHub Pages. 42501 = le droit d'exécution a été retiré.

set local role anon;
select throws_ok(
  $$ select delete_my_account() $$, '42501', null,
  'anon ne peut même pas appeler la fonction'
);
reset role;

-- ── Alice, connectée ─────────────────────────────────────────────────────
--
-- `set local role authenticated` : sans lui, la session garde les droits de
-- `postgres`, et ce fichier prouverait que POSTGRES sait effacer un compte —
-- ce que personne ne conteste. Il serait vert et sans objet.

set local role authenticated;
set local request.jwt.claims to
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- L'assertion qui donne son sens à toutes les autres : par elle-même, la
-- session d'Alice ne peut RIEN faire à `auth.users`.
select throws_ok(
  $$ delete from auth.users where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'un compte connecté ne peut PAS toucher auth.users directement'
);

select lives_ok(
  $$ select delete_my_account() $$,
  'mais il peut effacer le sien par la fonction'
);

reset role;

-- ── Le résultat, premier versant : plus une ligne d'Alice ────────────────

select is(
  (select count(*)::int from auth.users
   where id = '11111111-1111-1111-1111-111111111111'),
  0,
  'le compte lui-même a disparu d’auth.users — c’est la ligne qui distingue « vos données sont vidées » de « votre compte n’existe plus »'
);
select is((select count(*)::int from users where id = 'u_alice'), 0,
  'plus de fiche applicative : ni nom, ni e-mail, ni rôle');
select is((select count(*)::int from contacts where id = 'ct_alice'), 0,
  'plus de fiche de contact : ni téléphone, ni e-mail, ni trace de consentement');
select is((select count(*)::int from notifications where "userId" = 'u_alice'), 0,
  'plus une notification');
select is(
  (select count(*)::int from notification_preferences where "userId" = 'u_alice'),
  0, 'plus de préférences de notification');
select is((select count(*)::int from carpool_offers where "offeredBy" = 'u_alice'),
  0, 'plus une offre de covoiturage');

-- ── Le résultat, second versant : le club n'a rien perdu ─────────────────
--
-- C'est ce qui distingue cette fonction de celle du squelette. Un entraîneur
-- qui s'en va ne doit pas emporter la saison : ses équipes, ses matchs et ses
-- joueurs — dont des MINEURS — appartiennent au club, pas à lui.

select is((select count(*)::int from teams where id = 't_test'), 1,
  'l’équipe survit à son entraîneur');
select is((select "coachId" from teams where id = 't_test'), null,
  '…et elle est simplement DÉTACHÉE : plus d’entraîneur, pas de suppression');
select is((select "adjointCoachId" from teams where id = 't_test'), 'u_bob',
  'l’adjoint, lui, n’a pas bougé — le détachement vise le partant, pas la ligne');
select is((select count(*)::int from players where id = 'p_test'), 1,
  'la fiche du joueur mineur reste au registre du club');
select is((select count(*)::int from matches where id = 'm_test'), 1,
  'le match aussi');
select is((select count(*)::int from surveys where id = 'sv_test'), 1,
  'le sondage survit à son auteur');
select is((select "createdBy" from surveys where id = 'sv_test'), null,
  '…détaché lui aussi');
select is((select "declaredBy" from unavailabilities where id = 'un_test'), null,
  'l’indisponibilité du joueur reste, détachée de qui l’a déclarée');
select is(
  (select "parentUserId" from survey_responses where id = 'sr_test'), null,
  'la réponse au sondage reste, détachée du parent qui l’a saisie');

-- ── Et le voisin n'a rien senti ──────────────────────────────────────────

select is((select count(*)::int from auth.users), 1,
  'le compte de Bob est intact');
select is(
  (select count(*)::int from users where id = 'u_bob')
  + (select count(*)::int from contacts where id = 'ct_bob')
  + (select count(*)::int from notifications where "userId" = 'u_bob'),
  3,
  'sa fiche, son contact et sa notification aussi');

select * from finish();
rollback;
