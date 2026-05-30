/* c8 ignore next */
import { Link } from 'react-router-dom';
import { Calendar, Dumbbell, Users, ClipboardList, Trophy } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  useAppContext,
  useTeams,
  useMatches,
  useTrainings,
  useSurveys,
} from '../store/AppContext';
import { formatDateShort, isUpcoming } from '../utils/date';
import type { MatchStatus } from '../types';
import { MATCH_STATUS_LABELS } from '../types';

const statusVariant: Record<
  MatchStatus,
  'primary' | 'success' | 'warning' | 'muted' | 'danger'
> = {
  previsionnel: 'muted',
  engage: 'warning',
  saison: 'primary',
  tournoi: 'success',
  annule: 'danger',
};

export default function DashboardPage() {
  const { state } = useAppContext();
  const teams = useTeams();
  const allMatches = useMatches();
  const allTrainings = useTrainings();
  const allSurveys = useSurveys();

  const upcomingMatches = allMatches
    .filter(m => isUpcoming(m.date))
    .slice(0, 3);
  const upcomingTrainings = allTrainings
    .filter(t => !t.cancelled && isUpcoming(t.date))
    .slice(0, 2);
  const openSurveys = allSurveys.filter(s => s.status === 'ouvert').length;

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-fg-heading">Bonjour 👋</h1>
        <p className="text-sm text-fg-muted mt-0.5">
          Saison {state.season.name}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col gap-1">
          <p className="text-2xl font-bold text-primary">{teams.length}</p>
          <p className="text-xs text-fg-muted">Équipes</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-2xl font-bold text-primary">
            {state.players.filter(p => p.active).length}
          </p>
          <p className="text-xs text-fg-muted">Joueurs actifs</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-2xl font-bold text-primary">
            {upcomingMatches.length}
          </p>
          <p className="text-xs text-fg-muted">Matchs à venir</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <p className="text-2xl font-bold text-amber-500">{openSurveys}</p>
          <p className="text-xs text-fg-muted">Sondages ouverts</p>
        </Card>
      </div>

      {/* Upcoming matches */}
      {upcomingMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-fg-heading flex items-center gap-2">
              <Calendar size={15} className="text-primary" />
              Prochains matchs
            </h2>
            <Link to="/matchs" className="text-xs text-primary font-medium">
              Voir tout
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingMatches.map(match => {
              const team = teams.find(t => t.id === match.teamId);
              return (
                <Link key={match.id} to={`/matchs/${match.id}`}>
                  <Card
                    padding={false}
                    className="p-3 hover:bg-surface-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg truncate">
                          {match.isHome ? 'vs' : '@'} {match.opponent}
                        </p>
                        <p className="text-xs text-fg-muted mt-0.5">
                          {team?.name} · {formatDateShort(match.date)} à{' '}
                          {match.time}
                        </p>
                      </div>
                      <Badge variant={statusVariant[match.status]}>
                        {MATCH_STATUS_LABELS[match.status]}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming trainings */}
      {upcomingTrainings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-fg-heading flex items-center gap-2">
              <Dumbbell size={15} className="text-primary" />
              Prochains entraînements
            </h2>
            <Link
              to="/entrainements"
              className="text-xs text-primary font-medium"
            >
              Voir tout
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingTrainings.map(t => {
              const team = teams.find(te => te.id === t.teamId);
              return (
                <Link key={t.id} to={`/entrainements/${t.id}`}>
                  <Card
                    padding={false}
                    className="p-3 hover:bg-surface-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-fg">
                          {t.theme ?? 'Entraînement'}
                        </p>
                        <p className="text-xs text-fg-muted mt-0.5">
                          {team?.name} · {formatDateShort(t.date)} à {t.time} ·{' '}
                          {t.duration} min
                        </p>
                      </div>
                      {t.type === 'exceptionnel' && (
                        <Badge variant="warning">Exceptionnel</Badge>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Teams quick access */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-fg-heading flex items-center gap-2">
            <Users size={15} className="text-primary" />
            Mes équipes
          </h2>
          <Link to="/equipes" className="text-xs text-primary font-medium">
            Gérer
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {teams.map(team => {
            const playerCount = state.players.filter(
              p => p.active && p.primaryTeamId === team.id
            ).length;
            return (
              <Link key={team.id} to={`/equipes/${team.id}`}>
                <Card
                  padding={false}
                  className="p-3 hover:bg-surface-muted transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    <p className="text-sm font-semibold text-fg-heading">
                      {team.name}
                    </p>
                  </div>
                  <p className="text-xs text-fg-muted">{playerCount} joueurs</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Open surveys */}
      {openSurveys > 0 && (
        <section>
          <Link to="/sondages">
            <Card className="flex items-center gap-3 hover:bg-surface-muted transition-colors">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <ClipboardList size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-fg">
                  {openSurveys} sondage{openSurveys > 1 ? 's' : ''} en attente
                </p>
                <p className="text-xs text-fg-muted">Répondre maintenant</p>
              </div>
            </Card>
          </Link>
        </section>
      )}

      {/* Tournaments */}
      {state.tournaments.some(t => t.status !== 'termine') && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-fg-heading flex items-center gap-2">
              <Trophy size={15} className="text-primary" />
              Tournois
            </h2>
            <Link to="/tournois" className="text-xs text-primary font-medium">
              Voir tout
            </Link>
          </div>
          <div className="space-y-2">
            {state.tournaments
              .filter(t => t.status !== 'termine')
              .map(tournament => (
                <Link key={tournament.id} to="/tournois">
                  <Card
                    padding={false}
                    className="p-3 hover:bg-surface-muted transition-colors"
                  >
                    <p className="text-sm font-medium text-fg">
                      {tournament.name}
                    </p>
                    <p className="text-xs text-fg-muted mt-0.5">
                      {formatDateShort(tournament.dateStart)} ·{' '}
                      {tournament.location}
                    </p>
                  </Card>
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
