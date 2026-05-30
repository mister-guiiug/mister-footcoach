import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select, Textarea } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useAppContext } from '../../../store/AppContext';
import {
  EXERCISE_CATEGORY_LABELS,
  type Exercise,
  type ExerciseCategory,
} from '../../../types';
import { genId } from '../../../utils/id';

interface ExerciseFormDialogProps {
  open: boolean;
  onClose: () => void;
  exercise?: Exercise;
  onSaved?: (exerciseId: string) => void;
}

const CATEGORIES = Object.keys(EXERCISE_CATEGORY_LABELS) as ExerciseCategory[];

export function ExerciseFormDialog({
  open,
  onClose,
  exercise,
  onSaved,
}: ExerciseFormDialogProps) {
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
      setError('Le titre doit comporter au moins 2 caractères.');
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
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Modifier l'exercice" : 'Nouvel exercice'}
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
        <Input
          label="Titre"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Ex. Jeu de passes 3 contre 1"
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          rows={3}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Catégorie"
            value={form.category}
            onChange={e => set('category', e.target.value as ExerciseCategory)}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {EXERCISE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
          <Input
            label="Durée suggérée (min)"
            type="number"
            min={0}
            value={form.suggestedDuration}
            onChange={e => set('suggestedDuration', e.target.value)}
          />
        </div>
        <Input
          label="Tags (séparés par des virgules)"
          value={form.tags}
          onChange={e => set('tags', e.target.value)}
          placeholder="passes, technique, pression"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Dialog>
  );
}
