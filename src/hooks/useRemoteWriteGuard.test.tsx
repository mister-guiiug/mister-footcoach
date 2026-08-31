import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { I18nProvider } from '../i18n';
import { useRemoteWriteGuard } from './useRemoteWriteGuard';

/**
 * CE QUI EST ÉPROUVÉ ICI EST LA CONDITION, PAS LE GARDE.
 *
 * `useActionGuard` a ses propres tests chez le socle. Ce qui lui est propre à
 * mister-footcoach, c'est qu'il ne doit PAS bloquer avec le backend local — le
 * défaut de `VITE_BACKEND`, dans lequel une suppression hors réseau aboutit
 * exactement comme les autres, puisque tout vit dans `localStorage`. Griser un
 * bouton là serait un mensonge, et rien dans le typage ne le signalerait.
 *
 * `BACKEND` est lu à l'import : le double est un GETTER, comme dans
 * `UpdateBanner.test.tsx`.
 */
const backend = vi.hoisted(() => ({
  current: 'supabase' as 'local' | 'supabase',
}));

vi.mock('../backend/config', () => ({
  get BACKEND() {
    return backend.current;
  },
}));

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
}

function guard() {
  return renderHook(() => useRemoteWriteGuard(), { wrapper: I18nProvider })
    .result.current;
}

beforeEach(() => {
  localStorage.clear();
  backend.current = 'supabase';
  setNavigatorOnline(true);
});

afterEach(() => {
  localStorage.clear();
  setNavigatorOnline(true);
});

describe('useRemoteWriteGuard', () => {
  it('laisse passer en ligne, quel que soit le backend', () => {
    expect(guard().allowed).toBe(true);
    expect(guard().reason).toBeNull();

    backend.current = 'local';
    expect(guard().allowed).toBe(true);
  });

  it('bloque hors connexion avec le backend Supabase, en disant pourquoi', () => {
    setNavigatorOnline(false);

    const g = guard();
    expect(g.allowed).toBe(false);
    // Code STABLE, testable sans dépendre du texte affiché.
    expect(g.reasonCode).toBe('offline');
    expect(g.reason).toBe('Indisponible hors ligne');
    expect(g.disabledProps).toEqual({ 'aria-disabled': true });
  });

  it('reste INERTE hors connexion avec le backend local', () => {
    setNavigatorOnline(false);
    backend.current = 'local';

    const g = guard();
    expect(g.allowed).toBe(true);
    expect(g.reasonCode).toBeNull();
    expect(g.reason).toBeNull();
  });

  it('rend l’action inerte quand elle est bloquée, et la laisse passer sinon', () => {
    const action = vi.fn();

    setNavigatorOnline(false);
    guard().wrap(action)();
    expect(action).not.toHaveBeenCalled();

    setNavigatorOnline(true);
    guard().wrap(action)();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('donne à une corbeille un nom accessible qui DIT le motif', () => {
    // En ligne : le libellé habituel, aucun état particulier.
    expect(guard().iconProps('Supprimer')).toEqual({
      'aria-label': 'Supprimer',
      title: undefined,
      'aria-disabled': undefined,
    });

    // Bloqué : le nom accessible DEVIENT le motif — une icône seule ne peut
    // pas porter de phrase, et un bouton gris et muet ne dit rien.
    setNavigatorOnline(false);
    expect(guard().iconProps('Supprimer')).toEqual({
      'aria-label': 'Indisponible hors ligne',
      title: 'Indisponible hors ligne',
      'aria-disabled': true,
    });
  });

  it('parle la langue choisie dans l’application', () => {
    localStorage.setItem('footcoach_locale', 'en');
    setNavigatorOnline(false);

    expect(guard().reason).toBe('Unavailable while offline');
  });
});
