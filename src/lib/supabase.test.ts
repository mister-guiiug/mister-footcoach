import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * LA FABRIQUE DU SOCLE, GARDÉE PAR LES VARIABLES DE BUILD.
 *
 * Deux chemins, et le second est celui du bundle : sans `VITE_SUPABASE_URL` /
 * `VITE_SUPABASE_ANON_KEY`, aucune fabrique n'est construite et `getSupabase`
 * rejette avec le message de toujours — c'est ce garde, replié au build par
 * Vite, qui tient le SDK hors du bundle quand les variables manquent. Avec
 * elles, la fabrique rend UN client partagé : deux appels concurrents, la même
 * instance.
 */
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('getSupabase', () => {
  it('rejette, sans construire de fabrique, quand les variables manquent', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    const { getSupabase, supabase } = await import('./supabase');
    expect(supabase).toBeNull();
    await expect(getSupabase()).rejects.toThrow(
      'Supabase non configuré : définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.'
    );
  });

  it('rend UN client partagé quand elles sont là', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://exemple.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'cle-anon-publique');
    const { getSupabase, supabase } = await import('./supabase');
    expect(supabase?.isConfigured()).toBe(true);
    const [a, b] = await Promise.all([getSupabase(), getSupabase()]);
    expect(a).toBe(b);
    expect(a.auth).toBeDefined();
  });
});
