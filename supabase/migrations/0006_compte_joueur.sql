-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Le compte joueur — l'enfant indique LUI-MÊME s'il sera là.               ║
-- ║                                                                          ║
-- ║ POURQUOI. `docs/specs-fonctionnelles.md` § 15 distingue l'intention du   ║
-- ║ joueur de la confirmation du parent, et la V1 faisait saisir les deux    ║
-- ║ au parent (RG-SONDAGE-02). § 21.3 annonçait l'étape suivante : un compte ║
-- ║ pour le joueur. Le joueur est MINEUR : son compte n'existe que par le    ║
-- ║ consentement d'un parent (RGPD art. 8, § 18), qui peut le retirer.       ║
-- ║                                                                          ║
-- ║ CE QUE CE FICHIER AJOUTE.                                                ║
-- ║  1. Un rôle `player` dans `users.roles`, et `users."playerId"`.          ║
-- ║  2. `player_invitations` : un code à usage unique, HACHÉ, valable sept   ║
-- ║     jours, créé par un parent LIÉ au joueur (`contacts."playerIds"`).    ║
-- ║     La ligne garde qui a consenti, et quand.                             ║
-- ║  3. Quatre RPC, toutes `security definer`, et chacune vérifie SON        ║
-- ║     appelant : créer un code, l'utiliser, couper l'accès, dire son       ║
-- ║     intention. Plus une lecture : ses propres réponses.                  ║
-- ║  4. Ce que voit le joueur, et RIEN d'autre : sa fiche, les matchs,       ║
-- ║     entraînements et sondages de ses équipes, sa propre réponse.         ║
-- ║                                                                          ║
-- ║ POURQUOI `app_can_access_team` N'EST PAS ÉTENDUE AU JOUEUR. Elle ouvre   ║
-- ║ aux parents, en plus des matchs, TOUT ce qui est « de l'équipe » :       ║
-- ║ `app_can_access_player` en dérive, et avec elle les fiches, les          ║
-- ║ indisponibilités (motif « blessure » compris), l'assiduité, les réponses ║
-- ║ aux sondages et l'historique de postes des coéquipiers. Le joueur reçoit ║
-- ║ donc SES politiques, écrites table par table (section 5), et les         ║
-- ║ politiques existantes restent ce qu'elles étaient pour les autres rôles. ║
-- ║                                                                          ║
-- ║ ET CE QU'IL A FALLU FERMER POUR QUE ÇA TIENNE (section 3). L'enfant crée ║
-- ║ son compte lui-même : les inscriptions restent donc ouvertes sur le      ║
-- ║ projet. Or six politiques de `0002` accordaient la lecture à TOUT        ║
-- ║ compte authentifié (`using (true)`), dont `users` — noms et e-mails des  ║
-- ║ entraîneurs et des parents. Et deux autres laissaient un compte modifier ║
-- ║ ce qui fonde ses propres droits : ses rôles (`users_self`) et ses liens  ║
-- ║ de filiation (`contacts_write`). Un joueur aurait pu se déclarer parent  ║
-- ║ de n'importe qui, un inconnu lire l'annuaire du club. Les deux sont      ║
-- ║ fermés ici, et prouvés par `supabase/tests/compte-joueur.test.sql`.      ║
-- ║                                                                          ║
-- ║ ADDITIVE ET REJOUABLE. Aucune table ni colonne supprimée ; chaque objet  ║
-- ║ est créé `if not exists`, `or replace`, ou après `drop … if exists`.     ║
-- ║ Les politiques de `0002` ne sont pas touchées : les restrictions passent ║
-- ║ par des politiques RESTRICTIVES, qui s'ajoutent (ET logique) aux         ║
-- ║ permissives existantes au lieu de les réécrire.                          ║
-- ║                                                                          ║
-- ║ AUCUNE VUE. Une vue de `public` tourne sous son propriétaire, donc sans  ║
-- ║ RLS, et se lit d'office par `anon` : les lectures du joueur passent par  ║
-- ║ des politiques et par une fonction qui vérifie son appelant.             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- `gen_random_bytes` : le tirage du code. Supabase installe pgcrypto dans
-- `extensions` ; la ligne ne fait rien là où il y est déjà.
create extension if not exists pgcrypto with schema extensions;

-- ── 1. Données ────────────────────────────────────────────────────────────

-- Le lien d'un compte joueur vers sa fiche. `on delete set null` : une fiche
-- supprimée (rare — RG-JOUEUR-03 archive au lieu de supprimer) laisse un
-- compte sans lien, donc sans aucun accès, plutôt qu'une suppression en
-- cascade d'un compte que personne n'a demandé à effacer.
alter table users add column if not exists "playerId" text
  references players(id) on delete set null;
create index if not exists users_by_player on users("playerId");

-- Les invitations. Des HORODATAGES (`timestamptz`) et non le texte ISO du
-- reste du schéma : l'expiration se compare à `now()` EN BASE, là où se prend
-- la décision, jamais dans le client.
create table if not exists player_invitations (
  id uuid primary key default gen_random_uuid(),
  "playerId" text not null references players(id) on delete cascade,
  -- SHA-256 du code normalisé. Le code en clair n'est rendu qu'UNE fois, au
  -- parent qui le crée, et n'est écrit nulle part.
  "codeHash" text not null unique,
  -- Le consentement : QUI (le `users.id` du parent) et QUAND. Effacé avec le
  -- compte de ce parent (`delete_my_account`, plus bas).
  "createdBy" text not null,
  "consentedAt" timestamptz not null default now(),
  "expiresAt" timestamptz not null,
  "redeemedAt" timestamptz,
  -- Le compte ouvert par ce code, tant qu'il existe. Repasse à `null` quand
  -- ce compte est fermé : « actif » se lit donc `"redeemedBy" is not null`.
  "redeemedBy" text,
  "revokedAt" timestamptz,
  "revokedBy" text
);
create index if not exists player_invitations_by_player
  on player_invitations("playerId");

alter table player_invitations enable row level security;

-- Aucune écriture directe, pour personne : tout passe par les RPC. Et le
-- HACHÉ ne se lit pas non plus — un code de sept jours n'a pas à laisser
-- d'empreinte à qui voudrait l'éprouver hors ligne. `select *` échoue donc
-- sur cette table : le client nomme ses colonnes.
revoke all on player_invitations from anon, authenticated;
grant select (id, "playerId", "createdBy", "consentedAt", "expiresAt",
              "redeemedAt", "redeemedBy", "revokedAt", "revokedBy")
  on player_invitations to authenticated;

-- ── 2. Fonctions d'aide ───────────────────────────────────────────────────
--
-- Même facture que celles de `0002` : `stable security definer`, pour lire
-- `users` sans récursion de RLS. Chacune ne parle QUE de l'appelant
-- (`auth.uid()`) et rend `false`, `null` ou un tableau vide à qui n'a pas de
-- fiche. Exécutables par `authenticated` seulement : les politiques les
-- évaluent sous le rôle de l'appelant, et aucune politique ne vise `anon`.

-- Membre du club = une fiche avec au moins un rôle connu. Un compte tout juste
-- inscrit, sans fiche, n'en est pas un : il ne voit rien.
create or replace function app_is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select roles && array['admin', 'coach', 'parent', 'player']
       from users where "authId" = auth.uid()),
    false)
$$;

-- Joueur ET RIEN D'AUTRE. Un rôle cumulé (§ 3.2) garde l'union de ses droits :
-- seul un compte qui n'est QUE joueur tombe sous les restrictions du joueur.
create or replace function app_is_player_only()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select 'player' = any(roles)
            and not (roles && array['admin', 'coach', 'parent'])
       from users where "authId" = auth.uid()),
    false)
$$;

-- La fiche du joueur connecté — seulement si elle est ACTIVE : un joueur
-- archivé (RG-JOUEUR-03) a quitté le club, son compte ne voit plus rien.
create or replace function app_player_id()
returns text language sql stable security definer set search_path = public as $$
  select u."playerId"
    from users u
    join players p on p.id = u."playerId"
   where u."authId" = auth.uid()
     and 'player' = any(u.roles)
     and p.active
   limit 1
$$;

-- Ses équipes : la principale et, le cas échéant, celle du surclassement.
create or replace function app_player_team_ids()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array(
    select t
      from players p,
        unnest(array[p."primaryTeamId", p."secondaryTeamId"]) as t
     where p.id = app_player_id() and t is not null
  ), '{}')
$$;

revoke execute on function app_is_member() from public, anon;
revoke execute on function app_is_player_only() from public, anon;
revoke execute on function app_player_id() from public, anon;
revoke execute on function app_player_team_ids() from public, anon;
grant execute on function app_is_member() to authenticated;
grant execute on function app_is_player_only() to authenticated;
grant execute on function app_player_id() to authenticated;
grant execute on function app_player_team_ids() to authenticated;

-- ── 3. Ce qui fonde les droits ne se modifie plus soi-même ────────────────
--
-- `users_self` (0002) laisse chacun modifier SA fiche — toutes ses colonnes,
-- rôles compris : n'importe quel compte pouvait s'écrire `admin`. Et
-- `contacts_write` laisse le titulaire d'une fiche de contact en modifier les
-- `playerIds` — c'est-à-dire se déclarer parent de n'importe quel enfant, et
-- lire aussitôt tout ce qu'un parent lit. Le compte joueur repose sur ces
-- deux liens : un rôle `player` qu'on pourrait retirer soi-même, un lien de
-- filiation qu'on pourrait s'attribuer, et l'invitation ne prouverait rien.
--
-- Deux déclencheurs, parce qu'une politique RLS ne voit pas l'ANCIENNE valeur
-- d'une ligne. Ils ne s'appliquent qu'aux rôles de l'API (`anon`,
-- `authenticated`) hors administrateur : les RPC ci-dessous, qui s'exécutent
-- sous `postgres`, et le tableau de bord gardent la main. `security invoker`
-- (le défaut) à dessein — c'est `current_user` qui dit qui écrit.

create or replace function app_guard_users_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not app_is_admin() then
    if new.id is distinct from old.id
       or new."authId" is distinct from old."authId"
       or new.roles is distinct from old.roles
       or new."teamIds" is distinct from old."teamIds"
       or new."playerId" is distinct from old."playerId" then
      raise exception 'rôles et rattachements : réservés à l''administrateur'
        using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists users_guard_columns on users;
create trigger users_guard_columns
  before update on users
  for each row execute function app_guard_users_columns();

create or replace function app_guard_contacts_links()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not app_is_admin() then
    -- Un `upsert` (ce qu'envoie le client pour MODIFIER une fiche) passe
    -- d'abord ici en INSERT, avant que le conflit ne le change en UPDATE.
    -- La ligne déjà en base, avec les MÊMES liens, n'est donc pas une
    -- création de lien : le titulaire corrige son téléphone comme avant.
    if tg_op = 'INSERT' and cardinality(new."playerIds") > 0
       and not exists (
         select 1 from contacts c
          where c.id = new.id
            and c."playerIds" = new."playerIds"
            and c."userId" is not distinct from new."userId"
       ) then
      raise exception 'lien de filiation : réservé à l''administrateur'
        using errcode = '42501';
    end if;
    if tg_op = 'UPDATE'
       and (new."playerIds" is distinct from old."playerIds"
            or new."userId" is distinct from old."userId") then
      raise exception 'lien de filiation : réservé à l''administrateur'
        using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists contacts_guard_links on contacts;
create trigger contacts_guard_links
  before insert or update on contacts
  for each row execute function app_guard_contacts_links();

-- Un déclencheur ne s'appelle pas en RPC ; on retire tout de même l'exécution,
-- pour que « aucune fonction neuve n'est atteignable par l'API » se vérifie
-- d'une seule requête (le test le fait).
revoke execute on function app_guard_users_columns() from public, anon, authenticated;
revoke execute on function app_guard_contacts_links() from public, anon, authenticated;

-- ── 4. Politiques RESTRICTIVES : ce que les politiques de 0002 accordaient ─
--      à tout compte authentifié, et au joueur par ricochet
--
-- Une politique restrictive s'ajoute en ET à toutes les permissives de la
-- table : elle ne peut que retirer. Les droits de l'admin, de l'entraîneur et
-- du parent passent par elles sans changer.

-- Données de référence : membres du club seulement. Le joueur garde la
-- saison, le club et le réglage du club (le nom imprimé), et ne voit que SES
-- équipes — assez pour nommer les équipes de ses matchs, pas plus.
drop policy if exists clubs_members_only on clubs;
create policy clubs_members_only on clubs as restrictive
  for select to authenticated using (app_is_member());

drop policy if exists seasons_members_only on seasons;
create policy seasons_members_only on seasons as restrictive
  for select to authenticated using (app_is_member());

drop policy if exists club_settings_members_only on club_settings;
create policy club_settings_members_only on club_settings as restrictive
  for select to authenticated using (app_is_member());

drop policy if exists teams_members_only on teams;
create policy teams_members_only on teams as restrictive
  for select to authenticated
  using (
    app_is_member()
    and (not app_is_player_only() or id = any(app_player_team_ids()))
  );

-- La bibliothèque d'exercices est l'outil des entraîneurs : ni un inconnu, ni
-- un joueur.
drop policy if exists exercises_members_only on exercises;
create policy exercises_members_only on exercises as restrictive
  for select to authenticated
  using (app_is_member() and not app_is_player_only());

-- `users` : nom, e-mail, rôles. Chacun lit SA fiche ; l'admin lit tout — c'est
-- ainsi qu'il voit les comptes joueurs ; les autres membres lisent l'annuaire
-- des adultes, comme avant, mais plus les fiches des comptes joueurs, qui
-- portent l'adresse d'un mineur. Le joueur, lui, ne lit que la sienne.
drop policy if exists users_read_scope on users;
create policy users_read_scope on users as restrictive
  for select to authenticated
  using (
    id = app_current_user_id()
    or app_is_admin()
    or (
      app_is_member()
      and not app_is_player_only()
      and not ('player' = any(roles)
               and not (roles && array['admin', 'coach', 'parent']))
    )
  );

-- Aucune écriture directe du joueur : pas même sur sa propre fiche.
drop policy if exists users_no_player_write on users;
create policy users_no_player_write on users as restrictive
  for update to authenticated
  using (not app_is_player_only())
  with check (not app_is_player_only());

-- Contacts, covoiturage, préférences : ni lecture ni écriture pour le joueur.
-- Sans la première, un joueur pouvait créer une fiche de contact à son nom ;
-- sans la deuxième, proposer un covoiturage sur n'importe quel match.
drop policy if exists contacts_not_player on contacts;
create policy contacts_not_player on contacts as restrictive
  for all to authenticated
  using (not app_is_player_only())
  with check (not app_is_player_only());

drop policy if exists carpool_not_player on carpool_offers;
create policy carpool_not_player on carpool_offers as restrictive
  for all to authenticated
  using (not app_is_player_only())
  with check (not app_is_player_only());

drop policy if exists notif_prefs_not_player on notification_preferences;
create policy notif_prefs_not_player on notification_preferences as restrictive
  for all to authenticated
  using (not app_is_player_only())
  with check (not app_is_player_only());

-- ── 5. Ce que lit le joueur : sa fiche, et ses équipes ────────────────────
--
-- Des politiques PERMISSIVES, en plus de celles de 0002 : pour tout autre
-- compte, `app_player_id()` est nul et `app_player_team_ids()` vide, donc
-- elles n'ouvrent rien. Ni `attendances`, ni `position_history`, ni
-- `unavailabilities`, ni `injuries`, ni `lineups`, ni `match_events` (un
-- `blessure_live` y nomme un coéquipier), ni `tournaments` : aucune n'en a,
-- et les politiques de 0002 ne lui accordent rien — il n'a ni équipe
-- d'entraîneur, ni enfant.
--
-- `survey_responses` n'en a pas non plus, et c'est délibéré : sa ligne porte
-- une note « visible par le coach uniquement » (§ 15.4) et le détail des
-- réponses de chaque tuteur. Le joueur lit sa réponse par
-- `my_survey_responses()`, qui ne rend que les colonnes qui le regardent.

drop policy if exists players_read_own_player on players;
create policy players_read_own_player on players
  for select to authenticated using (id = app_player_id());

drop policy if exists matches_read_player on matches;
create policy matches_read_player on matches
  for select to authenticated using ("teamId" = any(app_player_team_ids()));

drop policy if exists trainings_read_player on trainings;
create policy trainings_read_player on trainings
  for select to authenticated using ("teamId" = any(app_player_team_ids()));

drop policy if exists surveys_read_player on surveys;
create policy surveys_read_player on surveys
  for select to authenticated using ("teamId" = any(app_player_team_ids()));

drop policy if exists player_invitations_read on player_invitations;
create policy player_invitations_read on player_invitations
  for select to authenticated
  using (app_is_admin() or "playerId" = any(app_parent_player_ids()));

-- ── 6. Fermer un compte joueur (usage interne) ────────────────────────────
--
-- Appelée par `revoke_player_access` et `delete_my_account`, qui tournent
-- sous `postgres`. Elle n'est PAS `security definer` et son exécution est
-- retirée à tous les rôles de l'API : appelée directement, elle n'aurait de
-- toute façon aucun droit — elle n'en a qu'à l'intérieur de ces deux-là.
--
-- Une fiche QUE joueur est effacée : son e-mail (celui d'un mineur), son nom,
-- son rôle, son lien. Le compte d'authentification reste, sans aucun accès :
-- l'enfant peut le supprimer lui-même, ou y rattacher un nouveau code. Une
-- fiche aux rôles cumulés perd seulement sa part de joueur.
create or replace function app_close_player_account(p_user_id text)
returns void language plpgsql set search_path = public as $$
begin
  update player_invitations set "redeemedBy" = null
   where "redeemedBy" = p_user_id;
  delete from notifications where "userId" = p_user_id;
  delete from notification_preferences where "userId" = p_user_id;
  delete from users
   where id = p_user_id
     and not (roles && array['admin', 'coach', 'parent']);
  update users
     set roles = array_remove(roles, 'player'), "playerId" = null
   where id = p_user_id;
end
$$;

revoke execute on function app_close_player_account(text)
  from public, anon, authenticated;

-- ── 7. Les RPC ────────────────────────────────────────────────────────────
--
-- Toutes `security definer`, propriété de `postgres` : c'est de lui qu'elles
-- tiennent le droit d'écrire là où l'appelant ne le peut pas. Chacune vérifie
-- donc ELLE-MÊME qui l'appelle, avant toute écriture. Les refus ont un code
-- stable (`42501` : pas le droit ; `22023` : demande invalide) et un message
-- court, que le client traduit.

-- Créer un code — le geste de CONSENTEMENT du parent. Rend le code en clair,
-- une seule fois ; seul son haché est gardé.
create or replace function create_player_invitation(p_player_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me text := app_current_user_id();
  -- Le même alphabet que `normalizeCode` du socle (« antiConfusion ») :
  -- 32 caractères sans 0/O ni 1/I. 256 est un multiple de 32, donc
  -- `octet % 32` est équiprobable, sans rejet.
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text := '';
  v_id uuid;
  v_expires timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null then
    raise exception 'session_requise' using errcode = '42501';
  end if;
  -- Le lien de filiation, et lui seul, autorise : ni l'entraîneur, ni
  -- l'administrateur ne consentent à la place d'un parent. Un compte sans
  -- fiche n'a pas de lien.
  --
  -- `coalesce(…, false)` N'EST PAS DÉCORATIF. Un identifiant nul, ou un
  -- élément nul dans `"playerIds"`, fait valoir la comparaison NUL et non
  -- faux ; `if not (NUL)` ne lève rien, et le refus sautait — un code pour
  -- n'importe quel enfant. Même garde dans `revoke_player_access` et
  -- `set_player_intention`.
  if v_me is null
     or not coalesce(p_player_id = any(app_parent_player_ids()), false) then
    raise exception 'parent_non_lie' using errcode = '42501';
  end if;
  if not exists (select 1 from players where id = p_player_id and active) then
    raise exception 'joueur_inactif' using errcode = '22023';
  end if;

  -- Deux parents qui créent un code au même instant : l'un après l'autre.
  perform pg_advisory_xact_lock(
    hashtextextended('player_invitation:' || p_player_id, 0));

  -- UN compte par joueur : pour en ouvrir un autre, on ferme d'abord celui-ci.
  if exists (select 1 from users
              where "playerId" = p_player_id and 'player' = any(roles)) then
    raise exception 'compte_deja_actif' using errcode = '22023';
  end if;

  -- UN code en attente par joueur : le nouveau remplace les précédents.
  update player_invitations
     set "revokedAt" = now(), "revokedBy" = v_me
   where "playerId" = p_player_id
     and "redeemedAt" is null
     and "revokedAt" is null
     and "expiresAt" > now();

  -- 12 caractères de 5 bits : 60 bits. Sur sept jours et à usage unique,
  -- aucun essai en ligne n'en vient à bout.
  v_bytes := extensions.gen_random_bytes(12);
  for i in 0..11 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;

  insert into player_invitations ("playerId", "codeHash", "createdBy", "expiresAt")
  values (p_player_id, encode(sha256(convert_to(v_code, 'UTF8')), 'hex'),
          v_me, v_expires)
  returning player_invitations.id into v_id;

  return jsonb_build_object('id', v_id, 'code', v_code, 'expiresAt', v_expires);
end
$$;

-- Utiliser un code — l'enfant, connecté à son NOUVEAU compte. Refuse d'un
-- même message un code inconnu, expiré, déjà utilisé ou révoqué : distinguer
-- les quatre renseignerait qui essaie des codes.
create or replace function redeem_player_invitation(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  -- La normalisation du client (`normalizeCode`) : majuscules, et tout
  -- caractère hors de l'alphabet écarté — tirets et espaces compris.
  v_code text := regexp_replace(upper(coalesce(p_code, '')),
                                '[^ABCDEFGHJKLMNPQRSTUVWXYZ2-9]', '', 'g');
  v_inv player_invitations%rowtype;
  v_player players%rowtype;
  v_email text;
  v_user_id text;
begin
  if v_uid is null then
    raise exception 'session_requise' using errcode = '42501';
  end if;
  -- Un compte déjà rattaché au club (un parent qui essaierait le code de son
  -- enfant avec SON compte) ne devient pas joueur : l'enfant crée le sien.
  if exists (select 1 from users where "authId" = v_uid) then
    raise exception 'compte_deja_rattache' using errcode = '22023';
  end if;

  -- `for update` : deux essais simultanés du même code, un seul gagne.
  select * into v_inv from player_invitations
   where "codeHash" = encode(sha256(convert_to(v_code, 'UTF8')), 'hex')
   for update;
  if not found
     or v_inv."redeemedAt" is not null
     or v_inv."revokedAt" is not null
     or v_inv."expiresAt" <= now() then
    raise exception 'invitation_invalide' using errcode = '22023';
  end if;

  select * into v_player from players where id = v_inv."playerId";
  -- Le consentement doit encore VALOIR : fiche active, parent toujours lié,
  -- pas d'autre compte ouvert entre-temps.
  if not found
     or not v_player.active
     or not exists (select 1 from contacts
                     where "userId" = v_inv."createdBy"
                       and v_inv."playerId" = any("playerIds"))
     or exists (select 1 from users
                 where "playerId" = v_inv."playerId"
                   and 'player' = any(roles)) then
    raise exception 'invitation_invalide' using errcode = '22023';
  end if;

  -- L'adresse du compte, pour que l'administrateur reconnaisse qui est qui.
  select email into v_email from auth.users where id = v_uid;
  v_user_id := 'u-' || replace(gen_random_uuid()::text, '-', '');

  insert into users (id, "authId", email, "firstName", "lastName", roles,
                     "teamIds", "playerId")
  values (v_user_id, v_uid, coalesce(v_email, ''), v_player."firstName",
          v_player."lastName", array['player'], '{}', v_player.id);

  update player_invitations
     set "redeemedAt" = now(), "redeemedBy" = v_user_id
   where id = v_inv.id;

  return v_player.id;
end
$$;

-- Couper l'accès — le parent retire son consentement, à tout moment. Ferme
-- le code en attente ET le compte ouvert. L'administrateur le peut aussi :
-- c'est le recours quand un parent n'est plus joignable.
create or replace function revoke_player_access(p_player_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me text := app_current_user_id();
  v_account text;
begin
  if auth.uid() is null then
    raise exception 'session_requise' using errcode = '42501';
  end if;
  -- `coalesce` : voir `create_player_invitation` — sans lui, un lien nul
  -- laissait couper l'accès de n'importe quel enfant.
  if v_me is null
     or not (app_is_admin()
             or coalesce(p_player_id = any(app_parent_player_ids()), false)) then
    raise exception 'parent_non_lie' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('player_invitation:' || p_player_id, 0));

  -- La trace reste : qui a retiré, et quand. Les codes en attente comme celui
  -- du compte ouvert ; un code expiré ou déjà clos garde son histoire.
  update player_invitations
     set "revokedAt" = now(), "revokedBy" = v_me
   where "playerId" = p_player_id
     and "revokedAt" is null
     and (("redeemedAt" is null and "expiresAt" > now())
          or "redeemedBy" is not null);

  for v_account in
    select id from users
     where "playerId" = p_player_id and 'player' = any(roles)
  loop
    perform app_close_player_account(v_account);
  end loop;
end
$$;

-- Dire son intention — la SEULE écriture du joueur. Elle ne touche que
-- `intentionJoueur` et `dateIntentionJoueur` : la confirmation du parent,
-- la note du coach et les réponses des tuteurs restent ce qu'elles sont. La
-- réponse du parent prévaut toujours (§ 15.1) ; ce n'est pas ici qu'elle se
-- change.
create or replace function set_player_intention(p_survey_id text,
                                                p_intention text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_player text := app_player_id();
  v_survey surveys%rowtype;
  -- Le format du client : la date UTC, `YYYY-MM-DD`.
  v_today text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
begin
  if auth.uid() is null or v_player is null then
    raise exception 'compte_joueur_requis' using errcode = '42501';
  end if;
  if p_intention is null
     or p_intention not in ('present', 'absent', 'incertain') then
    raise exception 'intention_invalide' using errcode = '22023';
  end if;

  select * into v_survey from surveys where id = p_survey_id;
  -- Un sondage d'une autre équipe n'existe pas pour lui : même refus qu'un
  -- sondage inconnu. Un sondage SANS équipe (la colonne l'autorise) non plus :
  -- sans `coalesce`, la comparaison valait NUL et le refus sautait.
  if not found
     or not coalesce(v_survey."teamId" = any(app_player_team_ids()), false) then
    raise exception 'sondage_inaccessible' using errcode = '42501';
  end if;
  if v_survey.status <> 'ouvert' then
    raise exception 'sondage_ferme' using errcode = '22023';
  end if;

  -- Deux appuis rapprochés : une seule ligne, jamais deux.
  perform pg_advisory_xact_lock(
    hashtextextended('survey_response:' || p_survey_id || ':' || v_player, 0));

  update survey_responses
     set "intentionJoueur" = p_intention, "dateIntentionJoueur" = v_today
   where "surveyId" = p_survey_id and "playerId" = v_player;
  if not found then
    insert into survey_responses (id, "surveyId", "playerId",
                                  "intentionJoueur", "dateIntentionJoueur")
    values ('sr-' || replace(gen_random_uuid()::text, '-', ''), p_survey_id,
            v_player, p_intention, v_today);
  end if;
end
$$;

-- Ses réponses — et seulement les colonnes qui le regardent : son intention,
-- la confirmation officielle du parent, et leurs dates. Ni la note du coach,
-- ni l'identité du tuteur qui a répondu. Vide pour tout autre compte.
create or replace function my_survey_responses()
returns table (
  id text,
  "surveyId" text,
  "playerId" text,
  "intentionJoueur" text,
  "dateIntentionJoueur" text,
  "confirmationParent" text,
  "dateConfirmationParent" text
)
language sql stable security definer set search_path = public as $$
  select r.id, r."surveyId", r."playerId", r."intentionJoueur",
         r."dateIntentionJoueur", r."confirmationParent",
         r."dateConfirmationParent"
    from survey_responses r
    join surveys s on s.id = r."surveyId"
   where r."playerId" = app_player_id()
     and s."teamId" = any(app_player_team_ids())
$$;

-- Propriétaire explicite, comme `delete_my_account` (0004) : c'est de lui que
-- ces fonctions tiennent leurs droits. `create function` accorde l'exécution à
-- `public` ET, sur Supabase, à `anon` par les privilèges par défaut : on retire
-- les deux, puis on rend au seul rôle qui a une session.
alter function create_player_invitation(text) owner to postgres;
alter function redeem_player_invitation(text) owner to postgres;
alter function revoke_player_access(text) owner to postgres;
alter function set_player_intention(text, text) owner to postgres;
alter function my_survey_responses() owner to postgres;

revoke execute on function create_player_invitation(text) from public, anon;
revoke execute on function redeem_player_invitation(text) from public, anon;
revoke execute on function revoke_player_access(text) from public, anon;
revoke execute on function set_player_intention(text, text) from public, anon;
revoke execute on function my_survey_responses() from public, anon;
grant execute on function create_player_invitation(text) to authenticated;
grant execute on function redeem_player_invitation(text) to authenticated;
grant execute on function revoke_player_access(text) to authenticated;
grant execute on function set_player_intention(text, text) to authenticated;
grant execute on function my_survey_responses() to authenticated;

-- ── 8. Supprimer son compte, maintenant qu'il existe des comptes joueurs ──
--
-- `delete_my_account` (0004) nomme une par une les tables qu'elle touche —
-- « cette liste est l'endroit où on la complète quand le modèle grandit ».
-- Le modèle a grandi de deux lignes :
--
--  - l'ENFANT qui efface son compte détache l'invitation qui l'avait ouvert ;
--  - le PARENT qui efface le sien retire son consentement avec : les comptes
--    joueurs ouverts par ses codes se ferment, puis ses invitations — la
--    trace de ce consentement, comme `consentDate` sur sa fiche de contact —
--    s'effacent avec lui. Un autre parent lié peut en créer un nouveau.
--
-- Le reste est la fonction de 0004, à la lettre.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  me  text;
  v_account text;
begin
  if uid is null then
    raise exception 'suppression de compte sans session'
      using errcode = '42501';
  end if;

  select id into me from public.users where "authId" = uid;

  if me is not null then
    update public.teams set "coachId" = null where "coachId" = me;
    update public.teams set "adjointCoachId" = null where "adjointCoachId" = me;
    update public.surveys set "createdBy" = null where "createdBy" = me;
    update public.unavailabilities set "declaredBy" = null where "declaredBy" = me;
    update public.survey_responses set "parentUserId" = null
     where "parentUserId" = me;

    -- Compte joueur (0006). D'abord les comptes que SES codes ont ouverts,
    -- tant que l'invitation dit encore lesquels ; puis ses invitations.
    for v_account in
      select "redeemedBy" from public.player_invitations
       where "createdBy" = me and "redeemedBy" is not null
    loop
      perform public.app_close_player_account(v_account);
    end loop;
    delete from public.player_invitations where "createdBy" = me;
    update public.player_invitations set "revokedBy" = null
     where "revokedBy" = me;
    update public.player_invitations set "redeemedBy" = null
     where "redeemedBy" = me;

    delete from public.notifications where "userId" = me;
    delete from public.notification_preferences where "userId" = me;
    delete from public.carpool_offers where "offeredBy" = me;
    delete from public.contacts where "userId" = me;
    delete from public.users where id = me;
  end if;

  delete from auth.users where id = uid;
end;
$$;

alter function public.delete_my_account() owner to postgres;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'Efface les données personnelles de l''utilisateur courant (fiche users, '
  'fiche contacts, notifications, préférences, offres de covoiturage), détache '
  'ce qui appartient au club (teams."coachId", teams."adjointCoachId", '
  'surveys."createdBy", unavailabilities."declaredBy", '
  'survey_responses."parentUserId"), ferme les comptes joueurs ouverts par ses '
  'invitations et efface celles-ci (0006), puis supprime le compte dans '
  'auth.users. security definer, propriété de postgres : c''est de lui '
  'qu''elle emprunte le droit d''écrire dans auth.users. Preuves : '
  'supabase/tests/suppression-compte.test.sql et compte-joueur.test.sql.';
