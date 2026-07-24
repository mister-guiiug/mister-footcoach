// Setup partagé famille : jest-dom + polyfill localStorage/sessionStorage
// (sous Vitest 4 + jsdom, Storage peut exister sans getItem/setItem
// fonctionnels) + stubs de base. Les mocks à spies ci-dessous (délibérés)
// gardent la main : ils sont enregistrés après.
import '@mister-guiiug/dev-wpa-config/vitest-setup';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';

afterEach(() => cleanup());

// Mock virtual:pwa-register/react used by UpdateBanner
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: vi.fn(() => ({
    needRefresh: [false],
    updateServiceWorker: vi.fn(),
  })),
}));

// Mock window.matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Suppress noisy console.error from React act() warnings in some tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act'))
      return;
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
