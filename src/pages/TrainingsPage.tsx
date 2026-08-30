import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, Plus } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '@mister-guiiug/dev-wpa-config/react/badge';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { TrainingFormDialog } from '../components/features/trainings/TrainingFormDialog';
import { useTrainings, useTeams } from '../store/AppContext';
import { formatDateFull, isUpcoming } from '../utils/date';
import { useI18n } from '../i18n';

export default function TrainingsPage() {
  const { t } = useI18n();
  const allTrainings = useTrainings();
  const teams = useTeams();
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [formOpen, setFormOpen] = useState(false);

  const filtered = allTrainings.filter(t => {
    if (teamFilter !== 'all' && t.teamId !== teamFilter) return false;
    if (filter === 'upcoming') return isUpcoming(t.date);
    if (filter === 'past') return !isUpcoming(t.date);
    return true;
  });

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg-heading">
          {t('trainings.title')}
        </h1>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus size={16} /> {t('common.new')}
        </Button>
      </div>

      {formOpen && (
        <TrainingFormDialog
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
              ? t('trainings.filterAll')
              : f === 'upcoming'
                ? t('trainings.filterUpcoming')
                : t('trainings.filterPast')}
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
          {t('trainings.allTeams')}
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

      {/* Training list */}
      <div className="space-y-3">
        {
          /* istanbul ignore next */ filtered.length === 0 && (
            <p className="text-sm text-fg-muted text-center py-8">
              {t('trainings.none')}
            </p>
          )
        }
        {filtered.map(training => {
          const team = teams.find(t => t.id === training.teamId);
          return (
            <Link key={training.id} to={`/entrainements/${training.id}`}>
              <Card
                padding={false}
                className={`hover:bg-surface-muted transition-colors ${training.cancelled ? 'opacity-60' : ''}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-fg-muted mb-1">
                        {formatDateFull(training.date)} à {training.time}
                      </p>
                      <p className="font-semibold text-fg-heading">
                        {training.theme ?? t('trainings.fallback')}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-fg-muted">
                        <Clock size={12} />
                        <span>{training.duration} min</span>
                        <Users size={12} />
                        <span>{team?.name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {training.cancelled && (
                        <Badge tone="danger">{t('trainings.cancelled')}</Badge>
                      )}
                      {training.type === 'exceptionnel' &&
                        !training.cancelled && (
                          <Badge tone="warning">
                            {t('trainings.exceptional')}
                          </Badge>
                        )}
                    </div>
                  </div>
                  {training.note && (
                    <p className="mt-2 text-xs text-fg-muted border-t border-border-ui pt-2">
                      {training.note}
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
