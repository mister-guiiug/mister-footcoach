-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Notifications push — la notification sort de l'application.             ║
-- ║                                                                          ║
-- ║ POURQUOI. § 16.2 prévoit deux canaux : le centre in-app, livré, et le    ║
-- ║ push PWA, que § 21.3 laissait aux évolutions. Le chemin est celui de     ║
-- ║ mister-doc, éprouvé en production :                                      ║
-- ║                                                                          ║
-- ║   notifications (INSERT) ─webhook─▶ Edge Function « push » ─Web Push─▶   ║
-- ║   navigateur ─▶ service worker ─▶ notification du système                ║
-- ║                                                                          ║
-- ║ Ce fichier porte la partie BASE : la table des abonnements, au schéma    ║
-- ║ qu'attend le transport Supabase du socle (`push/supabase`), et la        ║
-- ║ fermeture de ce qui ferait du push un canal ouvert à tous. Le webhook,   ║
-- ║ les clés VAPID et le secret sont des gestes de l'administrateur du       ║
-- ║ projet (`docs/supabase.md`) : aucun secret n'entre dans le dépôt.        ║
-- ║                                                                          ║
-- ║ CE QUI N'ÉTAIT PAS UN PROBLÈME ET LE DEVIENT. `notifications_insert`     ║
-- ║ (0002) accepte d'un compte authentifié N'IMPORTE QUELLE ligne, pour      ║
-- ║ n'importe quel destinataire (`with check (true)`). Tant que la           ║
-- ║ notification restait dans la cloche de l'application, c'était du         ║
-- ║ désordre. Avec le push, chaque ligne devient un message sur l'écran      ║
-- ║ verrouillé d'un téléphone, au texte choisi par qui l'insère — et les     ║
-- ║ inscriptions sont ouvertes (0006). La section 2 restreint donc qui peut  ║
-- ║ notifier qui, à l'exact périmètre de l'action `NOTIFY` du client.        ║
-- ║                                                                          ║
-- ║ ADDITIVE ET REJOUABLE, comme 0006.                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── 1. Les abonnements ────────────────────────────────────────────────────
--
-- Le schéma, colonne pour colonne, de l'en-tête de
-- `@mister-guiiug/dev-pwa-config/push/supabase` : le transport du socle écrit
-- `endpoint`, `user_id`, `p256dh`, `auth` et `user_agent`, et ne se
-- paramètre que par le nom de la table.
--
-- `user_id` est l'identité d'AUTHENTIFICATION (`auth.users.id`), pas le
-- `users.id` applicatif : c'est ce que le transport lit dans la session. La
-- cascade fait le ménage quand un compte est supprimé — `delete_my_account`
-- n'a rien à ajouter.
create table if not exists push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_by_user
  on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

-- `anon` n'y touche pas ; `authenticated` n'y fait que ce que les politiques
-- permettent — pas de TRUNCATE, qui ignore la RLS.
revoke all on push_subscriptions from anon, authenticated;
grant select, insert, update, delete on push_subscriptions to authenticated;

-- Chacun ne voit et ne gère QUE ses abonnements. Lire et retirer les siens
-- reste possible à tout compte ; en CRÉER demande d'être membre du club et
-- pas seulement joueur : le joueur ne reçoit aucune notification (§ 16.1), et
-- un compte inscrit sans fiche n'a rien à recevoir.
drop policy if exists push_subscriptions_read_own on push_subscriptions;
create policy push_subscriptions_read_own on push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists push_subscriptions_insert_own on push_subscriptions;
create policy push_subscriptions_insert_own on push_subscriptions
  for insert to authenticated
  with check (
    user_id = auth.uid() and app_is_member() and not app_is_player_only()
  );

-- L'`upsert` du transport (conflit sur `endpoint`) passe par ici : il ne
-- réécrit qu'une ligne DÉJÀ à soi, et ne la donne à personne d'autre.
drop policy if exists push_subscriptions_update_own on push_subscriptions;
create policy push_subscriptions_update_own on push_subscriptions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid() and app_is_member() and not app_is_player_only()
  );

drop policy if exists push_subscriptions_delete_own on push_subscriptions;
create policy push_subscriptions_delete_own on push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- ── 2. Qui peut notifier qui ──────────────────────────────────────────────
--
-- L'action `NOTIFY` du client (`src/store/persistAction.ts`) écrit une ligne
-- par membre de l'ENCADREMENT de l'équipe concernée (`users."teamIds"`). Ce
-- qu'elle fait, et rien de plus, devient la règle : l'administrateur notifie
-- qui il veut ; un entraîneur ou un parent notifie l'encadrement d'une équipe
-- à laquelle il a accès — les siennes, ou celles de ses enfants. Ni un compte
-- sans fiche, ni un joueur.
--
-- Le jour où le client notifiera aussi les PARENTS d'une équipe (§ 16.1 le
-- prévoit, le code ne le fait pas), cette fonction s'élargira avec lui.
create or replace function app_can_notify(p_user_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select app_is_admin()
      or (
        app_is_member()
        and not app_is_player_only()
        and exists (
          select 1 from users u
           where u.id = p_user_id
             and u."teamIds" && (app_coach_team_ids() || app_parent_team_ids())
        )
      )
$$;

revoke execute on function app_can_notify(text) from public, anon;
grant execute on function app_can_notify(text) to authenticated;

-- RESTRICTIVE : elle s'ajoute à `notifications_insert` (0002) sans la
-- réécrire.
drop policy if exists notifications_insert_scope on notifications;
create policy notifications_insert_scope on notifications as restrictive
  for insert to authenticated
  with check (app_can_notify("userId"));
