/**
 * Selected data backend. Defaults to the local store (used by tests and the
 * offline MVP). Set VITE_BACKEND=supabase to use Supabase (specs §5).
 */
export const BACKEND: 'local' | 'supabase' =
  import.meta.env.VITE_BACKEND === 'supabase' ? 'supabase' : 'local';
