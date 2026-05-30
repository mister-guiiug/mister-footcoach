import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, Users, Radio, ChevronRight } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  useMatch,
  useMatchEvents,
  useTeam,
  usePlayers,
  useAttendances,
} from '../store/AppContext';
import {
  MATCH_STATUS_LABELS,
  MATCH_EVENT_LABELS,
  ATTENDANCE_STATUS_LABELS,
  type MatchStatus,
  type AttendanceStatus,
} from '../types';
import { formatDateFull } from '../utils/date';

const statusVariant: Record<
  MatchStatus,
  'primary' | 'success' | 'warning' | 'muted' | 'danger'
> = {
  previsionnel: 'muted',
  engage: 'warning',
  saison: 'primary',
  tournoi: 'success',
  annule: 'danger',
};

const attendanceVariant: Record<
  AttendanceStatus,
  'present' | 'absent' | 'excuse'
> = {
  present: 'present',
  absent: 'absent',
  excuse: 'excuse',
};

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const match = useMatch(id!);
  const events = useMatchEvents(id!);
  const team = useTeam(match?.teamId ?? '');
  const players = usePlayers(match?.teamId);
  const attendances = useAttendances('match', id!);

  if (!match) {
    return (
      <div className="p-4">
        <EmptyState title="Match introuvable" />
      </div>
    );
  }

  const hasScore =
    match.scoreHome !== undefined && match.scoreAway !== undefined;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Badge variant={statusVariant[match.status]}>
            {MATCH_STATUS_LABELS[match.status]}
          </Badge>
          {match.liveActive && (
            <Badge variant="danger" className="animate-pulse">
              <Radio size={10} className="mr-1" /> EN DIRECT
            </Badge>
          )}
        </div>
        <h1 className="text-xl font-bold text-fg-heading mt-2">
          {match.isHome ? 'vs' : '@'} {match.opponent}
        </h1>
        <p className="text-sm text-fg-muted">
          {team?.name} · {match.phase}
        </p>
      </div>

      {/* Score */}
      {hasScore && (
        <Card className="text-center">
          <p className="text-4xl font-bold text-fg-heading">
            {match.isHome ? match.scoreHome : match.scoreAway}
            <span className="text-fg-muted mx-3">-</span>
            {match.isHome ? match.scoreAway : match.scoreHome}
          </p>
          <p className="text-xs text-fg-muted mt-1">
            {match.isHome
              ? /* istanbul ignore next */ (team?.name ?? 'Nous')
              : match.opponent}{' '}
            ·{' '}
            {match.isHome
              ? match.opponent
              : /* istanbul ignore next */ (team?.name ?? 'Nous')}
          </p>
        </Card>
      )}

      {/* Info */}
      <Card>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm">
            <Clock size={15} className="text-fg-muted flex-shrink-0" />
            <span className="text-fg">
              {formatDateFull(match.date)} à {match.time}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <MapPin size={15} className="text-fg-muted flex-shrink-0" />
            <div>
              <p className="text-fg">{match.location}</p>
              {match.address && (
                <p className="text-xs text-fg-muted">{match.address}</p>
              )}
            </div>
          </div>
          {match.meetingTime && (
            <div className="flex items-start gap-2.5 text-sm border-t border-border-ui pt-2.5">
              <Users size={15} className="text-fg-muted flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-fg font-medium">
                  Point de RDV · {match.meetingTime}
                </p>
                {match.meetingAddress && (
                  <p className="text-xs text-fg-muted">
                    {match.meetingAddress}
                  </p>
                )}
                {match.meetingNote && (
                  <p className="text-xs text-fg-muted mt-0.5">
                    {match.meetingNote}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Live mode button */}
      {!hasScore && (
        <Link to={`/matchs/${id}/live`}>
          <Card className="flex items-center gap-3 hover:bg-surface-muted transition-colors cursor-pointer">
            <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <Radio size={18} className="text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-fg">
                Mode match en direct
              </p>
              <p className="text-xs text-fg-muted">
                Saisir les événements en temps réel
              </p>
            </div>
            <ChevronRight size={16} className="text-fg-faint" />
          </Card>
        </Link>
      )}

      {/* Events */}
      {events.length > 0 && (
        <Card>
          <CardHeader title="Événements du match" />
          <div className="space-y-2">
            {events.map(event => {
              const player = players.find(p => p.id === event.playerId);
              return (
                <div key={event.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-fg-muted w-8 text-right flex-shrink-0">
                    {
                      /* istanbul ignore next */ event.minute
                        ? `${event.minute}'`
                        : '—'
                    }
                  </span>
                  <span className="text-lg flex-shrink-0">
                    {
                      /* istanbul ignore next */ event.type === 'but'
                        ? '⚽'
                        : event.type === 'but_csc'
                          ? '⚽🤦'
                          : event.type === 'carton_jaune'
                            ? '🟨'
                            : event.type === 'carton_rouge'
                              ? '🟥'
                              : event.type === 'remplacement'
                                ? '🔄'
                                : event.type === 'blessure_live'
                                  ? '🤕'
                                  : '📌'
                    }
                  </span>
                  <div>
                    <span className="text-fg font-medium">
                      {MATCH_EVENT_LABELS[event.type]}
                    </span>
                    {player && (
                      <span className="text-fg-muted ml-1">
                        — {player.firstName} {player.lastName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Attendance */}
      {attendances.length > 0 && (
        <Card>
          <CardHeader title="Présences" />
          <div className="space-y-2">
            {attendances.map(att => {
              const player = players.find(p => p.id === att.playerId);
              /* istanbul ignore next */
              if (!player) return null;
              return (
                <div
                  key={att.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-fg">
                    {player.firstName} {player.lastName}
                  </span>
                  <Badge variant={attendanceVariant[att.status]}>
                    {ATTENDANCE_STATUS_LABELS[att.status]}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
