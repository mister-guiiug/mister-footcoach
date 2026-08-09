import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useAppContext } from '../../../store/AppContext';
import type { TournamentGroup } from '../../../types';
import { genId } from '../../../utils/id';
import { useI18n } from '../../../i18n';

interface TournamentGroupFormDialogProps {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  nextOrder: number;
}

export function TournamentGroupFormDialog({
  open,
  onClose,
  tournamentId,
  nextOrder,
}: TournamentGroupFormDialogProps) {
  const { t } = useI18n();
  const { dispatch } = useAppContext();
  const [name, setName] = useState('');
  const [type, setType] = useState<TournamentGroup['type']>('poule');
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!name.trim()) {
      setError(t('tournaments.group.nameRequired'));
      return;
    }
    const group: TournamentGroup = {
      id: genId('group'),
      tournamentId,
      name: name.trim(),
      type,
      order: nextOrder,
    };
    dispatch({ type: 'ADD_TOURNAMENT_GROUP', group });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('tournaments.group.title')}
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
        <Input
          label={t('tournaments.group.name')}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('tournaments.group.namePlaceholder')}
        />
        <Select
          label={t('tournaments.group.type')}
          value={type}
          onChange={e => setType(e.target.value as TournamentGroup['type'])}
        >
          <option value="poule">{t('tournaments.group.typePoule')}</option>
          <option value="elimination">
            {t('tournaments.group.typeElimination')}
          </option>
        </Select>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Dialog>
  );
}
