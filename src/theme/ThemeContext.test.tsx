import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';

const STORAGE_KEY = 'mister_footcoach_theme';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('useTheme outside provider', () => {
  it('throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used inside ThemeProvider'
    );
    spy.mockRestore();
  });
});

describe('ThemeProvider', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to "system" theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('system');
  });

  it('reads persisted theme from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('dark');
  });

  it('setTheme persists to localStorage and updates state', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('resolvedTheme is "light" when matchMedia returns false', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    // matchMedia mock returns matches: false → resolved = light
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('resolvedTheme is "dark" when matchMedia returns true for dark', () => {
    (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
      (query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('setTheme("light") resolves to light regardless of matchMedia', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setTheme('light'));
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('setTheme("dark") resolves to dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setTheme('dark'));
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('system theme registers matchMedia listener and removes it on cleanup', () => {
    const addListenerMock = vi.fn();
    const removeListenerMock = vi.fn();
    (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
      (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addListenerMock,
        removeEventListener: removeListenerMock,
        dispatchEvent: vi.fn(),
      })
    );
    const { unmount } = renderHook(() => useTheme(), { wrapper });
    expect(addListenerMock).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
    unmount();
    expect(removeListenerMock).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('handler updates resolvedTheme when media query change fires', () => {
    let capturedHandler: (() => void) | null = null;
    let isDark = false;
    (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
      (query: string) => ({
        get matches() {
          return isDark && query.includes('dark');
        },
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, fn: () => void) => {
          if (event === 'change') capturedHandler = fn;
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.resolvedTheme).toBe('light');
    isDark = true;
    act(() => {
      if (capturedHandler) capturedHandler();
    });
    expect(result.current.resolvedTheme).toBe('dark');
    isDark = false;
    act(() => {
      if (capturedHandler) capturedHandler();
    });
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('non-system theme does not register matchMedia listener', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const addListenerMock = vi.fn();
    (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(
      (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addListenerMock,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })
    );
    renderHook(() => useTheme(), { wrapper });
    expect(addListenerMock).not.toHaveBeenCalled();
  });
});
