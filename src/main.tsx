import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './theme/ThemeContext.tsx';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

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
  </StrictMode>
);
