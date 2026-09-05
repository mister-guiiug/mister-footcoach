import { useState } from 'react';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { Input, Select, Textarea } from '../../ui/Input';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useAppContext } from '../../../store/AppContext';
import {
  UNAVAILABILITY_MOTIF_LABELS,
  type Player,
  type Unavailability,
  type UnavailabilityMotif,
} from '../../../types';
import { genId } from '../../../utils/id';
import { today } from '../../../utils/date';
import { CURRENT_USER_ID } from '../../../constants/session';
import { useI18n } from '../../../i18n';

interface UnavailabilityFormDialogProps {
  open: boolean;
  onClose: () => void;
  player: Player;
}

const MOTIFS = Object.keys(
  UNAVAILABILITY_MOTIF_LABELS
) as UnavailabilityMotif[];

export function UnavailabilityFormDialog({
  open,
  onClose,
  player,
}: UnavailabilityFormDialogProps) {
  const { t } = useI18n();
  const { dispatch } = useAppContext();
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState('');
  const [motif, setMotif] = useState<UnavailabilityMotif>('personnel');
  const [note, setNote] = useState('');

  function handleSubmit() {
    const unavailability: Unavailability = {
      id: genId('unavail'),
      playerId: player.id,
      startDate,
      endDate: endDate || undefined,
      motif,
      declaredBy: CURRENT_USER_ID,
      note: note.trim() || undefined,
    };
    dispatch({ type: 'ADD_UNAVAILABILITY', unavailability });
    dispatch({
      type: 'NOTIFY',
      teamId: player.primaryTeamId,
      notifType: 'indispo_declaree',
      message: t('notifications.msg.unavailDeclared', {
        name: `${player.firstName} ${player.lastName}`,
        motif: t(`unavailabilityMotif.${motif}`).toLowerCase(),
      }),
      relatedId: player.id,
      relatedType: 'player',
    });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('unavailability.title')}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {t('common.declare')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Select
          label={t('unavailability.motif')}
          value={motif}
          onChange={e => setMotif(e.target.value as UnavailabilityMotif)}
        >
          {MOTIFS.map(m => (
            <option key={m} value={m}>
              {t(`unavailabilityMotif.${m}`)}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('unavailability.startDate')}
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <Input
            label={t('unavailability.endDate')}
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
        <p className="text-xs text-fg-faint">{t('unavailability.noEndHint')}</p>
        <Textarea
          label={t('unavailability.note')}
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
        />
      </div>
    </Sheet>
  );
}
