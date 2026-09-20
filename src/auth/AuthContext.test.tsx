import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { ErrorBoundary } from '@mister-guiiug/dev-pwa-config/react';

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
const rpc = vi.fn<(name: string) => Reponse>(() =>
  Promise.resolve({ error: null })
);
const signOut = vi.fn(() => Promise.resolve());
const client = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null } }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithOtp,
    signInWithPassword,
    signOut,
  },
  rpc,
};
// La fabrique du socle rend le client dans une PROMESSE : le contexte
// l'attend, et le double aussi.
const getSupabase = vi.fn(() => Promise.resolve(client));
vi.mock('../backend/config', () => ({ BACKEND: 'supabase' }));
vi.mock('../lib/supabase', () => ({ getSupabase: () => getSupabase() }));

const { AuthProvider, useAuth } = await import('./AuthContext');

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

afterEach(() => {
  cleanup();
  signInWithOtp.mockClear();
  signInWithPassword.mockClear();
  rpc.mockClear();
  rpc.mockImplementation(() => Promise.resolve({ error: null }));
  signOut.mockClear();
  getSupabase.mockClear();
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

/**
 * SUPPRIMER SON COMPTE — l'ORDRE des deux gestes est tout le contrat.
 *
 * Le client n'a aucun droit sur `auth.users` : il appelle une RPC, et c'est
 * `delete_my_account()` — `security definer`, propriété de `postgres` — qui
 * fait le travail en base (`supabase/migrations/0004_supprimer_son_compte.sql`,
 * prouvée par `supabase/tests/suppression-compte.test.sql`). Ce qui se joue
 * ICI est le reste : appeler la bonne fonction, ne fermer la session qu'APRÈS
 * un succès, et remonter le motif d'un échec au lieu de l'avaler.
 */
describe('deleteAccount', () => {
  it('appelle la RPC puis ferme la session — dans cet ordre', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});

    expect(await result.current.deleteAccount()).toEqual({});

    expect(rpc).toHaveBeenCalledWith('delete_my_account');
    expect(signOut).toHaveBeenCalledOnce();
    // L'ordre, pas seulement la présence : déconnecter d'abord laisserait un
    // compte vivant derrière un écran qui dit le contraire.
    expect(rpc.mock.invocationCallOrder[0]!).toBeLessThan(
      signOut.mock.invocationCallOrder[0]!
    );
  });

  it('un refus remonte son motif ET laisse la session ouverte', async () => {
    rpc.mockImplementationOnce(() =>
      Promise.resolve({
        error: { message: 'permission denied for schema auth' },
      })
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});

    expect(await result.current.deleteAccount()).toEqual({
      error: 'permission denied for schema auth',
    });
    // La ligne qui compte : rien n'a été effacé, donc rien ne doit faire
    // croire le contraire à l'utilisateur.
    expect(signOut).not.toHaveBeenCalled();
  });
});

/**
 * UN CLIENT INTROUVABLE. La fabrique du socle REJETTE quand la configuration
 * manque, là où l'ancienne copie levait d'un trait dans l'effet — et une
 * frontière d'erreur n'attrape pas un rejet. Le contexte doit donc le lui
 * rejouer : l'écran de secours, pas une roue qui tourne sans fin.
 */
describe('client introuvable', () => {
  it('un rejet de la fabrique remonte à la frontière d’erreur', async () => {
    getSupabase.mockImplementationOnce(() =>
      Promise.reject(
        new Error(
          'supabase-client : configuration manquante — définissez VITE_SUPABASE_URL.'
        )
      )
    );
    // React relaie l'erreur en console avant de la confier à la frontière.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<p>frontière atteinte</p>}>
        <AuthProvider>
          <p>enfant</p>
        </AuthProvider>
      </ErrorBoundary>
    );
    expect(await screen.findByText('frontière atteinte')).toBeInTheDocument();
    expect(screen.queryByText('enfant')).not.toBeInTheDocument();
    spy.mockRestore();
  });
});
