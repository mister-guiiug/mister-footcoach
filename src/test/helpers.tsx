import { type ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../theme/ThemeContext';
import { AppProvider } from '../store/AppContext';

/** Wraps ui with all providers: ThemeProvider + AppProvider + MemoryRouter. */
export function renderWithProviders(
  ui: ReactElement,
  { initialPath = '/', route = '/' }: { initialPath?: string; route?: string } = {},
): RenderResult {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider>
        <AppProvider>
          <Routes>
            <Route path={route} element={ui} />
          </Routes>
        </AppProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

/** Wraps ui at a nested route with params. */
export function renderAtRoute(
  ui: ReactElement,
  options: {
    initialPath: string;
    routePattern: string;
  },
): RenderResult {
  return render(
    <MemoryRouter initialEntries={[options.initialPath]}>
      <ThemeProvider>
        <AppProvider>
          <Routes>
            <Route path={options.routePattern} element={ui} />
            {/* child routes needed by some pages */}
            <Route path={`${options.routePattern}/live`} element={<div>live</div>} />
          </Routes>
        </AppProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}
