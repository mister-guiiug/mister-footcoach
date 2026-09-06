-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Supprimer son compte — le droit à l'effacement (RGPD art. 17), sans      ║
-- ║ écrire au mainteneur.                                                    ║
-- ║                                                                          ║
-- ║ POURQUOI ICI PLUS QU'AILLEURS. `docs/specs-fonctionnelles.md` § 21.2     ║
-- ║ listait le droit à la suppression comme non outillé, et `AuthContext`    ║
-- ║ n'offrait que `signOut`. Or cette application manipule des données de    ║
-- ║ MINEURS (U11-U18) et de leurs contacts, avec `consentDate` et            ║
-- ║ `consentVersion` au modèle : un consentement qu'on ne peut pas retirer   ║
-- ║ n'est pas un consentement.                                               ║
-- ║                                                                          ║
-- ║ CE QU'ON EFFACE, ET CE QU'ON DÉTACHE — la seule décision de ce fichier.  ║
-- ║                                                                          ║
-- ║ Le squelette de la famille efface tout, parce que « rien de ce que       ║
-- ║ possède un compte n'appartient à quelqu'un d'autre ». Ici, c'est faux :  ║
-- ║ un entraîneur qui s'en va ne doit pas emporter la saison du club. Ses    ║
-- ║ équipes, ses matchs, ses joueurs, les statistiques de l'année            ║
-- ║ appartiennent au CLUB — et à des tiers, dont des mineurs.                ║
-- ║                                                                          ║
-- ║ D'où deux gestes, et pas un :                                            ║
-- ║                                                                          ║
-- ║  - EFFACER ce qui est à lui : sa fiche `users` (nom, e-mail, rôles), sa  ║
-- ║    fiche `contacts` s'il en a une (téléphone, e-mail, consentement), ses ║
-- ║    notifications et leurs préférences, ses offres de covoiturage.        ║
-- ║  - DÉTACHER ce qui est au club : `teams."coachId"`,                      ║
-- ║    `teams."adjointCoachId"`, `surveys."createdBy"`,                      ║
-- ║    `unavailabilities."declaredBy"` et                                    ║
-- ║    `survey_responses."parentUserId"` repassent à `null`. L'équipe        ║
-- ║    survit à son entraîneur, le sondage à son auteur.                     ║
-- ║                                                                          ║
-- ║ CE QUE ÇA NE FAIT PAS, et qu'il faut dire : la fiche d'un JOUEUR n'est   ║
-- ║ pas celle de son parent. Un parent qui efface son compte efface ses      ║
-- ║ propres coordonnées — donc les joueurs dont il était le contact n'en     ║
-- ║ auront plus — mais pas la fiche de son enfant, qui relève du registre du ║
-- ║ club et non de son compte. L'écran le dit avant de demander.             ║
-- ║                                                                          ║
-- ║ CE QUI REND CETTE FONCTION POSSIBLE. `security definer` la fait          ║
-- ║ s'exécuter avec les droits de son PROPRIÉTAIRE. Les migrations sont      ║
-- ║ appliquées par `postgres`, qui possède donc cette fonction, porte        ║
-- ║ `bypassrls` (d'où la traversée des politiques des tables applicatives)   ║
-- ║ et a le droit d'écrire dans `auth.users` — ce que `authenticated`, lui,  ║
-- ║ n'a à aucun moment. Ce droit-là est un GRANT (ou la propriété de la      ║
-- ║ table), pas un privilège de superutilisateur : c'est pourquoi ce qui     ║
-- ║ passe sur la pile jetable de la CI passe aussi sur un projet hébergé, où ║
-- ║ `postgres` n'est PAS superutilisateur. `supabase/tests/` le vérifie      ║
-- ║ assertion par assertion, au lieu de le supposer.                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  me  text;
begin
  -- SANS SESSION, ON LÈVE. Écrire `where "authId" = auth.uid()` avec un `uid`
  -- nul ne supprimerait rien ET ne dirait rien : la fonction rendrait « fait »
  -- sans avoir rien fait, ce qui est la pire réponse possible à cette
  -- demande-là. 42501 = `insufficient_privilege`, le même code que refuse la
  -- RLS ailleurs.
  if uid is null then
    raise exception 'suppression de compte sans session'
      using errcode = '42501';
  end if;

  -- L'identifiant APPLICATIF, qui n'est pas l'identifiant d'authentification :
  -- `users.id` est un texte (`u3`), `users."authId"` l'uuid du compte. Toutes
  -- les tables métier référencent le premier.
  select id into me from public.users where "authId" = uid;

  -- UN COMPTE SANS FICHE reste un compte : il a une adresse connue du service
  -- et une session valide. On continue jusqu'à `auth.users` au lieu de sortir.
  if me is not null then
    -- Détacher d'abord : ces lignes appartiennent au club, pas au partant.
    -- L'ordre compte — après la suppression de `users`, `me` ne désignerait
    -- plus rien à détacher.
    update public.teams set "coachId" = null where "coachId" = me;
    update public.teams set "adjointCoachId" = null where "adjointCoachId" = me;
    update public.surveys set "createdBy" = null where "createdBy" = me;
    -- Une indisponibilité et une réponse à un sondage concernent un JOUEUR :
    -- elles restent au registre du club. Seul le doigt qui les a saisies s'en
    -- va. Les laisser pointer vers une fiche effacée donnerait un identifiant
    -- orphelin — c'est-à-dire une donnée personnelle sans personne.
    update public.unavailabilities set "declaredBy" = null where "declaredBy" = me;
    update public.survey_responses set "parentUserId" = null
     where "parentUserId" = me;

    -- Puis effacer ce qui est à lui. Nommées une par une, et c'est délibéré :
    -- aucune de ces tables n'a de clé étrangère vers `auth.users`, donc AUCUNE
    -- cascade ne viendrait au secours d'un oubli. Cette liste est l'endroit où
    -- on la complète quand le modèle grandit, et elle se relit.
    delete from public.notifications where "userId" = me;
    delete from public.notification_preferences where "userId" = me;
    delete from public.carpool_offers where "offeredBy" = me;
    -- Sa fiche de contact : son téléphone, son e-mail, et la trace de son
    -- consentement. C'est la donnée personnelle la plus sensible du modèle.
    delete from public.contacts where "userId" = me;
    delete from public.users where id = me;
  end if;

  -- ET LE COMPTE LUI-MÊME. C'est la ligne qui distingue « j'ai vidé vos
  -- données » de « votre compte n'existe plus » : sans elle, l'adresse reste
  -- connue du service, la session reste valide, et le droit à l'effacement
  -- n'est pas satisfait.
  delete from auth.users where id = uid;
end;
$$;

-- PROPRIÉTAIRE EXPLICITE. C'est de lui que la fonction emprunte `bypassrls` et
-- le droit d'écrire dans `auth.users`. Le laisser implicite ferait dépendre le
-- comportement du rôle qui a appliqué la migration.
alter function public.delete_my_account() owner to postgres;

-- `create function` donne EXECUTE à `public` — c'est-à-dire à tout le monde,
-- `anon` compris. On le retire d'abord, on le rend ensuite au seul rôle qui
-- puisse avoir une session. Un appel par `anon` lèverait de toute façon
-- (`auth.uid()` est nul), mais une fonction qui efface des comptes n'a pas à
-- être atteignable par la clé publique du bundle servi par GitHub Pages.
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'Efface les données personnelles de l''utilisateur courant (fiche users, '
  'fiche contacts, notifications, préférences, offres de covoiturage), détache '
  'ce qui appartient au club (teams."coachId", teams."adjointCoachId", '
  'surveys."createdBy", unavailabilities."declaredBy", '
  'survey_responses."parentUserId"), puis supprime le compte dans auth.users. '
  'security definer, propriété de postgres : c''est de lui qu''elle emprunte le '
  'droit d''écrire dans auth.users. Preuve : supabase/tests/suppression-compte.test.sql.';
