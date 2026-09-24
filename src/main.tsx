import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@mister-guiiug/dev-pwa-config/react';
import {
  installErrorReporter,
  initSentry,
  recordError,
} from '@mister-guiiug/dev-pwa-config/react/observability';
import './index.css';
import App from './App.tsx';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme/ThemeContext.tsx';

installErrorReporter();
void initSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  // `loader` REND L’IMPORT ANALYSABLE PAR VITE, et c’est ce qui permet au
  // `manualChunks` de le ranger dans son propre morceau. Sans lui, le socle
  // retombe sur un spécificateur volontairement non analysable — nécessaire
  // tant que la peer n’est pas installée, inutile maintenant qu’elle l’est.
  //
  // Rien ne part tant qu’aucun DSN n’est posé : `initSentry` rend `null`
  // AVANT l’import. Et le morceau est hors du précache du service worker,
  // sans quoi il serait téléchargé quand même (cf. vite.config.ts).
  loader: () => import('@sentry/react'),
});

// PLUS DE `onCLS(console.log)` NI DE SES QUATRE VOISINS. Hérités du squelette
// (05/05/2026), ils écrivaient les mesures dans la console de chaque visiteur,
// et leur import STATIQUE de `web-vitals` a changé de prix avec Sentry 11 :
// `@sentry/browser-utils` dépend désormais du même paquet, le découpage le
// range avec le SDK, et l'entrée tirait alors `sentry.js` — 144,6 kB dans le
// chemin critique de chaque visiteur, DSN ou pas. Pour mesurer, c'est
// `initWebVitals` du socle, avec ses seuils.

import { AppProvider } from './store/AppContext.tsx';
import { AuthProvider } from './auth/AuthContext.tsx';
import { AuthGate } from './auth/AuthGate.tsx';
import { ConnectionBanner } from './components/ConnectionBanner.tsx';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { IconsProvider } from '@mister-guiiug/dev-pwa-config/react/icons-context';
import { lucideIconSet } from '@mister-guiiug/dev-pwa-config/react/icons-lucide';
import { X } from 'lucide-react';

/* La croix « fermer » des composants du socle (Toast, Sheet) reste celle de
   lucide, comme partout ailleurs dans l'app : un seul langage visuel. */
const socleIcons = lucideIconSet({ close: X });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      onError={error => {
        recordError(error, { source: 'error-boundary' });
      }}
    >
      <I18nProvider>
        <ThemeProvider>
          <IconsProvider icons={socleIcons}>
            <ToastProvider>
              <AuthProvider>
                {/* UN SEUL bandeau réseau pour toute l'application, et AVANT
                    la porte d'accès : avec le backend Supabase, se connecter
                    est déjà un appel réseau, et l'écran de connexion ne
                    répondrait qu'« identifiants invalides » quand c'est le
                    réseau qui manque. Il ne s'affiche pas du tout avec le
                    backend local, où l'absence de réseau ne coûte rien.

                    EN HAUT, ET DANS LE FLUX : le bas de l'écran porte déjà
                    `BottomNav` (z-40) et le bandeau de mise à jour
                    (`fixed bottom-4`, z-50) — deux bandeaux au même endroit se
                    recouvrent, un défaut qu'aucun test ne verrait. */}
                <ConnectionBanner />
                <AuthGate>
                  <AppProvider>
                    <App />
                  </AppProvider>
                </AuthGate>
              </AuthProvider>
            </ToastProvider>
          </IconsProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>
);
