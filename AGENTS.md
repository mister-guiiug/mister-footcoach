# Guide agents — mister-footcoach

PWA de coaching football : React 19 + TypeScript + Vite, Tailwind v4.

## Stack

- **Backend** : deux implémentations sélectionnées par `VITE_BACKEND`
  (`src/backend/config.ts`) — `local` (store + `localStorage`, valeur par
  défaut) et `supabase` (Postgres + Realtime + Auth : `src/lib/supabase.ts`,
  `supabase/migrations/`, scripts `supabase:*`). Ce projet n'utilise **pas**
  Convex.
- **État** : les pages ne consomment que les hooks de `src/store/AppContext` ;
  `SupabaseAppProvider` hydrate le même état depuis Postgres.
- **i18n** : aucun libellé en dur dans les composants. Tout passe par
  `src/i18n/messages.ts`, où `fr` fait foi et `en` doit refléter exactement les
  mêmes clés.
- **Socle partagé** : `@mister-guiiug/dev-wpa-config` fournit les configs
  ESLint, Prettier, lint-staged et Vitest, ainsi que les composants UI et le
  thème. Les fichiers de config locaux ne font que les ré-exporter : étendre le
  socle plutôt que redéfinir des règles ici.

## Validation

Avant tout commit, faire passer :

```bash
npm run format:check && npm run lint && npm run type-check && npm run test && npm run build
```

`npm run test` applique un **cliquet de couverture strict** : les seuils de
`vitest.config.ts` valent la couverture réelle exacte, sans marge. Toute
régression casse la CI, et tout gain doit être répercuté dans les seuils. On les
monte, jamais on ne les baisse pour faire passer le rouge au vert.

Les tests end-to-end (Playwright + axe) sont à part : `npm run test:e2e`.

## Documentation

`docs/spec.md` et `docs/specs-fonctionnelles.md` pour le fonctionnel,
`docs/conception-technique.md` pour l'architecture, `docs/supabase.md` pour la
mise en place du backend hébergé.
