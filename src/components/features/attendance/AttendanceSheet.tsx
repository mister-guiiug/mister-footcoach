import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
import { Badge } from '@mister-guiiug/dev-pwa-config/react/badge';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useAppContext } from '../../../store/AppContext';
import type { Attendance, AttendanceStatus, Player } from '../../../types';
import { attendanceId, NEXT_ATTENDANCE } from '../../../utils/attendance';
import { useI18n } from '../../../i18n';

const attendanceTone: Record<
  AttendanceStatus,
  'success' | 'danger' | 'warning'
> = {
  present: 'success',
  absent: 'danger',
  excuse: 'warning',
};

interface AttendanceSheetProps {
  sessionType: Attendance['sessionType'];
  sessionId: string;
  title: string;
  players: Player[];
  attendances: Attendance[];
  /** Ancre de la carte, pour y mener depuis une autre page. */
  id?: string;
}

/**
 * La feuille de présence d'une séance, entraînement ou match.
 *
 * L'écran dit ce qui est ENREGISTRÉ, et rien d'autre : un joueur sans
 * enregistrement s'affiche « Non saisi » et compte à part. Les taux
 * d'assiduité (`utils/stats`) ne lisent que les enregistrements ; afficher
 * « Présent » pour un joueur non saisi faisait croire à un taux que rien ne
 * calculait. Le coach qui ne touche que les absents termine par « Marquer les
 * autres présents », qui enregistre d'un geste tous ceux qui restent.
 */
export function AttendanceSheet({
  sessionType,
  sessionId,
  title,
  players,
  attendances,
  id,
}: AttendanceSheetProps) {
  const { t } = useI18n();
  const { dispatch } = useAppContext();

  const recordOf = (playerId: string) =>
    attendances.find(a => a.playerId === playerId);

  function record(
    playerId: string,
    status: AttendanceStatus,
    existing?: Attendance
  ) {
    dispatch({
      type: 'SET_ATTENDANCE',
      attendance: {
        id: existing?.id ?? attendanceId(sessionType, sessionId, playerId),
        sessionType,
        sessionId,
        playerId,
        status,
      },
    });
  }

  const statuses = players.map(p => recordOf(p.id)?.status);
  const count = (status: AttendanceStatus | undefined) =>
    statuses.filter(s => s === status).length;
  const unset = players.filter(p => !recordOf(p.id));

  const counters: { label: string; value: number; className: string }[] = [
    {
      label: t('attendance.presentCount'),
      value: count('present'),
      className: 'text-green-600',
    },
    {
      label: t('attendance.absentCount'),
      value: count('absent'),
      className: 'text-red-600',
    },
    {
      label: t('attendance.excuseCount'),
      value: count('excuse'),
      className: 'text-amber-600',
    },
    {
      label: t('attendance.unsetCount'),
      value: unset.length,
      className: 'text-fg-muted',
    },
  ];

  return (
    <Card padding={false} id={id}>
      <div className="px-4 py-3 border-b border-border-ui">
        <h3 className="text-sm font-semibold text-fg-heading">{title}</h3>
        <p className="text-xs text-fg-muted mt-0.5">
          {t('attendance.tapToChange')}
        </p>
      </div>

      {players.length > 0 && (
        <div className="px-4 py-3 border-b border-border-ui space-y-3">
          <div className="grid grid-cols-4 gap-2 text-center">
            {counters.map(c => (
              <div key={c.label}>
                <p className={`text-xl font-bold ${c.className}`}>{c.value}</p>
                <p className="text-xs text-fg-muted">{c.label}</p>
              </div>
            ))}
          </div>
          {unset.length > 0 && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                for (const player of unset) record(player.id, 'present');
              }}
            >
              {t('attendance.markOthersPresent', { count: unset.length })}
            </Button>
          )}
        </div>
      )}

      <ul className="divide-y divide-border-ui">
        {players.map(player => {
          const existing = recordOf(player.id);
          const status = existing?.status;
          return (
            <li key={player.id}>
              <button
                type="button"
                onClick={() =>
                  record(
                    player.id,
                    NEXT_ATTENDANCE[status ?? 'unset'],
                    existing
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-muted transition-colors"
              >
                <span className="text-sm text-fg">
                  {player.firstName} {player.lastName}
                </span>
                {status ? (
                  <Badge tone={attendanceTone[status]}>
                    {t(`attendance.${status}`)}
                  </Badge>
                ) : (
                  <Badge tone="muted">{t('attendance.unset')}</Badge>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
