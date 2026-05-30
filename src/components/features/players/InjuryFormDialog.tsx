import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select, Textarea } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useAppContext, useUnavailabilities } from '../../../store/AppContext';
import {
  INJURY_STATUS_LABELS,
  type Player,
  type Injury,
  type InjuryStatus,
  type Unavailability,
} from '../../../types';
import { genId } from '../../../utils/id';
import { today } from '../../../utils/date';
import { CURRENT_USER_ID } from '../../../constants/session';

interface InjuryFormDialogProps {
  open: boolean;
  onClose: () => void;
  player: Player;
  injury?: Injury;
}

const ZONES = [
  'cheville',
  'genou',
  'cuisse',
  'ischio-jambier',
  'dos',
  'épaule',
  'tête',
  'autre',
];

const STATUSES = Object.keys(INJURY_STATUS_LABELS) as InjuryStatus[];

export function InjuryFormDialog({
  open,
  onClose,
  player,
  injury,
}: InjuryFormDialogProps) {
  const { dispatch } = useAppContext();
  const unavailabilities = useUnavailabilities(player.id);
  const isEdit = Boolean(injury);

  const [form, setForm] = useState(() => ({
    zone: injury?.zone ?? 'cheville',
    nature: injury?.nature ?? '',
    startDate: injury?.startDate ?? today(),
    estimatedReturnDate: injury?.estimatedReturnDate ?? '',
    actualReturnDate: injury?.actualReturnDate ?? '',
    status: injury?.status ?? ('en_reeduc' as InjuryStatus),
    noteCoach: injury?.noteCoach ?? '',
  }));
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.nature.trim()) {
      setError('La nature de la blessure est obligatoire.');
      return;
    }

    const id = injury?.id ?? genId('injury');
    const becomingApt = form.status === 'apte';
    const actualReturnDate = becomingApt
      ? form.actualReturnDate || today()
      : form.actualReturnDate || undefined;

    const saved: Injury = {
      id,
      playerId: player.id,
      zone: form.zone,
      nature: form.nature.trim(),
      startDate: form.startDate,
      estimatedReturnDate: form.estimatedReturnDate || undefined,
      actualReturnDate,
      status: form.status,
      noteCoach: form.noteCoach.trim() || undefined,
    };

    if (isEdit) {
      dispatch({ type: 'UPDATE_INJURY', injury: saved });
      // RG-BLESS-02 — going "apte" closes the linked unavailability.
      if (becomingApt) {
        const linked = unavailabilities.find(
          u => u.injuryId === id && !u.endDate
        );
        if (linked) {
          dispatch({
            type: 'UPDATE_UNAVAILABILITY',
            unavailability: { ...linked, endDate: actualReturnDate },
          });
        }
      }
    } else {
      dispatch({ type: 'ADD_INJURY', injury: saved });
      // RG-BLESS-01 — creating an injury creates a linked unavailability.
      const unavailability: Unavailability = {
        id: genId('unavail'),
        playerId: player.id,
        startDate: saved.startDate,
        endDate: becomingApt ? actualReturnDate : undefined,
        motif: 'blessure',
        declaredBy: CURRENT_USER_ID,
        injuryId: id,
      };
      dispatch({ type: 'ADD_UNAVAILABILITY', unavailability });
      dispatch({
        type: 'NOTIFY',
        teamId: player.primaryTeamId,
        notifType: 'blessure_declaree',
        message: `Blessure déclarée pour ${player.firstName} ${player.lastName} (${form.zone}).`,
        relatedId: player.id,
        relatedType: 'player',
      });
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Suivi de blessure' : 'Déclarer une blessure'}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {isEdit ? 'Enregistrer' : 'Déclarer'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="rounded-xl bg-surface-muted p-2.5 text-xs text-fg-muted">
          Données sportives uniquement (disponibilité, précautions). Aucune
          donnée médicale ne doit être saisie.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Zone"
            value={form.zone}
            onChange={e => set('zone', e.target.value)}
          >
            {ZONES.map(z => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>
          <Input
            label="Nature"
            value={form.nature}
            onChange={e => set('nature', e.target.value)}
            placeholder="Ex. entorse"
            maxLength={100}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date de survenue"
            type="date"
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)}
          />
          <Input
            label="Reprise estimée"
            type="date"
            value={form.estimatedReturnDate}
            onChange={e => set('estimatedReturnDate', e.target.value)}
          />
        </div>

        <Select
          label="Statut"
          value={form.status}
          onChange={e => set('status', e.target.value as InjuryStatus)}
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {INJURY_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>

        {form.status === 'apte' && (
          <Input
            label="Date de reprise effective"
            type="date"
            value={form.actualReturnDate}
            onChange={e => set('actualReturnDate', e.target.value)}
          />
        )}

        <Textarea
          label="Note coach (invisible pour le parent)"
          value={form.noteCoach}
          onChange={e => set('noteCoach', e.target.value)}
          rows={2}
        />

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Dialog>
  );
}
