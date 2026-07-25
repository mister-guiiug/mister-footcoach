import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select, Textarea } from '../../ui/Input';
import { Button } from '../../ui/Button';
import {
  useTeams,
  useClubSettings,
  useAppContext,
} from '../../../store/AppContext';
import { type Match, type MatchStatus, type Survey } from '../../../types';
import { genId } from '../../../utils/id';
import { today, formatDateShort } from '../../../utils/date';
import { CURRENT_USER_ID } from '../../../constants/session';
import { useI18n } from '../../../i18n';

interface MatchFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Preselected team for a new match. */
  teamId?: string;
  /** When provided, the dialog edits this match instead of creating one. */
  match?: Match;
  onSaved?: (matchId: string) => void;
}

const STATUS_OPTIONS: MatchStatus[] = [
  'previsionnel',
  'engage',
  'saison',
  'tournoi',
  'annule',
];

export function MatchFormDialog({
  open,
  onClose,
  teamId,
  match,
  onSaved,
}: MatchFormDialogProps) {
  const { t } = useI18n();
  const teams = useTeams();
  const clubSettings = useClubSettings();
  const { state, dispatch } = useAppContext();
  const isEdit = Boolean(match);
  const [createSurvey, setCreateSurvey] = useState(
    clubSettings.autoSurveyOnMatch
  );

  const [form, setForm] = useState(() => ({
    teamId: match?.teamId ?? teamId ?? teams[0]?.id ?? '',
    date: match?.date ?? today(),
    time: match?.time ?? '10:00',
    opponent: match?.opponent ?? '',
    location: match?.location ?? '',
    address: match?.address ?? '',
    isHome: match?.isHome ?? true,
    status: match?.status ?? ('engage' as MatchStatus),
    phase: match?.phase ?? 'Championnat',
  }));
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.opponent.trim()) {
      setError(t('matches.form.opponentRequired'));
      return;
    }
    if (!form.location.trim()) {
      setError(t('matches.form.locationRequired'));
      return;
    }

    const id = match?.id ?? genId('match');
    const saved: Match = {
      id,
      teamId: form.teamId,
      seasonId: match?.seasonId ?? state.season.id,
      tournamentId: match?.tournamentId,
      date: form.date,
      time: form.time,
      location: form.location.trim(),
      address: form.address.trim(),
      isHome: form.isHome,
      opponent: form.opponent.trim(),
      status: form.status,
      phase: form.phase.trim() || 'Championnat',
      scoreHome: match?.scoreHome,
      scoreAway: match?.scoreAway,
      note: match?.note,
      liveActive: match?.liveActive ?? false,
      meetingAddress: match?.meetingAddress,
      meetingTime: match?.meetingTime,
      meetingNote: match?.meetingNote,
    };

    dispatch({ type: isEdit ? 'UPDATE_MATCH' : 'ADD_MATCH', match: saved });
    dispatch({
      type: 'NOTIFY',
      teamId: saved.teamId,
      notifType: isEdit ? 'match_modifie' : 'match_nouveau',
      message: isEdit
        ? t('notifications.msg.matchModified', {
            sign: form.isHome ? 'vs' : '@',
            opponent: saved.opponent,
            date: saved.date,
            time: saved.time,
          })
        : t('notifications.msg.matchNew', {
            sign: form.isHome ? 'vs' : '@',
            opponent: saved.opponent,
            date: saved.date,
            time: saved.time,
          }),
      relatedId: id,
      relatedType: 'match',
    });

    // Auto-create a presence survey for the match (RG-SONDAGE-04).
    if (!isEdit && createSurvey) {
      const survey: Survey = {
        id: genId('survey'),
        teamId: saved.teamId,
        sessionType: 'match',
        sessionId: id,
        question: t('surveys.defaultQuestion.match', {
          sign: form.isHome ? 'vs' : '@',
          opponent: saved.opponent,
          date: formatDateShort(saved.date),
        }),
        deadline: saved.date,
        status: 'ouvert',
        sendNotification: true,
        createdBy: CURRENT_USER_ID,
      };
      dispatch({ type: 'ADD_SURVEY', survey });
      dispatch({
        type: 'NOTIFY',
        teamId: saved.teamId,
        notifType: 'sondage_nouveau',
        message: t('notifications.msg.surveyNew', {
          question: survey.question,
        }),
        relatedId: survey.id,
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
      title={t(isEdit ? 'matches.form.editTitle' : 'matches.form.newTitle')}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {t(isEdit ? 'common.save' : 'common.create')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Select
          label={t('matches.form.team')}
          value={form.teamId}
          onChange={e => set('teamId', e.target.value)}
        >
          {teams.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>

        <Input
          label={t('matches.form.opponent')}
          value={form.opponent}
          onChange={e => set('opponent', e.target.value)}
          placeholder={t('matches.form.opponentPlaceholder')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('matches.form.date')}
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
          <Input
            label={t('matches.form.time')}
            type="time"
            value={form.time}
            onChange={e => set('time', e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {([true, false] as const).map(home => (
            <button
              key={String(home)}
              type="button"
              onClick={() => set('isHome', home)}
              className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                form.isHome === home
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border-ui text-fg-muted hover:bg-surface-muted'
              }`}
            >
              {home ? t('matches.home') : t('matches.away')}
            </button>
          ))}
        </div>

        <Input
          label={t('matches.form.locationLabel')}
          value={form.location}
          onChange={e => set('location', e.target.value)}
          placeholder={t('matches.form.locationPlaceholder')}
        />
        <Textarea
          label={t('matches.form.address')}
          value={form.address}
          onChange={e => set('address', e.target.value)}
          placeholder={t('matches.form.addressPlaceholder')}
          rows={2}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t('matches.form.status')}
            value={form.status}
            onChange={e => set('status', e.target.value as MatchStatus)}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>
                {t(`matchStatus.${s}`)}
              </option>
            ))}
          </Select>
          <Input
            label={t('matches.form.phase')}
            value={form.phase}
            onChange={e => set('phase', e.target.value)}
            placeholder={t('matches.form.phasePlaceholder')}
          />
        </div>

        {!isEdit && (
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={createSurvey}
              onChange={e => setCreateSurvey(e.target.checked)}
              className="h-4 w-4 rounded border-border-ui text-primary"
            />
            {t('matches.form.createSurvey')}
          </label>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Dialog>
  );
}
