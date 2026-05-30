import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Pencil } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { TrainingFormDialog } from '../components/features/trainings/TrainingFormDialog';
import { TrainingBlocksSection } from '../components/features/trainings/TrainingBlocksSection';
import {
  useTraining,
  useTeam,
  usePlayers,
  useAttendances,
  useTrainings,
  useAppContext,
} from '../store/AppContext';
import { ATTENDANCE_STATUS_LABELS, type AttendanceStatus } from '../types';
import { formatDateFull, isUpcoming } from '../utils/date';

const attendanceVariant: Record<
  AttendanceStatus,
  'present' | 'absent' | 'excuse'
> = {
  present: 'present',
  absent: 'absent',
  excuse: 'excuse',
};

const nextStatus: Record<AttendanceStatus, AttendanceStatus> = {
  present: 'absent',
  absent: 'excuse',
  excuse: 'present',
};

export default function TrainingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const training = useTraining(id!);
  const team = useTeam(training?.teamId ?? '');
  const players = usePlayers(training?.teamId);
  const attendances = useAttendances('training', id!);
  const allTrainings = useTrainings(training?.teamId);
  const { dispatch } = useAppContext();
  const [editOpen, setEditOpen] = useState(false);

  if (!training) {
    return (
      <div className="p-4">
        <EmptyState title="Entraînement introuvable" />
      </div>
    );
  }

  const seriesUpcoming = training.seriesId
    ? allTrainings.filter(
        t =>
          t.seriesId === training.seriesId && !t.cancelled && isUpcoming(t.date)
      )
    : [];

  function cancelSeries() {
    for (const t of seriesUpcoming) {
      dispatch({
        type: 'UPDATE_TRAINING',
        training: { ...t, cancelled: true },
      });
    }
    dispatch({
      type: 'NOTIFY',
      teamId: training!.teamId,
      notifType: 'entrainement_annule',
      message: `Série d'entraînements annulée (${seriesUpcoming.length} séances à venir).`,
      relatedId: training!.id,
      relatedType: 'training',
    });
  }

  function toggleAttendance(playerId: string) {
    const existing = attendances.find(a => a.playerId === playerId);
    const currentStatus: AttendanceStatus = existing?.status ?? 'present';
    dispatch({
      type: 'SET_ATTENDANCE',
      attendance: {
        id: existing?.id ?? `att-${Date.now()}-${playerId}`,
        sessionType: 'training',
        sessionId: id!,
        playerId,
        status: nextStatus[currentStatus],
      },
    });
  }

  const presentCount = attendances.filter(a => a.status === 'present').length;
  const absentCount = attendances.filter(a => a.status === 'absent').length;
  const excuseCount = attendances.filter(a => a.status === 'excuse').length;

  return (
    <div className="px-4 py-4 space-y-4">
      {editOpen && (
        <TrainingFormDialog
          open
          onClose={() => setEditOpen(false)}
          training={training}
        />
      )}

      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            {training.cancelled && <Badge variant="danger">Annulé</Badge>}
            {training.type === 'exceptionnel' && (
              <Badge variant="warning">Exceptionnel</Badge>
            )}
            {training.seriesId && <Badge variant="primary">Série</Badge>}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditOpen(true)}
          >
            <Pencil size={14} /> Modifier
          </Button>
        </div>
        <h1 className="text-xl font-bold text-fg-heading">
          {training.theme ?? 'Entraînement'}
        </h1>
        <p className="text-sm text-fg-muted">{team?.name}</p>
      </div>

      {/* Info */}
      <Card>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm">
            <Clock size={15} className="text-fg-muted flex-shrink-0" />
            <span className="text-fg">
              {formatDateFull(training.date)} à {training.time}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Clock
              size={15}
              className="text-fg-muted flex-shrink-0 opacity-0"
            />
            <span className="text-fg-muted">{training.duration} minutes</span>
          </div>
          {training.note && (
            <p className="text-sm text-fg-muted border-t border-border-ui pt-2.5">
              {training.note}
            </p>
          )}
        </div>
      </Card>

      {/* Recurring series actions (specs §8.2) */}
      {seriesUpcoming.length > 0 && (
        <Card>
          <p className="text-sm text-fg">
            Cette séance fait partie d'une série de{' '}
            <strong>{seriesUpcoming.length}</strong> occurrence
            {seriesUpcoming.length > 1 ? 's' : ''} à venir.
          </p>
          <Button
            variant="secondary"
            onClick={cancelSeries}
            className="mt-2 w-full"
          >
            Annuler les séances à venir de la série
          </Button>
        </Card>
      )}

      {/* Session content (specs §8.5) */}
      <TrainingBlocksSection trainingId={id!} />

      {/* Attendance summary */}
      {attendances.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="text-center">
            <p className="text-xl font-bold text-green-600">{presentCount}</p>
            <p className="text-xs text-fg-muted">Présents</p>
          </Card>
          <Card className="text-center">
            <p className="text-xl font-bold text-red-600">{absentCount}</p>
            <p className="text-xs text-fg-muted">Absents</p>
          </Card>
          <Card className="text-center">
            <p className="text-xl font-bold text-amber-600">{excuseCount}</p>
            <p className="text-xs text-fg-muted">Excusés</p>
          </Card>
        </div>
      )}

      {/* Player attendance */}
      <Card padding={false}>
        <div className="px-4 py-3 border-b border-border-ui">
          <h3 className="text-sm font-semibold text-fg-heading">
            Feuille de présence
          </h3>
          <p className="text-xs text-fg-muted mt-0.5">
            Toucher pour changer le statut
          </p>
        </div>
        <ul className="divide-y divide-border-ui">
          {players.map(player => {
            const att = attendances.find(a => a.playerId === player.id);
            const status: AttendanceStatus = att?.status ?? 'present';
            return (
              <li key={player.id}>
                <button
                  onClick={() => toggleAttendance(player.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-muted transition-colors"
                >
                  <span className="text-sm text-fg">
                    {player.firstName} {player.lastName}
                  </span>
                  <Badge variant={attendanceVariant[status]}>
                    {ATTENDANCE_STATUS_LABELS[status]}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
