import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useTeams, useAppContext } from '../../../store/AppContext';
import type { Match, Tournament, TournamentGroup } from '../../../types';
import { genId } from '../../../utils/id';

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
      setError("L'adversaire est obligatoire.");
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
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Match — score' : `Nouveau match · ${group.name}`}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Select
          label="Notre équipe"
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
          label="Adversaire"
          value={form.opponent}
          onChange={e => set('opponent', e.target.value)}
          placeholder="Ex. AS Martin"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Heure"
            type="time"
            value={form.time}
            onChange={e => set('time', e.target.value)}
          />
          {tournament.isOrganizedByClub && (
            <Input
              label="Terrain"
              value={form.field}
              onChange={e => set('field', e.target.value)}
              placeholder="Ex. Terrain 1"
            />
          )}
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-fg-muted">
            Score (laisser vide si non joué)
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={form.scoreHome}
              onChange={e => set('scoreHome', e.target.value)}
              aria-label="Score notre équipe"
              className="text-center"
            />
            <span className="text-fg-muted">-</span>
            <Input
              type="number"
              min={0}
              value={form.scoreAway}
              onChange={e => set('scoreAway', e.target.value)}
              aria-label="Score adversaire"
              className="text-center"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Dialog>
  );
}
