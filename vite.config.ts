import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaSeoPlugin } from '@mister-guiiug/dev-pwa-config/vite-pwa-base';
import { cspPlugin } from '@mister-guiiug/dev-pwa-config/vite-csp';
import { visualizer } from 'rollup-plugin-visualizer';
import { versionPlugin } from '@mister-guiiug/dev-pwa-config/vite-version';

const analyze = process.env.ANALYZE === '1';

// GitHub Pages : https://mister-guiiug.github.io/mister-footcoach/
// `VITE_BASE_PATH` (injecté par le reusable `pwa-deploy.yml`) override la valeur
// par défaut. Sans la variable, on garde `/mister-footcoach/` au build et `/` en dev.
export default defineConfig(({ command }) => {
  const basePath =
    process.env.VITE_BASE_PATH ??
    (command === 'build' ? '/mister-footcoach/' : '/');

  return {
    base: basePath,
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
        logoPath: '/logo.svg',
      }),
      // CSP durcie : script-src par hash SHA-256 de l'IIFE anti-FOUC inline
      // (plus de 'unsafe-inline' en prod). Placé après pwaSeoPlugin pour hasher
      // aussi d'éventuels scripts injectés au build. Directives portées à
      // l'identique depuis l'ancienne meta statique de index.html.
      cspPlugin({
        dev: command === 'serve',
        connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
        extraDirectives: {
          'frame-ancestors': "'none'",
        },
      }),
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
                expiration: {
                  maxEntries: 16,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        includeAssets: [
          'favicon.ico',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'logo.svg',
        ],
        manifest: {
          id: basePath,
          lang: 'fr',
          name: 'Mister Footcoach',
          short_name: 'Footcoach',
          description:
            'Application PWA pour les coachs de football : équipes, compositions, stats.',
          start_url: basePath,
          scope: basePath,
          theme_color: '#16a34a',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
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
