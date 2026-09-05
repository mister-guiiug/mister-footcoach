import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Activity,
  Pencil,
  CalendarOff,
  Plus,
  Download,
} from 'lucide-react';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { Badge } from '@mister-guiiug/dev-pwa-config/react/badge';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { PlayerFormDialog } from '../components/features/players/PlayerFormDialog';
import { UnavailabilityFormDialog } from '../components/features/players/UnavailabilityFormDialog';
import { InjuryFormDialog } from '../components/features/players/InjuryFormDialog';
import {
  usePlayer,
  useTeam,
  useUnavailabilities,
  useInjuries,
  usePositionHistory,
  useAppContext,
} from '../store/AppContext';
import { type Injury, type Position } from '../types';
import {
  formatDateShort,
  age,
  isActiveUnavailability,
  today,
} from '../utils/date';
import { computePlayerStats } from '../utils/stats';
import { buildPlayerExport, exportToJson } from '../utils/rgpd';
import { downloadText } from '@mister-guiiug/dev-pwa-config/download';
import { useI18n } from '../i18n';

export default function PlayerDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const player = usePlayer(id!);
  const primaryTeam = useTeam(player?.primaryTeamId ?? '');
  const secondaryTeam = useTeam(player?.secondaryTeamId ?? '');
  const unavailabilities = useUnavailabilities(id);
  const injuries = useInjuries(id);
  const positionHistory = usePositionHistory(id!);
  const { state, dispatch } = useAppContext();
  const [editOpen, setEditOpen] = useState(false);
  const [unavailOpen, setUnavailOpen] = useState(false);
  const [injuryOpen, setInjuryOpen] = useState(false);
  const [editingInjury, setEditingInjury] = useState<Injury | undefined>();

  if (!player) {
    return (
      <div className="p-4">
        <EmptyState title={t('players.notFound')} />
      </div>
    );
  }

  const todayStr = today();
  const activeUnavail = unavailabilities.find(u =>
    isActiveUnavailability(u.startDate, u.endDate, todayStr)
  );

  const appetenceEntries = Object.entries(player.appetences)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) as [string, number][];

  const stats = computePlayerStats(
    player.id,
    state.matchEvents,
    state.attendances,
    state.positionHistory
  );

  return (
    <div className="px-4 py-4 space-y-4">
      {editOpen && (
        <PlayerFormDialog
          open
          onClose={() => setEditOpen(false)}
          player={player}
        />
      )}
      {unavailOpen && (
        <UnavailabilityFormDialog
          open
          onClose={() => setUnavailOpen(false)}
          player={player}
        />
      )}
      {injuryOpen && (
        <InjuryFormDialog
          open
          onClose={() => {
            setInjuryOpen(false);
            setEditingInjury(undefined);
          }}
          player={player}
          injury={editingInjury}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary-subtle flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-primary">
            {player.firstName.charAt(0)}
            {player.lastName.charAt(0)}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-fg-heading">
              {player.firstName} {player.lastName}
            </h1>
            {player.number && <Badge tone="brand">#{player.number}</Badge>}
          </div>
          <p className="text-sm text-fg-muted mt-0.5">
            {t(`position.${player.preferredPosition}`)} ·{' '}
            {t('players.yearsOld', { count: age(player.dateOfBirth) })}
          </p>
          <p className="text-xs text-fg-faint mt-0.5">
            {primaryTeam?.name}
            {secondaryTeam &&
              ` · ${t('players.reinforcementOf', { team: secondaryTeam.name })}`}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
          <Pencil size={14} /> {t('common.edit')}
        </Button>
      </div>

      {/* Stats (specs §10.2) */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="text-center" padding={false}>
          <div className="py-2.5">
            <p className="text-lg font-bold text-fg-heading">
              {stats.matchesPlayed}
            </p>
            <p className="text-[10px] text-fg-muted">{t('players.matches')}</p>
          </div>
        </Card>
        <Card className="text-center" padding={false}>
          <div className="py-2.5">
            <p className="text-lg font-bold text-fg-heading">{stats.goals}</p>
            <p className="text-[10px] text-fg-muted">{t('players.goals')}</p>
          </div>
        </Card>
        <Card className="text-center" padding={false}>
          <div className="py-2.5">
            <p className="text-lg font-bold text-fg-heading">{stats.assists}</p>
            <p className="text-[10px] text-fg-muted">{t('players.assists')}</p>
          </div>
        </Card>
        <Card className="text-center" padding={false}>
          <div className="py-2.5">
            <p className="text-lg font-bold text-fg-heading">
              {Math.round(stats.attendance.rate * 100)}%
            </p>
            <p className="text-[10px] text-fg-muted">
              {t('players.attendance')}
            </p>
          </div>
        </Card>
      </div>

      {/* Availability & health actions (specs §4.6 & §4.7) */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setUnavailOpen(true)}>
          <CalendarOff size={15} /> {t('players.unavailability')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setEditingInjury(undefined);
            setInjuryOpen(true);
          }}
        >
          <Plus size={15} /> {t('players.injury')}
        </Button>
      </div>

      {/* RGPD export (specs §18.4) */}
      <Button
        variant="ghost"
        className="w-full"
        onClick={() =>
          downloadText(
            exportToJson(
              buildPlayerExport(player.id, {
                players: state.players,
                contacts: state.contacts,
                attendances: state.attendances,
                unavailabilities: state.unavailabilities,
                injuries: state.injuries,
                positionHistory: state.positionHistory,
                surveyResponses: state.surveyResponses,
              })
            ),
            `${player.firstName}-${player.lastName}-rgpd.json`,
            'application/json'
          )
        }
      >
        <Download size={15} /> {t('players.exportRgpd')}
      </Button>

      {/* Unavailability alert */}
      {activeUnavail && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/10">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={18}
              className="text-amber-600 flex-shrink-0 mt-0.5"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {t('players.unavailableWith', {
                  motif: t(`unavailabilityMotif.${activeUnavail.motif}`),
                })}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                {t('players.since', {
                  date: formatDateShort(activeUnavail.startDate),
                })}
                {activeUnavail.endDate &&
                  t('players.until', {
                    date: formatDateShort(activeUnavail.endDate),
                  })}
              </p>
              {activeUnavail.note && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  {activeUnavail.note}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                dispatch({
                  type: 'UPDATE_UNAVAILABILITY',
                  unavailability: { ...activeUnavail, endDate: todayStr },
                })
              }
            >
              {t('common.closeOut')}
            </Button>
          </div>
        </Card>
      )}

      {/* Active injury */}
      {injuries
        .filter(i => i.status !== 'apte')
        .map(injury => (
          <Card
            key={injury.id}
            className="border-red-200 bg-red-50 dark:bg-red-900/10"
          >
            <div className="flex items-start gap-3">
              <Activity
                size={18}
                className="text-red-600 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {injury.nature} — {injury.zone}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {t(`injuryStatus.${injury.status}`)}
                  {injury.estimatedReturnDate &&
                    t('players.returnEstimated', {
                      date: formatDateShort(injury.estimatedReturnDate),
                    })}
                </p>
                {injury.noteCoach && (
                  <p className="text-xs text-red-500 mt-1">
                    {injury.noteCoach}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingInjury(injury);
                  setInjuryOpen(true);
                }}
              >
                {t('common.track')}
              </Button>
            </div>
          </Card>
        ))}

      {/* Info */}
      <Card>
        <CardHeader title={t('players.information')} />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-fg-muted">
              {t('players.dateOfBirth')}
            </dt>
            <dd className="font-medium text-fg">
              {formatDateShort(player.dateOfBirth)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">{t('players.age')}</dt>
            <dd className="font-medium text-fg">
              {t('players.yearsOld', { count: age(player.dateOfBirth) })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">
              {t('players.preferredPosition')}
            </dt>
            <dd className="font-medium text-fg">
              {t(`position.${player.preferredPosition}`)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">{t('players.number')}</dt>
            <dd className="font-medium text-fg">{player.number ?? '—'}</dd>
          </div>
        </dl>
      </Card>

      {/* Appetences */}
      {appetenceEntries.length > 0 && (
        <Card>
          <CardHeader title={t('players.appetences')} />
          <div className="space-y-2">
            {appetenceEntries.map(([pos, score]) => {
              // Known position codes resolve via i18n; an unknown code (absent
              // from the catalog) makes t() echo the raw path, so we fall back
              // to the bare key to keep the label readable.
              const label = t(`position.${pos as Position}`);
              return (
                <div key={pos} className="flex items-center gap-3">
                  <span className="text-xs text-fg-muted w-24 shrink-0">
                    {label === `position.${pos}` ? pos : label}
                  </span>
                  <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-fg w-4 text-right">
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Position history */}
      {positionHistory.length > 0 && (
        <Card>
          <CardHeader title={t('players.positionHistory')} />
          <div className="space-y-2">
            {positionHistory.slice(0, 6).map(h => (
              <div
                key={h.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <span className="text-fg font-medium">
                    {t(`position.${h.position}`)}
                  </span>
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
