import { Outlet } from 'react-router-dom';
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { repoUrl } from '@mister-guiiug/dev-pwa-config/apps-catalog';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { UpdateBanner } from '../UpdateBanner';
import { APP_ID } from '../../lib/appId';

export function AppShell() {
  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <UpdateBanner />
      <TopBar />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
        {/* HORS des routes : le code source et le soutien sont ainsi sur le
            premier écran comme sur les Réglages — la règle famille. Ils
            n'étaient que dans la carte « Info » des Réglages, donc sur un seul
            écran. Le pied de page est DANS `<main>` parce que la barre basse
            est fixe et que c'est le `pb-20` qui lui réserve sa place. */}
        <AppFooter
          className="mt-8 justify-center px-4 pb-4"
          repoUrl={repoUrl(APP_ID)}
        />
      </main>
      <BottomNav />
    </div>
  );
}
