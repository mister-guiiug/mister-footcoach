// Setup partagé famille : jest-dom + polyfill localStorage/sessionStorage
// (sous Vitest 4 + jsdom, Storage peut exister sans getItem/setItem
// fonctionnels) + stubs de base. Les mocks à spies ci-dessous (délibérés)
// gardent la main : ils sont enregistrés après.
import '@mister-guiiug/dev-wpa-config/vitest-setup';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';

afterEach(() => cleanup());

// Pin the i18n locale to French in tests so existing French-text assertions
// stay valid regardless of the jsdom navigator.language default. The shared
// createI18n reads navigator.language when no locale is persisted.
Object.defineProperty(window.navigator, 'language', {
  value: 'fr-FR',
  configurable: true,
});

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
