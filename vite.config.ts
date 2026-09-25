import { defineConfig, loadEnv, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaSeoPlugin } from '@mister-guiiug/dev-pwa-config/vite-pwa-base';
import { cspPlugin } from '@mister-guiiug/dev-pwa-config/vite-csp';
import { visualizer } from 'rollup-plugin-visualizer';
import { versionPlugin } from '@mister-guiiug/dev-pwa-config/vite-version';
import { NAVIGATE_FALLBACK_DENY_FILES } from '@mister-guiiug/dev-pwa-config/vite-pwa';

const analyze = process.env.ANALYZE === '1';

// GitHub Pages : https://mister-guiiug.github.io/mister-footcoach/
// `VITE_BASE_PATH` (injecté par le reusable `pwa-deploy.yml`) override la valeur
// par défaut. Sans la variable, on garde `/mister-footcoach/` au build et `/` en dev.
export default defineConfig(({ command, mode }) => {
  const basePath =
    process.env.VITE_BASE_PATH ??
    (command === 'build' ? '/mister-footcoach/' : '/');

  // LES GESTIONNAIRES PUSH N'ENTRENT QUE DANS UN BUILD CONNECTÉ. Le push
  // n'existe qu'avec le backend Supabase ; en mode local — le défaut, et la
  // production aujourd'hui — le service worker reste exactement celui
  // d'avant : il n'importe rien de plus, et ne précache pas `push-sw.js`.
  // `loadEnv` lit la variable des fichiers `.env*` ET de l'environnement du
  // build (le `build-env` de la CI).
  const pushHandlers =
    loadEnv(mode, process.cwd(), 'VITE_').VITE_BACKEND === 'supabase';

  return {
    base: basePath,
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          /*
           * LE MORCEAU SENTRY GARDE SON NOM, SANS EMPREINTE — parce
           * qu'il est exclu du précache (`globIgnores` plus bas) et qu'une URL
           * empreintée y meurt à chaque déploiement.
           *
           * Le service worker sert la coquille précachée jusqu'à ce que
           * l'utilisateur accepte la mise à jour ; cette coquille demande
           * l'ANCIENNE empreinte, que le déploiement suivant a supprimée de
           * `assets/`. Mesuré en production sur mister-qowa le 22/09/2026 :
           * HTTP 404, « Échec du chargement pour le module » dans la console.
           * Pour Sentry, `initSentry` avale l'échec (son `try/catch`) : l'app ne
           * casse pas, elle rapporte ses erreurs à personne, sans le dire.
           *
           * Rien n'est perdu au cache : GitHub Pages répond
           * `Cache-Control: max-age=600` sur TOUS les fichiers, empreinte ou pas.
           *
           * `pwa-doctor` tient l'invariant depuis le socle 6.8.0
           * (règle `chunk-hors-precache`).
           */
          chunkFileNames: chunk =>
            chunk.name === 'sentry'
              ? 'assets/sentry.js'
              : 'assets/[name]-[hash].js',
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            const norm = id.replace(/\\/g, '/');
            // Sentry est chargé par un `import()` que `loader` rend
            // analysable. Sans cette ligne il tomberait dans `vendor`,
            // qui est PRÉCHARGÉ : mesuré sur miss-uwh, 381,9 kB
            // préchargés au lieu de 227,2 — pour un total gzip identique
            // à 0,1 kB près. Le total ne voit pas la différence,
            // `bundleBudget.preloadGzipKb` si.
            if (norm.includes('/@sentry/')) return 'sentry';
            // ET POSTHOG POUR LA MÊME RAISON, EN PLUS GRAVE. Sentry préchargé
            // coûtait du poids ; PostHog préchargé casse une PROMESSE : l'ADR
            // 0012 dit que rien n'est chargé avant l'accord, et le socle ne
            // l'appelle qu'après. Sans cette ligne, la bibliothèque tombe
            // dans `vendor`, qui est PRÉCHARGÉ — elle serait donc
            // téléchargée chez un visiteur qui refuse. C'est `preloadGzipKb`
            // qui le voit, jamais le total.
            if (norm.includes('/posthog-js/')) return 'posthog';
            // Le générateur PDF du socle n'est tiré que par l'export PDF
            // (`src/pdf/exportPdf.ts`), lui-même chargé par un `import()` au
            // clic. Sans cette ligne il tomberait dans `vendor`, que les
            // pages chargent d'emblée : payé à chaque ouverture pour un
            // bouton pressé une fois par match. Même règle que miss-uwh.
            if (norm.includes('/dev-pwa-config/pdf')) return 'pdf';
            // Le module push du socle n'est tiré que par `src/lib/push.ts`,
            // chargé à l'ouverture des réglages ou à la déconnexion, et
            // seulement dans un build connecté. Sans cette ligne il tomberait
            // dans `vendor`, PRÉCHARGÉ par chaque visiteur.
            if (norm.includes('/dev-pwa-config/push/')) return 'push';
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
    plugins: [
      // AVANT cspPlugin : il pose un script inline dans le <head>, que la
      // CSP doit hacher après coup ; et il écrit version.json au build.
      versionPlugin({ manifest: true }),
      react(),
      tailwindcss(),
      // SEO partagé famille : canonical/OG via placeholders index.html +
      // sitemap.xml/robots.txt générés au build (robots statique supprimé).
      pwaSeoPlugin({
        siteName: 'Mister Footcoach',
        basePath,
        logoPath: '/icons/icon-512.png',
        // La barre du navigateur, par schéma. Les deux couleurs étaient
        // écrites à la main dans `index.html` — et elles y SURVIVAIENT au
        // build par accident : `stripThemeColorMeta` travaille ligne à ligne
        // et nos balises, mises en forme par Prettier, tenaient sur quatre
        // lignes chacune. Le jour où l'une d'elles aurait tenu sur une seule,
        // le build l'aurait retirée sans rien remettre. Les valeurs sont donc
        // passées ici, à leur seule source, et retirées de `index.html`.
        themeColor: { light: '#16a34a', dark: '#14532d' },
      }),
      // CSP durcie : script-src par hash SHA-256 de l'IIFE anti-FOUC inline
      // (plus de 'unsafe-inline' en prod). Placé après pwaSeoPlugin pour hasher
      // aussi d'éventuels scripts injectés au build. Directives portées à
      // l'identique depuis l'ancienne meta statique de index.html.
      cspPlugin({
        dev: command === 'serve',
        // Ouvre les hôtes de PostHog — le nuage EUROPÉEN (ADR 0012). Sans
        // cette option, l'ingestion que `ConsentBanner` déclenche APRÈS
        // l'accord serait refusée par la politique — et l'échec ne se verrait
        // qu'en console, sur le site déployé, une fois le consentement donné.
        analytics: true,
        connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
        extraDirectives: {
          'frame-ancestors': "'none'",
        },
      }),
      VitePWA({
        registerType: 'prompt',
        workbox: {
          // Un fichier (sitemap.xml, llms.txt…) va au réseau, pas à index.html.
          navigateFallbackDenylist: [NAVIGATE_FALLBACK_DENY_FILES],
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
          /*
           * LE MORCEAU SENTRY HORS DU PRÉCACHE, sans quoi le découpage
           * ci-dessus ne servirait à rien : `globPatterns` ramasse TOUT le
           * JS émis, `import()` ou pas. Mesuré le 16/09/2026 sur la
           * production de deux apps du parc, 345 et 463 KiB bruts de SDK
           * téléchargés par chaque visiteur — sans qu’aucun DSN soit posé.
           *
           * Hors précache, il est cherché sur le réseau à la première
           * erreur, et jamais si l’observabilité reste éteinte. Ne pas
           * l’avoir hors ligne est sans conséquence : rapporter une erreur
           * demande le réseau.
           */
          globIgnores: [
            '**/sentry.js',
            '**/sentry-*.js',
            ...(pushHandlers ? [] : ['push-sw.js']),
          ],
          // Les gestionnaires Web Push (`public/push-sw.js`), ajoutés au
          // worker engendré sans changer sa stratégie de cache — le montage
          // de mister-doc. Build connecté seulement (voir `pushHandlers`).
          ...(pushHandlers ? { importScripts: ['push-sw.js'] } : {}),
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 16,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        // Ce que le worker doit précacher EN PLUS du build. La liste citait
        // 'favicon.ico', 'pwa-192x192.png' et 'pwa-512x512.png' : AUCUN de ces
        // trois fichiers n'a jamais existé dans `public/`.
        includeAssets: [
          'logo.svg',
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/icon-maskable.png',
        ],
        manifest: {
          id: basePath,
          lang: 'fr',
          name: 'Mister Footcoach',
          short_name: 'Mister Footcoach',
          description:
            'Application PWA pour les coachs de football : équipes, compositions, stats.',
          start_url: basePath,
          scope: basePath,
          theme_color: '#16a34a',
          background_color: '#ffffff',
          display: 'standalone',
          // TROIS PROMESSES QUE LE BUILD NE TENAIT PAS. Ces chemins ne
          // désignaient aucun fichier : Chrome Android lisait trois 404 et
          // fabriquait une pastille à la lettre. Les icônes sortent
          // désormais de `npm run icons` (`pwa-icons` du socle), dans
          // `public/icons`, et le maskable est une image DISTINCTE — un
          // seul fichier `any maskable` se fait rogner son dessin par le
          // masque d'Android.
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: 'screenshots/mobile.png',
              sizes: '824x1830',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Écran d’accueil sur mobile',
            },
            {
              src: 'screenshots/wide.png',
              sizes: '2560x1600',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Écran d’accueil sur ordinateur',
            },
          ],
        },
      }),
      ...(analyze
        ? [
            visualizer({
              filename: 'dist/stats.html',
              gzipSize: true,
              brotliSize: true,
              open: !process.env.CI,
            }) as PluginOption,
          ]
        : []),
    ],
  };
});
