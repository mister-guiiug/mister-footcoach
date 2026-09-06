import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

/**
 * Le contrat du contexte avec Supabase : le lien part avec un retour calculé
 * depuis l'origine SERVIE, et sans créer de compte. C'est ce que la liste
 * d'URL autorisées du projet doit contenir, et ce que l'administrateur attend.
 */
type Reponse = Promise<{ error: { message: string } | null }>;
const signInWithOtp = vi.fn<(args: unknown) => Reponse>(() =>
  Promise.resolve({ error: null })
);
const signInWithPassword = vi.fn<(args: unknown) => Reponse>(() =>
  Promise.resolve({ error: null })
);
vi.mock('../backend/config', () => ({ BACKEND: 'supabase' }));
vi.mock('../lib/supabase', () => ({
  getSupabase: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithOtp,
      signInWithPassword,
      signOut: () => Promise.resolve(),
    },
  }),
}));

const { AuthProvider, useAuth } = await import('./AuthContext');

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

afterEach(() => {
  cleanup();
  signInWithOtp.mockClear();
  signInWithPassword.mockClear();
});

describe('AuthProvider', () => {
  it('signInWithLink demande un lien, vers l’origine servie, sans créer de compte', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});

    const reponse = await result.current.signInWithLink('coach@exemple.fr');

    expect(reponse).toEqual({ error: undefined });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'coach@exemple.fr',
      options: {
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        shouldCreateUser: false,
      },
    });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('remonte le message de Supabase quand le lien ne part pas', async () => {
    signInWithOtp.mockImplementationOnce(() =>
      Promise.resolve({ error: { message: 'Signups not allowed for otp' } })
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});

    expect(await result.current.signInWithLink('inconnu@exemple.fr')).toEqual({
      error: 'Signups not allowed for otp',
    });
  });
});
