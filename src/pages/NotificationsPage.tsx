import { Bell, Check, CheckCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import {
  useNotifications,
  useCurrentUser,
  useAppContext,
} from '../store/AppContext';

function relativeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const notifications = useNotifications();
  const currentUser = useCurrentUser();
  const { dispatch } = useAppContext();

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg-heading">Notifications</h1>
        {unreadCount > 0 && currentUser && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              dispatch({
                type: 'MARK_ALL_NOTIFICATIONS_READ',
                userId: currentUser.id,
              })
            }
          >
            <CheckCheck size={14} /> Tout lire
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="Aucune notification"
          description="Vous serez notifié des changements concernant vos équipes."
          icon={<Bell size={32} />}
        />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <Card
              key={n.id}
              padding={false}
              className={n.read ? '' : 'border-primary/40'}
            >
              <div className="flex items-start gap-3 p-3">
                <div
                  className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                    n.read ? 'bg-transparent' : 'bg-primary'
                  }`}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg">{n.message}</p>
                  <p className="text-xs text-fg-faint mt-0.5">
                    {relativeDate(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() =>
                      dispatch({
                        type: 'MARK_NOTIFICATION_READ',
                        notificationId: n.id,
                      })
                    }
                    aria-label="Marquer comme lu"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-faint hover:bg-surface-muted hover:text-primary"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
