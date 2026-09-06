import { useState, type FormEvent } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Input } from '../../ui/Input';
import { useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n';

/**
 * LA ZONE DANGEREUSE — le droit à l'effacement (RGPD art. 17), à portée de
 * main et hors de portée du doigt qui glisse.
 *
 * CE QU'ELLE REMPLACE : rien. `docs/specs-fonctionnelles.md` § 21.2 listait la
 * suppression parmi les droits NON OUTILLÉS ; `AuthContext` n'offrait que
 * `signOut`. Or cette application manipule des données de MINEURS (U11-U18) et
 * de leurs contacts, avec `consentDate` et `consentVersion` au modèle. Un
 * consentement qu'on ne peut retirer qu'en écrivant au mainteneur n'en est pas
 * un.
 *
 * POURQUOI PAS `ConfirmDialog`. Toutes les autres suppressions de
 * l'application passent par la boîte du socle, et c'est bien : elles se
 * rattrapent. Un compte effacé, lui, ne se rattrape pas — il n'y a rien à
 * remettre à sa place. Et une barrière à « OK » n'en est pas une : c'est le
 * même clic que celui qu'on regrette, deux fois de suite. Retaper son adresse
 * demande de LIRE, donc de comprendre.
 *
 * L'ADRESSE MAL RETAPÉE NE DÉSACTIVE PAS LE BOUTON, ELLE RÉPOND. Un bouton
 * grisé sans explication laisse chercher ce qui manque, et un lecteur d'écran
 * n'annonce qu'« indisponible » — c'est le défaut que `RemoteWriteNotice`
 * corrige ailleurs dans ce dépôt. Ici la soumission reste possible, et c'est
 * le refus qui est dit, en `role="alert"`.
 *
 * ELLE N'EXISTE PAS EN MODE LOCAL. `SettingsPage` ne la monte qu'avec le
 * backend `supabase` : sans compte, un « supprimer mon compte » n'effacerait
 * rien, et serait pire que son absence. La carte « Mes données » est là pour
 * ce mode-là.
 *
 * CE QU'ELLE ANNONCE AVANT DE DEMANDER, parce que c'est le métier qui le
 * veut : ce qui part (la fiche, les coordonnées, le consentement), et ce qui
 * RESTE (l'équipe, les matchs, les joueurs — ils appartiennent au club, pas au
 * partant). Voir `supabase/migrations/0004_supprimer_son_compte.sql`.
 */
export function DangerZoneCard() {
  const { t } = useI18n();
  const { session, deleteAccount } = useAuth();
  const email = session?.user.email ?? '';
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Deux adresses égales aux espaces et à la casse près. */
  function sameAddress(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase() && b.trim() !== '';
  }

  function reset() {
    setOpen(false);
    setTyped('');
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!sameAddress(typed, email)) {
      setError(t('settings.danger.mismatch'));
      return;
    }
    setError(null);
    setBusy(true);
    const { error: failure } = await deleteAccount();
    setBusy(false);
    // Un échec laisse la carte OUVERTE et la session intacte : l'utilisateur
    // lit le motif et réessaie. En cas de succès il n'y a rien à ranger —
    // `deleteAccount` a fermé la session, `AuthGate` reprend la main.
    if (failure) setError(t('settings.danger.failed', { error: failure }));
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <TriangleAlert size={16} className="text-red-600" />
        <p className="text-sm font-semibold text-fg-heading">
          {t('settings.danger.title')}
        </p>
      </div>
      <p className="mb-3 text-xs text-fg-muted">{t('settings.danger.body')}</p>

      {!open ? (
        <Button
          variant="danger"
          onClick={() => setOpen(true)}
          className="w-full"
        >
          {t('settings.danger.action')}
        </Button>
      ) : (
        <form onSubmit={event => void submit(event)} className="space-y-3">
          <p className="text-xs text-fg-muted">
            {t('settings.danger.whatGoes')}
          </p>
          <p className="text-xs text-fg-muted">
            {t('settings.danger.whatStays')}
          </p>
          {/* L'adresse attendue est ÉCRITE : on demande de la recopier
              sciemment, pas de la deviner. */}
          <Input
            label={t('settings.danger.confirmLabel')}
            id="danger-confirm-email"
            value={typed}
            autoComplete="off"
            placeholder={email}
            onChange={event => setTyped(event.target.value)}
          />
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            {/* `loading` plutôt que `disabled` : le bouton garde le focus
                pendant l'appel, et le socle neutralise le clic lui-même. */}
            <Button
              type="submit"
              variant="danger"
              loading={busy}
              className="flex-1"
            >
              {t('settings.danger.confirm')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={reset}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
