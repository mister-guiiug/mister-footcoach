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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
