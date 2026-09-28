import { useState } from 'react';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Input } from '../../ui/Input';
import { useAppContext, useCurrentUser } from '../../../store/AppContext';
import type { Team } from '../../../types';
import { genId } from '../../../utils/id';
import { useI18n } from '../../../i18n';

/** La couleur d'une équipe neuve : lisible sur fond clair comme sombre. */
const DEFAULT_TEAM_COLOR = '#16a34a';

interface TeamFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Absente : création. Présente : on la renomme ou on la recolore. */
  team?: Team;
  onSaved?: (teamId: string) => void;
}

/**
 * Créer ou modifier une équipe. Relevé du 25/09/2026 : rien ne le permettait,
 * et l'app restait aux deux équipes U13 fictives du jeu de démonstration.
 *
 * Une équipe neuve rejoint la saison en cours et a pour entraîneur
 * l'utilisateur qui la crée. En mode connecté, la RLS réserve l'écriture des
 * équipes aux administrateurs du club : une création refusée est annulée et
 * signalée, comme toute écriture refusée (`SupabaseAppProvider`).
 */
export function TeamFormDialog({
  open,
  onClose,
  team,
  onSaved,
}: TeamFormDialogProps) {
  const { t } = useI18n();
  const { state, dispatch } = useAppContext();
  const currentUser = useCurrentUser();
  const isEdit = Boolean(team);

  const [form, setForm] = useState(() => ({
    name: team?.name ?? '',
    category: team?.category ?? '',
    color: team?.color ?? DEFAULT_TEAM_COLOR,
  }));
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.category.trim()) {
      setError(t('teams.form.required'));
      return;
    }
    const id = team?.id ?? genId('team');
    const saved: Team = {
      id,
      name: form.name.trim(),
      category: form.category.trim(),
      color: form.color,
      coachId: team?.coachId ?? currentUser?.id ?? '',
      seasonId: team?.seasonId ?? state.season.id,
    };
    dispatch({ type: isEdit ? 'UPDATE_TEAM' : 'ADD_TEAM', team: saved });
    onSaved?.(id);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t(isEdit ? 'teams.form.editTitle' : 'teams.form.newTitle')}
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
          label={t('teams.form.name')}
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder={t('teams.form.namePlaceholder')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('teams.form.category')}
            value={form.category}
            onChange={e => set('category', e.target.value)}
            placeholder={t('teams.form.categoryPlaceholder')}
          />
          <Input
            label={t('teams.form.color')}
            type="color"
            value={form.color}
            onChange={e => set('color', e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Sheet>
  );
}
