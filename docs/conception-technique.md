# Document de Conception Technique — Mister Footcoach

**Version :** 2.0  
**Date :** 11/08/2026  
**Statut :** Aligné sur le code du dépôt  
**Application :** Mister Footcoach — PWA de gestion d'équipes jeunes de football  
**Référence :** Spécifications fonctionnelles v1.2

---

## Table des matières

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Stack technique](#2-stack-technique)
3. [Structure du projet](#3-structure-du-projet)
4. [Backend Supabase (Postgres)](#4-backend-supabase-postgres)
5. [Sélection du backend et état applicatif](#5-sélection-du-backend-et-état-applicatif)
6. [Architecture frontend](#6-architecture-frontend)
7. [PWA et stratégie hors-ligne](#7-pwa-et-stratégie-hors-ligne)
8. [Authentification et autorisation](#8-authentification-et-autorisation)
9. [Sécurité](#9-sécurité)
10. [Tests](#10-tests)
11. [Performance et optimisation](#11-performance-et-optimisation)
12. [CI/CD](#12-cicd)
13. [Décisions d'architecture (ADR)](#13-décisions-darchitecture-adr)
14. [Roadmap technique](#14-roadmap-technique)

---

## 1. Vue d'ensemble de l'architecture

### 1.1 Schéma général

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│                                                                 │
│   ┌────────────────┐   ┌────────────────┐   ┌──────────────┐  │
│   │  Coach         │   │  Parent        │   │  Admin       │  │
│   │  (smartphone)  │   │  (smartphone)  │   │  (desktop)   │  │
│   └───────┬────────┘   └───────┬────────┘   └──────┬───────┘  │
│           └───────────────────┼───────────────────┘           │
│                    PWA React 19 (Vite 8)                        │
│                    Tailwind CSS v4 · Lucide React               │
│                    React Router v7 · Vitest 4                   │
│           Bundle statique servi par GitHub Pages                │
└───────────────────────────────┬─────────────────────────────────┘
                                │ VITE_BACKEND
              ┌─────────────────┴──────────────────┐
              │                                    │
   ┌──────────▼───────────┐          ┌─────────────▼──────────────┐
   │  'local'  (défaut)   │          │  'supabase'                │
   │                      │          │                            │
   │  AppProvider         │          │  SupabaseAppProvider       │
   │  useReducer          │          │  même reducer, hydraté     │
   │  + localStorage      │          │  depuis Postgres           │
   │  (données mock)      │          │  + persistAction (écriture)│
   └──────────────────────┘          └─────────────┬──────────────┘
                                                   │ HTTPS + WebSocket
                                     ┌─────────────▼──────────────┐
                                     │   SUPABASE (Frankfurt, UE) │
                                     │                            │
                                     │   ┌────────────────────┐   │
                                     │   │  Postgres + RLS    │   │
                                     │   │  (24 tables, §4.1) │   │
                                     │   └────────────────────┘   │
                                     │   ┌────────────────────┐   │
                                     │   │  Realtime          │   │
                                     │   │  (postgres_changes)│   │
                                     │   └────────────────────┘   │
                                     │   ┌────────────────────┐   │
                                     │   │  Auth (email/mdp)  │   │
                                     │   └────────────────────┘   │
                                     └────────────────────────────┘
```

Il n'y a **pas de code serveur écrit par le projet** : toute la logique métier
vit dans le client, et la sécurité est déléguée aux politiques RLS de Postgres
(§ 4.5). Le seul artefact déployé est un bundle statique.

### 1.2 Principes directeurs

| Principe                      | Décision                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Sécurité côté serveur**     | Toutes les tables sont protégées par des politiques RLS Postgres — jamais par le client (§ 4.5)                         |
| **Réactivité temps réel**     | Abonnement `postgres_changes` sur toutes les tables ; l'état est réhydraté (debouncé 300 ms) à chaque changement        |
| **Isolation du backend**      | Les pages ne consomment que les hooks de `src/store/AppContext` ; le backend est un détail d'implémentation du provider |
| **Un seul modèle de données** | Le schéma SQL utilise des colonnes camelCase quotées pour se mapper 1:1 sur les types de `src/types/index.ts`           |
| **Mobile-first**              | PWA installable, interface conçue pour smartphone, interactions tactiles                                                |
| **Zéro sur-ingénierie MVP**   | Le mode `local` (défaut) tourne sur `localStorage` + données mock, sans aucune configuration                            |

---

## 2. Stack technique

### 2.1 Vue synthétique

Versions telles que déclarées dans `package.json` (plages `^`) :

| Domaine         | Technologie                       | Version | Rôle                                                     |
| --------------- | --------------------------------- | ------- | -------------------------------------------------------- |
| Bundler         | **Vite**                          | 8.x     | Build, dev server, HMR                                   |
| Framework UI    | **React**                         | 19.x    | Rendu, hooks                                             |
| Langage         | **TypeScript**                    | ~6.0    | Type safety strict                                       |
| Style           | **Tailwind CSS**                  | 4.x     | Utility-first, tokens CSS natifs                         |
| Icônes          | **Lucide React**                  | 1.x     | Bibliothèque d'icônes SVG                                |
| Routing         | **React Router**                  | 7.x     | SPA routing (`BrowserRouter`)                            |
| Backend         | **Supabase**                      | 2.x     | Postgres + RLS + Realtime + Auth                         |
| Tests unitaires | **Vitest**                        | 4.x     | Tests React + TypeScript                                 |
| Tests E2E       | **Playwright**                    | 1.x     | Tests navigateur PWA + audit a11y (`axe-core`)           |
| PWA             | **vite-plugin-pwa**               | 1.x     | Manifest, Service Worker (Workbox)                       |
| Web Vitals      | **web-vitals**                    | 4.x     | Mesure LCP / CLS / INP / FCP / TTFB                      |
| Config partagée | **@mister-guiiug/dev-pwa-config** | 3.x     | ESLint, Prettier, Vitest, Playwright, i18n, CSP, PWA, CI |

Une part notable de la configuration (lint, format, base Vitest, Playwright,
i18n, `ErrorBoundary`, observabilité Sentry, plugins Vite CSP/SEO, workflows CI)
vient du paquet famille `@mister-guiiug/dev-pwa-config`, partagé entre toutes
les PWA `miss-*` / `mister-*`.

### 2.2 Backends disponibles

Le backend est choisi à la compilation via `VITE_BACKEND` (`src/backend/config.ts`) :

| Valeur               | Stockage                           | Authentification | Usage                            |
| -------------------- | ---------------------------------- | ---------------- | -------------------------------- |
| `local` **(défaut)** | `localStorage` + données mock      | Aucune           | Dev, tests, démo hors-ligne, e2e |
| `supabase`           | Postgres hébergé en UE (Frankfurt) | Supabase Auth    | Déploiement réel                 |

Toute valeur autre que `supabase` retombe sur `local` :

```typescript
// src/backend/config.ts
export const BACKEND: 'local' | 'supabase' =
  import.meta.env.VITE_BACKEND === 'supabase' ? 'supabase' : 'local';
```

Il n'existe **pas** d'adapter Firebase, ni de dépendance `firebase`.

### 2.3 Choix de Supabase — justification

| Besoin fonctionnel                   | Ce que Supabase apporte                                                     |
| ------------------------------------ | --------------------------------------------------------------------------- |
| Données de mineurs (RGPD)            | Hébergement UE au choix de la région — Frankfurt `eu-central-1`             |
| Cloisonnement admin / coach / parent | Row Level Security en base, donc inviolable depuis un bundle public         |
| Score live visible par les parents   | Realtime `postgres_changes` sur les tables — pas de polling                 |
| Bundle 100 % statique (GitHub Pages) | La clé `anon` est publiable : c'est la RLS qui protège, pas le client       |
| Modèle relationnel                   | Jointures, contraintes et index SQL natifs, adaptés aux stats multi-tables  |
| Simplicité opérationnelle            | PaaS managé — pas d'infra à gérer, migrations SQL versionnées dans le dépôt |

---

## 3. Structure du projet

Les tests unitaires sont **colocalisés** avec le code (`Foo.tsx` +
`Foo.test.tsx`), et non regroupés dans un dossier `__tests__`.

```
mister-footcoach/
│
├── supabase/
│   └── migrations/
│       ├── 0001_schema.sql          # 24 tables + 21 index (source de vérité)
│       ├── 0002_rls.sql             # Row Level Security + fonctions d'aide
│       └── 0003_seed.sql            # Jeu de données minimal
│
├── src/
│   ├── main.tsx                     # Point d'entrée — chaîne de providers
│   ├── App.tsx                      # Routeur (18 routes, pages en lazy())
│   ├── index.css                    # Tokens Tailwind CSS v4
│   ├── vite-env.d.ts
│   │
│   ├── backend/
│   │   ├── config.ts                # BACKEND = 'local' | 'supabase'
│   │   └── tables.ts                # Mapping tables Postgres ↔ AppState, chargement
│   │
│   ├── lib/
│   │   └── supabase.ts              # Client supabase-js (créé paresseusement)
│   │
│   ├── auth/
│   │   ├── AuthContext.tsx          # Session Supabase, signIn / signOut
│   │   ├── AuthGate.tsx             # Exige une session en mode supabase
│   │   └── LoginPage.tsx            # Écran de connexion e-mail / mot de passe
│   │
│   ├── store/
│   │   ├── AppContext.tsx           # Reducer + AppProvider local + hooks métier
│   │   ├── SupabaseAppProvider.tsx  # Même reducer, hydraté depuis Postgres
│   │   └── persistAction.ts         # Action dispatchée → écriture Supabase
│   │
│   ├── components/
│   │   ├── UpdateBanner.tsx         # Câblage du UpdatePromptBanner du socle
│   │   ├── layout/
│   │   │   ├── AppShell.tsx         # Wrapper principal
│   │   │   ├── TopBar.tsx           # En-tête avec retour et titre
│   │   │   └── BottomNav.tsx        # Navigation mobile (4 onglets + « Plus »)
│   │   ├── ui/                      # Composants atomiques réutilisables
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── Toast.tsx
│   │   └── features/                # Dialogues et sections métier
│   │       ├── contacts/  exercises/  logistics/  matches/
│   │       └── players/   surveys/    tournaments/ trainings/
│   │
│   ├── pages/                       # 18 pages (Dashboard, Teams, Matches,
│   │                                # MatchLive, Trainings, Lineup, Tournaments,
│   │                                # Surveys, Stats, Exercises, Contacts,
│   │                                # Notifications, Settings, détails…)
│   │
│   ├── i18n/
│   │   ├── index.ts                 # createI18n famille — locales fr / en
│   │   └── messages.ts              # Catalogue de traductions
│   │
│   ├── theme/
│   │   └── ThemeContext.tsx         # Clair / Sombre / Système
│   │
│   ├── constants/
│   │   └── session.ts               # CURRENT_USER_ID (MVP local)
│   │
│   ├── data/
│   │   ├── mock.ts                  # Jeu de données du mode local
│   │   └── federation.ts            # Flux fédération simulé
│   │
│   ├── types/
│   │   └── index.ts                 # Types domaine (miroir du schéma SQL)
│   │
│   ├── test/
│   │   ├── setup.ts                 # Setup Vitest (§ 10.2)
│   │   └── pwa-mock.ts
│   │
│   └── utils/                       # date, id, download, ical, lineup, maps,
│                                    # notifications, recurrence, rgpd, stats,
│                                    # surveyStatus, tournament, federation
│
├── scripts/
│   ├── supabase-setup.mjs           # Création projet + push des migrations
│   └── generate-icons.mjs
│
├── public/
│   ├── logo.svg
│   └── screenshots/                 # Captures du manifest PWA
│
├── e2e/
│   └── a11y.spec.ts                 # Playwright + axe-core
│
├── docs/
│   ├── spec.md
│   ├── specs-fonctionnelles.md
│   ├── supabase.md                  # Procédure d'installation du backend
│   └── conception-technique.md      # Ce document
│
├── .github/workflows/               # Appelants minces → dev-pwa-config (§ 12.1)
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── tsconfig.json                    # + tsconfig.app.json / tsconfig.node.json
└── package.json
```

> Il n'y a **ni dossier `convex/`, ni `src/adapters/`, ni `src/offline/`** :
> ceux décrits dans la v1 de ce document n'ont jamais été créés. `src/hooks/`
> existe mais ne contient qu'un `.gitkeep` — les hooks métier vivent dans
> `src/store/AppContext.tsx`. Tailwind v4 ne nécessite aucun
> `tailwind.config.ts` (§ 6.4).

---

## 4. Backend Supabase (Postgres)

Le backend n'est **pas** du code applicatif : c'est un schéma Postgres, un jeu
de politiques RLS et l'API REST/Realtime générée par Supabase. Les trois
migrations de `supabase/migrations/` constituent la totalité du backend
versionné. La procédure d'installation (création du projet, application des
migrations, rattachement du compte auth) est décrite dans
[`docs/supabase.md`](./supabase.md).

### 4.1 Schéma de données (`supabase/migrations/0001_schema.sql`)

24 tables et 21 index. Deux partis pris structurent le schéma :

- **Colonnes en camelCase quotées** — le schéma reflète 1:1 les types de
  `src/types/index.ts`, donc un `select *` se mappe directement sur les types
  du domaine, sans couche de conversion.
- **Ids et dates en `text`** — conforme au modèle de l'app (ids string générés
  côté client, dates ISO).

```sql
-- supabase/migrations/0001_schema.sql (extrait)

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
```

Les tables couvrent : `clubs`, `seasons`, `users`, `teams`, `players`,
`contacts`, `matches`, `match_events`, `trainings`, `training_blocks`,
`exercises`, `attendances`, `lineups`, `position_history`, `tournaments`,
`tournament_groups`, `carpool_offers`, `surveys`, `survey_responses`,
`notifications`, `notification_preferences`, `club_settings`,
`unavailabilities`, `injuries`.

> La colonne `players."photoStorageId"` existe dans le schéma mais **Supabase
> Storage n'est pas encore branché** : aucun upload ni URL signée n'est
> implémenté côté client (cf. § 11.4).

### 4.2 Lecture — hydratation complète

Il n'y a pas de query par écran. Le provider charge **l'intégralité de l'état**
en une passe (un `select *` par table, en parallèle), puis le maintient à jour
par temps réel. C'est volontaire : le volume de données d'un club tient
largement en mémoire, et le reste de l'app travaille sur un état unique.

```typescript
// src/backend/tables.ts (extrait)
/** AppData array keys ↔ Postgres table names. */
export const ARRAY_TABLES: { table: string; key: keyof AppState }[] = [
  { table: 'teams', key: 'teams' },
  { table: 'players', key: 'players' },
  { table: 'matches', key: 'matches' },
  { table: 'match_events', key: 'matchEvents' },
  // … 20 entrées au total
];

export async function loadAllFromSupabase(): Promise<AppState> {
  const sb = getSupabase();
  const state: AppState = { ...EMPTY_APP_STATE };
  const mutable = state as unknown as Record<string, unknown>;

  const results = await Promise.all(
    ARRAY_TABLES.map(t => sb.from(t.table).select('*'))
  );
  ARRAY_TABLES.forEach((t, i) => {
    mutable[t.key as string] = results[i]?.data ?? [];
  });

  // Singletons : saison active, réglages club, préférences de notification
  const { data: seasons } = await sb.from('seasons').select('*');
  const seasonRows = (seasons ?? []) as Season[];
  state.season =
    seasonRows.find(s => s.active) ?? seasonRows[0] ?? EMPTY_APP_STATE.season;
  // …

  state.selectedTeamId = state.teams[0]?.id ?? '';
  return state;
}
```

Une réhydratation ne doit pas faire perdre le contexte du coach :
`reconcileSelectedTeam` réinjecte l'équipe sélectionnée si elle existe toujours
dans les données fraîches.

### 4.3 Écriture — traduction des actions

Le frontend ne connaît que des actions de reducer. `persistAction` traduit
chaque action en l'écriture Supabase équivalente (`upsert`, `insert`, `update`,
`delete`).

```typescript
// src/store/persistAction.ts (extrait)
/**
 * Awaits a Supabase query and throws on error. supabase-js resolves (does not
 * reject) on RLS denials and constraint violations, returning `{ error }` — so
 * without this check, failed writes would be swallowed silently.
 */
async function run(query: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await query;
  if (error) {
    /* … */ throw new Error(message);
  }
}

export async function persistAction(
  action: AppAction,
  state: AppState
): Promise<void> {
  switch (action.type) {
    case 'ADD_PLAYER':
    case 'UPDATE_PLAYER':
      await upsert('players', action.player as unknown as Row);
      return;
    case 'ADD_MATCH_EVENT':
      await insert('match_events', action.event as unknown as Row);
      return;
    case 'SET_MATCH_LIVE':
      await patch('matches', action.matchId, { liveActive: action.active });
      return;
    // …
    // Local-only actions — nothing to persist.
    case 'SET_SELECTED_TEAM':
    case 'HYDRATE':
    case 'RESET_TO_MOCK':
      return;
  }
}
```

Deux points importants :

- **`supabase-js` ne rejette pas** en cas de refus RLS ou de violation de
  contrainte : il résout avec `{ error }`. Le helper `run` transforme ce cas en
  exception, sans quoi une écriture refusée disparaîtrait silencieusement.
- Les effets de bord métier (mise à jour du score sur un but, historique des
  postes lors d'un remplacement) sont calculés par le **reducer côté client**,
  puis persistés comme des actions distinctes — il n'y a pas de transaction
  serveur qui les regroupe.

### 4.4 Temps réel et cohérence

`SupabaseAppProvider` s'abonne à `postgres_changes` sur **toutes** les tables via
un unique canal, et déclenche une réhydratation complète debouncée à 300 ms.

```typescript
// src/store/SupabaseAppProvider.tsx (extrait)
const sb = getSupabase();
const channel = sb.channel('app-changes');
for (const table of ALL_TABLES) {
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table },
    () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void reload(), 300);
    }
  );
}
channel.subscribe();
```

Les écritures sont **optimistes** : l'action est appliquée localement par le
reducer, puis persistée. En cas d'échec (refus RLS typiquement), l'état est
resynchronisé sur la vérité serveur et l'utilisateur est averti par un toast —
plutôt que de laisser une modification fantôme disparaître au rafraîchissement
suivant.

```typescript
const dispatch = useCallback(
  (action: AppAction) => {
    localDispatch(action);
    void persistAction(action, stateRef.current).catch((e: unknown) => {
      console.error('Supabase persist failed', action.type, e);
      toast.show(t('errors.saveFailed'), 'error');
      void reload();
    });
  },
  [reload, toast, t]
);
```

> **Pas de fonctions planifiées.** Les rappels J-1 décrits dans les
> spécifications ne sont pas implémentés : il n'y a ni cron, ni Edge Function,
> ni `pg_cron`. Les notifications sont créées côté client par l'action `NOTIFY`,
> qui insère une ligne par destinataire éligible dans `notifications`.

### 4.5 Vérification des permissions (RLS)

Toute l'autorisation est en base. C'est ce qui rend publiable la clé `anon`
embarquée dans un bundle statique : un client modifié ne peut pas outrepasser
les politiques.

Le lien entre la session Supabase et le profil applicatif est la colonne
`users."authId" = auth.uid()`. Des fonctions `security definer` (qui
court-circuitent la RLS pour éviter la récursion) résolvent le rôle et les
rattachements :

```sql
-- supabase/migrations/0002_rls.sql (extrait)
create or replace function app_current_user_id()
returns text language sql stable security definer set search_path = public as $$
  select id from users where "authId" = auth.uid() limit 1
$$;

create or replace function app_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select 'admin' = any(roles) from users where "authId" = auth.uid()), false)
$$;

create or replace function app_can_manage_team(tid text)
returns boolean language sql stable security definer set search_path = public as $$
  select app_is_admin() or tid = any(app_coach_team_ids())
$$;
```

Les politiques s'expriment ensuite en une ligne par table :

```sql
-- Données rattachées à un joueur
create policy players_read on players for select to authenticated
  using (app_can_access_player(id));
create policy players_write on players for all to authenticated
  using (app_can_manage_team("primaryTeamId"))
  with check (app_can_manage_team("primaryTeamId"));

-- Blessures : coach/admin uniquement (RG-BLESS-04 — les parents ne voient
-- jamais le détail).
create policy injuries_manage on injuries for all to authenticated
  using (app_can_manage_player("playerId"))
  with check (app_can_manage_player("playerId"));

-- Indisponibilités : un parent peut déclarer pour son enfant.
create policy unavailabilities_write on unavailabilities for all to authenticated
  using (
    app_can_manage_player("playerId")
    or "playerId" = any(app_parent_player_ids())
  );
```

Le modèle de rôles est : **admin** (tout), **coach** (ses équipes via
`users."teamIds"`), **parent** (ses enfants via `contacts."playerIds"`).

---

## 5. Sélection du backend et état applicatif

### 5.1 Principe

Il n'y a **pas de couche adapter** avec une interface `BackendAdapter` et des
implémentations interchangeables. L'isolation se fait plus simplement : les
pages et composants ne consomment que les **hooks de `src/store/AppContext`**
(`usePlayers`, `useMatches`, `useTournamentGroups`, `useNotifications`…) et le
`dispatch` d'actions. Le backend est un détail d'implémentation du provider qui
enveloppe l'application.

```
Composant React
    │ import { usePlayers, useAppContext } from '../store/AppContext'
    ▼
AppContext (state + dispatch)
    │
    ├── BACKEND === 'local'    → AppProvider
    │                            useReducer + persistance localStorage
    │
    └── BACKEND === 'supabase' → SupabaseAppProvider
                                 même reducer, hydraté depuis Postgres,
                                 realtime + persistAction
```

Le point clé : **le reducer est partagé** entre les deux modes. Seules
l'hydratation initiale et la persistance changent. C'est ce qui permet aux
tests de tourner intégralement en mode `local` tout en couvrant la logique
métier utilisée en production.

### 5.2 Types du domaine (`src/types/index.ts`)

Les types domaine sont écrits à la main et servent de contrat commun aux deux
modes ; le schéma SQL les reflète colonne par colonne (§ 4.1). Il n'y a aucune
génération de types depuis le backend.

### 5.3 Chaîne de providers (`src/main.tsx`)

L'ordre de montage est significatif : l'authentification encadre l'état
applicatif, pour qu'aucune requête Supabase ne parte avant qu'une session
existe.

```tsx
// src/main.tsx (extrait)
<ErrorBoundary onError={/* … */}>
  <I18nProvider>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AuthGate>
            <AppProvider>
              <App />
            </AppProvider>
          </AuthGate>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </I18nProvider>
</ErrorBoundary>
```

`AppProvider` (dans `src/store/AppContext.tsx`) délègue à `SupabaseAppProvider`
quand `BACKEND === 'supabase'` ; sinon il gère lui-même l'état local et sa
persistance dans `localStorage` (clé `mister-footcoach-data`), initialisé
depuis `src/data/mock.ts`.

#### 5.3.1 Le magasin local est versionné

La persistance ne passe plus par un `JSON.stringify` de l'état suivi d'un
`JSON.parse` casté en `AppState` : `src/store/storage.ts` monte le
`createVersionedStore` du socle. Ce que ça change, et pourquoi :

| Avant                                   | Maintenant                                                   |
| --------------------------------------- | ------------------------------------------------------------ |
| Valeur nue sous `mister-footcoach-data` | Enveloppe `{ v, data }` sous la **même** clé                 |
| Aucune version, aucune migration        | `SCHEMA_VERSION = 1`, migrations indexées par version source |
| `as AppState` — aucune vérification     | `assertAppState` : refuse au lieu de caster                  |
| Une donnée illisible se perd en silence | Copie de côté (`…data.backup-v0`, `…data.backup-illisible`)  |

La clé n'a pas changé : le préfixe `mister-footcoach-` et la clé `data` se
recomposent exactement en `mister-footcoach-data`. Le socle considère toute
valeur **sans** enveloppe comme une version 0, et la migration `0 → 1` de l'app
la **complète** sans rien retirer — une collection absente d'un instantané plus
ancien devient un tableau vide, les clés inconnues traversent. L'instantané
d'aujourd'hui se relit donc entier, sans manœuvre de reprise
(`src/store/storage.test.ts`).

Deux rôles distincts, et c'est voulu : la migration **complète**, la validation
**refuse**. C'est cette dernière qui distingue un instantané de cette
application du fichier d'une autre, et qui fait qu'un import se solde par un
message plutôt que par une application vidée.

#### 5.3.2 Export et import de la base locale

En mode `local`, les réglages (`SettingsPage`) portent une carte « Mes
données » : un export de la **totalité** de l'état, enveloppe comprise — donc
relisible par une version future, qui le repassera par ses migrations —, et
l'import symétrique. L'import ne remplace rien tant que le parse, la chaîne de
migrations et la validation n'ont pas toutes abouti : un fichier d'une autre
application ou tronqué repart avec un message, sans que la saison en cours
bouge d'une ligne. Quand des données existent, une confirmation est demandée.

La carte est **absente** en mode `supabase` : la vérité y est en base, pas dans
ce magasin ; exporter un miroir périmé serait mensonger
(`src/pages/SettingsPage.supabase.test.tsx`).

### 5.4 Activation de Supabase

```bash
# .env.local
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Le client est créé **paresseusement** et mis en cache, pour qu'une app en mode
`local` ne construise jamais de client et ne dépende d'aucune variable
d'environnement :

```typescript
// src/lib/supabase.ts
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase non configuré : définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.'
    );
  }
  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}
```

Les étapes complètes (création du projet en région Frankfurt, application des
trois migrations, rattachement du compte auth au profil `users`) sont dans
[`docs/supabase.md`](./supabase.md).

---

## 6. Architecture frontend

### 6.1 React 19 — patterns utilisés

L'application reste volontairement sur des primitives simples. Les hooks
concurrents de React 19 ne sont **pas** utilisés à ce jour :

| Pattern             | État                                                                     |
| ------------------- | ------------------------------------------------------------------------ |
| `useReducer`        | **Utilisé** — état applicatif global unique (`src/store/AppContext.tsx`) |
| `lazy` + `Suspense` | **Utilisé** — les 18 pages sont chargées à la demande (§ 6.2)            |
| `useTransition`     | Non utilisé                                                              |
| `useDeferredValue`  | Non utilisé                                                              |
| `useOptimistic`     | Non utilisé — l'optimisme est géré dans `SupabaseAppProvider` (§ 4.4)    |
| `use(promise)`      | Non utilisé                                                              |
| Server Components   | **Non applicables** — SPA statique, rendu 100 % client                   |

La mémoïsation est également très localisée : un seul `useMemo` dans tout le
code applicatif (`LineupPage`), plus quelques `useCallback` dans `Toast` et
`SupabaseAppProvider`. Aucun `memo()` de composant. C'est un choix assumé tant
que les volumes restent ceux d'un club.

### 6.2 Routing (`src/App.tsx`)

18 routes, toutes protégées en amont par `AuthGate` (§ 8) plutôt que par un
composant `ProtectedRoute` par route. Le `basename` est dérivé de `BASE_URL`,
sans quoi l'app ne rendrait rien hors GitHub Pages.

```tsx
// src/App.tsx
export default function App() {
  return (
    // Basename dérivé de `BASE_URL` (donc de `VITE_BASE_PATH`) : `/mister-footcoach/`
    // pour GitHub Pages, `/` quand `dist/` est servi à la racine (Lighthouse CI,
    // e2e Playwright). En dur, l'app ne rendait rien hors GitHub Pages.
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<Spinner fullscreen />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="equipes" element={<TeamsPage />} />
            <Route path="equipes/:id" element={<TeamDetailPage />} />
            <Route path="joueurs/:id" element={<PlayerDetailPage />} />
            <Route path="matchs" element={<MatchesPage />} />
            <Route path="matchs/:id" element={<MatchDetailPage />} />
            <Route path="matchs/:id/live" element={<MatchLivePage />} />
            <Route path="entrainements" element={<TrainingsPage />} />
            <Route path="entrainements/:id" element={<TrainingDetailPage />} />
            <Route path="compositions" element={<LineupPage />} />
            <Route path="tournois" element={<TournamentsPage />} />
            <Route path="tournois/:id" element={<TournamentDetailPage />} />
            <Route path="sondages" element={<SurveysPage />} />
            <Route path="statistiques" element={<StatsPage />} />
            <Route path="exercices" element={<ExercisesPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="parametres" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

Il n'y a **pas de route `/login`** : l'écran de connexion est rendu par
`AuthGate` en amont du routeur (§ 8.3).

### 6.3 Navigation mobile (BottomNav)

Quatre onglets principaux, plus un bouton « Plus » qui ouvre un drawer :

```
┌────────────────────────────────────────────────────────────┐
│  Accueil  │  Équipes  │  Matchs  │  Entraîn.  │  ⋯ Plus   │
└────────────────────────────────────────────────────────────┘
```

Le drawer **Plus** contient : Tournois, Sondages, Compositions, Statistiques,
Exercices, Contacts, Paramètres. Les libellés passent tous par `t()` (i18n
fr/en) et les icônes viennent de Lucide.

### 6.4 Tailwind CSS v4

Tailwind v4 abandonne `tailwind.config.js`. La configuration se fait entièrement
dans `index.css`, qui importe d'abord le preset famille puis déclare les tokens
sémantiques du projet.

```css
/* src/index.css (extrait) */
@import 'tailwindcss';
@import '@mister-guiiug/dev-pwa-config/tailwind-preset.css';

/* Thème manuel : classe `dark` sur <html> (voir ThemeContext + script dans index.html). */
@custom-variant dark (&:where(.dark, .dark *));

/*
 * Tokens sémantiques : une seule source pour clair/sombre.
 */
html {
  --canvas: #f9fafb;
  --surface: #ffffff;
  --surface-muted: #f0fdf4;
  --fg: #111827;
  --fg-heading: #1f2937;
  --fg-muted: #4b5563;
  --fg-faint: #9ca3af;
  --divide: #f3f4f6;
  --divide-strong: #e5e7eb;
  --border-ui: #e5e7eb;
  --border-ui-strong: #d1d5db;

  /* Accent primaire (vert football) */
  --primary: #16a34a;
  --primary-hover: #15803d;
  --primary-subtle: #dcfce7;
  --primary-fg: #ffffff;
  --on-primary: #14532d;
}

html.dark {
  --canvas: #0f172a;
  --surface: #1e293b;
  /* … même jeu de tokens, valeurs sombres … */
}

@theme inline {
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-surface-muted: var(--surface-muted);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-divide: var(--divide);
  --color-border-ui: var(--border-ui);
  /* … */
}
```

Le basculement clair / sombre / système est piloté par
`src/theme/ThemeContext.tsx`, qui pose la classe `dark` sur `<html>` ; un script
inline dans `index.html` applique le thème avant le premier rendu pour éviter le
flash (son hash SHA-256 est repris dans la CSP, § 9.1).

---

## 7. PWA et stratégie hors-ligne

### 7.1 Configuration Vite PWA

```typescript
// vite.config.ts (extrait)
VitePWA({
  registerType: 'prompt',
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
  includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png', 'logo.svg'],
  manifest: {
    name: 'Mister Footcoach',
    short_name: 'Footcoach',
    start_url: basePath,
    scope: basePath,
    theme_color: '#16a34a',
    background_color: '#ffffff',
    display: 'standalone',
    icons: [/* 192, 512, 512 maskable */],
    screenshots: [/* mobile 824×1830, wide 2560×1600 */],
  },
}),
```

`registerType: 'prompt'` : la mise à jour n'est jamais appliquée dans le dos de
l'utilisateur, un bandeau propose de recharger. Le bandeau est celui du socle
(`@mister-guiiug/dev-pwa-config/react/update-prompt-banner`) ; `UpdateBanner`
ne fait plus que lui injecter le `registerSW` de `virtual:pwa-register`, les
libellés de l'i18n de l'app et son positionnement.

La seule règle de `runtimeCaching` concerne les Google Fonts. **Les appels
Supabase ne sont pas mis en cache** par le service worker.

### 7.2 Ce qui fonctionne hors-ligne — et ce qui ne fonctionne pas

| Cas                                           | Comportement réel                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| Mode `local` (défaut), app déjà installée     | **Entièrement hors-ligne** — coquille précachée, données dans `localStorage` |
| Mode `supabase`, réseau coupé                 | La coquille se charge, mais l'hydratation échoue et les écritures échouent   |
| Mode match live sans réseau (mode `supabase`) | **Non couvert** — pas de file d'attente ni de rejeu                          |

> **Il n'y a pas de couche offline dédiée.** Ni Dexie.js, ni IndexedDB, ni
> `useOfflineQueue`, ni Background Sync : le dossier `src/offline/` et les hooks
> décrits dans la v1 de ce document n'existent pas. La persistance hors-ligne se
> limite au `localStorage` du mode `local` et au précache Workbox de la coquille
> applicative.

En mode `supabase`, une écriture qui échoue (réseau ou refus RLS) est
resynchronisée sur la vérité serveur et signalée par un toast (§ 4.4) — c'est le
seul mécanisme de récupération d'erreur. Une file d'attente hors-ligne pour le
mode match live reste un écart connu avec les spécifications (§ 14.2).

### 7.3 Indicateur de connectivité

**Implémenté, et conditionnel.** `src/components/ConnectionBanner.tsx` habille
le `ConnectionBanner` du socle et est monté dans `src/main.tsx`, au-dessus de
`AuthGate` : le bandeau s'affiche donc sur tous les écrans, connecté ou non.
Une version antérieure de ce document affirmait le contraire ; c'était faux.

Il n'y a pas d'indicateur dans la `TopBar`, et c'est délibéré : une icône
permanente ne dit rien tant qu'elle est verte.

Ce qui compte ici n'est pas le bandeau, c'est sa **condition** :

| Backend              | Bandeau                        | Pourquoi                                                                   |
| -------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| `local` **(défaut)** | jamais                         | Tout vit dans `localStorage` : sans réseau, l'app marche exactement pareil |
| `supabase`           | après 1,5 s hors ligne CONTINU | Chaque `dispatch` part au serveur ; sans réseau, il n'aboutit pas          |

`online` est donc forcé à `true` en mode local — le socle prévoit ce cas
(« connectivité APPLICATIVE »). Le navigateur peut être hors ligne,
l'application, elle, ne l'est pas. Annoncer « hors connexion » à un coach dont
la séance vient d'être enregistrée serait une fausse alerte, et une fausse
alerte apprend à ignorer les vraies (`src/components/ConnectionBanner.test.tsx`
éprouve les deux bords de la temporisation, 1499 ms et 1500 ms).

Le libellé ne promet rien qui n'existe : « Hors connexion — les modifications
ne seront pas enregistrées sur le serveur. » Il ne dit **pas** « ce sera envoyé
plus tard », parce qu'il n'y a pas de file d'attente (ADR-003).

### 7.4 Le garde d'écriture distante

Un bandeau explique ; il n'empêche rien. `src/hooks/useRemoteWriteGuard.ts`
enveloppe le `useActionGuard` du socle et rend les suppressions **inertes**
quand le réseau manque en mode `supabase` — sans quoi
`SupabaseAppProvider` applique la suppression en local d'abord, échoue, puis
recharge : l'utilisateur voit son geste réussir, puis s'annuler tout seul.

Le garde est **inerte en mode local** (`online: false` éteint la
vérification) : `allowed` reste vrai, `reason` reste `null`.

Portée réelle, écrite ici pour qu'elle ne se découvre pas à l'usage :

| Couvert par le garde                                                                                                           | Non couvert                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Les quatre suppressions par corbeille : contacts, exercices, tournois (`TournamentDetailPage`), covoiturage (`CarpoolSection`) | Les créations et modifications par formulaire, et les événements du mode match live |

Une suppression bloquée porte son motif **à l'écran** — pas seulement dans son
nom accessible. Les corbeilles sont des icônes sans texte : `title` ne
s'affiche qu'à la souris, et cette application se tient au bord d'un terrain,
sur un téléphone. Chaque liste concernée rend donc le motif en clair
(`RemoteWriteNotice`), et le bouton reste dans le parcours clavier
(`aria-disabled`, pas `disabled`) pour que le motif soit **découvrable**.

---

## 8. Authentification et autorisation

### 8.1 Choix : Supabase Auth

L'authentification est celle de Supabase (e-mail + mot de passe), et non un
fournisseur d'identité tiers. Il n'y a **pas de Clerk** dans le projet.

```
Utilisateur → Supabase Auth (JWT) → Postgres (auth.uid())
                                     → users."authId" → rôle + rattachements
                                     → politiques RLS (§ 4.5)
```

Le rôle n'est pas porté par un claim du JWT : il est résolu **en base**, en
joignant `auth.uid()` sur `users."authId"`. C'est la même source de vérité pour
l'app et pour les politiques RLS.

### 8.2 Client et session (`src/auth/AuthContext.tsx`)

```tsx
// src/auth/AuthContext.tsx (extrait)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(BACKEND === 'supabase');

  useEffect(() => {
    if (BACKEND !== 'supabase') return;
    const sb = getSupabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message };
  }
  // signOut …
}
```

La session est persistée et rafraîchie automatiquement
(`persistSession: true, autoRefreshToken: true`, § 5.4). En mode `local`, le
provider est inerte : aucun client Supabase n'est créé.

### 8.3 Portail d'entrée (`AuthGate`)

Plutôt qu'un `ProtectedRoute` par route, un seul composant encadre toute
l'application, en amont du routeur (§ 5.3) :

```tsx
// src/auth/AuthGate.tsx
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (BACKEND !== 'supabase') return <>{children}</>;
  if (loading) return <Spinner fullscreen />;
  if (!session) return <LoginPage />;
  return <>{children}</>;
}
```

En mode `local` c'est un passe-plat transparent — ce qui permet aux tests et aux
e2e de tourner sans authentification.

### 8.4 Rôles

Les rôles (`admin`, `coach`, `parent`) sont stockés dans la colonne
`users.roles` (`text[]`), et les rattachements dans `users."teamIds"` (coach) ou
`contacts."playerIds"` (parent). Ils sont consommés :

- **côté serveur** par les fonctions `app_is_admin()`, `app_coach_team_ids()`,
  `app_parent_player_ids()` et les politiques RLS (§ 4.5) — c'est là que se joue
  la sécurité ;
- **côté client** uniquement pour l'affichage.

> En mode `local`, l'utilisateur courant est figé :
> `CURRENT_USER_ID = 'u1'` (`src/constants/session.ts`), le coach de l'équipe
> « U13 A » du jeu de données mock. Il n'y a pas encore de résolution du profil
> `users` à partir de la session Supabase côté client : `useCurrentUser()` lit
> cette constante dans les deux modes.

### 8.5 Supprimer son compte

Le droit à l'effacement (RGPD art. 17) est outillé depuis le 06/09/2026, en
mode `supabase` uniquement — sans compte, il n'y a rien à supprimer.

**Tout se passe en base.** Le client appelle une RPC ; c'est
`public.delete_my_account()` (`supabase/migrations/0004_supprimer_son_compte.sql`)
qui travaille. Elle est `security definer` et **appartient explicitement à
`postgres`** : c'est de lui qu'elle emprunte `bypassrls` (pour traverser les
politiques des 24 tables) et le droit d'écrire dans `auth.users`. Le bundle est
servi par GitHub Pages avec la clé publique : la clé `service_role` et l'API
d'administration (`auth.admin.deleteUser`) sont hors de question, et c'est
précisément ce que cette fonction remplace.

**Deux gestes, pas un — et c'est la seule décision de cette migration.** Le
squelette de la famille efface tout, parce que rien de ce que possède un compte
n'appartient à quelqu'un d'autre. Ici c'est faux : un entraîneur qui s'en va ne
doit pas emporter la saison du club.

| Effacé (à lui)                                                                                                                                             | Détaché (au club)                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`, `contacts` (téléphone, e-mail, `consentDate`, `consentVersion`), `notifications`, `notification_preferences`, `carpool_offers`, puis `auth.users` | `teams."coachId"`, `teams."adjointCoachId"`, `surveys."createdBy"`, `unavailabilities."declaredBy"`, `survey_responses."parentUserId"` → `null` |

Aucune de ces tables n'a de clé étrangère vers `auth.users` : **aucune cascade
ne viendrait au secours d'un oubli**, d'où la liste explicite, faite pour se
relire quand le modèle grandit.

Ce que ça ne fait pas, et que l'écran annonce avant de demander : la fiche d'un
JOUEUR n'est pas celle de son parent. Un parent qui efface son compte efface ses
propres coordonnées — les joueurs dont il était le contact n'en auront donc
plus — mais pas la fiche de son enfant, qui relève du registre du club.

**La barrière est une adresse à retaper**, pas un « OK »
(`src/components/features/settings/DangerZoneCard.tsx`). Toutes les autres
suppressions de l'application passent par le `ConfirmDialog` du socle, et c'est
bien : elles se rattrapent. Un compte effacé, non — et une barrière à « OK »
n'en est pas une, c'est le même clic que celui qu'on regrette, deux fois de
suite. Une adresse mal retapée ne grise pas le bouton : elle obtient une
réponse, en `role="alert"`.

**La preuve.** `supabase/tests/suppression-compte.test.sql` (29 assertions,
jouées par `.github/workflows/supabase-tests.yml` sur une pile jetable à chaque
changement de migration) vérifie le RÉSULTAT — plus une ligne du partant, tout
ce qui est au club encore là et détaché, le voisin intact — **et le
MÉCANISME** : que la fonction appartient bien à `postgres`, qu'elle est bien
`security definer`, que l'appelant ne peut PAS toucher `auth.users` par
lui-même, et que le droit dont elle hérite est un GRANT (ou la propriété de la
table) et non un privilège de superutilisateur. Cette dernière assertion est
celle qui rend le résultat transposable à un projet **hébergé**, où `postgres`
n'est pas superutilisateur.

> **La limite, dite.** Ces assertions tournent sur la pile jetable du runner,
> pas contre le projet hébergé. Elles établissent que le mécanisme invoqué
> n'est pas un privilège de superutilisateur ; elles ne sont pas un appel réel
> contre un projet en production. Personne, sur ce parc, n'a encore effacé un
> compte hébergé par cette voie.

---

## 9. Sécurité

### 9.1 Règles par couche

| Couche           | Mesure                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------- |
| Transport        | HTTPS obligatoire (GitHub Pages + Supabase)                                             |
| Authentification | Supabase Auth (e-mail + mot de passe), JWT porté par `supabase-js`                      |
| Autorisation     | Row Level Security Postgres sur les 24 tables — aucune confiance côté client (§ 4.5)    |
| Données mineurs  | Cloisonnement par rôle en base : `app_can_access_player()` / `app_can_manage_team()`    |
| Résidence        | Projet Supabase en région Frankfurt (`eu-central-1`) — données hébergées dans l'UE      |
| Clé `anon`       | Publique par conception : embarquée dans le bundle statique, sans pouvoir hors RLS      |
| CSP              | Durcie au build (`cspPlugin`) — `script-src` par hash SHA-256, `frame-ancestors 'none'` |
| XSS              | React échappe nativement — pas de `dangerouslySetInnerHTML`                             |
| Supply chain     | Lockfile vérifié en CI ; dépendances suivies par Renovate                               |

La CSP autorise explicitement le backend, et rien d'autre :

```typescript
// vite.config.ts (extrait)
cspPlugin({
  dev: command === 'serve',
  connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
  extraDirectives: { 'frame-ancestors': "'none'" },
}),
```

**Non implémenté à ce jour :** le flux iCal est généré côté client
(`src/utils/ical.ts`, téléchargement d'un fichier `.ics`) — il n'y a ni URL
d'abonnement, ni token à protéger. Les photos de joueurs ne sont pas stockées
(§ 11.4), donc aucune URL signée n'est en jeu.

### 9.2 Variables d'environnement

Toutes les variables du frontend sont **publiques** par construction : elles
sont inlinées dans le bundle statique. Il n'existe aucun secret côté serveur,
puisqu'il n'y a pas de serveur applicatif.

```bash
# .env.local
# "local" (localStorage, défaut) ou "supabase"
VITE_BACKEND=local

# Projet Supabase (région Frankfurt / eu-central-1). Valeurs publiques,
# safe dans le bundle statique : la sécurité est assurée côté serveur (RLS).
# VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
# VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY

# Base URL (GitHub Pages)
VITE_PUBLIC_SITE_ORIGIN=https://mister-guiiug.github.io

# Optionnel : monitoring d'erreurs Sentry. Vide = désactivé (no-op).
VITE_SENTRY_DSN=
```

Le token d'accès Supabase utilisé par la CLI (`SUPABASE_ACCESS_TOKEN`) et le
mot de passe de la base ne transitent **jamais** par le dépôt : ils restent dans
le terminal de l'opérateur (cf. [`docs/supabase.md`](./supabase.md)).

---

## 10. Tests

### 10.1 Stratégie globale

```
┌─────────────────────────────────────────────────────┐
│  Pyramide de tests                                  │
│                                                     │
│              ┌───────────┐                          │
│              │    E2E    │  Playwright + axe-core   │
│              │  @a11y    │  (1 spec, hors CI)       │
│           ┌──┴───────────┴──┐                       │
│           │  Pages & store  │  Vitest + Testing Lib │
│           │  (mode local)   │  (reducer, providers) │
│        ┌──┴─────────────────┴──┐                    │
│        │  Unitaires (Vitest 4) │  Composants, utils  │
│        │  + Testing Library    │  logique métier      │
│        └────────────────────── ┘                    │
└─────────────────────────────────────────────────────┘
```

53 fichiers de test, **colocalisés** avec le code qu'ils couvrent. Tout tourne
en mode `local` : aucun test n'atteint Supabase, et il n'y a **pas de MSW** —
les rares dépendances externes sont mockées avec `vi.mock` (§ 10.2).

### 10.2 Configuration Vitest 4

La configuration ne part pas de zéro : elle étend `baseTestOptions` et
`coveragePreset` de `@mister-guiiug/dev-pwa-config/vitest-base` (environnement
`jsdom`, `globals`, `setupFiles`, provider v8, reporters `text` / `html` /
`lcov` / `json-summary`, exclusions communes). Le projet n'ajoute que ce qui lui
est propre : le périmètre de couverture, les seuils, et les alias.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import {
  baseTestOptions,
  coveragePreset,
} from '@mister-guiiug/dev-pwa-config/vitest-base';

export default defineConfig({
  plugins: [react()],
  test: {
    ...baseTestOptions,
    coverage: {
      ...coveragePreset,
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // `coveragePreset` couvre déjà src/test/** et *.d.ts ; main.tsx est le
      // point d'entrée (montage React), non testable unitairement.
      exclude: [...coveragePreset.exclude, 'src/main.tsx'],
      // Planchers = couverture réelle EXACTE au 2026-08-10, sans marge :
      // statements 1456/2007, branches 1199/1641, functions 540/778,
      // lines 1316/1804 (le `pct` d'istanbul tronque à 2 décimales). Mesures
      // identiques sur Linux (CI) et Windows, d'où la tolérance zéro.
      // Cliquet strict : toute régression casse la CI, et tout gain de
      // couverture doit être répercuté ici. À monter, jamais à baisser pour
      // faire passer le rouge au vert.
      thresholds: {
        statements: 72.54,
        branches: 73.06,
        functions: 69.4,
        lines: 72.94,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'virtual:pwa-register/react': resolve(
        __dirname,
        './src/test/pwa-mock.ts'
      ),
    },
  },
});
```

Les seuils sont un **cliquet anti-régression** : ils sont calés sur la
couverture réelle mesurée, sans marge. Toute baisse de couverture fait échouer
`npm run test`, donc la CI (cf. § 12.1). Le fichier `vitest.config.ts` reste la
source de vérité — les valeurs ci-dessus datent du 2026-08-10 et sont relevées à
chaque gain de couverture.

Le setup partagé (`@mister-guiiug/dev-pwa-config/vitest-setup`) apporte
jest-dom, le polyfill `localStorage` / `sessionStorage` et les stubs de base. Le
setup projet n'ajoute que les mocks spécifiques à l'application :

```typescript
// src/test/setup.ts (extrait)
import '@mister-guiiug/dev-pwa-config/vitest-setup';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => cleanup());

// Locale i18n figée en français : les assertions sur du texte français
// restent valides quel que soit le navigator.language de jsdom.
Object.defineProperty(window.navigator, 'language', {
  value: 'fr-FR',
  configurable: true,
});

// Mock de virtual:pwa-register/react, utilisé par UpdateBanner
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: vi.fn(() => ({
    needRefresh: [false],
    updateServiceWorker: vi.fn(),
  })),
}));

// Mock de window.matchMedia (absent de jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

Le fichier complet ajoute également la neutralisation des avertissements
React `not wrapped in act(...)` (`beforeAll` / `afterAll` autour de
`console.error`).

### 10.3 Tests unitaires — exemple logique métier

Le gros de la couverture porte sur les utilitaires purs de `src/utils/`, qui
concentrent les règles de gestion. Exemple sur la résolution du statut d'un
sondage (intention du joueur vs confirmation du tuteur) :

```typescript
// src/utils/surveyStatus.test.ts (extrait)
import { describe, it, expect } from 'vitest';
import { retainedStatus } from './surveyStatus';
import type { SurveyResponse } from '../types';

function resp(p: Partial<SurveyResponse>): SurveyResponse {
  return { id: 'r', surveyId: 's', playerId: 'p', ...p };
}

describe('retainedStatus', () => {
  it('uses the parent confirmation as the official value', () => {
    const s = retainedStatus(resp({ confirmationParent: 'absent' }));
    expect(s.value).toBe('absent');
    expect(s.confirmed).toBe(true);
  });

  it('falls back to the unconfirmed player intention', () => {
    const s = retainedStatus(resp({ intentionJoueur: 'present' }));
    expect(s.value).toBe('present');
    expect(s.confirmed).toBe(false);
  });

  it('flags divergence between intention and confirmation', () => {
    const s = retainedStatus(
      resp({ intentionJoueur: 'present', confirmationParent: 'absent' })
    );
    expect(s.divergence).toBe(true);
    expect(s.value).toBe('absent'); // parent prevails
  });
});
```

### 10.4 Tests de l'état applicatif

Il n'y a pas de fonctions serveur à tester : la logique métier est dans le
reducer et les hooks de `src/store/AppContext.tsx`, couverts par
`AppContext.test.tsx` et `AppContext.actions.test.tsx`. La traduction
action → écriture Supabase est testée séparément dans `persistAction.test.ts`
avec un client `supabase-js` mocké, et le mapping tables ↔ état dans
`src/backend/tables.test.ts`.

Les pages sont testées en rendu réel (Testing Library) avec le provider local
et les données de `src/data/mock.ts` — ce qui exerce le même reducer que celui
utilisé en mode `supabase`.

### 10.5 Tests E2E Playwright

Une seule suite existe aujourd'hui : un audit d'accessibilité axe-core sur la
page d'accueil.

```typescript
// e2e/a11y.spec.ts
// Suite a11y minimale (axe-core + Playwright) — template dev-pwa-config.
// Le tag @a11y permet de filtrer : `playwright test --grep @a11y`.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoA11yViolations } from '@mister-guiiug/dev-pwa-config/playwright-a11y';

test.describe('@a11y accessibilité', () => {
  test("page d'accueil sans violation WCAG A/AA", async ({ page }) => {
    await page.goto('/');
    await expectNoA11yViolations(page, AxeBuilder, expect);
  });
});
```

La configuration vient de la factory famille `definePwaPlaywrightConfig`, avec
`preview: true` : les e2e s'exécutent contre un **build de production** servi par
`vite preview` (service worker, minification et cache réels), avec
`VITE_BASE_PATH=/` pour neutraliser le base path GitHub Pages.

```bash
npm run test:e2e
```

### 10.6 Tests pgTAP — le seul endroit où les migrations s'exécutent

Vitest ne touche pas la base : il éprouve du TypeScript. Les 24 tables de
`0001`, les politiques de `0002` et la fonction d'effacement de `0004` n'étaient
donc, jusqu'ici, que **relues** — et une politique se relit vite et se trompe de
même.

`supabase/tests/*.sql` s'exécute sur une pile Supabase **jetable**, montée par
le runner, qui applique les migrations depuis zéro :

```bash
supabase start   # exige Docker — absent du poste de développement
supabase test db
```

`.github/workflows/supabase-tests.yml` délègue au réutilisable de la famille
(`pwa-supabase-test.yml@v4`) et se déclenche sur tout changement de
`supabase/config.toml`, `supabase/migrations/**` ou `supabase/tests/**`. Aucun
secret : rien n'y touche le projet hébergé.

`supabase/config.toml` n'existe que pour cette pile locale — le projet hébergé,
lui, se configure par son tableau de bord et `npm run supabase:push`.

> Ces tests **ne tournent pas en CI** (`run-e2e: false`, § 12.1). Les scénarios
> fonctionnels de bout en bout (sondages, mode live, connexion) restent à
> écrire.

---

## 11. Performance et optimisation

### 11.1 Découpage des chunks (Vite 8)

```typescript
// vite.config.ts (extrait)
build: {
  sourcemap: true,
  chunkSizeWarningLimit: 900,
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (!id.includes('node_modules')) return;
        const norm = id.replace(/\\/g, '/');
        if (
          norm.includes('/react-dom/') ||
          norm.includes('/node_modules/react/') ||
          norm.includes('/scheduler/')
        ) {
          return 'react-vendor';
        }
        if (norm.includes('/react-router')) return 'router';
        if (norm.includes('/lucide-react/')) return 'lucide';
        if (norm.includes('/tailwindcss/')) return 'tailwind';
        return 'vendor';
      },
    },
  },
},
```

L'analyse du bundle est disponible à la demande via
`npm run build:analyze` (`ANALYZE=1` active `rollup-plugin-visualizer`, qui écrit
`dist/stats.html`).

### 11.2 Lazy loading des pages

Les 18 pages sont chargées en `lazy()` derrière un `Suspense` unique dont le
fallback est un `Spinner` plein écran (§ 6.2). Aucune page n'est pré-chargée —
y compris le Dashboard, qui est simplement la première route résolue.

### 11.3 Optimisations React

Volontairement minimales à ce stade (cf. § 6.1) : un seul `useMemo` dans
`LineupPage`, quelques `useCallback` dans `Toast` et `SupabaseAppProvider`,
aucun `memo()` de composant et aucun hook concurrent. Les listes manipulées
(effectif d'une équipe, calendrier d'une saison) restent de l'ordre de la
dizaine à la centaine d'éléments.

Le principal levier de performance appliqué est ailleurs : découpage des chunks
(§ 11.1), chargement paresseux des pages (§ 11.2) et précache Workbox (§ 7.1).

### 11.4 Images

- **Photos de joueurs : non implémentées.** Les colonnes `photoStorageId` /
  `logoStorageId` existent dans le schéma, mais aucun upload, aucun
  redimensionnement et aucun bucket Supabase Storage ne sont branchés.
- Icônes PWA et captures du manifest générées hors build
  (`scripts/generate-icons.mjs`, `sharp`).
- Les avatars affichés sont des placeholders CSS — aucun appel réseau.

### 11.5 Métriques cibles

Les seuils sont vérifiés à chaque PR par Lighthouse CI (§ 12.1), piloté par
`.lighthouserc.json`.

| Métrique                             | Cible                          |
| ------------------------------------ | ------------------------------ |
| LCP (Largest Contentful Paint)       | < 2.5s sur 4G                  |
| INP                                  | < 100ms                        |
| Bundle initial (gzippé)              | < 150 Ko                       |
| Chargement de la coquille hors-ligne | < 1s (précache service worker) |

Les Web Vitals sont mesurés à l'exécution par `web-vitals` dans `src/main.tsx`
(`onCLS`, `onFCP`, `onINP`, `onLCP`, `onTTFB`), aujourd'hui simplement loggés en
console — aucun endpoint de collecte n'est branché.

---

## 12. CI/CD

### 12.1 Pipeline GitHub Actions

Aucun job n'est écrit à la main dans ce dépôt : les workflows sont des
**appelants minces** qui délèguent à des _reusable workflows_ du dépôt famille
`mister-guiiug/dev-pwa-config`, épinglés sur le tag majeur `@v3`. Le bénéfice :
une seule définition de pipeline pour toutes les PWA `miss-*` / `mister-*`.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  packages: read

jobs:
  ci:
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-ci.yml@v4
    secrets: inherit
    with:
      run-e2e: false
```

Le reusable `pwa-ci.yml@v4` définit deux jobs actifs sur ce dépôt — plus un job
E2E optionnel, ici désactivé (Node 22 par défaut, `actions/checkout@v5` +
action composite `setup-pwa@v4` pour l'install) :

| Job                 | Contenu                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `verify-lockfile`   | Échoue avec un message clair si `package-lock.json` est désynchronisé de `package.json` (bindings natifs oubliés) |
| `quality`           | `npm run format:check` → `lint` → `type-check` → `test` → `build`, séquentiellement dans un seul job              |
| `e2e` _(optionnel)_ | Playwright ; **désactivé ici** via `run-e2e: false`                                                               |

Points à retenir :

- **La CI n'a pas d'étape de couverture dédiée.** La couverture est produite par
  le script `test` du projet (`vitest run --coverage`), et ce sont les
  `thresholds` de `vitest.config.ts` (§ 10.2) qui font échouer la CI en cas de
  régression. Il n'y a **ni upload d'artefact `coverage/`, ni publication
  Codecov** — le rapport HTML/lcov reste local.
- **Le levier de configuration est `package.json`.** Le reusable appelle
  `npm run <script>` ; changer ce que fait la CI (options Vitest, cible de
  build…) se fait dans les scripts npm, pas dans les fichiers de workflow.
- Les E2E Playwright ne tournent pas sur ce dépôt en CI (`run-e2e: false`) ;
  elles restent lançables en local via `npm run test:e2e`.

Les autres workflows suivent le même schéma de délégation :

| Fichier            | Reusable / rôle                                                                                | Déclencheur           |
| ------------------ | ---------------------------------------------------------------------------------------------- | --------------------- |
| `ci.yml`           | `pwa-ci.yml@v4`                                                                                | PR et push sur `main` |
| `deploy.yml`       | `pwa-deploy.yml@v4` (`use-base-path: true` pour GitHub Pages)                                  | Push sur `main`       |
| `lighthouse.yml`   | `pwa-lighthouse.yml@v4` — Lighthouse CI sur le build statique, piloté par `.lighthouserc.json` | PR                    |
| `cleanup-runs.yml` | Local — purge l'historique Actions, ne conserve que N runs par workflow                        | Manuel                |

### 12.2 Environnements

| Environnement   | Backend                                          | Déclencheur                     |
| --------------- | ------------------------------------------------ | ------------------------------- |
| **development** | `local` par défaut, ou Supabase via `.env.local` | `npm run dev`                   |
| **CI**          | `local` (aucune variable requise)                | PR et push sur `main`           |
| **production**  | Supabase (projet Frankfurt) si configuré         | Merge sur `main` → GitHub Pages |

Il n'y a **pas d'environnement de preview** : aucun déploiement par PR, et un
seul projet Supabase. Le build de production est publié sur GitHub Pages avec
`VITE_BASE_PATH=/mister-footcoach/` (§ 12.1).

---

## 13. Décisions d'architecture (ADR)

### ADR-001 — Supabase comme backend

**Décision :** Supabase (Postgres managé, région Frankfurt) est le backend de
production. Convex, envisagé dans la v1 de ce document, n'a jamais été
implémenté et la dépendance a été retirée.

**Contexte :** L'application manipule des données de mineurs, ce qui impose une
résidence UE explicite. Elle est distribuée comme un bundle statique sur GitHub
Pages, donc toute clé embarquée est publique : la sécurité doit être imposée par
le serveur. Le mode match live et les sondages demandent une propagation temps
réel.

**Conséquences :** La Row Level Security rend la clé `anon` publiable sans
risque (§ 4.5). Le modèle relationnel offre jointures, contraintes et index.
Le temps réel passe par `postgres_changes`, avec une granularité plus grossière
que des queries réactives : on réhydrate tout l'état plutôt que de merger ligne
à ligne (§ 4.4). En contrepartie, il n'y a **pas de code serveur** — donc pas de
transaction métier côté serveur, et pas de tâches planifiées natives.

**Alternative rejetée :** REST + polling — latence inadaptée au mode live.

---

### ADR-002 — Un provider par backend, pas de couche adapter

**Décision :** L'isolation du backend passe par deux implémentations de provider
partageant le **même reducer**, sélectionnées par `VITE_BACKEND`. Il n'y a pas
d'interface `BackendAdapter` ni de hooks dupliqués par backend.

**Contexte :** La v1 de ce document décrivait un pattern Adapter avec trois
implémentations (Convex, Supabase, Firebase) et une interface de hooks commune.
Avec un seul backend réel et un état applicatif global unique, cette
indirection coûtait plus qu'elle ne rapportait.

**Conséquences :** Les composants n'importent que `src/store/AppContext` et
ignorent le backend. La logique métier, étant dans le reducer, est testée une
seule fois et couvre les deux modes. Ajouter un backend signifierait écrire un
nouveau provider plus un nouveau `persistAction` — pas réimplémenter des
dizaines de hooks. L'inconvénient est que la stratégie de chargement est figée :
tout l'état est chargé d'un bloc (§ 4.2).

---

### ADR-003 — Pas de couche offline dédiée

**Décision :** Aucune file d'attente hors-ligne ni base IndexedDB. Le hors-ligne
se limite au précache Workbox de la coquille et, en mode `local`, à
`localStorage`.

**Contexte :** La v1 prévoyait Dexie.js + une queue de mutations rejouées à la
reconnexion pour le mode match live. Cela n'a pas été implémenté, et le mode
`local` couvre déjà le besoin de démonstration hors-ligne.

**Conséquences :** En mode `supabase`, une coupure réseau pendant un match fait
échouer les écritures — signalées par un toast, avec resynchronisation sur la
vérité serveur (§ 4.4), mais sans rejeu. C'est la principale limite fonctionnelle
connue de l'architecture actuelle (§ 14.3).

---

### ADR-004 — Supabase Auth pour l'authentification

**Décision :** L'authentification est celle de Supabase (e-mail + mot de passe).
Clerk, envisagé en v1, n'a pas été retenu.

**Contexte :** Le rôle doit être résolu au même endroit que les décisions
d'autorisation, c'est-à-dire en base, pour que les politiques RLS puissent s'y
appuyer. Un fournisseur d'identité tiers aurait ajouté une dépendance payante et
un second référentiel de rôles à synchroniser.

**Conséquences :** Aucun coût ni dépendance supplémentaire ; le rôle vit dans
`users.roles` et sert à la fois à l'UI et aux politiques RLS (§ 8.4). En
contrepartie, il n'y a pas d'UI d'authentification prête à l'emploi (l'écran de
connexion est écrit à la main) et pas d'OAuth Google/Apple, qui resterait à
activer côté Supabase si le besoin apparaît.

---

### ADR-005 — Tailwind CSS v4 sans fichier de config

**Décision :** Toute la configuration des tokens est dans `index.css` via `@theme inline`.

**Contexte :** Tailwind v4 abandonne le fichier `tailwind.config.js`. La configuration CSS-first est plus proche des standards web et compatible avec les IDE sans extension spécifique.

**Conséquences :** Les tokens (couleurs, espacements) sont des variables CSS natives accessibles en JavaScript via `getComputedStyle`. Pas de régression avec les plugins Tailwind existants.

---

## 14. Roadmap technique

### 14.1 Fait

| Tâche                                     | Détail                                                                |
| ----------------------------------------- | --------------------------------------------------------------------- |
| Squelette Vite 8 + React 19 + Tailwind v4 | Configuration héritée de `@mister-guiiug/dev-pwa-config`              |
| Types TypeScript domaine                  | `src/types/index.ts`                                                  |
| Mode `local` (`localStorage` + mock)      | Défaut ; sert au dev, aux tests et à la démo hors-ligne               |
| Magasin local versionné                   | Enveloppe `{ v, data }`, migration 0 → 1, copie de côté (§ 5.3.1)     |
| Export / import de la base locale         | Carte « Mes données » des réglages, mode `local` (§ 5.3.2)            |
| Indicateur de connectivité                | Bandeau du socle, mode `supabase` seulement (§ 7.3)                   |
| 18 pages métier                           | Dashboard, équipes, joueurs, matchs, entraînements, tournois…         |
| Simulateur de composition                 | Terrain interactif, formations foot à 8 (`LineupPage`)                |
| Mode match live                           | Événements, score, historique des postes (en ligne)                   |
| Sondages de présence                      | Intention joueur / confirmation tuteur, divergences                   |
| Logistique des déplacements               | Point de RDV + covoiturage                                            |
| Flux iCal                                 | Génération RFC 5545 **côté client** (`src/utils/ical.ts`)             |
| Backend Supabase                          | Schéma, RLS, seed, realtime, persistance (§ 4)                        |
| Authentification                          | Supabase Auth + `AuthGate`, rôles admin / coach / parent              |
| Supprimer son compte                      | `delete_my_account()` + « Zone dangereuse », prouvée en pgTAP (§ 8.5) |
| Notifications in-app                      | Table `notifications` + préférences par utilisateur                   |
| i18n                                      | Français / anglais (`src/i18n`)                                       |
| Thème clair / sombre / système            | `ThemeContext` + anti-FOUC inline                                     |
| PWA installable                           | Manifest + SW Workbox, bandeau de mise à jour                         |
| Tests Vitest 4                            | 53 fichiers, seuils de couverture en cliquet (§ 10.2)                 |
| CI/CD                                     | Déléguée au reusable famille + Lighthouse CI (§ 12.1)                 |
| Tests pgTAP                               | Pile jetable en CI : les migrations s'exécutent enfin (§ 10.6)        |

### 14.2 Écarts connus avec les spécifications

| Manque                         | Détail                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Rappels J-1                    | Aucune tâche planifiée : ni cron, ni Edge Function, ni `pg_cron` (§ 4.4)                                           |
| File d'attente hors-ligne      | Le mode live ne survit pas à une coupure réseau en mode `supabase` (§ 7.2)                                         |
| Photos de joueurs              | Colonnes présentes, Supabase Storage non branché (§ 11.4)                                                          |
| Profil utilisateur côté client | `useCurrentUser()` lit encore `CURRENT_USER_ID` figé (§ 8.4)                                                       |
| E2E fonctionnels               | Une seule spec a11y, non exécutée en CI (§ 10.5)                                                                   |
| Garde d'écriture partiel       | Seules les quatre suppressions par corbeille sont gardées ; les formulaires et le mode live ne le sont pas (§ 7.4) |

### 14.3 Évolutions futures

| Tâche                         | Détail                                               |
| ----------------------------- | ---------------------------------------------------- |
| Notifications Push PWA        | VAPID + Web Push API                                 |
| Intégration fédération réelle | Remplace le flux simulé de `src/data/federation.ts`  |
| Compte joueur                 | Saisie de l'intention de sondage en direct           |
| Export PDF                    | jsPDF côté client                                    |
| Merge realtime ligne à ligne  | Éviter la réhydratation complète à chaque changement |

---

_Document v2.0 — 11/08/2026 — aligné sur le code du dépôt. À réviser à chaque
changement structurant de la stack._
