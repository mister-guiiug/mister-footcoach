import { MapPin, Calendar } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useTournaments, useTeams } from '../store/AppContext';
import { TOURNAMENT_STATUS_LABELS, type TournamentStatus } from '../types';
import { formatDateShort } from '../utils/date';

const statusVariant: Record<TournamentStatus, 'muted' | 'warning' | 'success'> = {
  planifie: 'muted',
  en_cours: 'warning',
  termine: 'success',
};

const formatLabels: Record<string, string> = {
  poules: 'Poules',
  elimination_directe: 'Élimination directe',
  poules_finale: 'Poules + finale',
};

export default function TournamentsPage() {
  const tournaments = useTournaments();
  const teams = useTeams();

  return (
    <div className="px-4 py-4 space-y-4">
      <h1 className="text-xl font-bold text-fg-heading">Tournois</h1>

      {/* istanbul ignore next */tournaments.length === 0 ? (
        <EmptyState
          title="Aucun tournoi"
          description="Aucun tournoi n'est planifié pour cette saison."
          icon={<span className="text-4xl">🏆</span>}
        />
      ) : (
        <div className="space-y-3">
          {tournaments.map((tournament) => {
            const participatingTeams = teams.filter((t) =>
              tournament.teamIds.includes(t.id),
            );

            return (
              <Card key={tournament.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold text-fg-heading">{tournament.name}</h2>
                      {tournament.isOrganizedByClub && (
                        <Badge variant="primary">Organisateur</Badge>
                      )}
                    </div>
                    <Badge variant={statusVariant[tournament.status]}>
                      {TOURNAMENT_STATUS_LABELS[tournament.status]}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-fg-muted flex-shrink-0" />
                    <span className="text-fg">
                      {formatDateShort(tournament.dateStart)}
                      {tournament.dateEnd && tournament.dateEnd !== tournament.dateStart &&
                        ` — ${formatDateShort(tournament.dateEnd)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-fg-muted flex-shrink-0" />
                    <span className="text-fg">{tournament.location}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border-ui flex items-center justify-between text-xs text-fg-muted">
                  <span>Format : {formatLabels[tournament.format] ?? tournament.format}</span>
                  <span>{participatingTeams.map((t) => t.name).join(', ')}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
