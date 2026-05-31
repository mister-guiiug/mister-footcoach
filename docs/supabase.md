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

(ou `supabase db push` avec la CLI si tu utilises le projet lié.)

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
