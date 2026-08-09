import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select, Textarea } from '../../ui/Input';
import { Button } from '../../ui/Button';
import {
  useTeams,
  useMatches,
  useTrainings,
  useAppContext,
} from '../../../store/AppContext';
import type { Survey } from '../../../types';
import { genId } from '../../../utils/id';
import { today, formatDateShort } from '../../../utils/date';
import { CURRENT_USER_ID } from '../../../constants/session';
import { useI18n } from '../../../i18n';

type SessionType = Survey['sessionType'];

interface SurveyFormDialogProps {
  open: boolean;
  onClose: () => void;
  teamId?: string;
  onSaved?: (surveyId: string) => void;
}

export function SurveyFormDialog({
  open,
  onClose,
  teamId,
  onSaved,
}: SurveyFormDialogProps) {
  const { t } = useI18n();
  const teams = useTeams();
  const { dispatch } = useAppContext();

  const [selectedTeam, setSelectedTeam] = useState(
    teamId ?? teams[0]?.id ?? ''
  );
  const [sessionType, setSessionType] = useState<SessionType>('match');
  const [sessionId, setSessionId] = useState('');
  const [question, setQuestion] = useState('');
  const [deadline, setDeadline] = useState(today());
  const [sendNotification, setSendNotification] = useState(true);

  const matches = useMatches(selectedTeam);
  const trainings = useTrainings(selectedTeam);

  function defaultQuestion(type: SessionType, sid: string): string {
    if (type === 'match') {
      const m = matches.find(x => x.id === sid);
      return m
        ? t('surveys.defaultQuestion.match', {
            sign: m.isHome ? 'vs' : '@',
            opponent: m.opponent,
            date: formatDateShort(m.date),
          })
        : t('surveys.defaultQuestion.matchGeneric');
    }
    if (type === 'training') {
      const tr = trainings.find(x => x.id === sid);
      return tr
        ? t('surveys.defaultQuestion.training', {
            date: formatDateShort(tr.date),
          })
        : t('surveys.defaultQuestion.trainingGeneric');
    }
    return '';
  }

  function handleSessionChange(sid: string) {
    setSessionId(sid);
    if (
      !question.trim() ||
      question === defaultQuestion(sessionType, sessionId)
    ) {
      setQuestion(defaultQuestion(sessionType, sid));
    }
  }

  function handleSubmit() {
    const id = genId('survey');
    const survey: Survey = {
      id,
      teamId: selectedTeam,
      sessionType,
      sessionId: sessionType === 'libre' ? undefined : sessionId || undefined,
      question:
        question.trim() ||
        defaultQuestion(sessionType, sessionId) ||
        t('surveys.defaultQuestion.fallback'),
      deadline,
      status: 'ouvert',
      sendNotification,
      createdBy: CURRENT_USER_ID,
    };

    dispatch({ type: 'ADD_SURVEY', survey });
    if (sendNotification) {
      dispatch({
        type: 'NOTIFY',
        teamId: selectedTeam,
        notifType: 'sondage_nouveau',
        message: t('notifications.msg.surveyNew', {
          question: survey.question,
        }),
        relatedId: id,
        relatedType: 'survey',
      });
    }
    onSaved?.(id);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('surveys.form.title')}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {t('common.create')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Select
          label={t('surveys.form.team')}
          value={selectedTeam}
          onChange={e => {
            setSelectedTeam(e.target.value);
            setSessionId('');
          }}
        >
          {teams.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>

        <Select
          label={t('surveys.form.sessionType')}
          value={sessionType}
          onChange={e => {
            const next = e.target.value as SessionType;
            setSessionType(next);
            setSessionId('');
          }}
        >
          <option value="match">{t('surveys.form.sessionMatch')}</option>
          <option value="training">{t('surveys.form.sessionTraining')}</option>
          <option value="tournament">
            {t('surveys.form.sessionTournament')}
          </option>
          <option value="libre">{t('surveys.form.sessionFree')}</option>
        </Select>

        {sessionType === 'match' && (
          <Select
            label={t('surveys.form.matchAssociated')}
            value={sessionId}
            onChange={e => handleSessionChange(e.target.value)}
          >
            <option value="">{t('common.selectPlaceholder')}</option>
            {matches.map(m => (
              <option key={m.id} value={m.id}>
                {m.isHome ? 'vs' : '@'} {m.opponent} · {formatDateShort(m.date)}
              </option>
            ))}
          </Select>
        )}

        {sessionType === 'training' && (
          <Select
            label={t('surveys.form.trainingAssociated')}
            value={sessionId}
            onChange={e => handleSessionChange(e.target.value)}
          >
            <option value="">{t('common.selectPlaceholder')}</option>
            {trainings.map(tr => (
              <option key={tr.id} value={tr.id}>
                {tr.theme ?? t('surveys.form.trainingFallback')} ·{' '}
                {formatDateShort(tr.date)}
              </option>
            ))}
          </Select>
        )}

        <Textarea
          label={t('surveys.form.question')}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder={t('surveys.form.questionPlaceholder')}
          rows={2}
        />

        <Input
          label={t('surveys.form.deadline')}
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
        />

        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={sendNotification}
            onChange={e => setSendNotification(e.target.checked)}
            className="h-4 w-4 rounded border-border-ui text-primary"
          />
          {t('surveys.form.notifyFamilies')}
        </label>
      </div>
    </Dialog>
  );
}
