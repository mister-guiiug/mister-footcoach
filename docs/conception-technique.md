# Document de Conception Technique — Mister Footcoach

**Version :** 1.0  
**Date :** 05/05/2026  
**Statut :** Brouillon — en attente de validation  
**Application :** Mister Footcoach — PWA de gestion d'équipes jeunes de football  
**Référence :** Spécifications fonctionnelles v1.2

---

## Table des matières

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Stack technique](#2-stack-technique)
3. [Structure du projet](#3-structure-du-projet)
4. [Backend principal — Convex](#4-backend-principal--convex)
5. [Couche d'abstraction backend (Adapter Pattern)](#5-couche-dabstraction-backend-adapter-pattern)
6. [Architecture frontend](#6-architecture-frontend)
7. [PWA et stratégie offline](#7-pwa-et-stratégie-offline)
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
│                    PWA React 19 (Vite 6)                        │
│                    Tailwind CSS v4 · Lucide React               │
│                    React Router v7 · Vitest 3                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS / WebSocket
┌───────────────────────────────▼─────────────────────────────────┐
│                    COUCHE ADAPTER                                │
│         BackendAdapter (interface TypeScript commune)            │
│                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│   │  ConvexAdapter│  │SupabaseAdapter│  │  FirebaseAdapter     │ │
│   │  (défaut)    │  │  (opt. V2)   │  │  (opt. V2)           │ │
│   └──────┬───────┘  └──────────────┘  └──────────────────────┘ │
└──────────┼──────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                      CONVEX BACKEND                             │
│                                                                 │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│   │  Queries    │  │  Mutations  │  │  Actions            │   │
│   │  (real-time)│  │  (écriture) │  │  (HTTP, externe)    │   │
│   └─────────────┘  └─────────────┘  └─────────────────────┘   │
│                                                                 │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│   │  Scheduled  │  │  File       │  │  Convex Auth /      │   │
│   │  Functions  │  │  Storage    │  │  Clerk              │   │
│   └─────────────┘  └─────────────┘  └─────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                 Convex Database                         │  │
│   │  (document store réactif, consistance transactionnelle) │  │
│   └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

                    SERVICES TIERS (V1+)
         ┌───────────────┐  ┌──────────────────┐
         │  Clerk (Auth) │  │  Push (Web Push) │
         └───────────────┘  └──────────────────┘
```

### 1.2 Principes directeurs

| Principe | Décision |
|---|---|
| **Réactivité temps réel** | Convex comme backend principal — les queries sont des abonnements réactifs nativement |
| **Offline-first** | IndexedDB + Service Worker pour le mode match live (§7) |
| **Isolation du backend** | Pattern Adapter pour permettre de substituer Convex par Supabase ou Firebase sans toucher au code des composants |
| **Type safety end-to-end** | TypeScript strict de bout en bout — le schéma Convex génère les types frontend automatiquement |
| **Mobile-first** | PWA installable, interface conçue pour smartphone, interactions tactiles |
| **Zéro sur-ingénierie MVP** | Le MVP utilise le stockage local (localStorage/IndexedDB) sans backend, l'adapter Convex s'active en V1 |

---

## 2. Stack technique

### 2.1 Vue synthétique

| Domaine | Technologie | Version | Rôle |
|---|---|---|---|
| Bundler | **Vite** | 6.x | Build, dev server, HMR |
| Framework UI | **React** | 19.x | Rendu, Concurrent Mode, hooks |
| Langage | **TypeScript** | 6.x | Type safety strict |
| Style | **Tailwind CSS** | 4.x | Utility-first, tokens CSS natifs |
| Icônes | **Lucide React** | latest | Bibliothèque d'icônes SVG |
| Routing | **React Router** | 7.x | SPA routing, loaders, actions |
| Backend principal | **Convex** | latest | BaaS réactif, DB, fonctions serveur |
| Auth | **Clerk** | latest | Gestion des sessions, rôles |
| Tests unitaires | **Vitest** | 3.x | Tests React + TypeScript |
| Tests E2E | **Playwright** | latest | Tests navigateur PWA |
| PWA | **vite-plugin-pwa** | latest | Manifest, Service Worker (Workbox) |
| Offline store | **Dexie.js** | latest | Wrapper IndexedDB typé |

### 2.2 Alternatives backend (optionnelles)

| Backend | Package | Activation |
|---|---|---|
| **Supabase** | `@supabase/supabase-js` | `VITE_BACKEND=supabase` |
| **Firebase** | `firebase` | `VITE_BACKEND=firebase` |

Les deux restent des dépendances optionnelles (`devDependencies`) jusqu'à activation explicite.

### 2.3 Choix de Convex — justification

Convex est retenu comme backend principal pour les raisons suivantes :

| Besoin fonctionnel | Ce que Convex apporte |
|---|---|
| Score live visible par les parents | Queries réactives WebSocket nativement — zéro polling |
| Sondages avec réponses en temps réel | Mise à jour instantanée du tableau de bord coach |
| Mode match offline | Mutations mises en file d'attente côté client, rejouées à la reconnexion |
| Rappels de séance (J-1) | Scheduled functions natives |
| Type safety backend ↔ frontend | Génération automatique des types depuis le schéma |
| Notifications in-app | Mutations sur table `notifications` + query réactive |
| Simplicité opérationnelle | PaaS managé — pas d'infra à gérer |

---

## 3. Structure du projet

```
mister-footcoach/
│
├── convex/                          # Backend Convex (déployé séparément)
│   ├── schema.ts                    # Schéma de données (source de vérité des types)
│   ├── auth.config.ts               # Configuration Clerk
│   ├── _generated/                  # Types auto-générés — ne pas éditer
│   ├── lib/
│   │   ├── permissions.ts           # Helpers de vérification des rôles
│   │   └── validators.ts            # Validateurs réutilisables
│   ├── teams.ts                     # Queries/mutations équipes
│   ├── players.ts                   # Queries/mutations joueurs
│   ├── matches.ts                   # Queries/mutations matchs
│   ├── matchEvents.ts               # Mutations événements live
│   ├── trainings.ts                 # Queries/mutations entraînements
│   ├── exercises.ts                 # Bibliothèque d'exercices
│   ├── lineups.ts                   # Compositions
│   ├── tournaments.ts               # Tournois
│   ├── surveys.ts                   # Sondages
│   ├── logistics.ts                 # Covoiturage, point de RDV
│   ├── attendances.ts               # Assiduité
│   ├── unavailabilities.ts          # Indisponibilités
│   ├── injuries.ts                  # Suivi blessures
│   ├── notifications.ts             # Notifications in-app
│   ├── ical.ts                      # Génération flux iCal
│   └── scheduled.ts                 # Fonctions planifiées (rappels)
│
├── src/
│   ├── main.tsx                     # Point d'entrée
│   ├── App.tsx                      # Routeur principal
│   ├── index.css                    # Tokens Tailwind CSS v4
│   ├── vite-env.d.ts
│   │
│   ├── adapters/                    # Couche d'abstraction backend
│   │   ├── types.ts                 # Interfaces TypeScript communes
│   │   ├── index.ts                 # Factory — sélection selon VITE_BACKEND
│   │   ├── convex/                  # Adapter Convex (défaut)
│   │   │   ├── index.ts
│   │   │   ├── teams.hooks.ts
│   │   │   ├── players.hooks.ts
│   │   │   ├── matches.hooks.ts
│   │   │   └── ...
│   │   ├── supabase/                # Adapter Supabase (opt.)
│   │   │   └── index.ts
│   │   └── firebase/                # Adapter Firebase (opt.)
│   │       └── index.ts
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx         # Wrapper principal
│   │   │   ├── TopBar.tsx           # En-tête avec retour et titre
│   │   │   └── BottomNav.tsx        # Navigation mobile (5 onglets)
│   │   ├── ui/                      # Composants atomiques réutilisables
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Spinner.tsx
│   │   └── features/                # Composants métier
│   │       ├── players/
│   │       ├── matches/
│   │       ├── live/                # Mode match en temps réel
│   │       ├── trainings/
│   │       ├── lineup/              # Simulateur de composition
│   │       ├── tournaments/
│   │       ├── surveys/             # Sondages de présence
│   │       └── logistics/           # Point de RDV, covoiturage
│   │
│   ├── hooks/
│   │   ├── useOfflineQueue.ts       # File d'attente hors-ligne
│   │   ├── useOnlineStatus.ts       # Détection connectivité
│   │   └── useNotifications.ts      # Centre de notifications
│   │
│   ├── offline/
│   │   ├── db.ts                    # Dexie.js — schéma IndexedDB
│   │   ├── queue.ts                 # Queue de mutations offline
│   │   └── sync.ts                  # Stratégie de synchronisation
│   │
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── TeamsPage.tsx
│   │   ├── TeamDetailPage.tsx
│   │   ├── PlayerDetailPage.tsx
│   │   ├── MatchesPage.tsx
│   │   ├── MatchDetailPage.tsx
│   │   ├── MatchLivePage.tsx        # Mode match live
│   │   ├── TrainingsPage.tsx
│   │   ├── LineupPage.tsx
│   │   ├── TournamentsPage.tsx
│   │   ├── SurveysPage.tsx
│   │   └── SettingsPage.tsx
│   │
│   ├── store/
│   │   └── uiStore.ts               # État UI local (Zustand léger ou useState)
│   │
│   ├── theme/
│   │   └── ThemeContext.tsx          # Clair / Sombre / Système
│   │
│   ├── types/
│   │   └── index.ts                 # Types domaine (miroir du schéma Convex)
│   │
│   └── utils/
│       ├── date.ts
│       ├── positions.ts             # Référentiel postes foot à 8
│       └── ical.ts                  # Formatage iCal côté client
│
├── public/
│   ├── logo.svg
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
│
├── e2e/                             # Tests Playwright
├── docs/
│   ├── spec.md
│   ├── specs-fonctionnelles.md
│   └── conception-technique.md      # Ce document
│
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts               # Vide en v4 — config dans index.css
├── tsconfig.json
└── package.json
```

---

## 4. Backend principal — Convex

### 4.1 Schéma de données (`convex/schema.ts`)

Le schéma est la **source de vérité unique** pour les types TypeScript. Toute modification du schéma régénère automatiquement les types dans `convex/_generated/`.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // ── Clubs & Saisons ─────────────────────────────────────────
  clubs: defineTable({
    name: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
  }),

  seasons: defineTable({
    clubId: v.id("clubs"),
    name: v.string(),          // "2025-2026"
    startDate: v.string(),     // ISO date
    endDate: v.string(),
    active: v.boolean(),
  }).index("by_club", ["clubId"]),

  // ── Équipes ──────────────────────────────────────────────────
  teams: defineTable({
    clubId: v.id("clubs"),
    seasonId: v.id("seasons"),
    name: v.string(),
    category: v.string(),      // "U13", "U11"
    coachId: v.id("users"),
    adjointCoachId: v.optional(v.id("users")),
    color: v.optional(v.string()),
  })
    .index("by_season", ["seasonId"])
    .index("by_coach", ["coachId"]),

  // ── Joueurs ──────────────────────────────────────────────────
  players: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    primaryTeamId: v.id("teams"),
    secondaryTeamId: v.optional(v.id("teams")),
    preferredPosition: v.string(),
    appetences: v.optional(v.record(v.string(), v.number())), // Position → 1..5
    number: v.optional(v.number()),
    active: v.boolean(),
    photoStorageId: v.optional(v.id("_storage")),
  })
    .index("by_primary_team", ["primaryTeamId"])
    .index("by_secondary_team", ["secondaryTeamId"]),

  // ── Indisponibilités ─────────────────────────────────────────
  unavailabilities: defineTable({
    playerId: v.id("players"),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    motif: v.union(
      v.literal("blessure"), v.literal("maladie"),
      v.literal("vacances"), v.literal("suspension"),
      v.literal("personnel"), v.literal("autre"),
    ),
    declaredBy: v.id("users"),
    note: v.optional(v.string()),
    injuryId: v.optional(v.id("injuries")),
  }).index("by_player", ["playerId"]),

  // ── Blessures ────────────────────────────────────────────────
  injuries: defineTable({
    playerId: v.id("players"),
    zone: v.string(),
    nature: v.string(),
    startDate: v.string(),
    estimatedReturnDate: v.optional(v.string()),
    actualReturnDate: v.optional(v.string()),
    status: v.union(
      v.literal("en_reeduc"),
      v.literal("reprise_progressive"),
      v.literal("apte"),
    ),
    noteCoach: v.optional(v.string()),
  }).index("by_player", ["playerId"]),

  // ── Matchs ───────────────────────────────────────────────────
  matches: defineTable({
    teamId: v.id("teams"),
    seasonId: v.id("seasons"),
    tournamentId: v.optional(v.id("tournaments")),
    tournamentGroupId: v.optional(v.id("tournamentGroups")),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    address: v.string(),
    isHome: v.boolean(),
    opponent: v.string(),
    status: v.union(
      v.literal("previsionnel"), v.literal("engage"),
      v.literal("saison"), v.literal("tournoi"), v.literal("annule"),
    ),
    phase: v.string(),
    scoreHome: v.optional(v.number()),
    scoreAway: v.optional(v.number()),
    note: v.optional(v.string()),
    liveActive: v.boolean(),
    // Point de RDV
    meetingAddress: v.optional(v.string()),
    meetingTime: v.optional(v.string()),
    meetingNote: v.optional(v.string()),
  })
    .index("by_team", ["teamId"])
    .index("by_season", ["seasonId"])
    .index("by_date", ["date"]),

  // ── Événements match live ────────────────────────────────────
  matchEvents: defineTable({
    matchId: v.id("matches"),
    type: v.union(
      v.literal("but"), v.literal("but_csc"),
      v.literal("carton_jaune"), v.literal("carton_rouge"),
      v.literal("remplacement"), v.literal("blessure_live"),
      v.literal("arret_mi_temps"),
    ),
    minute: v.optional(v.number()),
    playerId: v.optional(v.id("players")),
    player2Id: v.optional(v.id("players")),
    note: v.optional(v.string()),
  })
    .index("by_match", ["matchId"])
    .index("by_match_type", ["matchId", "type"]),

  // ── Entraînements ────────────────────────────────────────────
  trainings: defineTable({
    teamId: v.id("teams"),
    date: v.string(),
    time: v.string(),
    duration: v.number(),
    type: v.union(v.literal("regulier"), v.literal("exceptionnel")),
    cancelled: v.boolean(),
    theme: v.optional(v.string()),
    note: v.optional(v.string()),
    seriesId: v.optional(v.string()), // UUID commun aux occurrences d'une série
  })
    .index("by_team", ["teamId"])
    .index("by_date", ["date"]),

  // ── Blocs de séance ──────────────────────────────────────────
  trainingBlocks: defineTable({
    trainingId: v.id("trainings"),
    order: v.number(),
    duration: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    exerciseId: v.optional(v.id("exercises")),
    exerciseTitleSnapshot: v.optional(v.string()), // dénormalisé
  }).index("by_training", ["trainingId"]),

  // ── Bibliothèque d'exercices ─────────────────────────────────
  exercises: defineTable({
    clubId: v.id("clubs"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("echauffement"), v.literal("technique"),
      v.literal("physique"), v.literal("tactique"),
      v.literal("jeu"), v.literal("retour_au_calme"),
    ),
    suggestedDuration: v.optional(v.number()),
    tags: v.array(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_club", ["clubId"])
    .index("by_category", ["category"]),

  // ── Assiduité ────────────────────────────────────────────────
  attendances: defineTable({
    sessionType: v.union(v.literal("match"), v.literal("training")),
    sessionId: v.string(),
    playerId: v.id("players"),
    status: v.union(
      v.literal("present"), v.literal("absent"), v.literal("excuse"),
    ),
    note: v.optional(v.string()),
    recordedBy: v.id("users"),
  })
    .index("by_session", ["sessionType", "sessionId"])
    .index("by_player", ["playerId"]),

  // ── Historique des postes ────────────────────────────────────
  positionHistory: defineTable({
    playerId: v.id("players"),
    matchId: v.id("matches"),
    period: v.string(),
    position: v.string(),
    minute: v.optional(v.number()),
  }).index("by_player", ["playerId"]),

  // ── Compositions ────────────────────────────────────────────
  lineups: defineTable({
    teamId: v.id("teams"),
    matchId: v.optional(v.id("matches")),
    name: v.string(),
    formation: v.string(),
    slots: v.array(v.object({
      position: v.string(),
      playerId: v.optional(v.id("players")),
      x: v.number(),
      y: v.number(),
    })),
    substituteIds: v.array(v.id("players")),
  }).index("by_team", ["teamId"]),

  // ── Tournois ────────────────────────────────────────────────
  tournaments: defineTable({
    clubId: v.id("clubs"),
    seasonId: v.id("seasons"),
    name: v.string(),
    dateStart: v.string(),
    dateEnd: v.optional(v.string()),
    location: v.string(),
    address: v.string(),
    organizer: v.string(),
    isOrganizedByClub: v.boolean(),
    teamIds: v.array(v.id("teams")),
    format: v.union(
      v.literal("poules"),
      v.literal("elimination_directe"),
      v.literal("poules_finale"),
    ),
    status: v.union(
      v.literal("planifie"), v.literal("en_cours"), v.literal("termine"),
    ),
  }).index("by_season", ["seasonId"]),

  tournamentGroups: defineTable({
    tournamentId: v.id("tournaments"),
    name: v.string(),
    type: v.union(v.literal("poule"), v.literal("elimination")),
    order: v.number(),
  }).index("by_tournament", ["tournamentId"]),

  // ── Covoiturage ──────────────────────────────────────────────
  carpoolOffers: defineTable({
    matchId: v.id("matches"),
    offeredBy: v.id("users"),
    seats: v.number(),
    departureLocation: v.optional(v.string()),
    departureTime: v.optional(v.string()),
    playerIds: v.array(v.id("players")),
    note: v.optional(v.string()),
  }).index("by_match", ["matchId"]),

  // ── Sondages de présence ─────────────────────────────────────
  surveys: defineTable({
    teamId: v.id("teams"),
    sessionType: v.union(
      v.literal("match"), v.literal("training"),
      v.literal("tournament"), v.literal("libre"),
    ),
    sessionId: v.optional(v.string()),
    question: v.string(),
    deadline: v.string(),
    status: v.union(
      v.literal("ouvert"), v.literal("ferme"), v.literal("archive"),
    ),
    sendNotification: v.boolean(),
    createdBy: v.id("users"),
  }).index("by_team", ["teamId"]),

  surveyResponses: defineTable({
    surveyId: v.id("surveys"),
    playerId: v.id("players"),
    // Intention du joueur (renseignée par le parent au nom du joueur en V1)
    intentionJoueur: v.optional(v.union(
      v.literal("present"), v.literal("absent"), v.literal("incertain"),
    )),
    dateIntentionJoueur: v.optional(v.string()),
    // Confirmation officielle du parent (valeur retenue)
    confirmationParent: v.optional(v.union(
      v.literal("present"), v.literal("absent"), v.literal("incertain"),
    )),
    dateConfirmationParent: v.optional(v.string()),
    parentUserId: v.optional(v.id("users")),
    note: v.optional(v.string()),
  })
    .index("by_survey", ["surveyId"])
    .index("by_player_survey", ["playerId", "surveyId"]),

  // ── Notifications in-app ────────────────────────────────────
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    message: v.string(),
    read: v.boolean(),
    relatedId: v.optional(v.string()),
    relatedType: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"]),

  // ── Tokens iCal ─────────────────────────────────────────────
  icalTokens: defineTable({
    userId: v.id("users"),
    fluxType: v.union(
      v.literal("equipe"), v.literal("joueur"), v.literal("personnel"),
    ),
    targetId: v.optional(v.string()),
    token: v.string(),
    active: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),

  // ── Contacts & Filiation ────────────────────────────────────
  contacts: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    email: v.string(),
    type: v.string(),           // père, mère, tuteur…
    playerIds: v.array(v.id("players")),
    userId: v.optional(v.id("users")),
    consentDate: v.optional(v.string()),
    consentVersion: v.optional(v.string()),
  }).index("by_email", ["email"]),
});
```

### 4.2 Queries — exemple

```typescript
// convex/players.ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireCoachOfTeam } from "./lib/permissions";

export const listByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    await requireCoachOfTeam(ctx, teamId);
    return ctx.db
      .query("players")
      .withIndex("by_primary_team", (q) => q.eq("primaryTeamId", teamId))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

export const getWithAvailability = query({
  args: { teamId: v.id("teams"), matchDate: v.string() },
  handler: async (ctx, { teamId, matchDate }) => {
    await requireCoachOfTeam(ctx, teamId);
    const players = await ctx.db
      .query("players")
      .withIndex("by_primary_team", (q) => q.eq("primaryTeamId", teamId))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    // Pour chaque joueur, vérifier les indisponibilités actives à la date du match
    return Promise.all(
      players.map(async (player) => {
        const unavailability = await ctx.db
          .query("unavailabilities")
          .withIndex("by_player", (q) => q.eq("playerId", player._id))
          .filter((q) =>
            q.and(
              q.lte(q.field("startDate"), matchDate),
              q.or(
                q.eq(q.field("endDate"), undefined),
                q.gte(q.field("endDate"), matchDate),
              ),
            ),
          )
          .first();
        return { ...player, unavailability: unavailability ?? null };
      }),
    );
  },
});
```

### 4.3 Mutations — exemple

```typescript
// convex/matchEvents.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireCoachOfTeam } from "./lib/permissions";

export const addEvent = mutation({
  args: {
    matchId: v.id("matches"),
    type: v.string(),
    minute: v.optional(v.number()),
    playerId: v.optional(v.id("players")),
    player2Id: v.optional(v.id("players")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match introuvable");
    if (!match.liveActive) throw new Error("Mode live non actif");
    await requireCoachOfTeam(ctx, match.teamId);

    const eventId = await ctx.db.insert("matchEvents", args);

    // Effets de bord selon le type d'événement
    if (args.type === "but") {
      await ctx.db.patch(args.matchId, {
        scoreHome: (match.scoreHome ?? 0) + (match.isHome ? 1 : 0),
        scoreAway: (match.scoreAway ?? 0) + (!match.isHome ? 1 : 0),
      });
    }

    if (args.type === "remplacement" && args.playerId && args.player2Id) {
      // Alimenter l'historique des postes pour les deux joueurs
      await ctx.db.insert("positionHistory", {
        playerId: args.player2Id,   // joueur sortant
        matchId: args.matchId,
        period: "remplacement_sortant",
        position: "?",              // à enrichir avec le poste de la compo
        minute: args.minute,
      });
    }

    return eventId;
  },
});
```

### 4.4 Scheduled Functions — rappels J-1

```typescript
// convex/scheduled.ts
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Appelé chaque jour à 8h (cron configuré dans convex/crons.ts)
export const sendDayBeforeReminders = internalAction({
  handler: async (ctx) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Récupérer matchs et entraînements du lendemain
    const matches = await ctx.runQuery(internal.matches.getByDate, {
      date: tomorrowStr,
    });
    const trainings = await ctx.runQuery(internal.trainings.getByDate, {
      date: tomorrowStr,
    });

    for (const event of [...matches, ...trainings]) {
      await ctx.runMutation(internal.notifications.createForTeam, {
        teamId: event.teamId,
        type: "rappel_veille",
        message: `Rappel : ${event.type === "match" ? "match" : "entraînement"} demain à ${event.time}`,
        relatedId: event._id,
        relatedType: event.type,
        rolesTarget: ["parent"],
      });
    }
  },
});

// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.daily(
  "rappels J-1",
  { hourUTC: 6, minuteUTC: 0 },   // 8h Paris (UTC+2 en été)
  internal.scheduled.sendDayBeforeReminders,
);
export default crons;
```

### 4.5 Vérification des permissions

```typescript
// convex/lib/permissions.ts
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function requireCoachOfTeam(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">,
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Non authentifié");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) =>
      q.eq("clerkId", identity.subject),
    )
    .unique();

  if (!user) throw new Error("Utilisateur inconnu");

  const isAdmin = user.roles.includes("admin");
  if (isAdmin) return user;

  const isCoachOfTeam = user.roles.includes("coach") &&
    user.teamIds.includes(teamId);
  if (!isCoachOfTeam) throw new Error("Accès refusé");

  return user;
}

export async function requireParentOfPlayer(
  ctx: QueryCtx | MutationCtx,
  playerId: Id<"players">,
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Non authentifié");

  const contact = await ctx.db
    .query("contacts")
    .filter((q) =>
      q.and(
        q.eq(q.field("userId"), identity.subject),
        q.neq(q.field("playerIds"), []),
      ),
    )
    .first();

  if (!contact?.playerIds.includes(playerId)) {
    throw new Error("Accès refusé");
  }
  return contact;
}
```

---

## 5. Couche d'abstraction backend (Adapter Pattern)

### 5.1 Principe

L'objectif est que les composants React et les pages n'importent **jamais** directement les primitives Convex, Supabase ou Firebase. Ils consomment uniquement des hooks à travers la couche adapter.

```
Composant React
    │ import { usePlayers } from "@/adapters"
    ▼
src/adapters/index.ts          ← sélectionne selon VITE_BACKEND
    │
    ├── convex/players.hooks.ts   ← useQuery(api.players.listByTeam)
    ├── supabase/players.hooks.ts ← useEffect + supabase.from("players")
    └── firebase/players.hooks.ts ← onSnapshot(collection("players"))
```

Chaque adapter exporte exactement les **mêmes hooks avec les mêmes signatures**.

### 5.2 Interfaces communes (`src/adapters/types.ts`)

```typescript
// src/adapters/types.ts
import type { Id } from "@/types/convex";

// ── Types domaine ────────────────────────────────────────────
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  primaryTeamId: string;
  secondaryTeamId?: string;
  preferredPosition: Position;
  appetences?: Partial<Record<Position, number>>;
  number?: number;
  active: boolean;
  unavailability?: Unavailability | null;   // enrichi à la query
}

export interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
}

// ── Interfaces des hooks ─────────────────────────────────────
export interface PlayersAdapter {
  usePlayers(teamId: string): UseQueryResult<Player[]>;
  usePlayersWithAvailability(
    teamId: string,
    matchDate: string,
  ): UseQueryResult<(Player & { unavailability: Unavailability | null })[]>;
  useCreatePlayer(): {
    mutate: (data: CreatePlayerData) => Promise<string>;
    isLoading: boolean;
  };
  useUpdatePlayer(): {
    mutate: (id: string, data: Partial<Player>) => Promise<void>;
    isLoading: boolean;
  };
}

export interface MatchesAdapter {
  useMatches(teamId: string): UseQueryResult<Match[]>;
  useMatch(matchId: string): UseQueryResult<Match>;
  useMatchEvents(matchId: string): UseQueryResult<MatchEvent[]>;
  useAddMatchEvent(): {
    mutate: (data: CreateMatchEventData) => Promise<string>;
    isLoading: boolean;
  };
  useUpdateMatchScore(): {
    mutate: (matchId: string, scoreHome: number, scoreAway: number) => Promise<void>;
  };
}

export interface SurveysAdapter {
  useSurveys(teamId: string): UseQueryResult<Survey[]>;
  useSurveyResponses(surveyId: string): UseQueryResult<SurveyResponse[]>;
  useRespondToSurvey(): {
    mutate: (data: SurveyResponseData) => Promise<void>;
    isLoading: boolean;
  };
}

// Interface complète du backend
export interface BackendAdapter {
  players: PlayersAdapter;
  matches: MatchesAdapter;
  surveys: SurveysAdapter;
  // ... teams, trainings, lineups, tournaments, logistics, notifications
}
```

### 5.3 Adapter Convex (`src/adapters/convex/`)

```typescript
// src/adapters/convex/players.hooks.ts
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { PlayersAdapter } from "../types";

export const convexPlayersAdapter: PlayersAdapter = {
  usePlayers(teamId) {
    const data = useQuery(api.players.listByTeam, { teamId: teamId as any });
    return {
      data: data?.map(normalizePlayer),
      isLoading: data === undefined,
      error: null,
    };
  },

  usePlayersWithAvailability(teamId, matchDate) {
    const data = useQuery(api.players.getWithAvailability, {
      teamId: teamId as any,
      matchDate,
    });
    return {
      data: data?.map(normalizePlayerWithAvailability),
      isLoading: data === undefined,
      error: null,
    };
  },

  useCreatePlayer() {
    const mutate = useMutation(api.players.create);
    return {
      mutate: async (data) => {
        const id = await mutate(data);
        return id;
      },
      isLoading: false,
    };
  },

  useUpdatePlayer() {
    const mutate = useMutation(api.players.update);
    return {
      mutate: async (id, data) => { await mutate({ id: id as any, ...data }); },
      isLoading: false,
    };
  },
};
```

### 5.4 Factory et sélection (`src/adapters/index.ts`)

```typescript
// src/adapters/index.ts
import type { BackendAdapter } from "./types";

const backend = import.meta.env.VITE_BACKEND ?? "convex";

async function loadAdapter(): Promise<BackendAdapter> {
  switch (backend) {
    case "supabase": {
      const mod = await import("./supabase");
      return mod.supabaseAdapter;
    }
    case "firebase": {
      const mod = await import("./firebase");
      return mod.firebaseAdapter;
    }
    default: {
      const mod = await import("./convex");
      return mod.convexAdapter;
    }
  }
}

// Hooks réexportés — point d'entrée unique pour les composants
export { usePlayers, usePlayersWithAvailability } from "./convex/players.hooks";
// (remplacés dynamiquement selon VITE_BACKEND grâce au tree-shaking Vite)
```

### 5.5 Activation Supabase ou Firebase

```bash
# .env.local pour activer Supabase
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# .env.local pour activer Firebase
VITE_BACKEND=firebase
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_PROJECT_ID=mister-footcoach
```

> L'adapter Supabase utilise les subscriptions PostgreSQL de Supabase (`supabase.channel(...).on(...)`).  
> L'adapter Firebase utilise `onSnapshot` de Firestore.  
> Dans les deux cas, la signature des hooks exportés est identique à l'adapter Convex.

---

## 6. Architecture frontend

### 6.1 React 19 — patterns utilisés

| Pattern | Usage |
|---|---|
| `useTransition` | Transitions non-bloquantes lors du chargement des pages |
| `useDeferredValue` | Recherche dans la liste des joueurs / exercices |
| `use(promise)` | Chargement de données dans les composants avec Suspense |
| `useOptimistic` | Mises à jour optimistes (assiduité, sondages) |
| Server Components | **Non utilisés** — PWA offline-first exige un rendu client |

### 6.2 Routing (`src/App.tsx`)

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Spinner } from "./components/ui/Spinner";

const DashboardPage    = lazy(() => import("./pages/DashboardPage"));
const TeamsPage        = lazy(() => import("./pages/TeamsPage"));
const TeamDetailPage   = lazy(() => import("./pages/TeamDetailPage"));
const PlayerDetailPage = lazy(() => import("./pages/PlayerDetailPage"));
const MatchesPage      = lazy(() => import("./pages/MatchesPage"));
const MatchDetailPage  = lazy(() => import("./pages/MatchDetailPage"));
const MatchLivePage    = lazy(() => import("./pages/MatchLivePage"));
const TrainingsPage    = lazy(() => import("./pages/TrainingsPage"));
const LineupPage       = lazy(() => import("./pages/LineupPage"));
const TournamentsPage  = lazy(() => import("./pages/TournamentsPage"));
const SurveysPage      = lazy(() => import("./pages/SurveysPage"));
const SettingsPage     = lazy(() => import("./pages/SettingsPage"));

export default function App() {
  return (
    <BrowserRouter basename="/mister-footcoach">
      <Suspense fallback={<Spinner fullscreen />}>
        <Routes>
          {/* Routes publiques */}
          <Route path="/login"   element={<LoginPage />} />
          <Route path="/consent" element={<ConsentPage />} />

          {/* Routes protégées */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="equipes"              element={<TeamsPage />} />
              <Route path="equipes/:id"          element={<TeamDetailPage />} />
              <Route path="joueurs/:id"          element={<PlayerDetailPage />} />
              <Route path="matchs"               element={<MatchesPage />} />
              <Route path="matchs/:id"           element={<MatchDetailPage />} />
              <Route path="matchs/:id/live"      element={<MatchLivePage />} />
              <Route path="entrainements"        element={<TrainingsPage />} />
              <Route path="compositions"         element={<LineupPage />} />
              <Route path="tournois"             element={<TournamentsPage />} />
              <Route path="sondages"             element={<SurveysPage />} />
              <Route path="parametres"           element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### 6.3 Navigation mobile (BottomNav)

```
┌────────────────────────────────────────────────────────────┐
│  🏠 Accueil  │  👥 Équipes  │  📅 Matchs  │  🏋 Entraîn.  │  ⚙️ Plus  │
└────────────────────────────────────────────────────────────┘
```

L'onglet **Plus** ouvre un drawer avec : Tournois, Sondages, Compositions, Paramètres.

### 6.4 Tailwind CSS v4

Tailwind v4 abandonne `tailwind.config.js`. La configuration se fait entièrement dans `index.css` via la directive `@theme`.

```css
/* src/index.css */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

/* Tokens sémantiques */
html {
  --canvas:            #f9fafb;
  --surface:           #ffffff;
  --surface-muted:     #f0fdf4;
  --fg:                #111827;
  --fg-heading:        #1f2937;
  --fg-muted:          #4b5563;
  --fg-faint:          #9ca3af;
  --border-ui:         #e5e7eb;
  --border-ui-strong:  #d1d5db;
  /* Accent primaire — vert football */
  --primary:           #16a34a;
  --primary-hover:     #15803d;
  --primary-subtle:    #dcfce7;
  --primary-fg:        #ffffff;
  /* Statuts */
  --status-present:    #16a34a;
  --status-absent:     #dc2626;
  --status-excuse:     #d97706;
  --status-unknown:    #9ca3af;
}

html.dark {
  --canvas:            #0f172a;
  --surface:           #1e293b;
  --surface-muted:     #0f2d1a;
  --fg:                #f1f5f9;
  --fg-heading:        #f8fafc;
  --fg-muted:          #94a3b8;
  --fg-faint:          #64748b;
  --border-ui:         #334155;
  --primary:           #22c55e;
  --primary-hover:     #16a34a;
}

@theme inline {
  --color-canvas:       var(--canvas);
  --color-surface:      var(--surface);
  --color-fg:           var(--fg);
  --color-fg-muted:     var(--fg-muted);
  --color-primary:      var(--primary);
  --color-border-ui:    var(--border-ui);
}
```

---

## 7. PWA et stratégie offline

### 7.1 Configuration Vite PWA

```typescript
// vite.config.ts (extrait)
VitePWA({
  registerType: "prompt",
  strategies: "generateSW",
  workbox: {
    globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest}"],
    // Stratégie réseau → cache pour les assets statiques
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.convex\.cloud\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "convex-api",
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
        },
      },
    ],
  },
}),
```

### 7.2 Stratégie offline pour le mode match live

Le mode match live est le seul flux qui doit fonctionner **entièrement hors-ligne**. La stratégie est la suivante :

```
┌─────────────────────────────────────────────────────────┐
│               MODE MATCH LIVE — FLUX OFFLINE            │
│                                                         │
│  Coach tape "But"                                       │
│       │                                                 │
│       ▼                                                 │
│  useOfflineQueue.enqueue(addMatchEvent, args)           │
│       │                                                 │
│       ├── [En ligne]  ──▶ Convex mutation directe       │
│       │                   Résultat immédiat             │
│       │                                                 │
│       └── [Hors-ligne] ─▶ Stockage IndexedDB           │
│                           (Dexie.js, table "queue")     │
│                           Affichage optimiste local     │
│                                ↓                        │
│                           Background Sync SW            │
│                                ↓                        │
│                    [Reconnexion réseau]                  │
│                                ↓                        │
│                    Replay des mutations en file          │
│                    dans l'ordre d'insertion              │
│                    Résolution des conflits              │
└─────────────────────────────────────────────────────────┘
```

### 7.3 Schéma IndexedDB (`src/offline/db.ts`)

```typescript
// src/offline/db.ts
import Dexie, { type Table } from "dexie";

export interface OfflineQueueEntry {
  id?: number;
  functionName: string;    // "matchEvents:addEvent"
  args: unknown;
  createdAt: number;       // timestamp ms
  retryCount: number;
  status: "pending" | "retrying" | "failed";
}

export interface LocalMatchState {
  matchId: string;
  scoreHome: number;
  scoreAway: number;
  events: LocalMatchEvent[];
  synced: boolean;
  lastUpdated: number;
}

class OfflineDB extends Dexie {
  queue!: Table<OfflineQueueEntry>;
  matchStates!: Table<LocalMatchState>;

  constructor() {
    super("mister-footcoach-offline");
    this.version(1).stores({
      queue: "++id, status, createdAt",
      matchStates: "matchId, synced",
    });
  }
}

export const db = new OfflineDB();
```

### 7.4 Hook `useOfflineQueue`

```typescript
// src/hooks/useOfflineQueue.ts
import { useMutation } from "convex/react";
import { useOnlineStatus } from "./useOnlineStatus";
import { db } from "@/offline/db";

export function useOfflineQueue() {
  const isOnline = useOnlineStatus();

  async function enqueue<T>(
    convexMutation: ReturnType<typeof useMutation>,
    args: T,
    optimisticUpdate?: () => void,
  ) {
    // 1. Mise à jour optimiste immédiate
    optimisticUpdate?.();

    if (isOnline) {
      // 2a. En ligne : appel direct
      return convexMutation(args);
    } else {
      // 2b. Hors-ligne : mise en file IndexedDB
      await db.queue.add({
        functionName: convexMutation.name,
        args,
        createdAt: Date.now(),
        retryCount: 0,
        status: "pending",
      });
    }
  }

  return { enqueue };
}
```

### 7.5 Indicateur de connectivité

L'application affiche un bandeau discret en cas de connexion offline, et une icône ✅ / 📴 dans la TopBar pendant le mode live.

---

## 8. Authentification et autorisation

### 8.1 Choix : Clerk + Convex Auth

**Clerk** est utilisé comme fournisseur d'identité. Son intégration avec Convex est native via `@clerk/clerk-react` et le provider Convex.

```
Utilisateur → Clerk (login / JWT) → Convex (vérification JWT) → Accès données
```

### 8.2 Configuration

```typescript
// src/main.tsx
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ConvexProviderWithClerk>
  </ClerkProvider>,
);
```

### 8.3 Rôles et claims

Les rôles (`admin`, `coach`, `parent`) sont stockés dans les **publicMetadata** Clerk, propagés dans le JWT Convex.

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: "https://clerk.mister-footcoach.com",
      applicationID: "convex",
    },
  ],
};
```

```typescript
// Dans une mutation Convex
const identity = await ctx.auth.getUserIdentity();
const roles = identity?.publicMetadata?.roles as string[] ?? [];
```

### 8.4 Composant `ProtectedRoute`

```tsx
// src/components/auth/ProtectedRoute.tsx
import { useConvexAuth } from "convex/react";
import { Navigate, Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui/Spinner";

export function ProtectedRoute() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) return <Spinner fullscreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

---

## 9. Sécurité

### 9.1 Règles par couche

| Couche | Mesure |
|---|---|
| Transport | HTTPS obligatoire (Convex Cloud + Clerk) |
| Authentification | JWT Clerk vérifié par Convex à chaque requête |
| Autorisation | Vérification dans chaque query/mutation Convex (pas de confiance côté client) |
| Données mineurs | Cloisonnement par rôle — `requireCoachOfTeam` / `requireParentOfPlayer` |
| XSS | React échappe nativement — pas de `dangerouslySetInnerHTML` |
| CSRF | Sans objet — API non-cookie (Bearer JWT) |
| Token iCal | Token aléatoire 32 octets (crypto.getRandomValues), stocké hashé |
| Fichiers | Accès aux photos via signed URL Convex Storage (expiration 1h) |

### 9.2 Variables d'environnement

```bash
# .env — valeurs publiques (exposées au frontend)
VITE_CONVEX_URL=https://xxx.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_BACKEND=convex

# Variables Convex (backend uniquement — jamais dans VITE_)
CLERK_SECRET_KEY=sk_live_...
PUSH_VAPID_PRIVATE_KEY=...
```

---

## 10. Tests

### 10.1 Stratégie globale

```
┌─────────────────────────────────────────────────────┐
│  Pyramide de tests                                  │
│                                                     │
│              ┌───────────┐                          │
│              │    E2E    │  Playwright (5–10 scénar │
│              │Playwright │  ios critiques)          │
│           ┌──┴───────────┴──┐                       │
│           │   Intégration   │  Vitest + MSW          │
│           │  (hooks+store)  │  (adapters mockés)     │
│        ┌──┴─────────────────┴──┐                    │
│        │  Unitaires (Vitest 3) │  Composants, utils  │
│        │  + Testing Library    │  logique métier      │
│        └────────────────────── ┘                    │
└─────────────────────────────────────────────────────┘
```

### 10.2 Configuration Vitest 3

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["convex/_generated/**", "src/test/**"],
    },
  },
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
});
```

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

// Mock Convex en dehors des tests d'intégration
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
  useConvexAuth: vi.fn(() => ({ isAuthenticated: true, isLoading: false })),
}));
```

### 10.3 Tests unitaires — exemple composant

```typescript
// src/components/features/surveys/__tests__/SurveyResponseForm.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SurveyResponseForm } from "../SurveyResponseForm";

describe("SurveyResponseForm", () => {
  it("affiche les deux champs : intention joueur et confirmation parent", () => {
    render(
      <SurveyResponseForm
        playerName="Lucas"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText(/ce que dit lucas/i)).toBeInTheDocument();
    expect(screen.getByText(/votre confirmation officielle/i)).toBeInTheDocument();
  });

  it("soumet avec les deux valeurs", async () => {
    const onSubmit = vi.fn();
    render(<SurveyResponseForm playerName="Lucas" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("radio", { name: /présent.*lucas/i }));
    fireEvent.click(screen.getByRole("radio", { name: /absent.*confirmation/i }));
    fireEvent.click(screen.getByRole("button", { name: /valider/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      intentionJoueur: "present",
      confirmationParent: "absent",
    });
  });

  it("signale une divergence quand intention ≠ confirmation", () => {
    render(
      <SurveyResponseForm
        playerName="Lucas"
        initialIntention="present"
        initialConfirmation="absent"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText(/réponses différentes/i)).toBeInTheDocument();
  });
});
```

### 10.4 Tests des fonctions Convex

```typescript
// convex/players.test.ts  (avec convex-test)
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

test("listByTeam ne renvoie que les joueurs actifs", async () => {
  const t = convexTest(schema);

  await t.run(async (ctx) => {
    const clubId = await ctx.db.insert("clubs", { name: "FC Test" });
    const seasonId = await ctx.db.insert("seasons", {
      clubId, name: "2025-2026",
      startDate: "2025-08-01", endDate: "2026-06-30", active: true,
    });
    const teamId = await ctx.db.insert("teams", {
      clubId, seasonId, name: "U13A",
      category: "U13", coachId: "user1" as any, color: "#16a34a",
    });

    await ctx.db.insert("players", {
      firstName: "Lucas", lastName: "D",
      dateOfBirth: "2012-03-15", primaryTeamId: teamId,
      preferredPosition: "AT", active: true,
    });
    await ctx.db.insert("players", {
      firstName: "Emma", lastName: "R",
      dateOfBirth: "2012-06-20", primaryTeamId: teamId,
      preferredPosition: "GK", active: false,     // inactif
    });
  });

  const players = await t.query(api.players.listByTeam, { teamId: "..." });
  expect(players).toHaveLength(1);
  expect(players[0].firstName).toBe("Lucas");
});
```

### 10.5 Tests E2E Playwright

```typescript
// e2e/survey-response.spec.ts
import { test, expect } from "@playwright/test";

test("un parent peut répondre à un sondage et voir la divergence", async ({ page }) => {
  await page.goto("/mister-footcoach");
  // Login comme parent
  await page.fill('[data-testid="email"]', "parent@test.com");
  await page.fill('[data-testid="password"]', "test1234");
  await page.click('[data-testid="login-btn"]');

  await page.click('[aria-label="Sondages"]');
  await expect(page.locator('[data-testid="survey-card"]').first()).toBeVisible();
  await page.click('[data-testid="survey-card"]');

  // Sélectionner intention joueur = Présent
  await page.click('[data-testid="intention-present"]');
  // Sélectionner confirmation parent = Absent
  await page.click('[data-testid="confirmation-absent"]');

  // Avertissement de divergence
  await expect(page.locator('[data-testid="divergence-warning"]')).toBeVisible();

  await page.click('[data-testid="submit-response"]');
  await expect(page.locator('[data-testid="response-saved"]')).toBeVisible();
});
```

---

## 11. Performance et optimisation

### 11.1 Stratégies Vite 6

```typescript
// vite.config.ts — découpage des chunks
rollupOptions: {
  output: {
    manualChunks(id) {
      if (id.includes("node_modules")) {
        const norm = id.replace(/\\/g, "/");
        if (norm.includes("/react-dom/") || norm.includes("/react/")) return "react";
        if (norm.includes("/react-router")) return "router";
        if (norm.includes("/convex/"))      return "convex";
        if (norm.includes("/lucide-react/")) return "lucide";
        if (norm.includes("/dexie/"))        return "dexie";
        if (norm.includes("/@clerk/"))       return "clerk";
        return "vendor";
      }
    },
  },
},
```

### 11.2 Lazy loading des pages

Toutes les pages sont chargées en `lazy()` avec `Suspense`. La page Dashboard est la seule pré-chargée.

### 11.3 Optimisations React 19

| Technique | Où |
|---|---|
| `useDeferredValue` | Filtrage de la liste des joueurs / exercices |
| `useTransition` | Navigation entre onglets, soumission de formulaires longs |
| `useOptimistic` | Basculement présent/absent dans la feuille d'assiduité |
| Mémoïsation | `useMemo` sur calculs de classement de tournoi, `memo()` sur les lignes de listes longues |

### 11.4 Images

- Photos de joueurs : stockées dans Convex Storage, servies via signed URL
- Redimensionnement côté client avant upload (canvas API) : max 400×400px, qualité 80%
- Placeholder : initiales du joueur générées en CSS, aucun appel réseau en offline

### 11.5 Métriques cibles

| Métrique | Cible |
|---|---|
| LCP (Largest Contentful Paint) | < 2.5s sur 4G |
| FID / INP | < 100ms |
| Bundle initial (gzippé) | < 150 Ko |
| Time To Interactive offline | < 1s (service worker + IndexedDB) |

---

## 12. CI/CD

### 12.1 Pipeline GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "npm" }
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run format:check

  test:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "npm" }
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "npm" }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e
        env:
          VITE_CONVEX_URL: ${{ secrets.CONVEX_URL_TEST }}
          VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_KEY_TEST }}

  deploy:
    runs-on: ubuntu-latest
    needs: e2e
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "npm" }
      - run: npm ci
      - run: npm run build
        env:
          VITE_CONVEX_URL: ${{ secrets.CONVEX_URL_PROD }}
          VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_KEY_PROD }}
      - name: Deploy Convex functions
        run: npx convex deploy --prod
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
      - name: Deploy frontend (GitHub Pages)
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 12.2 Environnements

| Environnement | Backend | Déclencheur |
|---|---|---|
| **development** | Convex local (`npx convex dev`) | `npm run dev` |
| **preview** | Convex projet `staging` | PR ouverte |
| **production** | Convex projet `prod` + Clerk prod | Merge sur `main` |

---

## 13. Décisions d'architecture (ADR)

### ADR-001 — Convex comme backend principal

**Décision :** Convex est choisi comme backend par défaut.

**Contexte :** Le mode match live nécessite que le score soit visible en temps réel par les parents. Les sondages nécessitent une mise à jour immédiate du tableau de bord coach. Deux options auraient requis une infrastructure supplémentaire (WebSocket custom, polling).

**Conséquences :** La réactivité temps réel est gratuite. Le modèle de données est contraint par le document store de Convex (pas de jointures SQL). Les queries complexes (statistiques multi-tables) sont réalisées en JavaScript dans les fonctions serveur.

**Alternative rejetée :** REST + polling toutes les 5s — trop de latence pour le live, charge réseau inutile.

---

### ADR-002 — Pattern Adapter pour le backend

**Décision :** Une interface TypeScript commune masque le backend réel. Le choix du backend se fait via une variable d'environnement.

**Contexte :** Le client peut souhaiter migrer vers Supabase (données relationnelles, coûts) ou Firebase (familiarité Google). Changer de backend ne doit pas entraîner de réécriture du frontend.

**Conséquences :** Les composants sont plus simples et testables (mock facile). Un léger coût d'abstraction existe pour les features avancées spécifiques à Convex (ex. transactions). Les adapters Supabase/Firebase restent des dépendances optionnelles.

---

### ADR-003 — Offline-first pour le mode live uniquement

**Décision :** Seul le flux "mode match live" implémente une stratégie offline complète (IndexedDB + queue). Le reste de l'application est Network-First.

**Contexte :** Un coach au bord d'un terrain peut avoir une connexion intermittente. Les autres flux (calendrier, statistiques) peuvent afficher un état stale sans impact critique.

**Conséquences :** La complexité de Dexie.js est limitée à un seul module. La synchronisation offline→online reste simple (append-only pour les events de match).

---

### ADR-004 — Clerk pour l'authentification

**Décision :** Clerk est utilisé plutôt que Convex Auth natif ou Supabase Auth.

**Contexte :** Clerk offre une UI d'authentification prête à l'emploi, la gestion des rôles via `publicMetadata`, et une intégration officielle Convex. Il supporte OAuth (Google, Apple) utile pour les parents.

**Conséquences :** Dépendance à un service tiers payant. En cas de migration de backend, Clerk reste utilisable (provider OAuth standard). Le coût du plan gratuit couvre le MVP.

---

### ADR-005 — Tailwind CSS v4 sans fichier de config

**Décision :** Toute la configuration des tokens est dans `index.css` via `@theme inline`.

**Contexte :** Tailwind v4 abandonne le fichier `tailwind.config.js`. La configuration CSS-first est plus proche des standards web et compatible avec les IDE sans extension spécifique.

**Conséquences :** Les tokens (couleurs, espacements) sont des variables CSS natives accessibles en JavaScript via `getComputedStyle`. Pas de régression avec les plugins Tailwind existants.

---

## 14. Roadmap technique

### 14.1 MVP — Phase 0 (données locales, pas de backend)

| Tâche | Détail |
|---|---|
| Squelette Vite 6 + React 19 + Tailwind v4 | ✅ Existant |
| Types TypeScript domaine | `src/types/index.ts` |
| Adapter `localStorage` (sans authentification) | Remplace Convex en dev isolé |
| Pages Dashboard, Équipes, Joueurs, Matchs | Données mockées |
| Simulateur de composition | Terrain interactif, formations foot à 8 |
| Mode match live (offline uniquement) | IndexedDB, pas de sync |
| PWA installable | Manifest + SW Workbox |

### 14.2 V1 — Phase 1 (Convex + Clerk)

| Tâche | Détail |
|---|---|
| Déploiement Convex + schéma complet | `convex/schema.ts` |
| Authentification Clerk | Rôles Admin / Coach / Parent |
| Adapter Convex branché | `src/adapters/convex/` |
| Sync mode live → Convex | Remplace le stockage local |
| Notifications in-app | Table `notifications` + query réactive |
| Scheduled functions (rappels J-1) | `convex/scheduled.ts` + crons |
| Sondages de présence | Module complet |
| Logistique des déplacements | Point de RDV + covoiturage |
| Flux iCal | Action HTTP Convex + génération RFC 5545 |
| Tests Vitest 3 > 70% couverture | Composants critiques |
| Pipeline CI/CD GitHub Actions | Complet |

### 14.3 V2 — Évolutions futures

| Tâche | Détail |
|---|---|
| Notifications Push PWA | VAPID + Web Push API |
| Intégration fédération | Action Convex → API externe |
| Compte joueur | Saisie intention sondage en direct |
| Adapter Supabase (opt.) | Pour les clients préférant PostgreSQL |
| Export PDF | jsPDF côté client ou action Convex |
| Analyse bundle | `rollup-plugin-visualizer` en CI |

---

*Document v1.0 — 05/05/2026 — à réviser après validation de la stack avec l'équipe.*
