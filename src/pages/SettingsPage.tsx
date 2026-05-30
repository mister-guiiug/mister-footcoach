import { Moon, Sun, Monitor, RefreshCw, Info } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeContext';
import { useAppContext } from '../store/AppContext';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { state, dispatch } = useAppContext();

  function resetData() {
    if (window.confirm('Réinitialiser toutes les données de démonstration ?')) {
      dispatch({ type: 'RESET_TO_MOCK' });
    }
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
