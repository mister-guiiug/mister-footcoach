import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { UpdateBanner } from '../UpdateBanner';

export function AppShell() {
  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <UpdateBanner />
      <TopBar />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
