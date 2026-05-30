import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select, Textarea } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useAppContext } from '../../../store/AppContext';
import {
  UNAVAILABILITY_MOTIF_LABELS,
  type Player,
  type Unavailability,
  type UnavailabilityMotif,
} from '../../../types';
import { genId } from '../../../utils/id';
import { today } from '../../../utils/date';
import { CURRENT_USER_ID } from '../../../constants/session';

interface UnavailabilityFormDialogProps {
  open: boolean;
  onClose: () => void;
  player: Player;
}

const MOTIFS = Object.keys(
  UNAVAILABILITY_MOTIF_LABELS
) as UnavailabilityMotif[];

export function UnavailabilityFormDialog({
  open,
  onClose,
  player,
}: UnavailabilityFormDialogProps) {
  const { dispatch } = useAppContext();
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState('');
  const [motif, setMotif] = useState<UnavailabilityMotif>('personnel');
  const [note, setNote] = useState('');

  function handleSubmit() {
    const unavailability: Unavailability = {
      id: genId('unavail'),
      playerId: player.id,
      startDate,
      endDate: endDate || undefined,
      motif,
      declaredBy: CURRENT_USER_ID,
      note: note.trim() || undefined,
    };
    dispatch({ type: 'ADD_UNAVAILABILITY', unavailability });
    dispatch({
      type: 'NOTIFY',
      teamId: player.primaryTeamId,
      notifType: 'indispo_declaree',
      message: `Indisponibilité déclarée pour ${player.firstName} ${player.lastName} (${UNAVAILABILITY_MOTIF_LABELS[motif].toLowerCase()}).`,
      relatedId: player.id,
      relatedType: 'player',
    });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Déclarer une indisponibilité"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Déclarer
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Select
          label="Motif"
          value={motif}
          onChange={e => setMotif(e.target.value as UnavailabilityMotif)}
        >
          {MOTIFS.map(m => (
            <option key={m} value={m}>
              {UNAVAILABILITY_MOTIF_LABELS[m]}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date de début"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <Input
            label="Date de fin (optionnel)"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
        <p className="text-xs text-fg-faint">
          Sans date de fin, l'indisponibilité reste active jusqu'à clôture
          manuelle.
        </p>
        <Textarea
          label="Note (visible coach/admin)"
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
        />
      </div>
    </Dialog>
  );
}
