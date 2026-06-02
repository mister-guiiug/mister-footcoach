import { useState } from 'react';
import {
  Moon,
  Sun,
  Monitor,
  RefreshCw,
  Info,
  Check,
  RadioTower,
  Coffee,
} from 'lucide-react';
import { REPO_URL, SPONSOR_URL } from '../links';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeContext';
import {
  useAppContext,
  useCurrentUser,
  useNotificationPreferences,
  useClubSettings,
} from '../store/AppContext';
import type { NotificationPreferences, ReminderDelay } from '../types';
import { NOTIFICATION_CATEGORIES } from '../utils/notifications';
import {
  reconcileFederationMatches,
  type ReconcileResult,
} from '../utils/federation';
import { FEDERATION_SAMPLE } from '../data/federation';
import { genId, nowIso } from '../utils/id';
import { formatDate } from '../utils/date';

const REMINDER_DELAYS: { value: ReminderDelay; label: string }[] = [
  { value: 'J-1', label: 'J-1' },
  { value: 'J-2', label: 'J-2' },
  { value: 'H-2', label: 'H-2' },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { state, dispatch } = useAppContext();
  const currentUser = useCurrentUser();
  const prefs = useNotificationPreferences();
  const clubSettings = useClubSettings();
  const [syncResult, setSyncResult] = useState<ReconcileResult | null>(null);

  function syncFederation() {
    const teamId = state.teams[0]?.id ?? '';
    const result = reconcileFederationMatches(
      state.matches,
      FEDERATION_SAMPLE,
      {
        teamId,
        seasonId: state.season.id,
        makeId: () => genId('match'),
      }
    );
    for (const m of result.updated)
      dispatch({ type: 'UPDATE_MATCH', match: m });
    for (const m of result.created) dispatch({ type: 'ADD_MATCH', match: m });
    dispatch({
      type: 'SET_CLUB_SETTINGS',
      settings: { ...clubSettings, federationLastSync: nowIso() },
    });
    setSyncResult(result);
  }

  function resetData() {
    if (window.confirm('Réinitialiser toutes les données de démonstration ?')) {
      dispatch({ type: 'RESET_TO_MOCK' });
    }
  }

  function updatePrefs(patch: Partial<NotificationPreferences>) {
    if (!currentUser) return;
    dispatch({
      type: 'SET_NOTIFICATION_PREFERENCES',
      userId: currentUser.id,
      preferences: { ...prefs, ...patch },
    });
  }

  function toggleCategory(key: string) {
    const muted = prefs.mutedCategories.includes(key)
      ? prefs.mutedCategories.filter(c => c !== key)
      : [...prefs.mutedCategories, key];
    updatePrefs({ mutedCategories: muted });
  }

  const themeOptions = [
    { value: 'light', label: 'Clair', icon: Sun },
    { value: 'dark', label: 'Sombre', icon: Moon },
    { value: 'system', label: 'Système', icon: Monitor },
  ] as const;

  return (
    <div className="px-4 py-4 space-y-5">
      <h1 className="text-xl font-bold text-fg-heading">Paramètres</h1>

      {/* Theme */}
      <Card>
        <p className="text-sm font-semibold text-fg-heading mb-3">Apparence</p>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 rounded-xl p-3 border transition-colors ${
                theme === value
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border-ui text-fg-muted hover:bg-surface-muted'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Notification preferences (specs §16.3) */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-fg-heading">Notifications</p>
          <button
            onClick={() => updatePrefs({ enabled: !prefs.enabled })}
            role="switch"
            aria-checked={prefs.enabled}
            aria-label="Activer les notifications"
            className={`relative h-6 w-11 rounded-full transition-colors ${
              prefs.enabled ? 'bg-primary' : 'bg-border-ui-strong'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                prefs.enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {prefs.enabled ? (
          <>
            <div className="space-y-1.5">
              {NOTIFICATION_CATEGORIES.map(cat => {
                const active = !prefs.mutedCategories.includes(cat.key);
                return (
                  <button
                    key={cat.key}
                    onClick={() => toggleCategory(cat.key)}
                    className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm hover:bg-surface-muted"
                  >
                    <span className="text-fg">{cat.label}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        active
                          ? 'border-primary bg-primary text-primary-fg'
                          : 'border-border-ui text-transparent'
                      }`}
                    >
                      <Check size={12} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 border-t border-border-ui pt-3">
              <p className="mb-1.5 text-xs font-medium text-fg-muted">
                Rappel de séance
              </p>
              <div className="flex gap-2">
                {REMINDER_DELAYS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => updatePrefs({ reminderDelay: d.value })}
                    className={`flex-1 rounded-xl border py-1.5 text-xs font-medium transition-colors ${
                      prefs.reminderDelay === d.value
                        ? 'border-primary bg-primary-subtle text-primary'
                        : 'border-border-ui text-fg-muted hover:bg-surface-muted'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-fg-muted">
            Toutes les notifications sont désactivées.
          </p>
        )}
      </Card>

      {/* Club settings */}
      <Card>
        <p className="text-sm font-semibold text-fg-heading mb-3">Club</p>
        <button
          onClick={() =>
            dispatch({
              type: 'SET_CLUB_SETTINGS',
              settings: {
                ...clubSettings,
                autoSurveyOnMatch: !clubSettings.autoSurveyOnMatch,
              },
            })
          }
          className="flex w-full items-center justify-between text-sm"
        >
          <span className="text-fg">Sondage auto à la création d'un match</span>
          <span
            role="switch"
            aria-checked={clubSettings.autoSurveyOnMatch}
            aria-label="Sondage auto à la création d'un match"
            className={`relative h-6 w-11 rounded-full transition-colors ${
              clubSettings.autoSurveyOnMatch
                ? 'bg-primary'
                : 'bg-border-ui-strong'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                clubSettings.autoSurveyOnMatch
                  ? 'translate-x-5'
                  : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>
      </Card>

      {/* Federation integration (specs §17) */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <RadioTower size={16} className="text-fg-muted" />
          <p className="text-sm font-semibold text-fg-heading">
            Intégration fédération
          </p>
        </div>
        <p className="mb-3 text-xs text-fg-muted">
          Synchronise le calendrier et les résultats officiels. Les champs
          locaux (note, assiduité, composition, événements live) ne sont jamais
          écrasés.
        </p>
        {clubSettings.federationLastSync && (
          <p className="mb-2 text-xs text-fg-faint">
            Dernière synchronisation :{' '}
            {formatDate(clubSettings.federationLastSync.split('T')[0]!)}
          </p>
        )}
        <Button variant="secondary" onClick={syncFederation} className="w-full">
          <RefreshCw size={14} /> Synchroniser la fédération
        </Button>

        {syncResult && (
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex gap-2">
              <Badge variant="success">
                {syncResult.updated.length} mis à jour
              </Badge>
              <Badge variant="primary">{syncResult.created.length} créés</Badge>
              <Badge variant="warning">
                {syncResult.conflicts.length} conflit
                {syncResult.conflicts.length > 1 ? 's' : ''}
              </Badge>
            </div>
            {syncResult.conflicts.map((c, i) => (
              <div
                key={i}
                className="rounded-xl bg-amber-50 dark:bg-amber-900/10 p-2.5 text-xs text-amber-700 dark:text-amber-400"
              >
                Conflit {c.field} — local : {c.local} · fédéral : {c.federal}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Season info */}
      <Card>
        <p className="text-sm font-semibold text-fg-heading mb-3">
          Saison active
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-fg-muted">Saison</span>
            <span className="font-medium text-fg">{state.season.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-muted">Début</span>
            <span className="font-medium text-fg">
              {state.season.startDate}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-muted">Fin</span>
            <span className="font-medium text-fg">{state.season.endDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-muted">Équipes</span>
            <span className="font-medium text-fg">{state.teams.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-muted">Joueurs actifs</span>
            <span className="font-medium text-fg">
              {state.players.filter(p => p.active).length}
            </span>
          </div>
        </div>
      </Card>

      {/* Data management */}
      <Card>
        <p className="text-sm font-semibold text-fg-heading mb-3">
          Données de démonstration
        </p>
        <p className="text-xs text-fg-muted mb-3">
          L'application utilise des données de démonstration stockées
          localement. La réinitialisation restaure les données d'exemple
          originales.
        </p>
        <Button variant="secondary" onClick={resetData} className="w-full">
          <RefreshCw size={14} />
          Réinitialiser les données
        </Button>
      </Card>

      {/* App info */}
      <Card>
        <div className="flex items-start gap-3">
          <Info size={18} className="text-fg-muted flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-fg-heading">Mister Footcoach</p>
            <p className="text-xs text-fg-muted mt-0.5">
              Version MVP — Phase 0
            </p>
            <p className="text-xs text-fg-muted mt-0.5">
              Application PWA de gestion d'équipes jeunes de football. Données
              stockées localement (localStorage).
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-fg-heading"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                Code source
              </a>
              <a
                href={SPONSOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-fg-heading"
              >
                <Coffee size={14} aria-hidden="true" />
                M'offrir un café
              </a>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
