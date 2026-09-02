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
  LayoutGrid,
} from 'lucide-react';
import { FamilyApps } from '@mister-guiiug/dev-wpa-config/react';
import {
  SPONSOR_URL,
  repoUrl,
} from '@mister-guiiug/dev-wpa-config/apps-catalog';
import { Card } from '@mister-guiiug/dev-wpa-config/react/card';
import { Badge } from '@mister-guiiug/dev-wpa-config/react/badge';
import { Button } from '@mister-guiiug/dev-wpa-config/react/button';
import { ConfirmDialog } from '@mister-guiiug/dev-wpa-config/react/confirm-dialog';
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
import { useI18n } from '../i18n';

/**
 * Identifiant de l'app dans le catalogue de la famille. C'est AUSSI le nom du
 * dépôt GitHub : `repoUrl(APP_ID)` et `currentAppId` en dépendent tous deux,
 * d'où la constante unique — une faute de frappe donnerait un lien 404.
 */
const APP_ID = 'mister-footcoach';

const REMINDER_DELAYS: { value: ReminderDelay; label: string }[] = [
  { value: 'J-1', label: 'J-1' },
  { value: 'J-2', label: 'J-2' },
  { value: 'H-2', label: 'H-2' },
];

export default function SettingsPage() {
  const { t, locale, setLocale, locales } = useI18n();
  const { theme, setTheme } = useTheme();
  const { state, dispatch } = useAppContext();
  const currentUser = useCurrentUser();
  const prefs = useNotificationPreferences();
  const clubSettings = useClubSettings();
  const [syncResult, setSyncResult] = useState<ReconcileResult | null>(null);
  // Réinitialisation en attente de réponse : `window.confirm` rendait un
  // booléen tout de suite, la boîte du socle attend un clic.
  const [resetPending, setResetPending] = useState(false);

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
    setResetPending(true);
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
    { value: 'light', label: t('settings.themeLight'), icon: Sun },
    { value: 'dark', label: t('settings.themeDark'), icon: Moon },
    { value: 'system', label: t('settings.themeSystem'), icon: Monitor },
  ] as const;

  return (
    <div className="px-4 py-4 space-y-5">
      <h1 className="text-xl font-bold text-fg-heading">
        {t('settings.title')}
      </h1>

      {/* Theme */}
      <Card>
        <p className="text-sm font-semibold text-fg-heading mb-3">
          {t('settings.appearance')}
        </p>
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

      {/* Language */}
      <Card>
        <p className="text-sm font-semibold text-fg-heading mb-3">
          {t('settings.language')}
        </p>
        <div
          role="group"
          aria-label={t('settings.language')}
          className="grid grid-cols-2 gap-2"
        >
          {locales.map(loc => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocale(loc)}
              aria-pressed={locale === loc}
              className={`rounded-xl p-3 border text-sm font-medium transition-colors ${
                locale === loc
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border-ui text-fg-muted hover:bg-surface-muted'
              }`}
            >
              {loc === 'fr'
                ? t('settings.languageFr')
                : t('settings.languageEn')}
            </button>
          ))}
        </div>
      </Card>

      {/* Notification preferences (specs §16.3) */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-fg-heading">
            {t('settings.notifications')}
          </p>
          <button
            onClick={() => updatePrefs({ enabled: !prefs.enabled })}
            role="switch"
            aria-checked={prefs.enabled}
            aria-label={t('settings.enableNotifications')}
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
                    <span className="text-fg">
                      {t(`notifications.category.${cat.key}`)}
                    </span>
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
                {t('settings.sessionReminder')}
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
          <p className="text-xs text-fg-muted">{t('settings.allDisabled')}</p>
        )}
      </Card>

      {/* Club settings */}
      <Card>
        <p className="text-sm font-semibold text-fg-heading mb-3">
          {t('settings.club')}
        </p>
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
          <span className="text-fg">{t('settings.autoSurvey')}</span>
          <span
            role="switch"
            aria-checked={clubSettings.autoSurveyOnMatch}
            aria-label={t('settings.autoSurvey')}
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
            {t('settings.federation')}
          </p>
        </div>
        <p className="mb-3 text-xs text-fg-muted">
          {t('settings.federationDesc')}
        </p>
        {clubSettings.federationLastSync && (
          <p className="mb-2 text-xs text-fg-faint">
            {t('settings.lastSync', {
              date: formatDate(clubSettings.federationLastSync.split('T')[0]!),
            })}
          </p>
        )}
        <Button variant="secondary" onClick={syncFederation} className="w-full">
          <RefreshCw size={14} /> {t('settings.syncFederation')}
        </Button>

        {syncResult && (
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex gap-2">
              <Badge tone="success">
                {t('settings.syncUpdated', {
                  count: syncResult.updated.length,
                })}
              </Badge>
              <Badge tone="brand">
                {t('settings.syncCreated', {
                  count: syncResult.created.length,
                })}
              </Badge>
              <Badge tone="warning">
                {t(
                  syncResult.conflicts.length > 1
                    ? 'settings.syncConflictPlural'
                    : 'settings.syncConflict',
                  { count: syncResult.conflicts.length }
                )}
              </Badge>
            </div>
            {syncResult.conflicts.map((c, i) => (
              <div
                key={i}
                className="rounded-xl bg-amber-50 dark:bg-amber-900/10 p-2.5 text-xs text-amber-700 dark:text-amber-400"
              >
                {t('settings.conflictDetail', {
                  field: c.field,
                  local: c.local,
                  federal: c.federal,
                })}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Season info */}
      <Card>
        <p className="text-sm font-semibold text-fg-heading mb-3">
          {t('settings.activeSeason')}
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-fg-muted">{t('settings.season')}</span>
            <span className="font-medium text-fg">{state.season.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-muted">{t('settings.start')}</span>
            <span className="font-medium text-fg">
              {state.season.startDate}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-muted">{t('settings.end')}</span>
            <span className="font-medium text-fg">{state.season.endDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-muted">{t('settings.teams')}</span>
            <span className="font-medium text-fg">{state.teams.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-muted">{t('settings.activePlayers')}</span>
            <span className="font-medium text-fg">
              {state.players.filter(p => p.active).length}
            </span>
          </div>
        </div>
      </Card>

      {/* Data management */}
      <Card>
        <p className="text-sm font-semibold text-fg-heading mb-3">
          {t('settings.demoData')}
        </p>
        <p className="text-xs text-fg-muted mb-3">
          {t('settings.demoDataDesc')}
        </p>
        <Button variant="secondary" onClick={resetData} className="w-full">
          <RefreshCw size={14} />
          {t('settings.resetData')}
        </Button>
      </Card>

      {resetPending && (
        <ConfirmDialog
          open
          destructive
          title={t('settings.resetConfirm')}
          confirmLabel={t('settings.resetData')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            dispatch({ type: 'RESET_TO_MOCK' });
            setResetPending(false);
          }}
          onCancel={() => setResetPending(false)}
        />
      )}

      {/* App info */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <LayoutGrid size={16} className="text-fg-muted" />
          <p className="text-sm font-semibold text-fg-heading">
            {t('settings.otherApps')}
          </p>
        </div>
        <p className="mb-3 text-xs text-fg-muted">
          {t('settings.otherAppsDesc')}
        </p>
        <div className="family-apps">
          <FamilyApps
            currentAppId={APP_ID}
            showSource={false}
            showSponsor={false}
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <Info size={18} className="text-fg-muted flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-fg-heading">{t('app.name')}</p>
            <p className="text-xs text-fg-muted mt-0.5">
              {t('settings.version')}
            </p>
            <p className="text-xs text-fg-muted mt-0.5">
              {t('settings.appDescription')}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <a
                href={repoUrl(APP_ID)}
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
                {t('settings.sourceCode')}
              </a>
              <a
                href={SPONSOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-fg-heading"
              >
                <Coffee size={14} aria-hidden="true" />
                {t('settings.buyCoffee')}
              </a>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
