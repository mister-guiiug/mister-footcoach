import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select, Textarea } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useTeams, useAppContext } from '../../../store/AppContext';
import {
  MATCH_STATUS_LABELS,
  type Match,
  type MatchStatus,
} from '../../../types';
import { genId } from '../../../utils/id';
import { today } from '../../../utils/date';

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
  const teams = useTeams();
  const { state, dispatch } = useAppContext();
  const isEdit = Boolean(match);

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
      setError("L'adversaire est obligatoire.");
      return;
    }
    if (!form.location.trim()) {
      setError('Le lieu est obligatoire.');
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
        ? `Match ${form.isHome ? 'vs' : '@'} ${saved.opponent} modifié (${saved.date} à ${saved.time}).`
        : `Nouveau match ${form.isHome ? 'vs' : '@'} ${saved.opponent} le ${saved.date} à ${saved.time}.`,
      relatedId: id,
      relatedType: 'match',
    });
    onSaved?.(id);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier le match' : 'Nouveau match'}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Select
          label="Équipe"
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
          label="Adversaire"
          value={form.opponent}
          onChange={e => set('opponent', e.target.value)}
          placeholder="Ex. FC Rivale"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
          <Input
            label="Heure"
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
              {home ? 'Domicile' : 'Extérieur'}
            </button>
          ))}
        </div>

        <Input
          label="Lieu / terrain"
          value={form.location}
          onChange={e => set('location', e.target.value)}
          placeholder="Ex. Stade municipal"
        />
        <Textarea
          label="Adresse"
          value={form.address}
          onChange={e => set('address', e.target.value)}
          placeholder="Adresse complète pour la navigation GPS"
          rows={2}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Statut"
            value={form.status}
            onChange={e => set('status', e.target.value as MatchStatus)}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>
                {MATCH_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Input
            label="Phase"
            value={form.phase}
            onChange={e => set('phase', e.target.value)}
            placeholder="Ex. Poule A"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Dialog>
  );
}
