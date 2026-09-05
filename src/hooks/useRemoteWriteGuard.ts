import { useActionGuard } from '@mister-guiiug/dev-pwa-config/react/use-action-guard';
import { BACKEND } from '../backend/config';

/**
 * Ce geste peut-il aboutir — et sinon, QUE DIRE à l'utilisateur ?
 *
 * `useActionGuard` du socle, avec la seule chose que le socle ne peut pas
 * deviner : mister-footcoach a DEUX magasins de données.
 *
 *  - `local` (le DÉFAUT, `VITE_BACKEND` non renseigné) : tout vit dans
 *    `localStorage`, et une suppression réussit hors réseau comme en réseau.
 *    Bloquer un bouton y serait un mensonge — d'où `online: false`, qui éteint
 *    la vérification et rend le garde inerte : `allowed` reste vrai, `reason`
 *    reste `null`, l'appelant ne voit aucune différence ;
 *  - `supabase` : `SupabaseAppProvider` applique la modification en local
 *    d'abord, puis, si l'écriture échoue, affiche un toast rouge et RECHARGE
 *    — ce qui annule la saisie. Une suppression semble donc réussir, puis la
 *    ligne réapparaît. Autant le dire avant.
 *
 * Le motif porte le code stable `offline` et le message du socle, traduit
 * français/anglais : `I18nProvider` monte lui-même le `LabelsProvider` avec la
 * locale courante.
 */
export function useRemoteWriteGuard() {
  const guard = useActionGuard({ online: BACKEND === 'supabase' });

  return {
    ...guard,
    /**
     * UNE ICÔNE SEULE NE PEUT PAS PORTER DE PHRASE. Toutes les suppressions de
     * l'application sont des corbeilles sans texte : quand le garde bloque,
     * c'est le NOM ACCESSIBLE du bouton qui doit devenir le motif — sinon
     * l'utilisateur trouve un bouton gris et muet, exactement le défaut que
     * `useActionGuard` existe pour empêcher. Le `title` double le message pour
     * la souris, `aria-disabled` dit l'état sans retirer le bouton du parcours
     * clavier (le motif reste DÉCOUVRABLE), et `wrap` neutralise le clic.
     *
     * Écrit ici plutôt qu'à chaque corbeille : quatre copies du même
     * `?? defaultLabel` finissent toujours par diverger.
     */
    iconProps(defaultLabel: string) {
      return {
        'aria-label': guard.reason ?? defaultLabel,
        title: guard.reason ?? undefined,
        ...guard.disabledProps,
      };
    },
  };
}
