import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Input, Select, Textarea } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { useTeams, useAppContext } from '../../../store/AppContext';
import type { Tournament, TournamentFormat } from '../../../types';
import { genId } from '../../../utils/id';
import { today } from '../../../utils/date';
import { useI18n } from '../../../i18n';

interface TournamentFormDialogProps {
  open: boolean;
  onClose: () => void;
  tournament?: Tournament;
  onSaved?: (tournamentId: string) => void;
}

export function TournamentFormDialog({
  open,
  onClose,
  tournament,
  onSaved,
}: TournamentFormDialogProps) {
  const { t } = useI18n();
  const teams = useTeams();
  const { state, dispatch } = useAppContext();
  const isEdit = Boolean(tournament);

  const [form, setForm] = useState(() => ({
    name: tournament?.name ?? '',
    dateStart: tournament?.dateStart ?? today(),
    dateEnd: tournament?.dateEnd ?? '',
    location: tournament?.location ?? '',
    address: tournament?.address ?? '',
    organizer: tournament?.organizer ?? '',
    isOrganizedByClub: tournament?.isOrganizedByClub ?? false,
    teamIds: tournament?.teamIds ?? (teams[0] ? [teams[0].id] : []),
    invitedTeams: (tournament?.invitedTeams ?? []).join(', '),
    format: tournament?.format ?? ('poules_finale' as TournamentFormat),
    status: tournament?.status ?? 'planifie',
  }));
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function toggleTeam(id: string) {
    setForm(f => ({
      ...f,
      teamIds: f.teamIds.includes(id)
        ? f.teamIds.filter(t => t !== id)
        : [...f.teamIds, id],
    }));
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError(t('tournaments.form.nameRequired'));
      return;
    }
    if (form.teamIds.length === 0) {
      setError(t('tournaments.form.atLeastOneTeam'));
      return;
    }

    const id = tournament?.id ?? genId('tournament');
    const saved: Tournament = {
      id,
      seasonId: tournament?.seasonId ?? state.season.id,
      name: form.name.trim(),
      dateStart: form.dateStart,
      dateEnd: form.dateEnd || undefined,
      location: form.location.trim(),
      address: form.address.trim(),
      organizer: form.organizer.trim() || 'FC Exemple',
      isOrganizedByClub: form.isOrganizedByClub,
      teamIds: form.teamIds,
      invitedTeams: form.isOrganizedByClub
        ? form.invitedTeams
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        : undefined,
      format: form.format,
      status: form.status,
    };

    dispatch({
      type: isEdit ? 'UPDATE_TOURNAMENT' : 'ADD_TOURNAMENT',
      tournament: saved,
    });
    for (const tid of saved.teamIds) {
      dispatch({
        type: 'NOTIFY',
        teamId: tid,
        notifType: isEdit ? 'tournoi_modifie' : 'tournoi_nouveau',
        message: t(
          isEdit
            ? 'notifications.msg.tournamentModified'
            : 'notifications.msg.tournamentNew',
          { name: saved.name, date: saved.dateStart }
        ),
        relatedId: id,
        relatedType: 'tournament',
      });
    }
    onSaved?.(id);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t(
        isEdit ? 'tournaments.form.editTitle' : 'tournaments.form.newTitle'
      )}
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
          label={t('tournaments.form.name')}
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder={t('tournaments.form.namePlaceholder')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('tournaments.form.dateStart')}
            type="date"
            value={form.dateStart}
            onChange={e => set('dateStart', e.target.value)}
          />
          <Input
            label={t('tournaments.form.dateEnd')}
            type="date"
            value={form.dateEnd}
            onChange={e => set('dateEnd', e.target.value)}
          />
        </div>

        <Input
          label={t('tournaments.form.location')}
          value={form.location}
          onChange={e => set('location', e.target.value)}
          placeholder={t('tournaments.form.locationPlaceholder')}
        />
        <Textarea
          label={t('tournaments.form.address')}
          value={form.address}
          onChange={e => set('address', e.target.value)}
          rows={2}
        />
        <Input
          label={t('tournaments.form.organizer')}
          value={form.organizer}
          onChange={e => set('organizer', e.target.value)}
        />

        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={form.isOrganizedByClub}
            onChange={e => set('isOrganizedByClub', e.target.checked)}
            className="h-4 w-4 rounded border-border-ui text-primary"
          />
          {t('tournaments.form.organizedByClub')}
        </label>

        {form.isOrganizedByClub && (
          <Input
            label={t('tournaments.form.invitedTeams')}
            value={form.invitedTeams}
            onChange={e => set('invitedTeams', e.target.value)}
            placeholder={t('tournaments.form.invitedPlaceholder')}
          />
        )}

        <div>
          <p className="mb-1 text-xs font-medium text-fg-muted">
            {t('tournaments.form.participatingTeams')}
          </p>
          <div className="flex flex-wrap gap-2">
            {teams.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTeam(t.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  form.teamIds.includes(t.id)
                    ? 'border-primary bg-primary-subtle text-primary'
                    : 'border-border-ui text-fg-muted hover:bg-surface-muted'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t('tournaments.form.format')}
            value={form.format}
            onChange={e => set('format', e.target.value as TournamentFormat)}
          >
            {(
              [
                'poules',
                'elimination_directe',
                'poules_finale',
              ] as TournamentFormat[]
            ).map(f => (
              <option key={f} value={f}>
                {t(`tournamentFormat.${f}`)}
              </option>
            ))}
          </Select>
          <Select
            label={t('tournaments.form.status')}
            value={form.status}
            onChange={e =>
              set('status', e.target.value as Tournament['status'])
            }
          >
            <option value="planifie">{t('tournamentStatus.planifie')}</option>
            <option value="en_cours">{t('tournamentStatus.en_cours')}</option>
            <option value="termine">{t('tournamentStatus.termine')}</option>
          </Select>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Dialog>
  );
}
