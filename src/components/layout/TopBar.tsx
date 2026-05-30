import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import type { ReactNode } from 'react';
import { useUnreadNotificationCount } from '../../store/AppContext';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  actions?: ReactNode;
}

export function TopBar({ title, showBack, actions }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = useUnreadNotificationCount();

  const isRoot = location.pathname === '/';

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 bg-surface border-b border-border-ui px-3">
      {(showBack ?? !isRoot) ? (
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-surface-muted text-fg-muted"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">⚽</span>
          <span className="font-bold text-fg-heading text-sm">
            Mister Footcoach
          </span>
        </div>
      )}

      {title && (showBack ?? !isRoot) && (
        <span className="flex-1 text-center font-semibold text-fg-heading text-sm truncate">
          {title}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        {actions}
        <button
          onClick={() => navigate('/notifications')}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-surface-muted text-fg-muted"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
