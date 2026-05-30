import { Moon, Sun, Monitor, RefreshCw, Info, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
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
          </div>
        </div>
      </Card>
    </div>
  );
}
