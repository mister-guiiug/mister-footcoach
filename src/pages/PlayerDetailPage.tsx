import { useParams } from 'react-router-dom';
import { AlertTriangle, Activity } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  usePlayer,
  useTeam,
  useUnavailabilities,
  useInjuries,
  usePositionHistory,
  useAttendances,
  useTrainings,
  useMatches,
} from '../store/AppContext';
import {
  POSITION_LABELS,
  INJURY_STATUS_LABELS,
  UNAVAILABILITY_MOTIF_LABELS,
} from '../types';
import { formatDateShort, age, isActiveUnavailability, today } from '../utils/date';

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const player = usePlayer(id!);
  const primaryTeam = useTeam(player?.primaryTeamId ?? '');
  const secondaryTeam = useTeam(player?.secondaryTeamId ?? '');
  const unavailabilities = useUnavailabilities(id);
  const injuries = useInjuries(id);
  const positionHistory = usePositionHistory(id!);

  // Compute attendance rate
  const allTrainings = useTrainings(player?.primaryTeamId);
  const allMatches = useMatches(player?.primaryTeamId);
  const trainingAttendances = useAttendances('training', '');
  const matchAttendances = useAttendances('match', '');

  if (!player) {
    return (
      <div className="p-4">
        <EmptyState title="Joueur introuvable" />
      </div>
    );
  }

  const todayStr = today();
  const activeUnavail = unavailabilities.find((u) =>
    isActiveUnavailability(u.startDate, u.endDate, todayStr),
  );

  const appetenceEntries = Object.entries(player.appetences)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) as [string, number][];

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary-subtle flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-primary">
            {player.firstName.charAt(0)}{player.lastName.charAt(0)}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-fg-heading">
              {player.firstName} {player.lastName}
            </h1>
            {player.number && (
              <Badge variant="primary">#{player.number}</Badge>
            )}
          </div>
          <p className="text-sm text-fg-muted mt-0.5">
            {POSITION_LABELS[player.preferredPosition]} · {age(player.dateOfBirth)} ans
          </p>
          <p className="text-xs text-fg-faint mt-0.5">
            {primaryTeam?.name}
            {secondaryTeam && ` · Renfort ${secondaryTeam.name}`}
          </p>
        </div>
      </div>

      {/* Unavailability alert */}
      {activeUnavail && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/10">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Indisponible — {UNAVAILABILITY_MOTIF_LABELS[activeUnavail.motif]}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                Depuis le {formatDateShort(activeUnavail.startDate)}
                {activeUnavail.endDate && ` jusqu'au ${formatDateShort(activeUnavail.endDate)}`}
              </p>
              {activeUnavail.note && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">{activeUnavail.note}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Active injury */}
      {injuries.filter((i) => i.status !== 'apte').map((injury) => (
        <Card key={injury.id} className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <div className="flex items-start gap-3">
            <Activity size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {injury.nature} — {injury.zone}
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                {INJURY_STATUS_LABELS[injury.status]}
                {injury.estimatedReturnDate &&
                  ` · Retour estimé ${formatDateShort(injury.estimatedReturnDate)}`}
              </p>
              {injury.noteCoach && (
                <p className="text-xs text-red-500 mt-1">{injury.noteCoach}</p>
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* Info */}
      <Card>
        <CardHeader title="Informations" />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-fg-muted">Date de naissance</dt>
            <dd className="font-medium text-fg">{formatDateShort(player.dateOfBirth)}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">Âge</dt>
            <dd className="font-medium text-fg">{age(player.dateOfBirth)} ans</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">Poste préféré</dt>
            <dd className="font-medium text-fg">{POSITION_LABELS[player.preferredPosition]}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">Numéro</dt>
            <dd className="font-medium text-fg">{player.number ?? '—'}</dd>
          </div>
        </dl>
      </Card>

      {/* Appetences */}
      {appetenceEntries.length > 0 && (
        <Card>
          <CardHeader title="Appétences par poste" />
          <div className="space-y-2">
            {appetenceEntries.map(([pos, score]) => (
              <div key={pos} className="flex items-center gap-3">
                <span className="text-xs text-fg-muted w-24 shrink-0">
                  {/* istanbul ignore next */POSITION_LABELS[pos as keyof typeof POSITION_LABELS] ?? pos}
                </span>
                <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(score / 5) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-fg w-4 text-right">{score}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Position history */}
      {positionHistory.length > 0 && (
        <Card>
          <CardHeader title="Historique des postes" />
          <div className="space-y-2">
            {positionHistory.slice(0, 6).map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-fg font-medium">{POSITION_LABELS[h.position]}</span>
                  <span className="text-fg-muted text-xs ml-2">{h.period}</span>
                </div>
                <span className="text-xs text-fg-muted">
                  vs {h.opponent} · {formatDateShort(h.matchDate)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
