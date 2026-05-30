import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Plus } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
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
import {
  SURVEY_RESPONSE_LABELS,
  type SurveyResponseValue,
  type Survey,
} from '../types';
import { formatDateShort } from '../utils/date';

function SurveyCard({ survey }: { survey: Survey }) {
  const responses = useSurveyResponses(survey.id);
  const players = usePlayers(survey.teamId);
  const match = useMatch(survey.sessionId ?? '');
  const training = useTraining(survey.sessionId ?? '');
  const { dispatch } = useAppContext();
  const [expanded, setExpanded] = useState(false);

  const sessionLabel =
    survey.sessionType === 'match' && match
      ? `Match vs ${match.opponent} (${formatDateShort(match.date)})`
      : survey.sessionType === 'training' && training
        ? `Entraînement ${formatDateShort(training.date)}`
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
        subtitle={`Clôture : ${formatDateShort(survey.deadline)}`}
        action={
          <Badge
            variant={
              survey.status === 'ouvert'
                ? 'success'
                : survey.status === 'ferme'
                  ? 'muted'
                  : 'muted'
            }
          >
            {survey.status === 'ouvert'
              ? 'Ouvert'
              : survey.status === 'ferme'
                ? 'Fermé'
                : 'Archivé'}
          </Badge>
        }
      />

      {/* Summary */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 rounded-xl bg-green-50 dark:bg-green-900/20 p-2.5 text-center">
          <p className="text-xl font-bold text-green-600">{confirmedPresent}</p>
          <p className="text-xs text-green-700 dark:text-green-400">
            Présents confirmés
          </p>
        </div>
        <div className="flex-1 rounded-xl bg-red-50 dark:bg-red-900/20 p-2.5 text-center">
          <p className="text-xl font-bold text-red-600">{confirmedAbsent}</p>
          <p className="text-xs text-red-700 dark:text-red-400">
            Absences confirmées
          </p>
        </div>
        <div className="flex-1 rounded-xl bg-surface-muted p-2.5 text-center">
          <p className="text-xl font-bold text-fg-muted">{pending}</p>
          <p className="text-xs text-fg-muted">En attente</p>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => setExpanded(v => !v)}
        className="w-full"
      >
        {expanded ? 'Masquer les détails' : 'Voir les réponses'}
      </Button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {players.map(player => {
            const resp = responses.find(r => r.playerId === player.id);
            const hasDivergence =
              resp?.intentionJoueur !== undefined &&
              resp?.confirmationParent !== undefined &&
              resp.intentionJoueur !== resp.confirmationParent;

            return (
              <div
                key={player.id}
                className="border border-border-ui rounded-xl p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-fg">
                    {player.firstName} {player.lastName}
                  </p>
                  {hasDivergence && (
                    <div className="flex items-center gap-1 text-amber-600 text-xs">
                      <AlertTriangle size={12} />
                      <span>Divergence</span>
                    </div>
                  )}
                </div>

                {/* Intention joueur */}
                <div className="mb-2">
                  <p className="text-xs text-fg-muted mb-1">
                    Ce que dit {player.firstName} (indicatif)
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
                        {SURVEY_RESPONSE_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confirmation parent */}
                <div>
                  <p className="text-xs font-medium text-fg-muted mb-1">
                    Confirmation officielle du parent ★
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
                        {SURVEY_RESPONSE_LABELS[v]}
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
          Sondages de présence
        </h1>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus size={16} /> Nouveau
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
          Toutes
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

      <p className="text-xs text-fg-muted">
        ★ La confirmation du parent est la seule valeur officielle retenue par
        le coach.
      </p>

      {
        /* istanbul ignore next */ surveys.length === 0 ? (
          <EmptyState
            title="Aucun sondage"
            description="Aucun sondage n'est en cours pour le moment."
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
