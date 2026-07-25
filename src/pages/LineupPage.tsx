import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  useTeams,
  usePlayers,
  useLineups,
  useUnavailabilities,
  useAppContext,
} from '../store/AppContext';
import {
  FORMATIONS,
  type LineupSlot,
  type Formation,
  type Position,
} from '../types';
import { isActiveUnavailability, today } from '../utils/date';
import { rankPlayersForPosition, isSuggested } from '../utils/lineup';
import { useI18n } from '../i18n';

// FORMATIONS est une constante non vide : la première sert de défaut
// (noUncheckedIndexedAccess rend l'accès [0] `Formation | undefined`).
const DEFAULT_FORMATION = FORMATIONS[0]!;

export default function LineupPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const teams = useTeams();
  const { state, dispatch } = useAppContext();

  const [selectedTeamId, setSelectedTeamId] = useState(
    searchParams.get('teamId') ?? teams[0]!.id
  );
  const [selectedFormation, setSelectedFormation] =
    useState<Formation>(DEFAULT_FORMATION);
  const [slots, setSlots] = useState<LineupSlot[]>(
    DEFAULT_FORMATION.slots.map(s => ({ ...s }))
  );
  const [selectedSlotPos, setSelectedSlotPos] = useState<string | null>(null);
  const [substituteIds, setSubstituteIds] = useState<string[]>([]);

  const players = usePlayers(selectedTeamId);
  const lineups = useLineups(selectedTeamId);
  const unavailabilities = useUnavailabilities();
  const todayStr = today();

  const unavailPlayerIds = useMemo(
    () =>
      unavailabilities
        .filter(
          u =>
            isActiveUnavailability(u.startDate, u.endDate, todayStr) &&
            players.some(p => p.id === u.playerId)
        )
        .map(u => u.playerId),
    [unavailabilities, players, todayStr]
  );

  const assignedPlayerIds = slots
    .map(s => s.playerId)
    .filter(Boolean) as string[];

  function changeFormation(formation: Formation) {
    setSelectedFormation(formation);
    setSlots(formation.slots.map(s => ({ ...s })));
    setSelectedSlotPos(null);
  }

  function handleSlotClick(position: string) {
    setSelectedSlotPos(selectedSlotPos === position ? null : position);
  }

  function assignPlayer(playerId: string) {
    /* c8 ignore next */
    if (!selectedSlotPos) return;
    setSlots(prev =>
      prev.map(s => {
        if (s.position === selectedSlotPos) return { ...s, playerId };
        /* c8 ignore next */
        if (s.playerId === playerId) return { ...s, playerId: undefined };
        return s;
      })
    );
    setSubstituteIds(prev => prev.filter(id => id !== playerId));
    setSelectedSlotPos(null);
  }

  function removeFromSlot(position: string) {
    setSlots(prev =>
      prev.map(s =>
        s.position === position ? { ...s, playerId: undefined } : s
      )
    );
    setSelectedSlotPos(null);
  }

  function toggleSubstitute(playerId: string) {
    /* c8 ignore next */
    if (assignedPlayerIds.includes(playerId)) return;
    setSubstituteIds(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  }

  function saveLineup() {
    dispatch({
      type: 'SAVE_LINEUP',
      lineup: {
        id: `lineup-${Date.now()}`,
        teamId: selectedTeamId,
        name: `${selectedFormation.label} — ${new Date().toLocaleDateString('fr-FR')}`,
        formation: selectedFormation.id,
        slots,
        substituteIds,
        createdAt: new Date().toISOString(),
      },
    });
  }

  function loadLineup(lineupId: string) {
    const lineup = lineups.find(l => l.id === lineupId);
    /* c8 ignore next */
    if (!lineup) return;
    const formation =
      FORMATIONS.find(f => f.id === lineup.formation) ?? DEFAULT_FORMATION;
    setSelectedFormation(formation);
    setSlots(lineup.slots);
    setSubstituteIds(lineup.substituteIds);
  }

  const unassignedPlayers = players.filter(
    p => !assignedPlayerIds.includes(p.id)
  );

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-fg-heading">
          {t('lineups.title')}
        </h1>
        <Button variant="primary" size="sm" onClick={saveLineup}>
          <Save size={14} />
          {t('lineups.save')}
        </Button>
      </div>

      {/* Team & formation selectors */}
      <div className="flex gap-2">
        <select
          value={selectedTeamId}
          onChange={e => setSelectedTeamId(e.target.value)}
          className="flex-1 h-9 rounded-xl border border-border-ui bg-surface px-3 text-sm text-fg"
        >
          {teams.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <div className="flex gap-1">
          {FORMATIONS.map(f => (
            <button
              key={f.id}
              onClick={() => changeFormation(f)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedFormation.id === f.id
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border-ui text-fg-muted hover:bg-surface-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Football pitch */}
      <div className="relative w-full aspect-[2/3] bg-green-700 rounded-2xl overflow-hidden border-2 border-green-600">
        {/* Field markings */}
        <div className="absolute inset-0 flex flex-col pointer-events-none">
          <div className="border-b-2 border-white/30 flex-1" />
          <div className="border-t-2 border-white/30 flex-1" />
        </div>
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-2 border-white/30 pointer-events-none" />
        {/* Goal top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-20 border-b-2 border-x-2 border-white/40 pointer-events-none" />
        {/* Goal bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-6 w-20 border-t-2 border-x-2 border-white/40 pointer-events-none" />

        {/* Player slots */}
        {slots.map(slot => {
          const player = players.find(p => p.id === slot.playerId);
          const isUnavail = slot.playerId
            ? unavailPlayerIds.includes(slot.playerId)
            : false;
          const isSelected = selectedSlotPos === slot.position;

          return (
            <button
              key={slot.position}
              onClick={() => handleSlotClick(slot.position)}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform ${
                isSelected ? 'scale-110' : ''
              }`}
            >
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  player
                    ? isUnavail
                      ? 'bg-amber-400 border-amber-600 text-white'
                      : 'bg-white border-primary text-primary'
                    : isSelected
                      ? 'bg-primary-subtle border-primary text-primary animate-pulse'
                      : 'bg-white/20 border-white/50 text-white'
                }`}
              >
                {player
                  ? (player.number ??
                    player.firstName.charAt(0) + player.lastName.charAt(0))
                  : slot.position}
              </div>
              {player && (
                <span className="mt-0.5 text-[10px] font-semibold text-white drop-shadow px-1 bg-black/30 rounded">
                  {player.firstName}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Player panel */}
      {selectedSlotPos && (
        <Card>
          <p className="text-xs font-medium text-fg-muted mb-2">
            {t('lineups.assignToPosition')}
            <strong>{t(`position.${selectedSlotPos as Position}`)}</strong>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {slots.find(s => s.position === selectedSlotPos)?.playerId && (
              <button
                onClick={() => removeFromSlot(selectedSlotPos)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
              >
                {t('common.remove')}
              </button>
            )}
            {rankPlayersForPosition(
              players.filter(
                p =>
                  !assignedPlayerIds.includes(p.id) ||
                  p.id ===
                    slots.find(s => s.position === selectedSlotPos)?.playerId
              ),
              selectedSlotPos as Position,
              state.positionHistory
            ).map(p => {
              const suggested =
                isSuggested(p, selectedSlotPos as Position) &&
                !unavailPlayerIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => assignPlayer(p.id)}
                  disabled={unavailPlayerIds.includes(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    unavailPlayerIds.includes(p.id)
                      ? 'border-amber-300 bg-amber-50 text-amber-600 opacity-60'
                      : suggested
                        ? 'border-primary bg-primary-subtle text-primary'
                        : 'border-border-ui text-fg hover:bg-surface-muted'
                  }`}
                >
                  {suggested && '⭐ '}
                  {p.firstName} {p.lastName}
                  {unavailPlayerIds.includes(p.id) && ' ⚠️'}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Unassigned players / substitutes */}
      {unassignedPlayers.length > 0 && (
        <Card>
          <p className="text-xs font-medium text-fg-muted mb-2">
            {t('lineups.substitutes')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unassignedPlayers.map(p => (
              <button
                key={p.id}
                onClick={() => toggleSubstitute(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  substituteIds.includes(p.id)
                    ? 'border-primary bg-primary-subtle text-primary'
                    : 'border-border-ui text-fg-muted hover:bg-surface-muted'
                }`}
              >
                {p.firstName} {p.lastName}
                {unavailPlayerIds.includes(p.id) && ' ⚠️'}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Saved lineups */}
      {lineups.length > 0 && (
        <Card>
          <p className="text-xs font-medium text-fg-muted mb-2">
            {t('lineups.saved')}
          </p>
          <div className="space-y-1">
            {lineups.map(l => (
              <button
                key={l.id}
                onClick={() => loadLineup(l.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-muted transition-colors"
              >
                <span className="text-sm text-fg">{l.name}</span>
                <span className="text-xs text-fg-muted">{l.formation}</span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
