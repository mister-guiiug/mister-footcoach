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
import { useI18n } from '../../i18n';

export function BottomNav() {
  const { t } = useI18n();
  const [showMore, setShowMore] = useState(false);
  const navigate = useNavigate();

  const mainTabs = [
    { to: '/', label: t('nav.home'), icon: LayoutDashboard, exact: true },
    { to: '/equipes', label: t('nav.teams'), icon: Users, exact: false },
    { to: '/matchs', label: t('nav.matches'), icon: Calendar, exact: false },
    {
      to: '/entrainements',
      label: t('nav.trainingsShort'),
      icon: Dumbbell,
      exact: false,
    },
  ];

  const moreTabs = [
    { to: '/tournois', label: t('nav.tournaments'), icon: Trophy },
    { to: '/sondages', label: t('nav.surveys'), icon: ClipboardList },
    { to: '/compositions', label: t('nav.lineups'), icon: Layers },
    { to: '/statistiques', label: t('nav.stats'), icon: BarChart3 },
    { to: '/exercices', label: t('nav.exercises'), icon: BookOpen },
    { to: '/contacts', label: t('nav.contacts'), icon: Contact },
    { to: '/parametres', label: t('nav.settings'), icon: Settings },
  ];

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
              {t('common.close')}
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
          {t('nav.more')}
        </button>
      </nav>
    </>
  );
}
