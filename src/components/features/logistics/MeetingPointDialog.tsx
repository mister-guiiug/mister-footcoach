import { useState } from 'react';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { Input, Textarea } from '../../ui/Input';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useAppContext } from '../../../store/AppContext';
import type { Match } from '../../../types';
import { useI18n } from '../../../i18n';

interface MeetingPointDialogProps {
  open: boolean;
  onClose: () => void;
  match: Match;
}

export function MeetingPointDialog({
  open,
  onClose,
  match,
}: MeetingPointDialogProps) {
  const { t } = useI18n();
  const { dispatch } = useAppContext();
  const [address, setAddress] = useState(match.meetingAddress ?? '');
  const [time, setTime] = useState(match.meetingTime ?? '');
  const [note, setNote] = useState(match.meetingNote ?? '');

  function handleSubmit() {
    dispatch({
      type: 'UPDATE_MATCH',
      match: {
        ...match,
        meetingAddress: address.trim() || undefined,
        meetingTime: time || undefined,
        meetingNote: note.trim() || undefined,
      },
    });
    dispatch({
      type: 'NOTIFY',
      teamId: match.teamId,
      notifType: 'point_rdv_modifie',
      message: t('notifications.msg.meetingUpdated', {
        sign: match.isHome ? 'vs' : '@',
        opponent: match.opponent,
      }),
      relatedId: match.id,
      relatedType: 'match',
    });
    onClose();
  }

  function handleClear() {
    dispatch({
      type: 'UPDATE_MATCH',
      match: {
        ...match,
        meetingAddress: undefined,
        meetingTime: undefined,
        meetingNote: undefined,
      },
    });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('meeting.title')}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleClear} className="flex-1">
            {t('meeting.clear')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input
          label={t('meeting.time')}
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
        />
        <Textarea
          label={t('meeting.address')}
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder={t('meeting.addressPlaceholder')}
          rows={2}
        />
        <Textarea
          label={t('meeting.note')}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t('meeting.notePlaceholder')}
          rows={2}
        />
      </div>
    </Sheet>
  );
}
