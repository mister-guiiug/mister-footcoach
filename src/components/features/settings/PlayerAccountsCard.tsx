import { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, UserX } from 'lucide-react';
import { Card } from '@mister-guiiug/dev-pwa-config/react/card';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { ConfirmDialog } from '@mister-guiiug/dev-pwa-config/react/confirm-dialog';
import { ShareButton } from '@mister-guiiug/dev-pwa-config/react/share-button';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import {
  copyToClipboard,
  currentAppUrl,
} from '@mister-guiiug/dev-pwa-config/share';
import { useAppContext, useCurrentUser } from '../../../store/AppContext';
import { useI18n } from '../../../i18n';
import {
  createInvitation,
  listInvitations,
  PlayerAccountError,
  revokePlayerAccess,
  type IssuedInvitation,
} from '../../../backend/playerAccounts';
import {
  invitationStatus,
  isPlayerOnly,
  type InvitationStatus,
} from '../../../utils/playerAccount';
import { formatInvitationCode } from '../../../utils/invitationCode';
import { formatDay } from '../../../utils/date';
import type { Player, PlayerInvitation } from '../../../types';

/**
 * LE COMPTE JOUEUR, CÔTÉ PARENT — et côté administrateur (mode `supabase`
 * seulement ; `SettingsPage` ne la monte pas en mode local).
 *
 * LE PARENT, pour chacun de ses enfants (`contacts."playerIds"`) : où en est
 * son compte, et les deux gestes qui le gouvernent.
 *  - CRÉER UN CODE vaut CONSENTEMENT (RGPD art. 8, § 18) : il est donc demandé
 *    en toutes lettres, dans une boîte qui dit ce que l'enfant verra et que
 *    ce consentement se retire. Le code n'est montré qu'UNE fois — la base
 *    n'en garde que le haché —, avec de quoi le copier ou le partager.
 *  - COUPER L'ACCÈS, à tout moment : le code en attente ne sert plus, et le
 *    compte ouvert est fermé.
 *
 * L'ADMINISTRATEUR voit les comptes joueurs du club, et qui y a consenti.
 * Il peut aussi couper un accès — le recours quand un parent n'est plus
 * joignable. Il ne peut PAS créer de code : il ne consent pas à la place
 * d'un parent (la base le refuse, `parent_non_lie`).
 *
 * Invisible pour qui n'est ni parent lié, ni administrateur.
 */
export function PlayerAccountsCard() {
  const { t } = useI18n();
  const toast = useToast();
  const { state, refresh } = useAppContext();
  const me = useCurrentUser();
  const [invitations, setInvitations] = useState<PlayerInvitation[] | null>(
    null
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [issued, setIssued] = useState<
    (IssuedInvitation & { player: Player }) | null
  >(null);
  const [consentFor, setConsentFor] = useState<Player | null>(null);
  const [revokeFor, setRevokeFor] = useState<Player | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = me?.roles.includes('admin') ?? false;
  const childIds = me
    ? [
        ...new Set(
          state.contacts
            .filter(c => c.userId === me.id)
            .flatMap(c => c.playerIds)
        ),
      ]
    : [];
  const children = childIds
    .map(id => state.players.find(p => p.id === id))
    .filter((p): p is Player => Boolean(p));
  const accounts = isAdmin
    ? state.users.filter(u => u.playerId && isPlayerOnly(u))
    : [];
  const visible = children.length > 0 || isAdmin;

  // Relue après chaque geste : la base seule dit où en est une invitation.
  const load = useCallback(async () => {
    try {
      setInvitations(await listInvitations());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    listInvitations()
      .then(rows => {
        if (!alive) return;
        setInvitations(rows);
        setLoadFailed(false);
      })
      .catch(() => {
        if (alive) setLoadFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [visible]);

  if (!visible) return null;

  function message(failure: unknown): string {
    return t(
      `playerAccount.errors.${
        failure instanceof PlayerAccountError ? failure.code : 'inconnue'
      }`
    );
  }

  async function confirmInvite(player: Player) {
    setBusy(true);
    setError(null);
    try {
      const invitation = await createInvitation(player.id);
      setIssued({ ...invitation, player });
      setConsentFor(null);
      await load();
    } catch (failure) {
      setConsentFor(null);
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }

  async function confirmRevoke(player: Player) {
    setBusy(true);
    setError(null);
    try {
      await revokePlayerAccess(player.id);
      setRevokeFor(null);
      if (issued?.player.id === player.id) setIssued(null);
      toast.success(t('playerAccount.revoked'));
      await load();
      // Le compte fermé disparaît de l'annuaire que lit l'administrateur.
      await refresh?.();
    } catch (failure) {
      setRevokeFor(null);
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }

  async function copyCode(code: string) {
    if (await copyToClipboard(formatInvitationCode(code))) {
      toast.success(t('playerAccount.copied'));
    } else {
      toast.error(t('playerAccount.copyFailed'));
    }
  }

  function statusLine(status: InvitationStatus): string {
    switch (status.kind) {
      case 'active':
        return t('playerAccount.statusActive', {
          date: formatDay(status.since),
        });
      case 'pending':
        return t('playerAccount.statusPending', {
          date: formatDay(status.expiresAt),
        });
      case 'expired':
        return t('playerAccount.statusExpired', {
          date: formatDay(status.expiresAt),
        });
      default:
        return t('playerAccount.statusNone');
    }
  }

  function userName(userId: string): string | null {
    const user = state.users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : null;
  }

  const now = new Date();

  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <KeyRound size={16} aria-hidden="true" className="text-fg-muted" />
        <h2 className="text-sm font-semibold text-fg-heading">
          {t('playerAccount.title')}
        </h2>
      </div>

      {error && (
        <p role="alert" className="mb-3 text-xs text-red-600">
          {error}
        </p>
      )}
      {loadFailed && (
        <p role="alert" className="mb-3 text-xs text-red-600">
          {t('playerAccount.loadFailed')}
        </p>
      )}

      {children.length > 0 && (
        <>
          <p className="mb-3 text-xs text-fg-muted">
            {t('playerAccount.intro')}
          </p>
          <ul className="space-y-2">
            {children.map(player => {
              const status = invitationStatus(
                invitations ?? [],
                player.id,
                now
              );
              const name = `${player.firstName} ${player.lastName}`;
              return (
                <li
                  key={player.id}
                  className="rounded-xl border border-border-ui p-3"
                >
                  <p className="text-sm font-medium text-fg">{name}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {invitations === null ? '…' : statusLine(status)}
                  </p>
                  {issued?.player.id === player.id && (
                    <IssuedCode
                      invitation={issued}
                      onCopy={() => void copyCode(issued.code)}
                      onDone={() => setIssued(null)}
                    />
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {status.kind !== 'active' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setConsentFor(player)}
                        aria-disabled={invitations === null || undefined}
                      >
                        <KeyRound size={14} aria-hidden="true" />
                        {status.kind === 'pending'
                          ? t('playerAccount.newCode')
                          : t('playerAccount.invite')}
                      </Button>
                    )}
                    {(status.kind === 'active' ||
                      status.kind === 'pending') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRevokeFor(player)}
                      >
                        <UserX size={14} aria-hidden="true" />
                        {t('playerAccount.revoke')}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {isAdmin && (
        <div className={children.length > 0 ? 'mt-4' : ''}>
          <h3 className="mb-2 text-xs font-semibold text-fg-heading">
            {t('playerAccount.adminTitle')}
          </h3>
          {accounts.length === 0 ? (
            <p className="text-xs text-fg-muted">
              {t('playerAccount.adminNone')}
            </p>
          ) : (
            <ul className="space-y-2">
              {accounts.map(account => {
                const player = state.players.find(
                  p => p.id === account.playerId
                );
                const invitation = invitations?.find(
                  i => i.redeemedBy === account.id
                );
                const parent = invitation
                  ? userName(invitation.createdBy)
                  : null;
                return (
                  <li
                    key={account.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-border-ui p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg">
                        {player
                          ? `${player.firstName} ${player.lastName}`
                          : `${account.firstName} ${account.lastName}`}
                      </p>
                      <p className="truncate text-xs text-fg-muted">
                        {account.email}
                      </p>
                      <p className="text-xs text-fg-faint">
                        {invitation && parent
                          ? t('playerAccount.adminConsent', {
                              parent,
                              date: formatDay(invitation.consentedAt),
                            })
                          : t('playerAccount.adminConsentUnknown')}
                      </p>
                    </div>
                    {player && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRevokeFor(player)}
                      >
                        <UserX size={14} aria-hidden="true" />
                        {t('playerAccount.revoke')}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {consentFor && (
        <ConfirmDialog
          open
          title={t('playerAccount.consentTitle', {
            name: consentFor.firstName,
          })}
          message={t('playerAccount.consentBody', {
            name: consentFor.firstName,
          })}
          confirmLabel={t('playerAccount.consentConfirm')}
          cancelLabel={t('common.cancel')}
          loading={busy}
          onConfirm={() => void confirmInvite(consentFor)}
          onCancel={() => setConsentFor(null)}
        />
      )}

      {revokeFor && (
        <ConfirmDialog
          open
          destructive
          title={t('playerAccount.revokeTitle', { name: revokeFor.firstName })}
          message={t('playerAccount.revokeBody', {
            name: revokeFor.firstName,
          })}
          confirmLabel={t('playerAccount.revokeConfirm')}
          cancelLabel={t('common.cancel')}
          loading={busy}
          onConfirm={() => void confirmRevoke(revokeFor)}
          onCancel={() => setRevokeFor(null)}
        />
      )}
    </Card>
  );
}

/**
 * Le code, montré UNE fois. En gros, en chasse fixe, en trois blocs — il se
 * lit à voix haute, au téléphone ou dans un vestiaire. Annoncé à qui ne le
 * voit pas (`aria-live`).
 */
function IssuedCode({
  invitation,
  onCopy,
  onDone,
}: {
  invitation: IssuedInvitation & { player: Player };
  onCopy: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const code = formatInvitationCode(invitation.code);
  const until = formatDay(invitation.expiresAt);
  return (
    <div
      aria-live="polite"
      className="mt-3 rounded-xl bg-primary-subtle p-3 text-fg"
    >
      <p className="text-xs font-semibold">
        {t('playerAccount.codeTitle', { name: invitation.player.firstName })}
      </p>
      <p className="py-2 text-center font-mono text-xl font-bold">{code}</p>
      <p className="text-xs">{t('playerAccount.codeOnce', { date: until })}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onCopy}>
          <Copy size={14} aria-hidden="true" />
          {t('playerAccount.copy')}
        </Button>
        <ShareButton
          title={t('playerAccount.shareTitle')}
          text={t('playerAccount.shareText', { code, date: until })}
          url={currentAppUrl()}
          label={t('playerAccount.share')}
          copiedLabel={t('playerAccount.copied')}
          failedLabel={t('playerAccount.copyFailed')}
        />
        <Button size="sm" variant="ghost" onClick={onDone}>
          {t('playerAccount.done')}
        </Button>
      </div>
    </div>
  );
}
