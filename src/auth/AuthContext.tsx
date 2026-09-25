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
  /**
   * L'inscription — la seule, et elle sert au COMPTE JOUEUR : l'enfant crée
   * son compte, puis le rattache au club avec le code de son parent
   * (`redeem_player_invitation`). Les adultes, eux, sont créés par
   * l'administrateur. Un compte sans fiche ne voit rien (migration 0006).
   *
   * `confirmationSent` : le projet exige de confirmer l'adresse, il n'y a
   * donc pas encore de session — un lien est parti.
   */
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error?: string; confirmationSent?: boolean }>;
  signOut: () => Promise<void>;
  /**
   * Le droit à l'effacement (RGPD art. 17), sans écrire au mainteneur.
   * `docs/specs-fonctionnelles.md` § 21.2 le listait comme non outillé, et
   * cette application manipule des données de MINEURS et de leurs contacts,
   * avec `consentDate` et `consentVersion` au modèle : un consentement qu'on
   * ne peut pas retirer n'est pas un consentement.
   *
   * TOUT SE PASSE EN BASE. `delete_my_account()` est `security definer` et
   * appartient à `postgres` : c'est de lui qu'elle emprunte le droit d'écrire
   * dans `auth.users`, que le client n'a à aucun moment. Le bundle est servi
   * par GitHub Pages avec la clé publique — la clé `service_role` et l'API
   * d'administration sont donc hors de question, et c'est précisément ce que
   * cette fonction remplace.
   *
   * La session est fermée APRÈS, et seulement si la suppression a réussi :
   * déconnecter d'abord laisserait un compte vivant derrière un écran qui dit
   * le contraire.
   */
  deleteAccount: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(BACKEND === 'supabase');
  // Un client introuvable (configuration manquante) : la fabrique du socle
  // REJETTE au lieu de lever, et une frontière d'erreur n'attrape qu'un rendu
  // ou un effet, jamais un rejet. L'erreur est donc rejouée au rendu, pour
  // finir là où finissait le `throw` synchrone qu'elle remplace — l'écran de
  // secours, pas une roue qui tourne sans fin derrière `loading`.
  const [failure, setFailure] = useState<Error | null>(null);

  useEffect(() => {
    if (BACKEND !== 'supabase') return;
    // Le client est une PROMESSE (fabrique du socle) : l'abonnement se pose
    // quand elle arrive, et pas du tout si le fournisseur s'est démonté
    // entre-temps — sinon l'abonnement survivrait au composant.
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;
    getSupabase()
      .then(sb => {
        if (cancelled) return;
        sb.auth.getSession().then(({ data }) => {
          setSession(data.session);
          setLoading(false);
        });
        subscription = sb.auth.onAuthStateChange((_e, s) => {
          setSession(s);
        }).data.subscription;
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setFailure(error instanceof Error ? error : new Error(String(error)));
      });
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const sb = await getSupabase();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }

  async function signInWithLink(email: string) {
    const sb = await getSupabase();
    const { error } = await sb.auth.signInWithOtp({
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

  async function signUp(
    email: string,
    password: string
  ): Promise<{ error?: string; confirmationSent?: boolean }> {
    // L'inscription du joueur n'existe que dans un build connecté : repliée
    // dès la transformation (voir `signOut`), la suite sort du morceau
    // d'entrée du mode local, que chaque visiteur télécharge.
    if (
      import.meta.env.VITE_BACKEND !== 'supabase' &&
      import.meta.env.MODE !== 'test'
    )
      return { error: 'unsupported' };
    const sb = await getSupabase();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      // Même retour que le lien de connexion : l'origine SERVIE.
      options: {
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
      },
    });
    if (error) return { error: error.message };
    return { confirmationSent: !data.session };
  }

  async function signOut() {
    // UN APPAREIL DE FAMILLE SE PARTAGE, un abonnement push appartient à
    // l'appareil. Le laisser en partant, c'est livrer les notifications de ce
    // compte à qui ouvrira la session suivante sur cet écran — un parent,
    // puis son enfant. Il est donc retiré AVANT de fermer la session (sa
    // suppression en base en exige une). Au mieux : une panne ici ne retient
    // jamais la déconnexion. Le module n'est chargé qu'à ce moment — et
    // n'existe que dans un build connecté : la condition sur
    // `import.meta.env`, repliée dans CE module dès la transformation, fait
    // sortir du build local l'import ET son morceau (voir `RoleSwitch`).
    if (
      import.meta.env.VITE_BACKEND === 'supabase' ||
      import.meta.env.MODE === 'test'
    ) {
      try {
        const { disablePush } = await import('../lib/push');
        await disablePush();
      } catch {
        // Hors ligne, ou aucun abonnement : on se déconnecte quand même.
      }
    }
    const sb = await getSupabase();
    await sb.auth.signOut();
  }

  async function deleteAccount() {
    const sb = await getSupabase();
    const { error } = await sb.rpc('delete_my_account');
    // Un refus laisse la session INTACTE : l'utilisateur voit le message et
    // peut réessayer. Le déconnecter ici lui ferait croire que c'est fait.
    if (error) return { error: error.message };
    await sb.auth.signOut();
    return {};
  }

  if (failure) throw failure;

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        signIn,
        signInWithLink,
        signUp,
        signOut,
        deleteAccount,
      }}
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

/**
 * L'identité d'authentification de la session, ou `null` — sans exiger de
 * fournisseur. C'est elle qui désigne la fiche `users` de l'utilisateur en
 * mode `supabase` (`users."authId"`) ; en mode local, il n'y a pas de
 * session, et les écrans testés sans `AuthProvider` reçoivent `null`.
 */
export function useSessionUserId(): string | null {
  return useContext(AuthContext)?.session?.user.id ?? null;
}
