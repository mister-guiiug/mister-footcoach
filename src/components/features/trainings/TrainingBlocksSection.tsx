import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardHeader } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { Input, Select, Textarea } from '../../ui/Input';
import {
  useTrainingBlocks,
  useExercises,
  useAppContext,
} from '../../../store/AppContext';
import type { TrainingBlock } from '../../../types';
import { genId } from '../../../utils/id';
import { useI18n } from '../../../i18n';

interface TrainingBlocksSectionProps {
  trainingId: string;
}

export function TrainingBlocksSection({
  trainingId,
}: TrainingBlocksSectionProps) {
  const { t } = useI18n();
  const blocks = useTrainingBlocks(trainingId);
  const { dispatch } = useAppContext();
  const [formOpen, setFormOpen] = useState(false);

  const totalDuration = blocks.reduce((sum, b) => sum + b.duration, 0);

  function persist(next: TrainingBlock[]) {
    // Renumber order to keep it contiguous.
    const renumbered = next.map((b, i) => ({ ...b, order: i + 1 }));
    dispatch({
      type: 'SET_TRAINING_BLOCKS',
      trainingId,
      blocks: renumbered,
    });
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    persist(next);
  }

  function remove(id: string) {
    persist(blocks.filter(b => b.id !== id));
  }

  return (
    <Card>
      <CardHeader
        title={t('trainingBlocks.title')}
        subtitle={
          blocks.length > 0
            ? t('trainingBlocks.totalMin', { count: totalDuration })
            : undefined
        }
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFormOpen(true)}
          >
            <Plus size={14} /> {t('trainingBlocks.addBlock')}
          </Button>
        }
      />

      {formOpen && (
        <BlockFormDialog
          open
          onClose={() => setFormOpen(false)}
          trainingId={trainingId}
          nextOrder={blocks.length + 1}
          onAdd={block => persist([...blocks, block])}
        />
      )}

      {blocks.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('trainingBlocks.empty')}</p>
      ) : (
        <ol className="space-y-2">
          {blocks.map((block, i) => (
            <li
              key={block.id}
              className="flex items-start gap-2 rounded-xl border border-border-ui p-3"
            >
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-primary">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-fg">{block.title}</p>
                  <span className="text-xs text-fg-muted flex-shrink-0">
                    {block.duration} min
                  </span>
                </div>
                {block.description && (
                  <p className="text-xs text-fg-muted mt-0.5">
                    {block.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={t('trainingBlocks.moveUp')}
                  className="flex h-5 w-5 items-center justify-center rounded text-fg-faint hover:text-fg disabled:opacity-30"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === blocks.length - 1}
                  aria-label={t('trainingBlocks.moveDown')}
                  className="flex h-5 w-5 items-center justify-center rounded text-fg-faint hover:text-fg disabled:opacity-30"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <button
                onClick={() => remove(block.id)}
                aria-label={t('trainingBlocks.deleteBlock')}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-faint hover:bg-surface-muted hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

interface BlockFormDialogProps {
  open: boolean;
  onClose: () => void;
  trainingId: string;
  nextOrder: number;
  onAdd: (block: TrainingBlock) => void;
}

function BlockFormDialog({
  open,
  onClose,
  trainingId,
  nextOrder,
  onAdd,
}: BlockFormDialogProps) {
  const { t } = useI18n();
  const exercises = useExercises();
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('15');
  const [description, setDescription] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [error, setError] = useState('');

  function handleExerciseChange(id: string) {
    setExerciseId(id);
    const ex = exercises.find(e => e.id === id);
    if (ex) {
      if (!title.trim()) setTitle(ex.title);
      if (ex.suggestedDuration) setDuration(String(ex.suggestedDuration));
      if (!description.trim() && ex.description) setDescription(ex.description);
    }
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError(t('trainingBlocks.titleRequired'));
      return;
    }
    onAdd({
      id: genId('block'),
      trainingId,
      order: nextOrder,
      duration: Number(duration) || 0,
      title: title.trim(),
      description: description.trim() || undefined,
      exerciseId: exerciseId || undefined,
    });
    setTitle('');
    setDuration('15');
    setDescription('');
    setExerciseId('');
    setError('');
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('trainingBlocks.dialogTitle')}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {t('common.add')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {exercises.length > 0 && (
          <Select
            label={t('trainingBlocks.fromExercise')}
            value={exerciseId}
            onChange={e => handleExerciseChange(e.target.value)}
          >
            <option value="">{t('common.noneMasc')}</option>
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.title}
              </option>
            ))}
          </Select>
        )}
        <Input
          label={t('trainingBlocks.titleLabel')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={t('trainingBlocks.titlePlaceholder')}
        />
        <Input
          label={t('trainingBlocks.duration')}
          type="number"
          min={0}
          value={duration}
          onChange={e => setDuration(e.target.value)}
        />
        <Textarea
          label={t('trainingBlocks.description')}
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Dialog>
  );
}
