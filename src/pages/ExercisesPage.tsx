import { useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '@mister-guiiug/dev-wpa-config/react/badge';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '@mister-guiiug/dev-wpa-config/react/empty-state';
import { ExerciseFormDialog } from '../components/features/exercises/ExerciseFormDialog';
import { useExercises, useAppContext } from '../store/AppContext';
import { type Exercise, type ExerciseCategory } from '../types';
import { useI18n } from '../i18n';

const CATEGORIES: ExerciseCategory[] = [
  'echauffement',
  'technique',
  'physique',
  'tactique',
  'jeu',
  'retour_au_calme',
];

export default function ExercisesPage() {
  const { t } = useI18n();
  const exercises = useExercises();
  const { dispatch } = useAppContext();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | ExerciseCategory
  >('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | undefined>();

  const q = search.trim().toLowerCase();
  const filtered = exercises.filter(ex => {
    if (categoryFilter !== 'all' && ex.category !== categoryFilter)
      return false;
    if (!q) return true;
    return (
      ex.title.toLowerCase().includes(q) ||
      ex.tags.some(t => t.toLowerCase().includes(q)) ||
      t(`exerciseCategory.${ex.category}`).toLowerCase().includes(q)
    );
  });

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(ex: Exercise) {
    setEditing(ex);
    setFormOpen(true);
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg-heading">
          {t('exercises.title')}
        </h1>
        <Button size="sm" onClick={openNew}>
          <Plus size={16} /> {t('common.new')}
        </Button>
      </div>

      {formOpen && (
        <ExerciseFormDialog
          open
          onClose={() => setFormOpen(false)}
          exercise={editing}
        />
      )}

      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint"
        />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('exercises.searchPlaceholder')}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            categoryFilter === 'all'
              ? 'bg-primary text-primary-fg'
              : 'bg-surface border border-border-ui text-fg-muted hover:bg-surface-muted'
          }`}
        >
          {t('exercises.allCategories')}
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === c
                ? 'bg-primary text-primary-fg'
                : 'bg-surface border border-border-ui text-fg-muted hover:bg-surface-muted'
            }`}
          >
            {t(`exerciseCategory.${c}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={t('exercises.none')}
          description={t('exercises.noneDesc')}
          icon={<span className="text-4xl">🏃</span>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(ex => (
            <Card key={ex.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-fg-heading">
                      {ex.title}
                    </h2>
                    <Badge tone="brand">
                      {t(`exerciseCategory.${ex.category}`)}
                    </Badge>
                    {ex.suggestedDuration && (
                      <Badge tone="muted">{ex.suggestedDuration} min</Badge>
                    )}
                  </div>
                  {ex.description && (
                    <p className="text-sm text-fg-muted mt-1">
                      {ex.description}
                    </p>
                  )}
                  {ex.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ex.tags.map(tag => (
                        <span
                          key={tag}
                          className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-fg-muted"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => openEdit(ex)}
                    aria-label={t('common.edit')}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-faint hover:bg-surface-muted hover:text-primary"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() =>
                      dispatch({ type: 'DELETE_EXERCISE', exerciseId: ex.id })
                    }
                    aria-label={t('common.delete')}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-faint hover:bg-surface-muted hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
