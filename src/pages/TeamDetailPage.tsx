import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, AlertTriangle, Plus, Download } from 'lucide-react';
import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { PlayerFormDialog } from '../components/features/players/PlayerFormDialog';
import {
  useTeam,
  usePlayers,
  useMatches,
  useTrainings,
  useUnavailabilities,
  useTournaments,
} from '../store/AppContext';
import {
  formatDateShort,
  isUpcoming,
  isActiveUnavailability,
  today,
} from '../utils/date';
import {
  toIcalendar,
  ICAL_MIME,
  type IcalEvent,
} from '@mister-guiiug/dev-pwa-config/ical';
import { downloadText } from '@mister-guiiug/dev-pwa-config/download';
import { useI18n } from '../i18n';
import type { Match, Training } from '../types';

/**
 * Un match devient un événement d'agenda. Le `STATUS` n'est pas décoratif : un
 * match annulé RESTE au calendrier, barré, au lieu de disparaître sans que
 * personne ne comprenne pourquoi (RG-ICAL-04 pour le nom du tournoi).
 *
 * `date` + `time` sont recollés en horodatage ISO SANS décalage : c'est une
 * heure FLOTTANTE, donc un coup d'envoi à 10 h reste à 10 h pour le parent qui
 * consulte l'agenda depuis un autre fuseau.
 */
function matchEvent(match: Match, tournamentName?: string): IcalEvent {
  const descParts = [`Statut : ${match.status}`, `Phase : ${match.phase}`];
  if (tournamentName) descParts.push(`Tournoi : ${tournamentName}`);
  if (match.meetingTime || match.meetingAddress) {
    descParts.push(
      `RDV : ${[match.meetingTime, match.meetingAddress].filter(Boolean).join(' — ')}`
    );
  }
  return {
    uid: `match-${match.id}@mister-footcoach`,
    summary: `⚽ ${match.isHome ? 'vs' : '@'} ${match.opponent}`,
    start: `${match.date}T${match.time || '00:00'}`,
    durationMinutes: 120,
    location: [match.location, match.address].filter(Boolean).join(', '),
    description: descParts.join('\n'),
    status:
      match.status === 'annule'
        ? 'CANCELLED'
        : match.status === 'previsionnel'
          ? 'TENTATIVE'
          : 'CONFIRMED',
  };
}

/** Un entraînement : sa fin se déduit de sa durée saisie, en minutes. */
function trainingEvent(training: Training): IcalEvent {
  return {
    uid: `training-${training.id}@mister-footcoach`,
    summary: `🏋 ${training.theme ?? 'Entraînement'}`,
    start: `${training.date}T${training.time || '00:00'}`,
    durationMinutes: training.duration,
    description: training.note,
    status: training.cancelled ? 'CANCELLED' : 'CONFIRMED',
  };
}

export default function TeamDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const team = useTeam(id!);
  const players = usePlayers(id);
  const matches = useMatches(id);
  const trainings = useTrainings(id);
  const unavailabilities = useUnavailabilities();
  const tournaments = useTournaments();
  const [playerFormOpen, setPlayerFormOpen] = useState(false);

  function exportICal() {
    const tournamentName = (tid?: string) =>
      tid ? tournaments.find(t => t.id === tid)?.name : undefined;
    const events = [
      ...matches.map(m => matchEvent(m, tournamentName(m.tournamentId))),
      ...trainings.map(trainingEvent),
    ];
    downloadText(
      // Pas de `timeZone` : les heures restent FLOTTANTES, sans quoi un
      // `X-WR-TIMEZONE` ferait reconvertir le 18 h de l'entraînement dans le
      // fuseau du lecteur — exactement ce qu'on ne veut pas.
      toIcalendar(events, {
        name: `${team?.name ?? 'Équipe'} — Mister Footcoach`,
        prodId: '-//Mister Footcoach//FR',
      }),
      `${team?.name ?? 'equipe'}.ics`,
      ICAL_MIME
    );
  }

  if (!team) {
    return (
      <div className="p-4">
        <EmptyState title={t('teams.notFound')} />
      </div>
    );
  }

  const upcomingMatches = matches.filter(m => isUpcoming(m.date)).slice(0, 3);
  const upcomingTrainings = trainings
    .filter(t => !t.cancelled && isUpcoming(t.date))
    .slice(0, 2);
  const todayStr = today();

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: team.color + '22' }}
        >
          <span className="text-2xl font-bold" style={{ color: team.color }}>
            {team.name.charAt(0)}
          </span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-fg-heading">{team.name}</h1>
          <p className="text-sm text-fg-muted">
            {team.category} ·{' '}
            {t('teams.playersCount', { count: players.length })}
          </p>
        </div>
      </div>

      {playerFormOpen && (
        <PlayerFormDialog
          open
          onClose={() => setPlayerFormOpen(false)}
          teamId={id}
        />
      )}

      {/* Players */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-fg-heading">
            {t('teams.squad')}
          </h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPlayerFormOpen(true)}
          >
            <Plus size={14} /> {t('teams.addPlayer')}
          </Button>
        </div>
        <Card padding={false}>
          {
            /* istanbul ignore next */ players.length === 0 ? (
              <EmptyState title={t('teams.noPlayers')} />
            ) : (
              <ul className="divide-y divide-border-ui">
                {players.map(player => {
                  const unavail = unavailabilities.find(
                    u =>
                      u.playerId === player.id &&
                      isActiveUnavailability(u.startDate, u.endDate, todayStr)
                  );
                  const isSecondary =
                    player.secondaryTeamId === id ||
                    player.primaryTeamId !== id;

                  return (
                    <li key={player.id}>
                      <Link
                        to={`/joueurs/${player.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors"
                      >
                        <div className="h-9 w-9 rounded-full bg-primary-subtle flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {player.number ??
                              player.firstName.charAt(0) +
                                player.lastName.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-fg truncate">
                              {player.firstName} {player.lastName}
                            </p>
                            {unavail && (
                              <AlertTriangle
                                size={13}
                                className="text-amber-500 flex-shrink-0"
                              />
                            )}
                          </div>
                          <p className="text-xs text-fg-muted">
                            {t(`position.${player.preferredPosition}`)}
                            {isSecondary && ' · ' + t('teams.reinforcement')}
                          </p>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-fg-faint flex-shrink-0"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )
          }
        </Card>
      </section>

      {/* Upcoming matches */}
      {upcomingMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-fg-heading">
              {t('teams.nextMatches')}
            </h2>
            <Link to="/matchs" className="text-xs text-primary">
              {t('common.viewAll')}
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingMatches.map(m => (
              <Link key={m.id} to={`/matchs/${m.id}`}>
                <Card
                  padding={false}
                  className="p-3 hover:bg-surface-muted transition-colors"
                >
                  <p className="text-sm font-medium text-fg">
                    {m.isHome ? 'vs' : '@'} {m.opponent}
                  </p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {formatDateShort(m.date)} à {m.time}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming trainings */}
      {upcomingTrainings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-fg-heading">
              {t('teams.nextTrainings')}
            </h2>
            <Link to="/entrainements" className="text-xs text-primary">
              {t('common.viewAll')}
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingTrainings.map(training => (
              <Link key={training.id} to={`/entrainements/${training.id}`}>
                <Card
                  padding={false}
                  className="p-3 hover:bg-surface-muted transition-colors"
                >
                  <p className="text-sm font-medium text-fg">
                    {training.theme ?? t('teams.trainingFallback')}
                  </p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {formatDateShort(training.date)} à {training.time} ·{' '}
                    {training.duration} min
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <section>
        <h2 className="text-sm font-semibold text-fg-heading mb-2">
          {t('teams.actions')}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Link to={`/compositions?teamId=${id}`}>
            <Card
              padding={false}
              className="p-3 hover:bg-surface-muted transition-colors text-center"
            >
              <p className="text-sm font-medium text-primary">
                {t('teams.lineups')}
              </p>
            </Card>
          </Link>
          <Link to={`/sondages?teamId=${id}`}>
            <Card
              padding={false}
              className="p-3 hover:bg-surface-muted transition-colors text-center"
            >
              <p className="text-sm font-medium text-primary">
                {t('teams.surveys')}
              </p>
            </Card>
          </Link>
        </div>
        <Button
          variant="secondary"
          onClick={exportICal}
          className="mt-2 w-full"
        >
          <Download size={15} /> {t('teams.exportICal')}
        </Button>
      </section>
    </div>
  );
}
