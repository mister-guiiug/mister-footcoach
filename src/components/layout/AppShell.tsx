import { Outlet, useLocation } from 'react-router-dom';
import { ConsentBanner } from '@mister-guiiug/dev-pwa-config/react/consent-banner';
import { usePageViews } from '@mister-guiiug/dev-pwa-config/react/use-page-views';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { UpdateBanner } from '../UpdateBanner';

export function AppShell() {
  const { pathname } = useLocation();

  /*
   * LA MESURE VIT ICI, et pas dans `App` : `useLocation` n'existe que SOUS le
   * routeur, et c'est `App` qui monte `BrowserRouter`. Cette coque est le
   * premier composant à la fois sous le routeur et présent sur tous les
   * écrans.
   *
   * GA4 n'envoie `page_view` qu'au chargement du document, et `initAnalytics`
   * pose en plus `send_page_view: false` pour que la première vue passe par ce
   * hook comme les autres — sinon l'écran d'entrée serait compté deux fois. Le
   * hook ne fait rien tant que le consentement n'est pas accordé.
   */
  usePageViews(pathname);

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <UpdateBanner />
      <TopBar />
      {/* PAS de pied de page ici. Rendu par la coquille, il suivait les onze
          écrans — un plateau de match en direct et chaque formulaire portaient
          « M'offrir un café ». La règle famille en veut DEUX, l'accueil et les
          Réglages, et c'est là qu'il est désormais rendu (`<AppFooter>` dans
          `DashboardPage` et `SettingsPage`). Le `pb-20` reste : il réserve la
          place de la barre basse fixe, pied de page ou non. */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
        {/* Une `region`, pas une boîte modale : elle ne recouvre rien et ne
            piège pas le focus — un bandeau posé par-dessus un plateau de match
            en direct serait exactement le « dark pattern » que le RGPD nomme.
            Ne rend RIEN tant que `VITE_GA_MEASUREMENT_ID` n'est pas posée. */}
        <ConsentBanner
          gaMeasurementId={import.meta.env.VITE_GA_MEASUREMENT_ID}
          className="mx-4 mb-4"
        />
      </main>
      <BottomNav />
    </div>
  );
}
