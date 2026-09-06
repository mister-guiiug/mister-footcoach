import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { UpdateBanner } from '../UpdateBanner';

export function AppShell() {
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
      </main>
      <BottomNav />
    </div>
  );
}
