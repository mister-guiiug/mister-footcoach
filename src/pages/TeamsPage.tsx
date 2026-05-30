import { Link } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useTeams, usePlayers } from '../store/AppContext';

export default function TeamsPage() {
  const teams = useTeams();
  const allPlayers = usePlayers();

  return (
    <div className="px-4 py-4 space-y-4">
      <h1 className="text-xl font-bold text-fg-heading">Équipes</h1>

      <div className="space-y-3">
        {teams.map(team => {
          const playerCount = allPlayers.filter(
            p => p.primaryTeamId === team.id
          ).length;
          const secondaryCount = allPlayers.filter(
            p => p.secondaryTeamId === team.id
          ).length;

          return (
            <Link key={team.id} to={`/equipes/${team.id}`}>
              <Card
                padding={false}
                className="hover:bg-surface-muted transition-colors"
              >
                <div className="flex items-center gap-4 p-4">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: team.color + '22' }}
                  >
                    <Users size={22} style={{ color: team.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-fg-heading">{team.name}</p>
                    <p className="text-xs text-fg-muted mt-0.5">
                      {team.category} · {playerCount} joueurs principaux
                      {secondaryCount > 0 && ` · ${secondaryCount} renforts`}
                    </p>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-fg-faint flex-shrink-0"
                  />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
