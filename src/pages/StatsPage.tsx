import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useTeams, usePlayers, useAppContext } from '../store/AppContext';
import { computeTeamStats, computePlayerStats } from '../utils/stats';
import { useI18n } from '../i18n';

export default function StatsPage() {
  const { t } = useI18n();
  const teams = useTeams();
  const { state } = useAppContext();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '');
  const players = usePlayers(teamId);

  const teamStats = computeTeamStats(
    teamId,
    state.matches,
    state.matchEvents,
    state.attendances,
    state.players
  );

  const topScorerName = (playerId: string) => {
    const p = state.players.find(x => x.id === playerId);
    return p ? `${p.firstName} ${p.lastName}` : '?';
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <h1 className="text-xl font-bold text-fg-heading">{t('stats.title')}</h1>

      {/* Team filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {teams.map(t => (
          <button
            key={t.id}
            onClick={() => setTeamId(t.id)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              teamId === t.id
                ? 'bg-primary text-primary-fg'
                : 'bg-surface border border-border-ui text-fg-muted hover:bg-surface-muted'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Team results */}
      <Card>
        <CardHeader
          title={t('stats.teamResults')}
          subtitle={t('stats.currentSeason')}
        />
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-2.5">
            <p className="text-xl font-bold text-green-600">{teamStats.wins}</p>
            <p className="text-xs text-fg-muted">{t('stats.wins')}</p>
          </div>
          <div className="rounded-xl bg-surface-muted p-2.5">
            <p className="text-xl font-bold text-fg-muted">{teamStats.draws}</p>
            <p className="text-xs text-fg-muted">{t('stats.draws')}</p>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-2.5">
            <p className="text-xl font-bold text-red-600">{teamStats.losses}</p>
            <p className="text-xs text-fg-muted">{t('stats.losses')}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-fg-muted">{t('stats.goalsForAgainst')}</span>
          <span className="font-semibold text-fg">
            {teamStats.goalsFor} : {teamStats.goalsAgainst}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-fg-muted">{t('stats.matchesPlayed')}</span>
          <span className="font-semibold text-fg">{teamStats.played}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-fg-muted">{t('stats.globalAttendance')}</span>
          <span className="font-semibold text-fg">
            {Math.round(teamStats.attendance.rate * 100)}%
          </span>
        </div>
      </Card>

      {/* Top scorers */}
      {teamStats.topScorers.length > 0 && (
        <Card>
          <CardHeader title={t('stats.topScorers')} />
          <div className="space-y-2">
            {teamStats.topScorers.slice(0, 5).map((s, i) => (
              <div
                key={s.playerId}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-fg">
                  {i + 1}. {topScorerName(s.playerId)}
                </span>
                <Badge variant="primary">
                  {t(
                    s.goals > 1 ? 'stats.goalsCountPlural' : 'stats.goalsCount',
                    { count: s.goals }
                  )}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Per-player stats */}
      <Card padding={false}>
        <div className="border-b border-border-ui px-4 py-3">
          <h3 className="text-sm font-semibold text-fg-heading">
            {t('stats.perPlayer')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-fg-muted">
                <th className="px-4 py-2 text-left font-medium">
                  {t('stats.colPlayer')}
                </th>
                <th className="px-2 py-2 text-center font-medium">
                  {t('stats.colPlayed')}
                </th>
                <th className="px-2 py-2 text-center font-medium">⚽</th>
                <th className="px-2 py-2 text-center font-medium">🅰️</th>
                <th className="px-4 py-2 text-right font-medium">
                  {t('stats.colAttendance')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-ui">
              {players.map(player => {
                const ps = computePlayerStats(
                  player.id,
                  state.matchEvents,
                  state.attendances,
                  state.positionHistory
                );
                return (
                  <tr key={player.id}>
                    <td className="px-4 py-2">
                      <Link
                        to={`/joueurs/${player.id}`}
                        className="text-fg hover:text-primary"
                      >
                        {player.firstName} {player.lastName}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-center text-fg-muted">
                      {ps.matchesPlayed}
                    </td>
                    <td className="px-2 py-2 text-center text-fg-muted">
                      {ps.goals}
                    </td>
                    <td className="px-2 py-2 text-center text-fg-muted">
                      {ps.assists}
                    </td>
                    <td className="px-4 py-2 text-right text-fg-muted">
                      {Math.round(ps.attendance.rate * 100)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
