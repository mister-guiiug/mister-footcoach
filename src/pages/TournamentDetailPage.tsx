import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Navigation,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card, CardHeader } from '@mister-guiiug/dev-wpa-config/react/card';
import { Badge } from '@mister-guiiug/dev-wpa-config/react/badge';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { EmptyState } from '@mister-guiiug/dev-wpa-config/react/empty-state';
import { TournamentFormDialog } from '../components/features/tournaments/TournamentFormDialog';
import { TournamentGroupFormDialog } from '../components/features/tournaments/TournamentGroupFormDialog';
import { TournamentMatchFormDialog } from '../components/features/tournaments/TournamentMatchFormDialog';
import {
  useTournament,
  useTournamentGroups,
  useTournamentMatches,
  useTeams,
  useAppContext,
} from '../store/AppContext';
import {
  type Match,
  type TournamentGroup,
  type TournamentStatus,
} from '../types';
import { formatDateShort } from '../utils/date';
import { googleMapsUrl, appleMapsUrl } from '../utils/maps';
import { computeGroupStandings } from '../utils/tournament';
import { useI18n } from '../i18n';
import { useRemoteWriteGuard } from '../hooks/useRemoteWriteGuard';

const statusTone: Record<TournamentStatus, 'muted' | 'warning' | 'success'> = {
  planifie: 'muted',
  en_cours: 'warning',
  termine: 'success',
};

export default function TournamentDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const tournament = useTournament(id!);
  const groups = useTournamentGroups(id!);
  const matches = useTournamentMatches(id!);
  const teams = useTeams();
  const { dispatch } = useAppContext();
  const deleteGuard = useRemoteWriteGuard();

  const [editOpen, setEditOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [matchCtx, setMatchCtx] = useState<{
    group: TournamentGroup;
    match?: Match;
  } | null>(null);

  if (!tournament) {
    return (
      <div className="p-4">
        <EmptyState title={t('tournaments.notFound')} />
      </div>
    );
  }

  const teamName = (teamId: string) =>
    teams.find(team => team.id === teamId)?.name ?? t('tournaments.ourTeam');

  return (
    <div className="px-4 py-4 space-y-4">
      {editOpen && (
        <TournamentFormDialog
          open
          onClose={() => setEditOpen(false)}
          tournament={tournament}
        />
      )}
      {groupOpen && (
        <TournamentGroupFormDialog
          open
          onClose={() => setGroupOpen(false)}
          tournamentId={tournament.id}
          nextOrder={groups.length + 1}
        />
      )}
      {matchCtx && (
        <TournamentMatchFormDialog
          open
          onClose={() => setMatchCtx(null)}
          tournament={tournament}
          group={matchCtx.group}
          match={matchCtx.match}
        />
      )}

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-fg-heading">
              {tournament.name}
            </h1>
            {tournament.isOrganizedByClub && (
              <Badge tone="brand">{t('tournaments.organizer')}</Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditOpen(true)}
          >
            <Pencil size={14} /> {t('common.edit')}
          </Button>
        </div>
        <div className="mt-1">
          <Badge tone={statusTone[tournament.status]}>
            {t(`tournamentStatus.${tournament.status}`)}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <Card>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-fg-muted flex-shrink-0" />
            <span className="text-fg">
              {formatDateShort(tournament.dateStart)}
              {tournament.dateEnd &&
                tournament.dateEnd !== tournament.dateStart &&
                ` — ${formatDateShort(tournament.dateEnd)}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-fg-muted flex-shrink-0" />
            <span className="text-fg">{tournament.location}</span>
          </div>
          {tournament.address && (
            <div className="flex gap-2 pl-[22px]">
              <a
                href={googleMapsUrl(tournament.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-ui bg-surface px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-muted"
              >
                <Navigation size={12} /> Google Maps
              </a>
              <a
                href={appleMapsUrl(tournament.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-ui bg-surface px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-muted"
              >
                <Navigation size={12} /> Plans
              </a>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border-ui pt-2 text-xs text-fg-muted">
            <span>
              {t('tournaments.formatPrefix', {
                format: t(`tournamentFormat.${tournament.format}`),
              })}
            </span>
            <span>
              {teams
                .filter(t => tournament.teamIds.includes(t.id))
                .map(t => t.name)
                .join(', ')}
            </span>
          </div>
        </div>
      </Card>

      {/* Home tournament — invited teams & pitch schedule (specs §12.5) */}
      {tournament.isOrganizedByClub && (
        <Card>
          <CardHeader title={t('tournaments.organization')} />
          {tournament.invitedTeams && tournament.invitedTeams.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium text-fg-muted">
                {t('tournaments.invitedTeams')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tournament.invitedTeams.map(name => (
                  <span
                    key={name}
                    className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs text-fg"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="mb-1 text-xs font-medium text-fg-muted">
            {t('tournaments.scheduleByField')}
          </p>
          {(() => {
            const scheduled = matches.filter(m => m.field);
            if (scheduled.length === 0) {
              return (
                <p className="text-sm text-fg-muted">
                  {t('tournaments.noFieldMatch')}
                </p>
              );
            }
            const fields = [...new Set(scheduled.map(m => m.field!))].sort();
            return (
              <div className="space-y-2">
                {fields.map(field => (
                  <div key={field}>
                    <p className="text-xs font-semibold text-fg-heading">
                      {field}
                    </p>
                    <div className="mt-1 space-y-1">
                      {scheduled
                        .filter(m => m.field === field)
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .map(m => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-lg border border-border-ui px-2.5 py-1 text-xs"
                          >
                            <span className="text-fg-muted">{m.time}</span>
                            <span className="text-fg">
                              {teamName(m.teamId)} — {m.opponent}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>
      )}

      {/* Groups */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg-heading">
          {t('tournaments.groups')}
        </h2>
        <Button size="sm" onClick={() => setGroupOpen(true)}>
          <Plus size={14} /> {t('tournaments.addGroup')}
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title={t('tournaments.noGroup')}
          description={t('tournaments.noGroupDesc')}
          icon={<span className="text-4xl">🏆</span>}
        />
      ) : (
        groups.map(group => {
          const groupMatches = matches.filter(
            m => m.tournamentGroupId === group.id
          );
          const standings =
            group.type === 'poule'
              ? computeGroupStandings(groupMatches, teamName)
              : [];

          return (
            <Card key={group.id}>
              <CardHeader
                title={group.name}
                subtitle={t(
                  group.type === 'poule'
                    ? 'tournaments.poule'
                    : 'tournaments.elimination'
                )}
                action={
                  <button
                    onClick={deleteGuard.wrap(() =>
                      dispatch({
                        type: 'DELETE_TOURNAMENT_GROUP',
                        groupId: group.id,
                      })
                    )}
                    {...deleteGuard.iconProps(t('tournaments.deleteGroup'))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-faint hover:bg-surface-muted hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                }
              />

              {/* Matches */}
              <div className="space-y-1.5">
                {groupMatches.map(m => {
                  const hasScore =
                    m.scoreHome !== undefined && m.scoreAway !== undefined;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMatchCtx({ group, match: m })}
                      className="flex w-full items-center justify-between rounded-xl border border-border-ui px-3 py-2 text-sm hover:bg-surface-muted"
                    >
                      <span className="text-fg">
                        {teamName(m.teamId)} — {m.opponent}
                      </span>
                      <span className="font-semibold text-fg-heading">
                        {hasScore
                          ? `${m.scoreHome} - ${m.scoreAway}`
                          : t('tournaments.toPlay')}
                      </span>
                    </button>
                  );
                })}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMatchCtx({ group })}
                  className="w-full"
                >
                  <Plus size={14} /> {t('tournaments.addMatch')}
                </Button>
              </div>

              {/* Standings (specs §12.4) */}
              {group.type === 'poule' && standings.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-fg-muted">
                        <th className="py-1 text-left font-medium">#</th>
                        <th className="py-1 text-left font-medium">
                          {t('tournaments.standTeam')}
                        </th>
                        <th className="px-1 py-1 text-center font-medium">
                          {t('tournaments.standPlayed')}
                        </th>
                        <th className="px-1 py-1 text-center font-medium">
                          {t('tournaments.standDiff')}
                        </th>
                        <th className="px-1 py-1 text-center font-medium">
                          {t('tournaments.standPoints')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-ui">
                      {standings.map((s, i) => (
                        <tr key={s.name}>
                          <td className="py-1 text-fg-muted">{i + 1}</td>
                          <td className="py-1 text-fg">{s.name}</td>
                          <td className="px-1 py-1 text-center text-fg-muted">
                            {s.played}
                          </td>
                          <td className="px-1 py-1 text-center text-fg-muted">
                            {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                          </td>
                          <td className="px-1 py-1 text-center font-semibold text-fg-heading">
                            {s.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
