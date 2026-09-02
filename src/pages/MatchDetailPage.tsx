import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Users,
  Radio,
  ChevronRight,
  Pencil,
  Navigation,
} from 'lucide-react';
import { Card, CardHeader } from '@mister-guiiug/dev-wpa-config/react/card';
import { Badge } from '@mister-guiiug/dev-wpa-config/react/badge';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { EmptyState } from '@mister-guiiug/dev-wpa-config/react/empty-state';
import { MatchFormDialog } from '../components/features/matches/MatchFormDialog';
import { MeetingPointDialog } from '../components/features/logistics/MeetingPointDialog';
import { CarpoolSection } from '../components/features/logistics/CarpoolSection';
import {
  useMatch,
  useMatchEvents,
  useTeam,
  usePlayers,
  useAttendances,
} from '../store/AppContext';
import { type MatchStatus, type AttendanceStatus } from '../types';
import { formatDateFull } from '../utils/date';
import { googleMapsUrl, appleMapsUrl } from '../utils/maps';
import { useI18n } from '../i18n';

const statusTone: Record<
  MatchStatus,
  'brand' | 'success' | 'warning' | 'muted' | 'danger'
> = {
  previsionnel: 'muted',
  engage: 'warning',
  saison: 'brand',
  tournoi: 'success',
  annule: 'danger',
};

const attendanceTone: Record<
  AttendanceStatus,
  'success' | 'danger' | 'warning'
> = {
  present: 'success',
  absent: 'danger',
  excuse: 'warning',
};

export default function MatchDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const match = useMatch(id!);
  const events = useMatchEvents(id!);
  const team = useTeam(match?.teamId ?? '');
  const players = usePlayers(match?.teamId);
  const attendances = useAttendances('match', id!);
  const [editOpen, setEditOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);

  if (!match) {
    return (
      <div className="p-4">
        <EmptyState title={t('matches.notFound')} />
      </div>
    );
  }

  const hasScore =
    match.scoreHome !== undefined && match.scoreAway !== undefined;

  return (
    <div className="px-4 py-4 space-y-4">
      {editOpen && (
        <MatchFormDialog
          open
          onClose={() => setEditOpen(false)}
          match={match}
        />
      )}
      {meetingOpen && (
        <MeetingPointDialog
          open
          onClose={() => setMeetingOpen(false)}
          match={match}
        />
      )}

      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Badge tone={statusTone[match.status]}>
            {t(`matchStatus.${match.status}`)}
          </Badge>
          <div className="flex items-center gap-2">
            {match.liveActive && (
              <Badge tone="danger" className="animate-pulse">
                <Radio size={10} className="mr-1" /> {t('matches.live')}
              </Badge>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditOpen(true)}
            >
              <Pencil size={14} /> {t('common.edit')}
            </Button>
          </div>
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
              ? /* istanbul ignore next */ (team?.name ?? t('matches.us'))
              : match.opponent}{' '}
            ·{' '}
            {match.isHome
              ? match.opponent
              : /* istanbul ignore next */ (team?.name ?? t('matches.us'))}
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

          {/* GPS navigation (specs §14.3) */}
          {match.address && (
            <div className="flex gap-2 pl-[26px]">
              <a
                href={googleMapsUrl(match.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-ui bg-surface px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-muted"
              >
                <Navigation size={12} /> Google Maps
              </a>
              <a
                href={appleMapsUrl(match.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-ui bg-surface px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-muted"
              >
                <Navigation size={12} /> Plans
              </a>
            </div>
          )}

          {/* Meeting point (specs §14.2) */}
          <div className="flex items-start gap-2.5 text-sm border-t border-border-ui pt-2.5">
            <Users size={15} className="text-fg-muted flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {match.meetingTime || match.meetingAddress ? (
                <>
                  <p className="text-fg font-medium">
                    {t('matches.meetingPoint')}
                    {match.meetingTime ? ` · ${match.meetingTime}` : ''}
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
                </>
              ) : (
                <p className="text-xs text-fg-muted">
                  {t('matches.meetingNone')}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMeetingOpen(true)}
            >
              {match.meetingTime || match.meetingAddress
                ? t('common.edit')
                : t('matches.define')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Carpool — away matches only (specs §14.4) */}
      {!match.isHome && <CarpoolSection match={match} />}

      {/* Live mode button */}
      {!hasScore && (
        <Link to={`/matchs/${id}/live`}>
          <Card className="flex items-center gap-3 hover:bg-surface-muted transition-colors cursor-pointer">
            <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <Radio size={18} className="text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-fg">
                {t('matches.liveMode')}
              </p>
              <p className="text-xs text-fg-muted">
                {t('matches.liveModeDesc')}
              </p>
            </div>
            <ChevronRight size={16} className="text-fg-faint" />
          </Card>
        </Link>
      )}

      {/* Events */}
      {events.length > 0 && (
        <Card>
          <CardHeader title={t('matches.events')} />
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
                      {t(`matchEvent.${event.type}`)}
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
          <CardHeader title={t('matches.attendance')} />
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
                  <Badge tone={attendanceTone[att.status]}>
                    {t(`attendance.${att.status}`)}
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
