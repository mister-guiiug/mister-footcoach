import { useState } from 'react';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { Input, Select, Textarea } from '../../ui/Input';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
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
import { useI18n } from '../../../i18n';

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
] as const;

const STATUSES = Object.keys(INJURY_STATUS_LABELS) as InjuryStatus[];

export function InjuryFormDialog({
  open,
  onClose,
  player,
  injury,
}: InjuryFormDialogProps) {
  const { t } = useI18n();
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
      setError(t('injury.natureRequired'));
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
        message: t('notifications.msg.injuryDeclared', {
          name: `${player.firstName} ${player.lastName}`,
          zone: form.zone,
        }),
        relatedId: player.id,
        relatedType: 'player',
      });
    }
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t(isEdit ? 'injury.trackTitle' : 'injury.declareTitle')}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {t(isEdit ? 'common.save' : 'common.declare')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="rounded-xl bg-surface-muted p-2.5 text-xs text-fg-muted">
          {t('injury.dataNotice')}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t('injury.zone')}
            value={form.zone}
            onChange={e => set('zone', e.target.value)}
          >
            {ZONES.map(z => (
              <option key={z} value={z}>
                {t(`injury.zoneOptions.${z}`)}
              </option>
            ))}
          </Select>
          <Input
            label={t('injury.nature')}
            value={form.nature}
            onChange={e => set('nature', e.target.value)}
            placeholder={t('injury.naturePlaceholder')}
            maxLength={100}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('injury.startDate')}
            type="date"
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)}
          />
          <Input
            label={t('injury.estimatedReturn')}
            type="date"
            value={form.estimatedReturnDate}
            onChange={e => set('estimatedReturnDate', e.target.value)}
          />
        </div>

        <Select
          label={t('injury.status')}
          value={form.status}
          onChange={e => set('status', e.target.value as InjuryStatus)}
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {t(`injuryStatus.${s}`)}
            </option>
          ))}
        </Select>

        {form.status === 'apte' && (
          <Input
            label={t('injury.effectiveReturn')}
            type="date"
            value={form.actualReturnDate}
            onChange={e => set('actualReturnDate', e.target.value)}
          />
        )}

        <Textarea
          label={t('injury.noteCoach')}
          value={form.noteCoach}
          onChange={e => set('noteCoach', e.target.value)}
          rows={2}
        />

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Sheet>
  );
}
