import { useState } from 'react';
import { Sheet } from '@mister-guiiug/dev-wpa-config/react/sheet';
import { Input, Select, Textarea } from '../../ui/Input';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { useTeams, useAppContext } from '../../../store/AppContext';
import { useI18n } from '../../../i18n';
import type { Training, TrainingType } from '../../../types';
import { genId } from '../../../utils/id';
import { today } from '../../../utils/date';
import { generateWeeklyTrainings } from '../../../utils/recurrence';

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
  const { t } = useI18n();
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
    occurrences: 1,
  }));

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    const occurrences = Math.max(1, Number(form.occurrences) || 1);

    // Recurring series (specs §8.2) — generate independent weekly occurrences.
    if (!isEdit && occurrences > 1) {
      const seriesId = genId('series');
      const series = generateWeeklyTrainings(
        {
          teamId: form.teamId,
          date: form.date,
          time: form.time,
          duration: Number(form.duration) || 0,
          type: form.type,
          theme: form.theme.trim() || undefined,
          note: form.note.trim() || undefined,
        },
        occurrences,
        () => genId('training'),
        seriesId
      );
      for (const t of series) {
        dispatch({ type: 'ADD_TRAINING', training: t });
      }
      dispatch({
        type: 'NOTIFY',
        teamId: form.teamId,
        notifType: 'entrainement_nouveau',
        message: t('notifications.msg.trainingSeries', {
          count: occurrences,
          date: form.date,
        }),
        relatedId: series[0]!.id,
        relatedType: 'training',
      });
      onSaved?.(series[0]!.id);
      onClose();
      return;
    }

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
        ? t('notifications.msg.trainingCancelled', { date: saved.date })
        : saved.theme
          ? t('notifications.msg.trainingSingleThemed', {
              date: saved.date,
              time: saved.time,
              theme: saved.theme,
            })
          : t('notifications.msg.trainingSingle', {
              date: saved.date,
              time: saved.time,
            }),
      relatedId: id,
      relatedType: 'training',
    });
    onSaved?.(id);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t(isEdit ? 'trainings.form.editTitle' : 'trainings.form.newTitle')}
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
        <Select
          label={t('trainings.form.team')}
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
            label={t('trainings.form.date')}
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
          <Input
            label={t('trainings.form.time')}
            type="time"
            value={form.time}
            onChange={e => set('time', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('trainings.form.duration')}
            type="number"
            min={0}
            value={form.duration}
            onChange={e => set('duration', Number(e.target.value))}
          />
          <Select
            label={t('trainings.form.type')}
            value={form.type}
            onChange={e => set('type', e.target.value as TrainingType)}
          >
            <option value="regulier">{t('trainings.form.typeRegular')}</option>
            <option value="exceptionnel">
              {t('trainings.form.typeExceptional')}
            </option>
          </Select>
        </div>

        <Input
          label={t('trainings.form.theme')}
          value={form.theme}
          onChange={e => set('theme', e.target.value)}
          placeholder={t('trainings.form.themePlaceholder')}
        />
        <Textarea
          label={t('trainings.form.note')}
          value={form.note}
          onChange={e => set('note', e.target.value)}
          rows={2}
        />

        {!isEdit && (
          <Input
            label={t('trainings.form.repeat')}
            type="number"
            min={1}
            max={30}
            value={form.occurrences}
            onChange={e => set('occurrences', Number(e.target.value))}
          />
        )}

        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={form.cancelled}
              onChange={e => set('cancelled', e.target.checked)}
              className="h-4 w-4 rounded border-border-ui text-primary"
            />
            {t('trainings.form.cancelledCheck')}
          </label>
        )}
      </div>
    </Sheet>
  );
}
