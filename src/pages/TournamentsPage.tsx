import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Plus, Pencil, ChevronRight } from 'lucide-react';
import type { Tournament } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { TournamentFormDialog } from '../components/features/tournaments/TournamentFormDialog';
import { useTournaments, useTeams } from '../store/AppContext';
import { type TournamentStatus } from '../types';
import { formatDateShort } from '../utils/date';
import { useI18n } from '../i18n';

const statusVariant: Record<TournamentStatus, 'muted' | 'warning' | 'success'> =
  {
    planifie: 'muted',
    en_cours: 'warning',
    termine: 'success',
  };

export default function TournamentsPage() {
  const { t } = useI18n();
  const tournaments = useTournaments();
  const teams = useTeams();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tournament | undefined>();

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg-heading">
          {t('tournaments.title')}
        </h1>
        <Button size="sm" onClick={openNew}>
          <Plus size={16} /> {t('common.new')}
        </Button>
      </div>

      {formOpen && (
        <TournamentFormDialog
          open
          onClose={() => setFormOpen(false)}
          tournament={editing}
        />
      )}

      {
        /* istanbul ignore next */ tournaments.length === 0 ? (
          <EmptyState
            title={t('tournaments.none')}
            description={t('tournaments.noneDesc')}
            icon={<span className="text-4xl">🏆</span>}
          />
        ) : (
          <div className="space-y-3">
            {tournaments.map(tournament => {
              const participatingTeams = teams.filter(t =>
                tournament.teamIds.includes(t.id)
              );

              return (
                <Card key={tournament.id}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          to={`/tournois/${tournament.id}`}
                          className="flex items-center gap-1 font-semibold text-fg-heading hover:text-primary"
                        >
                          {tournament.name}
                          <ChevronRight size={15} className="text-fg-faint" />
                        </Link>
                        {tournament.isOrganizedByClub && (
                          <Badge variant="primary">
                            {t('tournaments.organizer')}
                          </Badge>
                        )}
                      </div>
                      <Badge variant={statusVariant[tournament.status]}>
                        {t(`tournamentStatus.${tournament.status}`)}
                      </Badge>
                    </div>
                    <button
                      onClick={() => {
                        setEditing(tournament);
                        setFormOpen(true);
                      }}
                      aria-label={t('tournaments.editAria')}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-fg-faint hover:bg-surface-muted hover:text-primary"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar
                        size={14}
                        className="text-fg-muted flex-shrink-0"
                      />
                      <span className="text-fg">
                        {formatDateShort(tournament.dateStart)}
                        {tournament.dateEnd &&
                          tournament.dateEnd !== tournament.dateStart &&
                          ` — ${formatDateShort(tournament.dateEnd)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin
                        size={14}
                        className="text-fg-muted flex-shrink-0"
                      />
                      <span className="text-fg">{tournament.location}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border-ui flex items-center justify-between text-xs text-fg-muted">
                    <span>
                      {t('tournaments.formatPrefix', {
                        format: t(`tournamentFormat.${tournament.format}`),
                      })}
                    </span>
                    <span>
                      {participatingTeams.map(t => t.name).join(', ')}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      }
    </div>
  );
}
