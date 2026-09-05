import { useState } from 'react';
import { Car, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { Badge } from '@mister-guiiug/dev-pwa-config/react/badge';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { Input } from '../../ui/Input';
import {
  useCarpoolOffers,
  usePlayers,
  useAppContext,
} from '../../../store/AppContext';
import type { Match, CarpoolOffer } from '../../../types';
import { genId } from '../../../utils/id';
import { CURRENT_USER_ID } from '../../../constants/session';
import { useI18n } from '../../../i18n';
import { useRemoteWriteGuard } from '../../../hooks/useRemoteWriteGuard';

interface CarpoolSectionProps {
  match: Match;
}

export function CarpoolSection({ match }: CarpoolSectionProps) {
  const { t } = useI18n();
  const offers = useCarpoolOffers(match.id);
  const players = usePlayers(match.teamId);
  const { state, dispatch } = useAppContext();
  const deleteGuard = useRemoteWriteGuard();
  const [formOpen, setFormOpen] = useState(false);

  function conductorName(userId: string): string {
    const user = state.users.find(u => u.id === userId);
    if (user) return `${user.firstName} ${user.lastName}`;
    const contact = state.contacts.find(c => c.userId === userId);
    if (contact) return `${contact.firstName} ${contact.lastName}`;
    return 'Parent';
  }

  function playerName(playerId: string): string {
    const p = players.find(x => x.id === playerId);
    return p ? `${p.firstName} ${p.lastName}` : '?';
  }

  // Players already covered by at least one offer.
  const coveredIds = new Set(offers.flatMap(o => o.playerIds));
  const withoutSolution = players.filter(p => !coveredIds.has(p.id));

  return (
    <Card>
      <CardHeader
        title={t('carpool.title')}
        subtitle={t('carpool.subtitle')}
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFormOpen(true)}
          >
            <Plus size={14} /> {t('carpool.offer')}
          </Button>
        }
      />

      {formOpen && (
        <CarpoolFormDialog
          match={match}
          open
          onClose={() => setFormOpen(false)}
        />
      )}

      {offers.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('carpool.none')}</p>
      ) : (
        <div className="space-y-2">
          {offers.map(offer => {
            const free = Math.max(0, offer.seats - offer.playerIds.length);
            return (
              <div
                key={offer.id}
                className="flex items-start gap-3 rounded-xl border border-border-ui p-3"
              >
                <Car size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-fg">
                      {conductorName(offer.offeredBy)}
                    </p>
                    <Badge tone={free > 0 ? 'success' : 'muted'}>
                      {t(
                        free > 1
                          ? 'carpool.seatsFreePlural'
                          : 'carpool.seatsFree',
                        { count: free }
                      )}
                    </Badge>
                  </div>
                  {(offer.departureLocation || offer.departureTime) && (
                    <p className="text-xs text-fg-muted mt-0.5">
                      {t('carpool.departure', {
                        location: offer.departureLocation ?? '—',
                      })}
                      {offer.departureTime ? ` · ${offer.departureTime}` : ''}
                    </p>
                  )}
                  {offer.playerIds.length > 0 && (
                    <p className="text-xs text-fg-muted mt-0.5">
                      {t('carpool.takesCharge', {
                        names: offer.playerIds.map(playerName).join(', '),
                      })}
                    </p>
                  )}
                </div>
                <button
                  onClick={deleteGuard.wrap(() =>
                    dispatch({
                      type: 'DELETE_CARPOOL_OFFER',
                      offerId: offer.id,
                    })
                  )}
                  {...deleteGuard.iconProps(t('carpool.deleteOffer'))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-faint hover:bg-surface-muted hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {withoutSolution.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 p-3">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            {t('carpool.withoutSolution', { count: withoutSolution.length })}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
            {withoutSolution
              .map(p => `${p.firstName} ${p.lastName}`)
              .join(', ')}
          </p>
        </div>
      )}
    </Card>
  );
}

interface CarpoolFormDialogProps {
  match: Match;
  open: boolean;
  onClose: () => void;
}

function CarpoolFormDialog({ match, open, onClose }: CarpoolFormDialogProps) {
  const { t } = useI18n();
  const players = usePlayers(match.teamId);
  const { dispatch } = useAppContext();
  const [seats, setSeats] = useState('4');
  const [departureLocation, setDepartureLocation] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [playerIds, setPlayerIds] = useState<string[]>([]);

  function togglePlayer(id: string) {
    setPlayerIds(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  }

  function handleSubmit() {
    const offer: CarpoolOffer = {
      id: genId('carpool'),
      matchId: match.id,
      offeredBy: CURRENT_USER_ID,
      seats: Number(seats) || 1,
      departureLocation: departureLocation.trim() || undefined,
      departureTime: departureTime || undefined,
      playerIds,
    };
    dispatch({ type: 'ADD_CARPOOL_OFFER', offer });
    dispatch({
      type: 'NOTIFY',
      teamId: match.teamId,
      notifType: 'covoiturage_nouvelle_offre',
      message: t('notifications.msg.carpoolNew', {
        sign: match.isHome ? 'vs' : '@',
        opponent: match.opponent,
      }),
      relatedId: match.id,
      relatedType: 'match',
    });
    setSeats('4');
    setDepartureLocation('');
    setDepartureTime('');
    setPlayerIds([]);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('carpool.proposeTitle')}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {t('common.propose')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('carpool.seatsAvailable')}
            type="number"
            min={1}
            max={8}
            value={seats}
            onChange={e => setSeats(e.target.value)}
          />
          <Input
            label={t('carpool.departureTime')}
            type="time"
            value={departureTime}
            onChange={e => setDepartureTime(e.target.value)}
          />
        </div>
        <Input
          label={t('carpool.departureLocation')}
          value={departureLocation}
          onChange={e => setDepartureLocation(e.target.value)}
          placeholder={t('carpool.departurePlaceholder')}
        />
        <div>
          <p className="mb-1 text-xs font-medium text-fg-muted">
            {t('carpool.playersCovered')}
          </p>
          <div className="flex flex-wrap gap-2">
            {players.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlayer(p.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  playerIds.includes(p.id)
                    ? 'border-primary bg-primary-subtle text-primary'
                    : 'border-border-ui text-fg-muted hover:bg-surface-muted'
                }`}
              >
                {p.firstName} {p.lastName}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
