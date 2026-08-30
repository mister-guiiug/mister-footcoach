import { useState } from 'react';
import { Sheet } from '@mister-guiiug/dev-wpa-config/react/sheet';
import { Input, Select, Textarea } from '../../ui/Input';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { useAppContext } from '../../../store/AppContext';
import { type Exercise, type ExerciseCategory } from '../../../types';
import { useI18n } from '../../../i18n';
import { genId } from '../../../utils/id';

interface ExerciseFormDialogProps {
  open: boolean;
  onClose: () => void;
  exercise?: Exercise;
  onSaved?: (exerciseId: string) => void;
}

const CATEGORIES: ExerciseCategory[] = [
  'echauffement',
  'technique',
  'physique',
  'tactique',
  'jeu',
  'retour_au_calme',
];

export function ExerciseFormDialog({
  open,
  onClose,
  exercise,
  onSaved,
}: ExerciseFormDialogProps) {
  const { t } = useI18n();
  const { dispatch } = useAppContext();
  const isEdit = Boolean(exercise);

  const [form, setForm] = useState(() => ({
    title: exercise?.title ?? '',
    description: exercise?.description ?? '',
    category: exercise?.category ?? ('technique' as ExerciseCategory),
    suggestedDuration: exercise?.suggestedDuration?.toString() ?? '',
    tags: exercise?.tags.join(', ') ?? '',
  }));
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (form.title.trim().length < 2) {
      setError(t('exercises.form.titleTooShort'));
      return;
    }

    const id = exercise?.id ?? genId('exercise');
    const saved: Exercise = {
      id,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      suggestedDuration: form.suggestedDuration
        ? Number(form.suggestedDuration)
        : undefined,
      tags: form.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    };

    dispatch({
      type: isEdit ? 'UPDATE_EXERCISE' : 'ADD_EXERCISE',
      exercise: saved,
    });
    onSaved?.(id);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t(isEdit ? 'exercises.form.editTitle' : 'exercises.form.newTitle')}
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
        <Input
          label={t('exercises.form.title')}
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder={t('exercises.form.titlePlaceholder')}
        />
        <Textarea
          label={t('exercises.form.description')}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          rows={3}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t('exercises.form.category')}
            value={form.category}
            onChange={e => set('category', e.target.value as ExerciseCategory)}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {t(`exerciseCategory.${c}`)}
              </option>
            ))}
          </Select>
          <Input
            label={t('exercises.form.suggestedDuration')}
            type="number"
            min={0}
            value={form.suggestedDuration}
            onChange={e => set('suggestedDuration', e.target.value)}
          />
        </div>
        <Input
          label={t('exercises.form.tags')}
          value={form.tags}
          onChange={e => set('tags', e.target.value)}
          placeholder={t('exercises.form.tagsPlaceholder')}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Sheet>
  );
}
