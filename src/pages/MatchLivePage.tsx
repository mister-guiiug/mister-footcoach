import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Radio, Plus, Minus, X, Play, Pause, RotateCcw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import {
  useMatch,
  useMatchEvents,
  useTeam,
  usePlayers,
  useAppContext,
} from '../store/AppContext';
import {
  MATCH_EVENT_LABELS,
  type MatchEventType,
  type PositionHistory,
} from '../types';
import { genId } from '../utils/id';

const EVENT_BUTTONS: { type: MatchEventType; emoji: string; label: string }[] =
  [
    { type: 'but', emoji: '⚽', label: 'But' },
    { type: 'but_csc', emoji: '🤦', label: 'CSC' },
    { type: 'carton_jaune', emoji: '🟨', label: 'Jaune' },
    { type: 'carton_rouge', emoji: '🟥', label: 'Rouge' },
    { type: 'remplacement', emoji: '🔄', label: 'Rempl.' },
    { type: 'blessure_live', emoji: '🩹', label: 'Blessure' },
    { type: 'arret_mi_temps', emoji: '📌', label: 'Mi-temps' },
  ];

export default function MatchLivePage() {
  const { id } = useParams<{ id: string }>();
  const match = useMatch(id!);
  const events = useMatchEvents(id!);
  const team = useTeam(match?.teamId ?? '');
  const players = usePlayers(match?.teamId);
  const { dispatch } = useAppContext();
  const navigate = useNavigate();

  const [minute, setMinute] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<MatchEventType | null>(
    null
  );
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [playerOut, setPlayerOut] = useState<string | null>(null);
  const [scoreHome, setScoreHome] = useState(match?.scoreHome ?? 0);
  const [scoreAway, setScoreAway] = useState(match?.scoreAway ?? 0);
  const [isLive, setIsLive] = useState(match?.liveActive ?? false);

  // Chronometer (specs §7.5.4) — drives the event minute automatically.
  const [chronoRunning, setChronoRunning] = useState(false);
  const [chronoSec, setChronoSec] = useState(0);

  useEffect(() => {
    if (!chronoRunning) return;
    const interval = setInterval(() => {
      setChronoSec(s => {
        const next = s + 1;
        setMinute(Math.floor(next / 60));
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [chronoRunning]);

  if (!match) {
    return (
      <div className="p-4">
        <EmptyState title="Match introuvable" />
      </div>
    );
  }

  function toggleLive() {
    dispatch({ type: 'SET_MATCH_LIVE', matchId: id!, active: !isLive });
    setIsLive(v => !v);
  }

  function addEvent() {
    /* c8 ignore next */
    if (!selectedEvent) return;
    dispatch({
      type: 'ADD_MATCH_EVENT',
      event: {
        id: `me-${Date.now()}`,
        matchId: id!,
        type: selectedEvent,
        minute,
        playerId: selectedPlayer ?? undefined,
        player2Id: playerOut ?? undefined,
      },
    });

    // Substitution → feed the position history for both players (§7.5.5).
    if (selectedEvent === 'remplacement') {
      const entries: PositionHistory[] = [];
      const inP = players.find(p => p.id === selectedPlayer);
      const outP = players.find(p => p.id === playerOut);
      if (inP)
        entries.push({
          id: genId('ph'),
          playerId: inP.id,
          matchId: id!,
          matchDate: match!.date,
          opponent: match!.opponent,
          period: 'remplaçant entrant',
          position: inP.preferredPosition,
        });
      if (outP)
        entries.push({
          id: genId('ph'),
          playerId: outP.id,
          matchId: id!,
          matchDate: match!.date,
          opponent: match!.opponent,
          period: 'remplaçant sortant',
          position: outP.preferredPosition,
        });
      if (entries.length > 0)
        dispatch({ type: 'ADD_POSITION_HISTORY', entries });
    }

    // Live injury → offer to open the player's file to log it (§7.5.5).
    if (selectedEvent === 'blessure_live' && selectedPlayer) {
      const pid = selectedPlayer;
      if (
        window.confirm(
          'Créer un suivi de blessure pour ce joueur ? (ouvre sa fiche)'
        )
      ) {
        navigate(`/joueurs/${pid}`);
      }
    }

    if (selectedEvent === 'but') {
      const newHome = match!.isHome ? scoreHome + 1 : scoreHome;
      const newAway = match!.isHome ? scoreAway : scoreAway + 1;
      setScoreHome(newHome);
      setScoreAway(newAway);
      dispatch({
        type: 'UPDATE_MATCH_SCORE',
        matchId: id!,
        scoreHome: newHome,
        scoreAway: newAway,
      });
    } else if (selectedEvent === 'but_csc') {
      const newHome = match!.isHome ? scoreHome : scoreHome + 1;
      const newAway = match!.isHome ? scoreAway + 1 : scoreAway;
      setScoreHome(newHome);
      setScoreAway(newAway);
      dispatch({
        type: 'UPDATE_MATCH_SCORE',
        matchId: id!,
        scoreHome: newHome,
        scoreAway: newAway,
      });
    }

    setSelectedEvent(null);
    setSelectedPlayer(null);
    setPlayerOut(null);
  }

  const usHome = match.isHome
    ? /* istanbul ignore next */ (team?.name ?? 'Nous')
    : match.opponent;
  const usAway = match.isHome
    ? match.opponent
    : /* istanbul ignore next */ (team?.name ?? 'Nous');

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-fg-heading">Mode Live</h1>
          <p className="text-xs text-fg-muted">vs {match.opponent}</p>
        </div>
        <Button
          variant={isLive ? 'danger' : 'primary'}
          size="sm"
          onClick={toggleLive}
        >
          <Radio size={14} />
          {isLive ? 'Arrêter' : 'Démarrer'}
        </Button>
      </div>

      {/* Chronometer (specs §7.5.4) */}
      <Card>
        <div className="flex items-center justify-between">
          <span
            className="font-mono text-2xl font-bold text-fg-heading"
            aria-label="Chronomètre"
          >
            {String(Math.floor(chronoSec / 60)).padStart(2, '0')}:
            {String(chronoSec % 60).padStart(2, '0')}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={chronoRunning ? 'secondary' : 'primary'}
              onClick={() => setChronoRunning(r => !r)}
            >
              {chronoRunning ? <Pause size={14} /> : <Play size={14} />}
              {chronoRunning ? 'Pause' : 'Lancer'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Réinitialiser le chronomètre"
              onClick={() => {
                setChronoRunning(false);
                setChronoSec(0);
                setMinute(0);
              }}
            >
              <RotateCcw size={14} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Score */}
      <Card className="text-center">
        <div className="flex items-center justify-center gap-6">
          <div className="flex-1">
            <p className="text-xs text-fg-muted mb-1">{usHome}</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setScoreHome(v => Math.max(0, v - 1))}
                className="h-8 w-8 rounded-full border border-border-ui flex items-center justify-center hover:bg-surface-muted"
              >
                <Minus size={14} />
              </button>
              <span className="text-4xl font-bold text-fg-heading w-12 text-center">
                {scoreHome}
              </span>
              <button
                onClick={() => {
                  const v = scoreHome + 1;
                  setScoreHome(v);
                  dispatch({
                    type: 'UPDATE_MATCH_SCORE',
                    matchId: id!,
                    scoreHome: v,
                    scoreAway,
                  });
                }}
                className="h-8 w-8 rounded-full border border-border-ui flex items-center justify-center hover:bg-surface-muted"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl text-fg-muted">-</span>
            <span className="text-xs text-fg-muted mt-1">{minute}'</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-fg-muted mb-1">{usAway}</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setScoreAway(v => Math.max(0, v - 1))}
                className="h-8 w-8 rounded-full border border-border-ui flex items-center justify-center hover:bg-surface-muted"
              >
                <Minus size={14} />
              </button>
              <span className="text-4xl font-bold text-fg-heading w-12 text-center">
                {scoreAway}
              </span>
              <button
                onClick={() => {
                  const v = scoreAway + 1;
                  setScoreAway(v);
                  dispatch({
                    type: 'UPDATE_MATCH_SCORE',
                    matchId: id!,
                    scoreHome,
                    scoreAway: v,
                  });
                }}
                className="h-8 w-8 rounded-full border border-border-ui flex items-center justify-center hover:bg-surface-muted"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
        {/* Minute slider */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-fg-muted w-8 text-right">
            {minute}'
          </span>
          <input
            type="range"
            min={0}
            max={80}
            value={minute}
            onChange={e => setMinute(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
        </div>
      </Card>

      {/* Event buttons */}
      <Card>
        <p className="text-xs font-medium text-fg-muted mb-2">
          Ajouter un événement
        </p>
        <div className="grid grid-cols-3 gap-2">
          {EVENT_BUTTONS.map(({ type, emoji, label }) => (
            <button
              key={type}
              onClick={() =>
                setSelectedEvent(selectedEvent === type ? null : type)
              }
              className={`flex flex-col items-center gap-1 rounded-xl p-2.5 border transition-colors ${
                selectedEvent === type
                  ? 'border-primary bg-primary-subtle'
                  : 'border-border-ui hover:bg-surface-muted'
              }`}
            >
              <span className="text-xl">{emoji}</span>
              <span className="text-xs text-fg-muted">{label}</span>
            </button>
          ))}
        </div>

        {/* Player selection */}
        {selectedEvent && selectedEvent !== 'arret_mi_temps' && (
          <div className="mt-3">
            <p className="text-xs font-medium text-fg-muted mb-2">
              {selectedEvent === 'remplacement'
                ? 'Joueur entrant'
                : 'Joueur concerné'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() =>
                    setSelectedPlayer(selectedPlayer === p.id ? null : p.id)
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    selectedPlayer === p.id
                      ? 'border-primary bg-primary text-primary-fg'
                      : 'border-border-ui text-fg hover:bg-surface-muted'
                  }`}
                >
                  {p.firstName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing player for a substitution (specs §7.5.5) */}
        {selectedEvent === 'remplacement' && (
          <div className="mt-3">
            <p className="text-xs font-medium text-fg-muted mb-2">
              Joueur sortant
            </p>
            <div className="flex flex-wrap gap-1.5">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlayerOut(playerOut === p.id ? null : p.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    playerOut === p.id
                      ? 'border-red-500 bg-red-500 text-white'
                      : 'border-border-ui text-fg hover:bg-surface-muted'
                  }`}
                >
                  {p.firstName}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedEvent && (
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={addEvent}
              className="flex-1"
            >
              <Plus size={14} />
              Valider {MATCH_EVENT_LABELS[selectedEvent]}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedEvent(null);
                setSelectedPlayer(null);
              }}
            >
              <X size={14} />
            </Button>
          </div>
        )}
      </Card>

      {/* Event log */}
      {events.length > 0 && (
        <Card>
          <p className="text-xs font-medium text-fg-muted mb-2">Événements</p>
          <div className="space-y-2">
            {[...events].reverse().map(e => {
              const player = players.find(p => p.id === e.playerId);
              return (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-fg-faint w-6">{e.minute}'</span>
                  <span>
                    {e.type === 'but'
                      ? '⚽'
                      : e.type === 'carton_jaune'
                        ? '🟨'
                        : e.type === 'carton_rouge'
                          ? '🟥'
                          : '📌'}
                  </span>
                  <span className="text-fg">{MATCH_EVENT_LABELS[e.type]}</span>
                  {player && (
                    <span className="text-fg-muted text-xs">
                      {player.firstName} {player.lastName}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Close & record attendance (specs §7.5.5) */}
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          if (isLive) {
            dispatch({ type: 'SET_MATCH_LIVE', matchId: id!, active: false });
            setIsLive(false);
          }
          navigate(`/matchs/${id}`);
        }}
      >
        Clôturer et saisir l'assiduité
      </Button>
    </div>
  );
}
