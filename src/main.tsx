import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@mister-guiiug/dev-wpa-config/react';
import {
  installErrorReporter,
  recordError,
} from '@mister-guiiug/dev-wpa-config/react/observability';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './theme/ThemeContext.tsx';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

installErrorReporter();

onCLS(console.log);
onFCP(console.log);
onINP(console.log);
onLCP(console.log);
onTTFB(console.log);

import { AppProvider } from './store/AppContext.tsx';
import { AuthProvider } from './auth/AuthContext.tsx';
import { AuthGate } from './auth/AuthGate.tsx';
import { ToastProvider } from './components/ui/Toast.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      onError={error => {
        recordError(error, { source: 'error-boundary' });
      }}
    >
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
    </ErrorBoundary>
  </StrictMode>
);
