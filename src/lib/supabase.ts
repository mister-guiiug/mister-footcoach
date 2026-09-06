import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Lazily creates the Supabase client from public env vars. The anon key is
 * safe to ship in the (public) GitHub Pages bundle: every table is protected
 * by RLS, never by the client.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase non configuré : définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.'
    );
  }
  client = createClient(url, anonKey, {
    // `flowType: 'pkce'` : le lien de connexion renvoie `?code=` dans la query au
    // lieu d'un jeton dans le fragment — inoffensif sous BrowserRouter, et le
    // même réglage que le reste de la famille.
    auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce' },
  });
  return client;
}
