import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Dumbbell,
  MoreHorizontal,
  Trophy,
  ClipboardList,
  Layers,
  BarChart3,
  BookOpen,
  Contact,
  Settings,
  X,
} from 'lucide-react';
import { useState } from 'react';

const mainTabs = [
  { to: '/', label: 'Accueil', icon: LayoutDashboard, exact: true },
  { to: '/equipes', label: 'Équipes', icon: Users, exact: false },
  { to: '/matchs', label: 'Matchs', icon: Calendar, exact: false },
  { to: '/entrainements', label: 'Entraîn.', icon: Dumbbell, exact: false },
];

const moreTabs = [
  { to: '/tournois', label: 'Tournois', icon: Trophy },
  { to: '/sondages', label: 'Sondages', icon: ClipboardList },
  { to: '/compositions', label: 'Compositions', icon: Layers },
  { to: '/statistiques', label: 'Statistiques', icon: BarChart3 },
  { to: '/exercices', label: 'Exercices', icon: BookOpen },
  { to: '/contacts', label: 'Contacts', icon: Contact },
  { to: '/parametres', label: 'Paramètres', icon: Settings },
];

export function BottomNav() {
  const [showMore, setShowMore] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* More drawer */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed bottom-16 left-0 right-0 z-50 mx-3 rounded-2xl bg-surface border border-border-ui shadow-xl p-2">
            <div className="grid grid-cols-2 gap-1">
              {moreTabs.map(({ to, label, icon: Icon }) => (
                <button
                  key={to}
                  onClick={() => {
                    setShowMore(false);
                    navigate(to);
                  }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-fg hover:bg-surface-muted transition-colors"
                >
                  <Icon size={18} className="text-fg-muted" />
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowMore(false)}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs text-fg-muted hover:bg-surface-muted"
            >
              <X size={14} />
              Fermer
            </button>
          </div>
        </>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch bg-surface border-t border-border-ui safe-area-bottom">
        {mainTabs.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-fg-muted hover:text-fg'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={() => setShowMore(v => !v)}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
            showMore ? 'text-primary' : 'text-fg-muted hover:text-fg'
          }`}
        >
          <MoreHorizontal size={20} strokeWidth={showMore ? 2.5 : 1.75} />
          Plus
        </button>
      </nav>
    </>
  );
}
