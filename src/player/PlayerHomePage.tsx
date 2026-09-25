import type { ReactNode } from 'react';
import { AlertTriangle, Calendar, Dumbbell, LogOut } from 'lucide-react';
import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
import { Badge } from '@mister-guiiug/dev-pwa-config/react/badge';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useAppContext, useCurrentUser } from '../store/AppContext';
import { useAuth } from '../auth/AuthContext';
import { UpdateBanner } from '../components/UpdateBanner';
import { useI18n } from '../i18n';
import { formatDateShort, isUpcoming } from '../utils/date';
import { retainedStatus } from '../utils/surveyStatus';
import type { Match, Survey, SurveyResponseValue, Training } from '../types';

const VALUES: SurveyResponseValue[] = ['present', 'absent', 'incertain'];

/** Combien d'événements à venir : la semaine qui vient, pas la saison. */
const MAX_EVENTS = 8;

type Upcoming =
  | { kind: 'match'; at: string; match: Match }
  | { kind: 'training'; at: string; training: Training };

/**
 * LA PAGE DU JOUEUR — tout ce que son compte montre, et c'est peu, exprès.
 *
 * Ses sondages ouverts, avec les trois boutons de SON intention ; ses
 * prochains matchs et entraînements ; de quoi se déconnecter. Pas de barre de
 * navigation vers des écrans qui seraient vides : la base ne lui rend que sa
 * fiche, les matchs, entraînements et sondages de ses équipes, et ses propres
 * réponses (migration 0006).
 *
 * LA RÉPONSE DU PARENT PRÉVAUT (§ 15.1), et la page le dit : sous chaque
 * sondage, la confirmation du parent quand elle existe, et un signal quand
 * les deux diffèrent — la divergence du § 15.5, vue du côté de l'enfant.
 *
 * Tutoiement : c'est un enfant qui lit.
 */
export default function PlayerHomePage() {
  const { t } = useI18n();
  const { state } = useAppContext();
  const { signOut } = useAuth();
  const me = useCurrentUser();
  const player = state.players.find(p => p.id === me?.playerId);

  if (!player) {
    // Fiche archivée (RG-JOUEUR-03) : la base ne la rend plus.
    return (
      <PlayerFrame>
        <p className="text-sm text-fg-muted">{t('player.archived')}</p>
        <SignOutButton onSignOut={signOut} />
      </PlayerFrame>
    );
  }

  const teamIds = [player.primaryTeamId, player.secondaryTeamId].filter(
    (id): id is string => Boolean(id)
  );
  const teamName = (id: string) =>
    state.teams.find(tm => tm.id === id)?.name ?? '';

  const surveys = state.surveys
    .filter(s => teamIds.includes(s.teamId) && s.status === 'ouvert')
    .sort((a, b) => (a.deadline < b.deadline ? -1 : 1));

  const upcoming: Upcoming[] = [
    ...state.matches
      .filter(m => teamIds.includes(m.teamId) && isUpcoming(m.date))
      .map(m => ({
        kind: 'match' as const,
        at: `${m.date}T${m.time}`,
        match: m,
      })),
    ...state.trainings
      .filter(tr => teamIds.includes(tr.teamId) && isUpcoming(tr.date))
      .map(tr => ({
        kind: 'training' as const,
        at: `${tr.date}T${tr.time}`,
        training: tr,
      })),
  ]
    .sort((a, b) => (a.at < b.at ? -1 : 1))
    .slice(0, MAX_EVENTS);

  return (
    <PlayerFrame>
      <div>
        <h1 className="text-xl font-bold text-fg-heading">
          {t('player.greeting', { name: player.firstName })}
        </h1>
        <p className="mt-0.5 text-sm text-fg-muted">
          {teamIds.map(teamName).filter(Boolean).join(' · ')}
        </p>
        <p className="mt-2 text-xs text-fg-muted">{t('player.intro')}</p>
      </div>

      <section aria-labelledby="player-surveys" className="space-y-2">
        <h2
          id="player-surveys"
          className="text-sm font-semibold text-fg-heading"
        >
          {t('player.mySurveys')}
        </h2>
        {surveys.length === 0 ? (
          <p className="text-sm text-fg-muted">{t('player.noSurveys')}</p>
        ) : (
          surveys.map(survey => (
            <PlayerSurveyCard
              key={survey.id}
              survey={survey}
              playerId={player.id}
            />
          ))
        )}
      </section>

      <section aria-labelledby="player-events" className="space-y-2">
        <h2
          id="player-events"
          className="text-sm font-semibold text-fg-heading"
        >
          {t('player.myEvents')}
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-fg-muted">{t('player.noEvents')}</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(event =>
              event.kind === 'match' ? (
                <MatchItem
                  key={event.match.id}
                  match={event.match}
                  team={teamName(event.match.teamId)}
                />
              ) : (
                <TrainingItem
                  key={event.training.id}
                  training={event.training}
                  team={teamName(event.training.teamId)}
                />
              )
            )}
          </ul>
        )}
      </section>

      <SignOutButton onSignOut={signOut} />
    </PlayerFrame>
  );
}

/** La coque : un en-tête, et le bandeau de mise à jour de l'application. */
function PlayerFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Comme dans la coquille de l'app : c'est lui qui enregistre le
          service worker et propose les mises à jour. */}
      <UpdateBanner />
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border-ui bg-surface px-3">
        <span aria-hidden="true" className="text-xl">
          ⚽
        </span>
        <span className="text-sm font-bold text-fg-heading">
          Mister Footcoach
        </span>
      </header>
      <main className="space-y-5 px-4 py-4">{children}</main>
    </div>
  );
}

function SignOutButton({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { t } = useI18n();
  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={() => void onSignOut()}
    >
      <LogOut size={14} aria-hidden="true" /> {t('player.signOut')}
    </Button>
  );
}

function PlayerSurveyCard({
  survey,
  playerId,
}: {
  survey: Survey;
  playerId: string;
}) {
  const { t } = useI18n();
  const { state, dispatch } = useAppContext();
  const response = state.surveyResponses.find(
    r => r.surveyId === survey.id && r.playerId === playerId
  );
  // Une ligne de Postgres porte `null` : voir `retainedStatus`.
  const intention = response?.intentionJoueur ?? undefined;
  const confirmation = response?.confirmationParent ?? undefined;
  const { divergence } = retainedStatus(response);
  const groupId = `survey-${survey.id}`;

  return (
    <Card>
      <h3 id={groupId} className="text-sm font-semibold text-fg-heading">
        {survey.question}
      </h3>
      <p className="mt-0.5 text-xs text-fg-muted">
        {t('player.deadline', { date: formatDateShort(survey.deadline) })}
      </p>

      <p className="mt-3 mb-1 text-xs text-fg-muted">{t('player.myAnswer')}</p>
      <div role="group" aria-labelledby={groupId} className="flex gap-1.5">
        {VALUES.map(value => (
          <button
            key={value}
            type="button"
            aria-pressed={intention === value}
            onClick={() =>
              dispatch({
                type: 'SET_PLAYER_INTENTION',
                surveyId: survey.id,
                playerId,
                value,
              })
            }
            className={`min-h-11 flex-1 rounded-lg border px-2 text-sm transition-colors ${
              intention === value
                ? // La palette des boutons de réponse de `SurveysPage` : la
                  // même réponse a la même couleur partout, et aucune règle
                  // CSS neuve n'entre dans la feuille que tout visiteur charge.
                  value === 'present'
                  ? 'border-green-500 bg-green-50 font-semibold text-green-700'
                  : value === 'absent'
                    ? 'border-red-500 bg-red-50 font-semibold text-red-700'
                    : 'border-amber-500 bg-amber-50 font-semibold text-amber-700'
                : 'border-border-ui text-fg-muted hover:bg-surface-muted'
            }`}
          >
            {t(`surveyResponse.${value}`)}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-fg">
        {confirmation
          ? t('player.parentConfirmed', {
              value: t(`surveyResponse.${confirmation}`),
            })
          : t('player.parentPending')}
      </p>
      {divergence && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          <AlertTriangle size={12} aria-hidden="true" />
          {t('player.divergence')}
        </p>
      )}
    </Card>
  );
}

function MatchItem({ match, team }: { match: Match; team: string }) {
  const { t } = useI18n();
  return (
    <li>
      <Card padding={false} className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
              <Calendar size={14} aria-hidden="true" className="text-primary" />
              {t('player.matchAgainst', { opponent: match.opponent })}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {[team, formatDateShort(match.date), match.time]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p className="text-xs text-fg-muted">
              {match.isHome ? t('player.home') : t('player.away')}
              {match.location ? ` — ${match.location}` : ''}
            </p>
            {match.meetingTime && (
              <p className="text-xs text-fg-muted">
                {t('player.meeting', { time: match.meetingTime })}
              </p>
            )}
          </div>
          {match.status === 'annule' && (
            <Badge tone="danger">{t('player.cancelled')}</Badge>
          )}
        </div>
      </Card>
    </li>
  );
}

function TrainingItem({
  training,
  team,
}: {
  training: Training;
  team: string;
}) {
  const { t } = useI18n();
  return (
    <li>
      <Card padding={false} className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
              <Dumbbell size={14} aria-hidden="true" className="text-primary" />
              {training.theme ?? t('player.training')}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {[
                team,
                formatDateShort(training.date),
                training.time,
                t('common.minutesShort', { count: training.duration }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          {training.cancelled && (
            <Badge tone="danger">{t('player.cancelled')}</Badge>
          )}
        </div>
      </Card>
    </li>
  );
}
