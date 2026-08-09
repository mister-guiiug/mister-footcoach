import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useTeams, useAppContext } from '../../../store/AppContext';
import { POSITION_LABELS, type Player, type Position } from '../../../types';
import { genId } from '../../../utils/id';
import { useI18n } from '../../../i18n';

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
  const { t } = useI18n();
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
      setError(t('players.form.namesRequired'));
      return;
    }
    if (!form.dateOfBirth) {
      setError(t('players.form.dobRequired'));
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
      title={t(isEdit ? 'players.form.editTitle' : 'players.form.newTitle')}
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
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('players.form.firstName')}
            value={form.firstName}
            onChange={e => set('firstName', e.target.value)}
          />
          <Input
            label={t('players.form.lastName')}
            value={form.lastName}
            onChange={e => set('lastName', e.target.value)}
          />
        </div>

        <Input
          label={t('players.form.dateOfBirth')}
          type="date"
          value={form.dateOfBirth}
          onChange={e => set('dateOfBirth', e.target.value)}
        />

        <Select
          label={t('players.form.primaryTeam')}
          value={form.primaryTeamId}
          onChange={e => set('primaryTeamId', e.target.value)}
        >
          {teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </Select>

        <Select
          label={t('players.form.secondaryTeam')}
          value={form.secondaryTeamId}
          onChange={e => set('secondaryTeamId', e.target.value)}
        >
          <option value="">{t('common.noneFem')}</option>
          {teams
            .filter(team => team.id !== form.primaryTeamId)
            .map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t('players.form.preferredPosition')}
            value={form.preferredPosition}
            onChange={e => set('preferredPosition', e.target.value as Position)}
          >
            {POSITIONS.map(p => (
              <option key={p} value={p}>
                {t(`position.${p}`)}
              </option>
            ))}
          </Select>
          <Input
            label={t('players.form.number')}
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
