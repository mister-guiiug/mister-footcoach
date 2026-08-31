import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@mister-guiiug/dev-wpa-config/react';
import {
  installErrorReporter,
  initSentry,
  recordError,
} from '@mister-guiiug/dev-wpa-config/react/observability';
import './index.css';
import App from './App.tsx';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme/ThemeContext.tsx';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

installErrorReporter();
void initSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});

onCLS(console.log);
onFCP(console.log);
onINP(console.log);
onLCP(console.log);
onTTFB(console.log);

import { AppProvider } from './store/AppContext.tsx';
import { AuthProvider } from './auth/AuthContext.tsx';
import { AuthGate } from './auth/AuthGate.tsx';
import { ConnectionBanner } from './components/ConnectionBanner.tsx';
import { ToastProvider } from '@mister-guiiug/dev-wpa-config/react/toast';
import { IconsProvider } from '@mister-guiiug/dev-wpa-config/react/icons-context';
import { lucideIconSet } from '@mister-guiiug/dev-wpa-config/react/icons-lucide';
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
