import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useTeams, useAppContext } from '../../../store/AppContext';
import { POSITION_LABELS, type Player, type Position } from '../../../types';
import { genId } from '../../../utils/id';

interface PlayerFormDialogProps {
  open: boolean;
  onClose: () => void;
  teamId?: string;
  player?: Player;
  onSaved?: (playerId: string) => void;
}

const POSITIONS = Object.keys(POSITION_LABELS) as Position[];

export function PlayerFormDialog({
  open,
  onClose,
  teamId,
  player,
  onSaved,
}: PlayerFormDialogProps) {
  const teams = useTeams();
  const { dispatch } = useAppContext();
  const isEdit = Boolean(player);

  const [form, setForm] = useState(() => ({
    firstName: player?.firstName ?? '',
    lastName: player?.lastName ?? '',
    dateOfBirth: player?.dateOfBirth ?? '',
    primaryTeamId: player?.primaryTeamId ?? teamId ?? teams[0]?.id ?? '',
    secondaryTeamId: player?.secondaryTeamId ?? '',
    preferredPosition: player?.preferredPosition ?? ('MC' as Position),
    number: player?.number?.toString() ?? '',
  }));
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Le prénom et le nom sont obligatoires.');
      return;
    }
    if (!form.dateOfBirth) {
      setError('La date de naissance est obligatoire.');
      return;
    }

    const id = player?.id ?? genId('player');
    const saved: Player = {
      id,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth,
      primaryTeamId: form.primaryTeamId,
      secondaryTeamId: form.secondaryTeamId || undefined,
      preferredPosition: form.preferredPosition,
      appetences: player?.appetences ?? {},
      number: form.number ? Number(form.number) : undefined,
      active: player?.active ?? true,
    };

    dispatch({ type: isEdit ? 'UPDATE_PLAYER' : 'ADD_PLAYER', player: saved });
    onSaved?.(id);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier le joueur' : 'Nouveau joueur'}
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
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Prénom"
            value={form.firstName}
            onChange={e => set('firstName', e.target.value)}
          />
          <Input
            label="Nom"
            value={form.lastName}
            onChange={e => set('lastName', e.target.value)}
          />
        </div>

        <Input
          label="Date de naissance"
          type="date"
          value={form.dateOfBirth}
          onChange={e => set('dateOfBirth', e.target.value)}
        />

        <Select
          label="Équipe principale"
          value={form.primaryTeamId}
          onChange={e => set('primaryTeamId', e.target.value)}
        >
          {teams.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>

        <Select
          label="Équipe secondaire (renfort)"
          value={form.secondaryTeamId}
          onChange={e => set('secondaryTeamId', e.target.value)}
        >
          <option value="">— Aucune —</option>
          {teams
            .filter(t => t.id !== form.primaryTeamId)
            .map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Poste de prédilection"
            value={form.preferredPosition}
            onChange={e => set('preferredPosition', e.target.value as Position)}
          >
            {POSITIONS.map(p => (
              <option key={p} value={p}>
                {POSITION_LABELS[p]}
              </option>
            ))}
          </Select>
          <Input
            label="Numéro"
            type="number"
            min={1}
            value={form.number}
            onChange={e => set('number', e.target.value)}
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Dialog>
  );
}
