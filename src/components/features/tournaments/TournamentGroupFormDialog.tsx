import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useAppContext } from '../../../store/AppContext';
import type { TournamentGroup } from '../../../types';
import { genId } from '../../../utils/id';

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
  const { dispatch } = useAppContext();
  const [name, setName] = useState('');
  const [type, setType] = useState<TournamentGroup['type']>('poule');
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!name.trim()) {
      setError('Le nom est obligatoire.');
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
      title="Nouveau groupe"
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
        <Input
          label="Nom"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex. Poule A, Demi-finale"
        />
        <Select
          label="Type"
          value={type}
          onChange={e => setType(e.target.value as TournamentGroup['type'])}
        >
          <option value="poule">Poule</option>
          <option value="elimination">Élimination</option>
        </Select>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Dialog>
  );
}
