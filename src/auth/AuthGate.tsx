import { type ReactNode } from 'react';
import { BACKEND } from '../backend/config';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from './AuthContext';
import { LoginPage } from './LoginPage';

/**
 * Requires an authenticated Supabase session before rendering the app when the
 * Supabase backend is active. In local mode it is a transparent passthrough.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (BACKEND !== 'supabase') return <>{children}</>;
  if (loading) return <Spinner fullscreen />;
  if (!session) return <LoginPage />;
  return <>{children}</>;
}
