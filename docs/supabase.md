# Backend Supabase (région Frankfurt)

L'app peut tourner sur deux backends, sélectionnés par `VITE_BACKEND` :

- `local` (défaut) — store local + `localStorage`, utilisé en dev/tests et pour
  le MVP offline. Aucune configuration.
- `supabase` — Postgres + Realtime + Auth, hébergé en UE.

L'architecture est isolée : les pages ne consomment que les hooks de
`src/store/AppContext`. En mode `supabase`, `SupabaseAppProvider` hydrate le
même état depuis Postgres, le maintient à jour en temps réel, et persiste les
actions (`src/store/persistAction.ts`).

## 1. Créer le projet (à faire dans le dashboard)

1. https://supabase.com → **New project**.
2. **Region : Frankfurt (eu-central-1)** — obligatoire pour les données de
   mineurs (RGPD, PO-05).
3. Note l'**URL du projet** et la **clé `anon`** (Project Settings → API).

## 2. Appliquer les migrations

Dans **SQL Editor**, exécute dans l'ordre :

1. `supabase/migrations/0001_schema.sql` — schéma (tables, index).
2. `supabase/migrations/0002_rls.sql` — Row Level Security (admin / coach /
   parent) + fonctions d'aide.
3. `supabase/migrations/0003_seed.sql` — données minimales (club, saison,
   2 équipes, quelques joueurs, profil admin).
4. `supabase/migrations/0004_supprimer_son_compte.sql` — `delete_my_account()`,
   la suppression de son compte.
5. `supabase/migrations/0005_nom_du_club.sql` — le nom du club
   (`club_settings."clubName"`), imprimé en tête des exports PDF.
6. `supabase/migrations/0006_compte_joueur.sql` — le compte joueur (§ 6
   ci-dessous) : rôle `player`, invitations, RPC, et la fermeture des droits
   qu'il suppose.
7. `supabase/migrations/0007_notifications_push.sql` — les abonnements push
   (§ 7 ci-dessous), et qui peut notifier qui.

(ou `supabase db push` avec la CLI si tu utilises le projet lié.)

Les migrations `0006` et `0007` sont **additives et rejouables** : aucune
table ni colonne n'est supprimée, et les rejouer ne change rien.

## 3. Créer ton compte et le lier au profil

1. **Authentication → Users → Add user** (email + mot de passe).
2. Copie l'`User UID` (uuid).
3. Dans **SQL Editor** :
   ```sql
   update users set "authId" = 'TON-UUID' where id = 'u3';
   ```
   (`u3` = profil admin du seed ; adapte selon le rôle voulu.)

> Le lien `users."authId" = auth.uid()` est ce que les politiques RLS utilisent
> pour résoudre le rôle et les rattachements.

## 4. Configurer l'app

Dans `.env.local` :

```bash
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

La clé `anon` est **publique** : elle peut figurer dans le bundle statique
(GitHub Pages) car la sécurité est imposée côté serveur par les politiques RLS,
jamais par le client.

## 5. Lancer

```bash
npm run dev
```

L'écran de connexion apparaît (mode `supabase`). Connecte-toi avec le compte
créé à l'étape 3.

Un compte qui n'est rattaché à aucune fiche (`users."authId"`) ne voit **plus**
une application vide : un écran lui dit de demander son rattachement à
l'administrateur — ou, s'il s'agit d'un enfant, d'y saisir son code
d'invitation (§ 6).

## 6. Compte joueur — ce qui est livré, et le seul réglage à vérifier

**Livré** (migration `0006`, écrans, tests pgTAP) : un joueur a son propre
compte et y indique **lui-même** son intention de réponse aux sondages. La
réponse du parent reste la seule officielle, et prévaut toujours.

1. **Le parent** (lié au joueur par sa fiche de contact) ouvre _Paramètres ›
   Compte joueur_, choisit l'enfant, accepte le texte de consentement : un
   code de 12 caractères s'affiche, **une seule fois**, valable 7 jours, à
   copier ou partager. La base n'en garde que le haché, avec qui a consenti et
   quand.
2. **L'enfant** ouvre l'application, choisit _J'ai un code d'invitation
   joueur_, crée son compte (e-mail + mot de passe), puis saisit le code : son
   compte est rattaché à sa fiche, avec le seul rôle `player`.
3. **Il voit** sa fiche, les matchs, entraînements et sondages de ses équipes,
   et sa propre réponse. **Jamais** les contacts, les blessures, les
   indisponibilités ni la fiche d'un autre joueur. Il n'écrit que son
   intention, par la RPC `set_player_intention`.
4. **Le parent coupe l'accès** quand il veut, au même endroit : le code en
   attente ne sert plus, la fiche du compte (l'adresse d'un mineur) est
   effacée. L'administrateur le peut aussi, et voit la liste des comptes
   joueurs avec la trace du consentement.

**À vérifier dans le tableau de bord — Authentication → Sign In / Providers →
Email :**

- **« Allow new users to sign up » doit rester ACTIVÉ.** C'est l'enfant qui
  crée son compte. Ce n'est pas une ouverture : depuis `0006`, un compte sans
  fiche ne lit rien (ni annuaire, ni équipes, ni club), et ne peut rien écrire.
- **« Confirm email »** : recommandé. L'enfant reçoit alors un lien de
  confirmation, qui le ramène dans l'application ; l'adresse de retour doit
  figurer dans _Authentication → URL Configuration_, comme pour le lien de
  connexion.

Aucun secret, aucune fonction à déployer pour le compte joueur.

> **Ce que `0006` ferme en passant**, parce que le compte joueur en dépendait :
> un compte ne peut plus modifier ses propres rôles ni ses rattachements
> (`users`), un parent ne peut plus s'ajouter un enfant sur sa fiche de contact
> (`contacts."playerIds"`), et les tables lisibles par « tout compte
> authentifié » (`users`, `teams`, `clubs`, `seasons`, `club_settings`,
> `exercises`) ne le sont plus que par les membres du club. Le détail est en
> tête de la migration ; les preuves dans `supabase/tests/compte-joueur.test.sql`.

## 7. Notifications push — à activer, dans cet ordre

**Livré** (migration `0007`, Edge Function `supabase/functions/push`, service
worker, réglage) : chaque ligne insérée dans `notifications` part en
notification push vers les appareils **de son seul destinataire**, selon ses
préférences (notifications coupées, catégorie décochée : rien ne part). Les
abonnements expirés (404/410) sont purgés. Chacun active le push appareil par
appareil, dans _Paramètres › Notifications_.

```
notifications (INSERT) ─webhook─▶ Edge Function « push » ─Web Push─▶ appareil
```

**Rien de tout cela ne fonctionne tant que les cinq gestes ci-dessous ne sont
pas faits** — et aucun ne se signale dans l'application, sauf le dernier.
Aucune valeur n'est dans le dépôt : elles sont à toi.

### 7.1 Générer les clés VAPID et le secret du webhook

Une paire VAPID est un couple de clés P-256, et `WEBHOOK_SECRET` une chaîne
aléatoire. `node:crypto` suffit, sans rien installer ; la sortie est au format
`.env`, applicable telle quelle à l'étape suivante :

```bash
node -e "const c=require('crypto');const {privateKey}=c.generateKeyPairSync('ec',{namedCurve:'prime256v1'});const j=privateKey.export({format:'jwk'});const b=s=>Buffer.from(s,'base64url');console.log('VAPID_PUBLIC_KEY='+Buffer.concat([Buffer.from([4]),b(j.x),b(j.y)]).toString('base64url'));console.log('VAPID_PRIVATE_KEY='+b(j.d).toString('base64url'));console.log('WEBHOOK_SECRET='+c.randomBytes(32).toString('base64url'))" > push-secrets.local
```

- `VAPID_PUBLIC_KEY` — **publique** : elle ira aussi dans le bundle (7.5).
- `VAPID_PRIVATE_KEY` — **jamais** dans le bundle, ni dans le dépôt.
- `WEBHOOK_SECRET` — partagé entre la fonction et l'en-tête du webhook (7.4).

`push-secrets.local` est ignoré par git (`*.local`). Recopie-le dans un
gestionnaire de mots de passe : c'est l'unique copie de la clé privée, et la
perdre oblige à régénérer la paire — ce qui invalide tous les abonnements.

### 7.2 Poser les secrets de la fonction

Complète `push-secrets.local` avec les deux valeurs qui n'ont rien d'aléatoire :

```
VAPID_SUBJECT=mailto:contact@votre-club.fr
APP_URL=https://mister-guiiug.github.io/mister-footcoach/
```

puis :

```bash
supabase secrets set --project-ref <ref> --env-file push-secrets.local
```

(ou _Project Settings → Edge Functions → Secrets_). `SUPABASE_URL` et
`SUPABASE_SERVICE_ROLE_KEY` sont fournis par la plateforme.

### 7.3 Déployer la fonction

```bash
supabase functions deploy push --project-ref <ref>
```

`supabase/config.toml` porte `verify_jwt = false` pour `push` : un webhook n'a
pas de session. Sa seule protection est donc `WEBHOOK_SECRET`, comparé à temps
constant et **fermé par défaut** — sans lui, la fonction refuse tout (`500`).
La fonction relit la notification **en base** par son identifiant : même
avec le secret, on ne lui fait pousser que ce qui est dans `notifications`.

### 7.4 Créer le webhook de base, avec son en-tête secret

_Database → Webhooks → Create a new hook_ :

- Table `public.notifications`, évènement **Insert** seulement ;
- Type **HTTP Request**, méthode `POST`, URL
  `https://<ref>.supabase.co/functions/v1/push` ;
- En-tête HTTP **obligatoire** : `x-webhook-secret` = la valeur de
  `WEBHOOK_SECRET`, **au caractère près** (un espace de trop donne un `401`
  silencieux : la notification apparaît dans la cloche, rien ne part).

Un seul hook sur cette table : deux enverraient deux push par notification.

### 7.5 Poser `VITE_VAPID_PUBLIC_KEY` au build

La clé **publique** est lue **au build** (`.env.example` la documente) :

- en local, dans `.env.local` : `VITE_VAPID_PUBLIC_KEY=<VAPID_PUBLIC_KEY>` ;
- en production, comme **variable** Actions (_Settings → Secrets and
  variables → Actions → Variables_), et passée au build par `deploy.yml` :
  `VITE_VAPID_PUBLIC_KEY=${{ vars.VITE_VAPID_PUBLIC_KEY }}` dans `build-env`.
  Aujourd'hui `deploy.yml` ne transmet ni celle-ci, ni `VITE_BACKEND`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` : **la production est en mode
  local**, où ni le push ni le compte joueur n'existent. Les quatre lignes
  s'ajoutent ensemble, le jour où le mode connecté est mis en service.

> **Ce jour-là, le budget du bundle cassera le déploiement.** `pwa-deploy.yml`
> lance `npm run build`, qui finit par `pwa-bundle-budget` : un build connecté
> dépasse `bundleBudget` (`package.json`) — **déjà sur `main`**, parce que le
> SDK Supabase tombe dans `vendor`, que chaque visiteur précharge. Mesuré le
> 25/09/2026 avec des variables fictives : `main` précharge 221,0 kB gzip pour
> 172 permis, et pèse 459,9 kB au total pour 435 ; le compte joueur et le push
> y ajoutent 6,4 kB préchargés et 16,5 kB au total (227,4 et 476,4 kB). Il
> faudra alors revoir le budget, ou ce qu'un build connecté précharge — une
> décision à prendre, pas un chiffre à pousser pour passer au vert. Détail :
> `docs/conception-technique.md` § 11.1.

La même clé publique doit figurer dans les secrets de la fonction (7.1) et au
build : une paire dépareillée fait refuser les envois par les services de push.

Sans cette variable, le réglage l'annonce : « Les notifications push ne sont
pas encore activées sur cette installation. » C'est le seul maillon que
l'application sait signaler.

### 7.6 Vérifier

Une sonde valide les maillons serveur (secret, clés, lecture en base) sans
rien envoyer — l'identifiant n'existe pas :

```bash
curl -i -X POST "https://<ref>.supabase.co/functions/v1/push" -H "Content-Type: application/json" -H "x-webhook-secret: <WEBHOOK_SECRET>" -d '{"record":{"id":"sonde"}}'
```

`200 {"sent":0,"reason":"unknown"}` : le serveur est prêt. `401` : le secret
diffère ; `500` : un secret manque (le message dit lequel). Reste à l'essayer
pour de vrai : activer le push dans les réglages, puis créer un match sur une
équipe dont on est l'encadrement.

> **Limites connues.** Sur iPhone et iPad, le push exige que l'application soit
> installée sur l'écran d'accueil (iOS 16.4+) : le réglage le dit. Le texte
> poussé est celui de la notification, écrit dans la langue de qui l'a
> déclenchée. Et les destinataires sont ceux de l'action `NOTIFY` du client —
> l'encadrement de l'équipe : les parents ne sont pas encore notifiés (§ 16.1
> des spécifications), ni en in-app, ni en push.

## Automatisé via la CLI (alternative aux étapes 1–2)

Au lieu de cliquer dans le dashboard, tu peux créer le projet **et** appliquer
les migrations en une commande. **Ton token reste dans ton terminal**, jamais
dans le repo ni dans un chat.

### Prérequis : installer la CLI Supabase

Le wrapper npm de la CLI est cassé sur Windows (bug npm de binaires optionnels).
Utilise donc :

- **Windows** : `scoop install supabase`
- **macOS** : `brew install supabase/tap/supabase`
- Sinon : binaire standalone — https://supabase.com/docs/guides/cli

### Créer un token (et révoquer les anciens exposés)

Dashboard → **Account → Access Tokens** → _Generate new token_. Puis, **dans le
terminal où tu lanceras la commande** :

```powershell
# PowerShell
$env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"
```

```bash
# bash / zsh
export SUPABASE_ACCESS_TOKEN=sbp_xxx
```

### Lancer

**Créer un nouveau projet** (région Frankfurt) — org id via
`supabase orgs list` :

```bash
SUPABASE_ORG_ID=<org> npm run supabase:setup
```

La commande crée le projet puis affiche son **project ref**. Relance ensuite
pour lier et pousser les migrations :

```bash
SUPABASE_PROJECT_REF=<ref> npm run supabase:setup
```

(Si le projet existe déjà, va directement à la 2ᵉ commande.) La CLI demande le
**mot de passe de la base** au moment voulu — jamais passé en argument. Le
script applique les migrations via `supabase db push`. Il reste à lier ton
compte auth (étape 3) et à remplir `.env.local` (étape 4).

## Notes techniques

- **Colonnes en camelCase quotées** : le schéma reflète 1:1 les types
  TypeScript, donc un `select *` se mappe directement sur les types du domaine.
- **Ids et dates en `text`** : conforme au modèle de l'app (ids string, dates
  ISO).
- **Temps réel** : `SupabaseAppProvider` réhydrate l'état à chaque changement
  (rechargement debouncé). Suffisant pour la charge d'un club ; on pourra
  affiner en merge par ligne plus tard.
- **Hébergement** : seul le **frontend statique** va sur GitHub Pages ; le
  backend est géré par Supabase (UE).
