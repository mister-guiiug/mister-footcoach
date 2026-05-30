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
        ? `Présent au match ${m.isHome ? 'vs' : '@'} ${m.opponent} le ${formatDateShort(m.date)} ?`
        : 'Présent au prochain match ?';
    }
    if (type === 'training') {
      const t = trainings.find(x => x.id === sid);
      return t
        ? `Présent à l'entraînement du ${formatDateShort(t.date)} ?`
        : 'Présent au prochain entraînement ?';
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
        question.trim() || defaultQuestion(sessionType, sessionId) || 'Sondage',
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
        message: `Nouveau sondage : ${survey.question}`,
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
      title="Nouveau sondage"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Créer
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Select
          label="Équipe"
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
          label="Type de séance"
          value={sessionType}
          onChange={e => {
            const next = e.target.value as SessionType;
            setSessionType(next);
            setSessionId('');
          }}
        >
          <option value="match">Match</option>
          <option value="training">Entraînement</option>
          <option value="tournament">Tournoi</option>
          <option value="libre">Libre</option>
        </Select>

        {sessionType === 'match' && (
          <Select
            label="Match associé"
            value={sessionId}
            onChange={e => handleSessionChange(e.target.value)}
          >
            <option value="">— Sélectionner —</option>
            {matches.map(m => (
              <option key={m.id} value={m.id}>
                {m.isHome ? 'vs' : '@'} {m.opponent} · {formatDateShort(m.date)}
              </option>
            ))}
          </Select>
        )}

        {sessionType === 'training' && (
          <Select
            label="Entraînement associé"
            value={sessionId}
            onChange={e => handleSessionChange(e.target.value)}
          >
            <option value="">— Sélectionner —</option>
            {trainings.map(t => (
              <option key={t.id} value={t.id}>
                {t.theme ?? 'Entraînement'} · {formatDateShort(t.date)}
              </option>
            ))}
          </Select>
        )}

        <Textarea
          label="Question"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ex. Serez-vous présent au match du 15/05 ?"
          rows={2}
        />

        <Input
          label="Date limite de réponse"
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
          Notifier les familles à l'ouverture
        </label>
      </div>
    </Dialog>
  );
}
