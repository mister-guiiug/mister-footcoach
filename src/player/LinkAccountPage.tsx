import { useState, type FormEvent } from 'react';
import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Input } from '../components/ui/Input';
import { DangerZoneCard } from '../components/features/settings/DangerZoneCard';
import { useAuth } from '../auth/AuthContext';
import { useAppContext } from '../store/AppContext';
import { useI18n } from '../i18n';
import {
  PlayerAccountError,
  redeemInvitation,
} from '../backend/playerAccounts';
import {
  INVITATION_CODE_LENGTH,
  normalizeInvitationCode,
} from '../utils/invitationCode';

/**
 * UN COMPTE CONNECTÉ, MAIS RATTACHÉ À RIEN — mode `supabase`.
 *
 * Deux personnes arrivent ici, et l'écran parle aux deux :
 *  - l'ENFANT qui vient de créer son compte : il saisit le code de son parent,
 *    et `redeem_player_invitation` le rattache à sa fiche ;
 *  - l'ADULTE que l'administrateur n'a pas encore rattaché (étape 3 de
 *    `docs/supabase.md`) : ce code n'est pas pour lui, et on le lui dit.
 *
 * Une fiche SANS RÔLE (`hasProfile`) ne se rattache pas par un code : la base
 * refuserait (`compte_deja_rattache`). L'écran dit alors qui peut agir.
 *
 * On peut aussi effacer ce compte d'ici : un compte dont l'accès a été retiré
 * par un parent n'a plus de raison d'exister, et son titulaire doit pouvoir le
 * supprimer sans écrire à personne.
 */
export default function LinkAccountPage({
  hasProfile,
}: {
  hasProfile: boolean;
}) {
  const { t } = useI18n();
  const { session, signOut } = useAuth();
  const { refresh } = useAppContext();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeInvitationCode(code);
    // Un code incomplet ne part pas : la base répondrait « inconnu », ce qui
    // est vrai mais n'aide pas à voir la faute de frappe.
    if (normalized.length !== INVITATION_CODE_LENGTH) {
      setError(t('linkAccount.incomplete'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await redeemInvitation(normalized);
      // La fiche vient d'être créée : relire la base fait passer
      // `RoleSwitch` sur la page du joueur. Cet écran disparaît avec.
      await refresh?.();
    } catch (failure) {
      setError(
        t(
          `playerAccount.errors.${
            failure instanceof PlayerAccountError ? failure.code : 'inconnue'
          }`
        )
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-sm space-y-4">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-2xl">
              ⚽
            </span>
            <h1 className="text-lg font-bold text-fg-heading">
              {t('linkAccount.title')}
            </h1>
          </div>

          {hasProfile ? (
            <p className="text-sm text-fg-muted">{t('linkAccount.noRole')}</p>
          ) : (
            <form
              onSubmit={event => void submit(event)}
              className="space-y-3"
              noValidate
            >
              <p className="text-sm text-fg-muted">{t('linkAccount.intro')}</p>
              <Input
                id="invitation-code"
                label={t('linkAccount.codeLabel')}
                value={code}
                onChange={event => setCode(event.target.value.toUpperCase())}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={20}
                aria-describedby="invitation-code-hint"
                className="font-mono"
              />
              <p id="invitation-code-hint" className="text-xs text-fg-faint">
                {t('linkAccount.codeHint')}
              </p>
              {error && (
                <p role="alert" className="text-xs text-red-600">
                  {error}
                </p>
              )}
              <Button type="submit" loading={busy} className="w-full">
                {t('linkAccount.submit')}
              </Button>
              <p className="text-xs text-fg-muted">
                {t('linkAccount.adultHint')}
              </p>
            </form>
          )}

          <div className="border-t border-border-ui pt-3">
            {session?.user.email && (
              <p className="mb-2 text-xs text-fg-faint">
                {t('linkAccount.signedInAs', { email: session.user.email })}
              </p>
            )}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => void signOut()}
            >
              {t('linkAccount.signOut')}
            </Button>
          </div>
        </Card>
        <DangerZoneCard />
      </div>
    </div>
  );
}
