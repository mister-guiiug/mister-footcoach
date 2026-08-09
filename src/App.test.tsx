import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme/ThemeContext';
import { AppProvider } from './store/AppContext';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    // BrowserRouter uses window.location; set it to the basename
    window.history.pushState({}, '', '/mister-footcoach/');
  });

  it('renders without crashing', () => {
    const { container } = render(
      <I18nProvider>
        <ThemeProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </ThemeProvider>
      </I18nProvider>
    );
    expect(container.firstChild).toBeTruthy();
  });
});
