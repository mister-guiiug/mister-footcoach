import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { BACKEND } from '../backend/config';
import { getSupabase } from '../lib/supabase';

interface AuthValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  /**
   * Un lien à usage unique, par e-mail : l'application ne voit passer aucun
   * secret et n'en stocke aucun. C'est l'entrée par défaut depuis l'étape 5
   * d'AMELIORATIONS.md ; le mot de passe reste possible, il n'est plus le
   * défaut.
   */
  signInWithLink: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(BACKEND === 'supabase');

  useEffect(() => {
    if (BACKEND !== 'supabase') return;
    const sb = getSupabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message };
  }

  async function signInWithLink(email: string) {
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: {
        // Le retour du lien est calculé depuis l'origine SERVIE, jamais depuis
        // une constante : le même bundle tourne en local et sur Pages. Cette
        // adresse doit figurer dans la liste d'URL autorisées du projet
        // Supabase (Authentication → URL Configuration), qui ne contient que
        // localhost:3000 à la création — sinon le lien part, et n'arrive nulle
        // part.
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        // Les comptes sont créés par l'administrateur : un lien envoyé à une
        // adresse inconnue ne doit pas en fabriquer un.
        shouldCreateUser: false,
      },
    });
    return { error: error?.message };
  }

  async function signOut() {
    await getSupabase().auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ session, loading, signIn, signInWithLink, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
