import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Plus } from 'lucide-react';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { Badge } from '@mister-guiiug/dev-pwa-config/react/badge';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';
import { SurveyFormDialog } from '../components/features/surveys/SurveyFormDialog';
import {
  useSurveys,
  useSurveyResponses,
  usePlayers,
  useTeams,
  useMatch,
  useTraining,
  useAppContext,
} from '../store/AppContext';
import { type SurveyResponseValue, type Survey } from '../types';
import { formatDateShort } from '../utils/date';
import {
  retainedStatus,
  matchesFilter,
  tutorDivergence,
  sortedTutorResponses,
  type RetainedStatus,
  type SurveyFilter,
} from '../utils/surveyStatus';
import { useI18n } from '../i18n';

function RetainedBadge({ status }: { status: RetainedStatus }) {
  const { t } = useI18n();
  if (!status.answered)
    return <Badge tone="muted">{t('surveys.notAnswered')}</Badge>;
  const label = t(`surveyResponse.${status.value!}`);
  if (!status.confirmed) {
    return <Badge tone="muted">{t('surveys.notConfirmed', { label })}</Badge>;
  }
  const tone =
    status.value === 'present'
      ? 'success'
      : status.value === 'absent'
        ? 'danger'
        : 'warning';
  return <Badge tone={tone}>{label}</Badge>;
}

function SurveyCard({ survey }: { survey: Survey }) {
  const { t } = useI18n();
  const responses = useSurveyResponses(survey.id);
  const players = usePlayers(survey.teamId);
  const match = useMatch(survey.sessionId ?? '');
  const training = useTraining(survey.sessionId ?? '');
  const { state, dispatch } = useAppContext();
  const [expanded, setExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SurveyFilter>('all');

  const STATUS_FILTERS: { key: SurveyFilter; label: string }[] = [
    { key: 'all', label: t('surveys.filterAll') },
    { key: 'confirmed_present', label: t('surveys.filterPresent') },
    { key: 'confirmed_absent', label: t('surveys.filterAbsent') },
    { key: 'unanswered', label: t('surveys.filterUnanswered') },
  ];

  function tutorName(userId: string): string {
    const contact = state.contacts.find(c => c.userId === userId);
    if (contact) return `${contact.firstName} ${contact.lastName}`;
    const user = state.users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : t('surveys.tutor');
  }

  const sessionLabel =
    survey.sessionType === 'match' && match
      ? t('surveys.sessionMatch', {
          opponent: match.opponent,
          date: formatDateShort(match.date),
        })
      : survey.sessionType === 'training' && training
        ? t('surveys.sessionTraining', { date: formatDateShort(training.date) })
        : /* istanbul ignore next */ survey.question;

  const confirmedPresent = responses.filter(
    r => r.confirmationParent === 'present'
  ).length;
  const confirmedAbsent = responses.filter(
    r => r.confirmationParent === 'absent'
  ).length;
  const pending = players.length - responses.length;

  function respondForPlayer(
    playerId: string,
    field: 'intentionJoueur' | 'confirmationParent',
    value: SurveyResponseValue
  ) {
    const existing = responses.find(r => r.playerId === playerId);
    if (existing) {
      dispatch({
        type: 'UPDATE_SURVEY_RESPONSE',
        response: {
          ...existing,
          [field]: value,
          [`date${field.charAt(0).toUpperCase() + field.slice(1)}`]: new Date()
            .toISOString()
            .split('T')[0],
        },
      });
    } else {
      dispatch({
        type: 'ADD_SURVEY_RESPONSE',
        response: {
          id: `sr-${Date.now()}-${playerId}`,
          surveyId: survey.id,
          playerId,
          [field]: value,
          [`date${field.charAt(0).toUpperCase() + field.slice(1)}`]: new Date()
            .toISOString()
            .split('T')[0],
        },
      });
    }
  }

  return (
    <Card>
      <CardHeader
        title={sessionLabel}
        subtitle={t('surveys.deadline', {
          date: formatDateShort(survey.deadline),
        })}
        action={
          <Badge
            tone={
              survey.status === 'ouvert'
                ? 'success'
                : survey.status === 'ferme'
                  ? 'muted'
                  : 'muted'
            }
          >
            {survey.status === 'ouvert'
              ? t('surveys.statusOpen')
              : survey.status === 'ferme'
                ? t('surveys.statusClosed')
                : t('surveys.statusArchived')}
          </Badge>
        }
      />

      {/* Summary */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 rounded-xl bg-green-50 dark:bg-green-900/20 p-2.5 text-center">
          <p className="text-xl font-bold text-green-600">{confirmedPresent}</p>
          <p className="text-xs text-green-700 dark:text-green-400">
            {t('surveys.presentConfirmed')}
          </p>
        </div>
        <div className="flex-1 rounded-xl bg-red-50 dark:bg-red-900/20 p-2.5 text-center">
          <p className="text-xl font-bold text-red-600">{confirmedAbsent}</p>
          <p className="text-xs text-red-700 dark:text-red-400">
            {t('surveys.absentConfirmed')}
          </p>
        </div>
        <div className="flex-1 rounded-xl bg-surface-muted p-2.5 text-center">
          <p className="text-xl font-bold text-fg-muted">{pending}</p>
          <p className="text-xs text-fg-muted">{t('surveys.pending')}</p>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => setExpanded(v => !v)}
        className="w-full"
      >
        {expanded ? t('surveys.hideDetails') : t('surveys.viewResponses')}
      </Button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Synthesis filters (specs §15.5) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === f.key
                    ? 'bg-primary text-primary-fg'
                    : 'bg-surface border border-border-ui text-fg-muted hover:bg-surface-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {players
            .filter(player =>
              matchesFilter(
                retainedStatus(responses.find(r => r.playerId === player.id)),
                statusFilter
              )
            )
            .map(player => {
              const resp = responses.find(r => r.playerId === player.id);
              const status = retainedStatus(resp);

              return (
                <div
                  key={player.id}
                  className="border border-border-ui rounded-xl p-3"
                >
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-sm font-medium text-fg">
                      {player.firstName} {player.lastName}
                    </p>
                    <div className="flex items-center gap-2">
                      {status.divergence && (
                        <div className="flex items-center gap-1 text-amber-600 text-xs">
                          <AlertTriangle size={12} />
                          <span>{t('surveys.divergence')}</span>
                        </div>
                      )}
                      <RetainedBadge status={status} />
                    </div>
                  </div>

                  {/* Divergence between legal tutors (specs §15.8) */}
                  {tutorDivergence(resp?.tutorResponses) && (
                    <div className="mb-2 rounded-xl bg-amber-50 dark:bg-amber-900/10 p-2.5">
                      <p className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <AlertTriangle size={12} />
                        {t('surveys.tutorDivergence')}
                      </p>
                      <div className="mt-1.5 space-y-1">
                        {sortedTutorResponses(resp?.tutorResponses).map(tr => (
                          <div
                            key={tr.userId}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-fg">
                              {tutorName(tr.userId)} —{' '}
                              {t(`surveyResponse.${tr.value}`)}
                            </span>
                            <button
                              onClick={() =>
                                respondForPlayer(
                                  player.id,
                                  'confirmationParent',
                                  tr.value
                                )
                              }
                              className="rounded-md border border-border-ui px-2 py-0.5 font-medium text-fg-muted hover:bg-surface-muted"
                            >
                              {t('common.retain')}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Intention joueur */}
                  <div className="mb-2">
                    <p className="text-xs text-fg-muted mb-1">
                      {t('surveys.playerSays', { name: player.firstName })}
                    </p>
                    <div className="flex gap-1.5">
                      {(
                        [
                          'present',
                          'absent',
                          'incertain',
                        ] as SurveyResponseValue[]
                      ).map(v => (
                        <button
                          key={v}
                          onClick={() =>
                            respondForPlayer(player.id, 'intentionJoueur', v)
                          }
                          className={`flex-1 py-1 rounded-lg text-xs border transition-colors ${
                            resp?.intentionJoueur === v
                              ? v === 'present'
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : v === 'absent'
                                  ? 'border-red-500 bg-red-50 text-red-700'
                                  : 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-border-ui text-fg-muted hover:bg-surface-muted'
                          }`}
                        >
                          {t(`surveyResponse.${v}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Confirmation parent */}
                  <div>
                    <p className="text-xs font-medium text-fg-muted mb-1">
                      {t('surveys.officialConfirmation')}
                    </p>
                    <div className="flex gap-1.5">
                      {(
                        [
                          'present',
                          'absent',
                          'incertain',
                        ] as SurveyResponseValue[]
                      ).map(v => (
                        <button
                          key={v}
                          onClick={() =>
                            respondForPlayer(player.id, 'confirmationParent', v)
                          }
                          className={`flex-1 py-1 rounded-lg text-xs border transition-colors ${
                            resp?.confirmationParent === v
                              ? v === 'present'
                                ? 'border-green-500 bg-green-100 text-green-700 font-semibold'
                                : v === 'absent'
                                  ? 'border-red-500 bg-red-100 text-red-700 font-semibold'
                                  : 'border-amber-500 bg-amber-100 text-amber-700 font-semibold'
                              : 'border-border-ui text-fg-muted hover:bg-surface-muted'
                          }`}
                        >
                          {t(`surveyResponse.${v}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </Card>
  );
}

export default function SurveysPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const teams = useTeams();
  const [teamFilter, setTeamFilter] = useState(
    searchParams.get('teamId') ?? 'all'
  );
  const [formOpen, setFormOpen] = useState(false);

  const surveys = useSurveys(teamFilter === 'all' ? undefined : teamFilter);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg-heading">
          {t('surveys.title')}
        </h1>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus size={16} /> {t('common.new')}
        </Button>
      </div>

      {formOpen && (
        <SurveyFormDialog
          open
          onClose={() => setFormOpen(false)}
          teamId={teamFilter !== 'all' ? teamFilter : undefined}
        />
      )}

      {/* Team filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setTeamFilter('all')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            teamFilter === 'all'
              ? 'bg-primary text-primary-fg'
              : 'bg-surface border border-border-ui text-fg-muted hover:bg-surface-muted'
          }`}
        >
          {t('surveys.allTeams')}
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

      <p className="text-xs text-fg-muted">{t('surveys.officialNote')}</p>

      {
        /* istanbul ignore next */ surveys.length === 0 ? (
          <EmptyState
            title={t('surveys.none')}
            description={t('surveys.noneDesc')}
            icon={<span className="text-4xl">📋</span>}
          />
        ) : (
          <div className="space-y-3">
            {surveys.map(survey => (
              <SurveyCard key={survey.id} survey={survey} />
            ))}
          </div>
        )
      }
    </div>
  );
}
