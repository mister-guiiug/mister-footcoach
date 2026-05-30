import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select, Textarea } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useTeams, useAppContext } from '../../../store/AppContext';
import type { Training, TrainingType } from '../../../types';
import { genId } from '../../../utils/id';
import { today } from '../../../utils/date';

interface TrainingFormDialogProps {
  open: boolean;
  onClose: () => void;
  teamId?: string;
  training?: Training;
  onSaved?: (trainingId: string) => void;
}

export function TrainingFormDialog({
  open,
  onClose,
  teamId,
  training,
  onSaved,
}: TrainingFormDialogProps) {
  const teams = useTeams();
  const { dispatch } = useAppContext();
  const isEdit = Boolean(training);

  const [form, setForm] = useState(() => ({
    teamId: training?.teamId ?? teamId ?? teams[0]?.id ?? '',
    date: training?.date ?? today(),
    time: training?.time ?? '18:00',
    duration: training?.duration ?? 90,
    type: training?.type ?? ('regulier' as TrainingType),
    theme: training?.theme ?? '',
    note: training?.note ?? '',
    cancelled: training?.cancelled ?? false,
  }));

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    const id = training?.id ?? genId('training');
    const saved: Training = {
      id,
      teamId: form.teamId,
      date: form.date,
      time: form.time,
      duration: Number(form.duration) || 0,
      type: form.type,
      cancelled: form.cancelled,
      theme: form.theme.trim() || undefined,
      note: form.note.trim() || undefined,
      seriesId: training?.seriesId,
    };

    dispatch({
      type: isEdit ? 'UPDATE_TRAINING' : 'ADD_TRAINING',
      training: saved,
    });
    dispatch({
      type: 'NOTIFY',
      teamId: saved.teamId,
      notifType: saved.cancelled
        ? 'entrainement_annule'
        : isEdit
          ? 'entrainement_modifie'
          : saved.type === 'exceptionnel'
            ? 'entrainement_exceptionnel'
            : 'entrainement_nouveau',
      message: saved.cancelled
        ? `Entraînement du ${saved.date} annulé.`
        : `Entraînement du ${saved.date} à ${saved.time}${saved.theme ? ` — ${saved.theme}` : ''}.`,
      relatedId: id,
      relatedType: 'training',
    });
    onSaved?.(id);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Modifier l'entraînement" : 'Nouvel entraînement'}
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

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Durée (min)"
            type="number"
            min={0}
            value={form.duration}
            onChange={e => set('duration', Number(e.target.value))}
          />
          <Select
            label="Type"
            value={form.type}
            onChange={e => set('type', e.target.value as TrainingType)}
          >
            <option value="regulier">Régulier</option>
            <option value="exceptionnel">Exceptionnel</option>
          </Select>
        </div>

        <Input
          label="Thème"
          value={form.theme}
          onChange={e => set('theme', e.target.value)}
          placeholder="Ex. Pressing haut"
        />
        <Textarea
          label="Note / programme"
          value={form.note}
          onChange={e => set('note', e.target.value)}
          rows={2}
        />

        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={form.cancelled}
              onChange={e => set('cancelled', e.target.checked)}
              className="h-4 w-4 rounded border-border-ui text-primary"
            />
            Séance annulée
          </label>
        )}
      </div>
    </Dialog>
  );
}
