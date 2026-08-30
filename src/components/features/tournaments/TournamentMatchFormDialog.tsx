import { useState } from 'react';
import { Sheet } from '@mister-guiiug/dev-wpa-config/react/sheet';
import { Input, Select } from '../../ui/Input';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { useTeams, useAppContext } from '../../../store/AppContext';
import type { Match, Tournament, TournamentGroup } from '../../../types';
import { genId } from '../../../utils/id';
import { useI18n } from '../../../i18n';

interface TournamentMatchFormDialogProps {
  open: boolean;
  onClose: () => void;
  tournament: Tournament;
  group: TournamentGroup;
  /** When set, edits the match (and its score) instead of creating one. */
  match?: Match;
}

export function TournamentMatchFormDialog({
  open,
  onClose,
  tournament,
  group,
  match,
}: TournamentMatchFormDialogProps) {
  const { t } = useI18n();
  const allTeams = useTeams();
  const { dispatch } = useAppContext();
  const isEdit = Boolean(match);

  const eligibleTeams = allTeams.filter(t => tournament.teamIds.includes(t.id));

  const [form, setForm] = useState(() => ({
    teamId: match?.teamId ?? eligibleTeams[0]?.id ?? '',
    opponent: match?.opponent ?? '',
    time: match?.time ?? '',
    field: match?.field ?? '',
    scoreHome: match?.scoreHome?.toString() ?? '',
    scoreAway: match?.scoreAway?.toString() ?? '',
  }));
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.opponent.trim()) {
      setError(t('tournaments.match.opponentRequired'));
      return;
    }
    const hasScore = form.scoreHome !== '' && form.scoreAway !== '';
    const id = match?.id ?? genId('match');
    const saved: Match = {
      id,
      teamId: form.teamId,
      seasonId: tournament.seasonId,
      tournamentId: tournament.id,
      tournamentGroupId: group.id,
      date: match?.date ?? tournament.dateStart,
      time: form.time || '00:00',
      field: form.field.trim() || undefined,
      location: match?.location ?? tournament.location,
      address: match?.address ?? tournament.address,
      isHome: true, // club team treated as home for score mapping
      opponent: form.opponent.trim(),
      status: 'tournoi',
      phase: group.name,
      scoreHome: hasScore ? Number(form.scoreHome) : undefined,
      scoreAway: hasScore ? Number(form.scoreAway) : undefined,
      liveActive: false,
    };

    dispatch({ type: isEdit ? 'UPDATE_MATCH' : 'ADD_MATCH', match: saved });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? t('tournaments.match.editTitle')
          : t('tournaments.match.newTitle', { group: group.name })
      }
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {t(isEdit ? 'common.save' : 'common.add')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Select
          label={t('tournaments.match.ourTeam')}
          value={form.teamId}
          onChange={e => set('teamId', e.target.value)}
        >
          {eligibleTeams.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Input
          label={t('tournaments.match.opponent')}
          value={form.opponent}
          onChange={e => set('opponent', e.target.value)}
          placeholder={t('tournaments.match.opponentPlaceholder')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('tournaments.match.time')}
            type="time"
            value={form.time}
            onChange={e => set('time', e.target.value)}
          />
          {tournament.isOrganizedByClub && (
            <Input
              label={t('tournaments.match.field')}
              value={form.field}
              onChange={e => set('field', e.target.value)}
              placeholder={t('tournaments.match.fieldPlaceholder')}
            />
          )}
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-fg-muted">
            {t('tournaments.match.scoreHint')}
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={form.scoreHome}
              onChange={e => set('scoreHome', e.target.value)}
              aria-label={t('tournaments.match.scoreHomeAria')}
              className="text-center"
            />
            <span className="text-fg-muted">-</span>
            <Input
              type="number"
              min={0}
              value={form.scoreAway}
              onChange={e => set('scoreAway', e.target.value)}
              aria-label={t('tournaments.match.scoreAwayAria')}
              className="text-center"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Sheet>
  );
}
