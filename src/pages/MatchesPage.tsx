import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
import { Badge } from '@mister-guiiug/dev-pwa-config/react/badge';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { MatchFormDialog } from '../components/features/matches/MatchFormDialog';
import { useMatches, useTeams } from '../store/AppContext';
import { type MatchStatus } from '../types';
import { formatDateFull, isUpcoming } from '../utils/date';
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

export default function MatchesPage() {
  const { t } = useI18n();
  const allMatches = useMatches();
  const teams = useTeams();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);

  const filtered = allMatches.filter(m => {
    if (teamFilter !== 'all' && m.teamId !== teamFilter) return false;
    if (filter === 'upcoming') return isUpcoming(m.date);
    if (filter === 'past') return !isUpcoming(m.date);
    return true;
  });

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg-heading">
          {t('matches.title')}
        </h1>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus size={16} /> {t('common.new')}
        </Button>
      </div>

      {formOpen && (
        <MatchFormDialog
          open
          onClose={() => setFormOpen(false)}
          teamId={teamFilter !== 'all' ? teamFilter : undefined}
        />
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(['all', 'upcoming', 'past'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-primary-fg'
                : 'bg-surface border border-border-ui text-fg-muted hover:bg-surface-muted'
            }`}
          >
            {f === 'all'
              ? t('matches.filterAll')
              : f === 'upcoming'
                ? t('matches.filterUpcoming')
                : t('matches.filterPast')}
          </button>
        ))}

        <div className="h-4 w-px bg-border-ui self-center mx-1" />

        <button
          onClick={() => setTeamFilter('all')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            teamFilter === 'all'
              ? 'bg-primary text-primary-fg'
              : 'bg-surface border border-border-ui text-fg-muted hover:bg-surface-muted'
          }`}
        >
          {t('matches.allTeams')}
        </button>
        {teams.map(t => (
          <button
            key={t.id}
            onClick={() => setTeamFilter(t.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              teamFilter === t.id
                ? 'bg-primary text-primary-fg'
                : 'bg-surface border border-border-ui text-fg-muted hover:bg-surface-muted'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Match list */}
      <div className="space-y-3">
        {
          /* istanbul ignore next */ filtered.length === 0 && (
            <p className="text-sm text-fg-muted text-center py-8">
              {t('matches.none')}
            </p>
          )
        }
        {filtered.map(match => {
          const team = teams.find(t => t.id === match.teamId);
          const hasScore =
            match.scoreHome !== undefined && match.scoreAway !== undefined;
          return (
            <Link key={match.id} to={`/matchs/${match.id}`}>
              <Card
                padding={false}
                className="hover:bg-surface-muted transition-colors"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-fg-muted mb-1">
                        {formatDateFull(match.date)} · {match.time}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-fg-heading">
                          {match.isHome ? t('matches.home') : t('matches.away')}
                        </p>
                        <span className="text-fg-muted">·</span>
                        <p className="font-semibold text-fg">
                          {match.opponent}
                        </p>
                      </div>
                      <p className="text-xs text-fg-muted mt-1">
                        {team?.name} · {match.location}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge tone={statusTone[match.status]}>
                        {t(`matchStatus.${match.status}`)}
                      </Badge>
                      {hasScore && (
                        <p className="text-lg font-bold text-fg-heading">
                          {match.isHome ? match.scoreHome : match.scoreAway}
                          <span className="text-fg-muted mx-1">-</span>
                          {match.isHome ? match.scoreAway : match.scoreHome}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
