import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Textarea } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useAppContext } from '../../../store/AppContext';
import type { Match } from '../../../types';

interface MeetingPointDialogProps {
  open: boolean;
  onClose: () => void;
  match: Match;
}

export function MeetingPointDialog({
  open,
  onClose,
  match,
}: MeetingPointDialogProps) {
  const { dispatch } = useAppContext();
  const [address, setAddress] = useState(match.meetingAddress ?? '');
  const [time, setTime] = useState(match.meetingTime ?? '');
  const [note, setNote] = useState(match.meetingNote ?? '');

  function handleSubmit() {
    dispatch({
      type: 'UPDATE_MATCH',
      match: {
        ...match,
        meetingAddress: address.trim() || undefined,
        meetingTime: time || undefined,
        meetingNote: note.trim() || undefined,
      },
    });
    dispatch({
      type: 'NOTIFY',
      teamId: match.teamId,
      notifType: 'point_rdv_modifie',
      message: `Point de RDV mis à jour pour le match ${match.isHome ? 'vs' : '@'} ${match.opponent}.`,
      relatedId: match.id,
      relatedType: 'match',
    });
    onClose();
  }

  function handleClear() {
    dispatch({
      type: 'UPDATE_MATCH',
      match: {
        ...match,
        meetingAddress: undefined,
        meetingTime: undefined,
        meetingNote: undefined,
      },
    });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Point de rendez-vous"
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleClear} className="flex-1">
            Effacer
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Enregistrer
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input
          label="Heure de rendez-vous"
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
        />
        <Textarea
          label="Adresse"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Ex. Parking du complexe sportif"
          rows={2}
        />
        <Textarea
          label="Note"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ex. Entrée rue du Moulin"
          rows={2}
        />
      </div>
    </Dialog>
  );
}
