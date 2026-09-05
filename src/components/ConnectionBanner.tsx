import { ConnectionBanner as SocleConnectionBanner } from '@mister-guiiug/dev-pwa-config/react/connection-banner';
import { BACKEND } from '../backend/config';
import { useI18n } from '../i18n';

/**
 * Bandeau « hors connexion ». Le balisage et la temporisation viennent du
 * socle (`react/connection-banner`) ; ce fichier ne fait que du câblage, comme
 * `UpdateBanner` juste à côté.
 *
 * LE POINT IMPORTANT EST LA CONDITION, PAS LE BANDEAU. mister-footcoach a DEUX
 * magasins de données, choisis par `VITE_BACKEND` :
 *
 *  - `local` (le DÉFAUT) : tout l'état vit dans `localStorage`. Sans réseau,
 *    l'application marche exactement pareil — joueurs, séances, matchs, tout
 *    s'enregistre. Annoncer « hors connexion » y serait une fausse alerte, et
 *    une fausse alerte apprend à ignorer les vraies ;
 *  - `supabase` : chaque `dispatch` part au serveur. `SupabaseAppProvider`
 *    applique la modification en local D'ABORD, puis, si l'écriture échoue,
 *    affiche un toast rouge et RECHARGE — ce qui annule la saisie. Sans
 *    réseau, l'utilisateur voit donc son geste réussir puis disparaître.
 *
 * D'où `online` forcé à `true` en mode local : le socle prévoit exactement ce
 * cas (« Remplace `navigator.onLine` — connectivité APPLICATIVE »). Le
 * navigateur peut bien être hors ligne, l'application, elle, ne l'est pas.
 *
 * CE QUE LE BANDEAU NE PROMET PAS. Il ne dit pas « ce sera envoyé plus tard » :
 * il n'y a pas de file d'attente. Il dit ce qui est vrai — rien ne sera
 * enregistré sur le serveur tant que le réseau manque.
 */
export function ConnectionBanner() {
  const { t } = useI18n();

  return (
    <SocleConnectionBanner
      online={BACKEND === 'local' ? true : undefined}
      label={t('connection.offline')}
      // Seule chose que `components.css` ne fixe pas : la place. Dans le flux,
      // tout en haut du document (monté dans `main.tsx`, avant `AuthGate`) —
      // le bas de l'écran porte déjà `BottomNav` (z-40) et le bandeau de mise
      // à jour (`fixed bottom-4`, z-50), et deux bandeaux au même endroit se
      // recouvrent. La marge haute inclut la zone sûre iOS, que `TopBar` —
      // désormais poussée plus bas quand le bandeau est là — n'assure plus
      // seule.
      className="mx-4 mt-[calc(1rem+env(safe-area-inset-top))]"
    />
  );
}
