import { useRef, useState, type ChangeEvent } from 'react';
import {
  Moon,
  Sun,
  Monitor,
  RefreshCw,
  Info,
  Check,
  RadioTower,
  LayoutGrid,
  Download,
  Upload,
} from 'lucide-react';
import { FamilyApps } from '@mister-guiiug/dev-pwa-config/react';
import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
import { Badge } from '@mister-guiiug/dev-pwa-config/react/badge';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { ConfirmDialog } from '@mister-guiiug/dev-pwa-config/react/confirm-dialog';
import { dateSlug, downloadText } from '@mister-guiiug/dev-pwa-config/download';
import { useTheme } from '../theme/ThemeContext';
import {
  useAppContext,
  useCurrentUser,
  useNotificationPreferences,
  useClubSettings,
} from '../store/AppContext';
import { exportState, importState } from '../store/storage';
import { BACKEND } from '../backend/config';
import { DangerZoneCard } from '../components/features/settings/DangerZoneCard';
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
import { APP_ID } from '../lib/appId';

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

  // ── Sauvegarde et restauration (mode local) ────────────────────────
  //
  // POURQUOI ICI, ET SEULEMENT EN MODE LOCAL. Le mode local est le DÉFAUT :
  // toute la saison — vingt collections, joueurs, matchs, compositions — vit
  // dans le `localStorage` d'un seul navigateur. Le vider, changer de
  // téléphone, ou simplement voir le navigateur nettoyer son stockage, et il
  // n'y a plus rien : aucun compte, aucun serveur, aucune reprise. Jusqu'ici
  // la seule sortie de l'application était l'export RGPD d'UN joueur, qui ne
  // se réimporte pas. En mode `supabase`, la vérité est en base et ce n'est
  // pas ce magasin-là qui la porte : la carte n'a rien à y promettre.
  const fileInput = useRef<HTMLInputElement>(null);
  /** Le fichier lu, en attente de confirmation parce qu'il y a de quoi perdre. */
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  /** Dernier import réussi — de quoi VOIR ce qui est entré, pas juste « OK ». */
  const [importDone, setImportDone] = useState<{
    teams: number;
    players: number;
    matches: number;
  } | null>(null);
  /** Le message de refus, tel que le magasin l'a formulé. */
  const [importError, setImportError] = useState<string | null>(null);

  function exportData() {
    downloadText(
      exportState(),
      `mister-footcoach-${dateSlug()}.json`,
      'application/json'
    );
  }

  /**
   * Écrit le fichier, ou refuse. Le magasin fait les deux : il ne remplace
   * l'état QUE si l'enveloppe, la chaîne de migrations et la validation ont
   * toutes abouti — un fichier d'une autre application repart avec un message,
   * et la saison en cours n'a pas bougé d'une ligne.
   */
  function runImport(json: string) {
    try {
      const state = importState(json);
      dispatch({ type: 'HYDRATE', state });
      setImportDone({
        teams: state.teams.length,
        players: state.players.length,
        matches: state.matches.length,
      });
      setImportError(null);
    } catch (error) {
      // Toujours une `Error` : le magasin du socle enveloppe la cause dans une
      // `Error` au message lisible, et `assertAppState` lève des `TypeError`.
      // Un repli « ce n'était pas une Error » serait une branche inatteignable.
      setImportDone(null);
      setImportError((error as Error).message);
    }
  }

  async function onImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Remis à zéro tout de suite : choisir DEUX fois le même fichier doit
    // relancer l'import, et un `<input type="file">` ne signale pas un choix
    // identique au précédent.
    event.target.value = '';
    if (!file) return;
    const json = await file.text();
    // Un import REMPLACE tout. Tant qu'il n'y a rien à perdre — première
    // ouverture, données effacées — le demander serait une cérémonie inutile.
    if (hasSomethingToLose) setPendingImport(json);
    else runImport(json);
  }

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

  /**
   * Y a-t-il de quoi perdre ? Trois collections suffisent à le dire — une
   * équipe, un joueur ou un match, et l'écrasement mérite une question. Le
   * critère porte sur l'état EN MÉMOIRE, pas sur la présence d'une clé : le
   * magasin en écrit une dès le premier rendu, elle serait donc toujours là.
   */
  const hasSomethingToLose =
    state.teams.length > 0 ||
    state.players.length > 0 ||
    state.matches.length > 0;

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

      {/* Sauvegarde et restauration — mode local seulement */}
      {BACKEND === 'local' && (
        <Card>
          <p className="text-sm font-semibold text-fg-heading mb-3">
            {t('settings.myData')}
          </p>
          <p className="text-xs text-fg-muted mb-3">
            {t('settings.myDataDesc')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={exportData}>
              <Download size={14} />
              {t('settings.exportData')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={14} />
              {t('settings.importData')}
            </Button>
          </div>
          {/* Le vrai champ est masqué visuellement, pas retiré de l'arbre : il
              garde son nom accessible, et un test peut lui donner un fichier
              sans passer par la boîte de dialogue du système. */}
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label={t('settings.importData')}
            onChange={event => void onImportFile(event)}
          />
          {importDone && (
            <p role="status" className="mt-3 text-xs text-fg-muted">
              {t('settings.importDone', {
                teams: importDone.teams,
                players: importDone.players,
                matches: importDone.matches,
              })}
            </p>
          )}
          {importError && (
            <p role="alert" className="mt-3 text-xs text-red-600">
              {t('settings.importFailed')}
              <span className="block text-fg-faint">{importError}</span>
            </p>
          )}
        </Card>
      )}

      {pendingImport !== null && (
        <ConfirmDialog
          open
          destructive
          title={t('settings.importConfirm')}
          message={t('settings.importConfirmBody')}
          confirmLabel={t('settings.importData')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            const json = pendingImport;
            setPendingImport(null);
            runImport(json);
          }}
          onCancel={() => setPendingImport(null)}
        />
      )}

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

      {/* Zone dangereuse — mode Supabase seulement : sans compte, il n'y a
          rien à supprimer, et un bouton qui n'efface rien serait pire que son
          absence. Monté CONDITIONNELLEMENT plutôt que rendu vide : la carte
          appelle `useAuth`, qui exige un `AuthProvider` — lequel n'existe que
          derrière le backend distant. */}
      {BACKEND === 'supabase' && <DangerZoneCard />}

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
            {/* Les deux liens ne sont plus recopiés ici : le pied de page de
                la coquille les porte sur TOUS les écrans, celui-ci compris. */}
          </div>
        </div>
      </Card>
    </div>
  );
}
