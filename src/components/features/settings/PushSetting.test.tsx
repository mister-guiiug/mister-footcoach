import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../../i18n';

/**
 * LE RÉGLAGE PUSH — chaque « non » dit pourquoi, et le « oui » se retire.
 *
 * `lib/push` est doublé : sa mécanique a ses tests (`src/lib/push.test.ts`).
 * Ici, ce que l'écran en fait.
 */
vi.mock('../../../backend/config', () => ({ BACKEND: 'supabase' }));
const session = vi.hoisted(() => ({ userId: 'auth-coach' as string | null }));
vi.mock('../../../auth/AuthContext', () => ({
  useSessionUserId: () => session.userId,
}));
const push = vi.hoisted(() => ({
  deployed: true,
  support: {
    supported: true,
    reason: null as string | null,
    standalone: false,
  },
  denied: false,
  currentPushEndpoint: vi.fn<() => Promise<string | null>>(() =>
    Promise.resolve(null)
  ),
  enablePush: vi.fn<(userId: string) => Promise<'on' | 'denied' | 'error'>>(
    () => Promise.resolve('on')
  ),
  disablePush: vi.fn<() => Promise<void>>(() => Promise.resolve()),
}));
vi.mock('../../../lib/push', () => ({
  pushDeployed: () => push.deployed,
  pushBrowserSupport: () => push.support,
  pushPermissionDenied: () => push.denied,
  currentPushEndpoint: () => push.currentPushEndpoint(),
  enablePush: (userId: string) => push.enablePush(userId),
  disablePush: () => push.disablePush(),
}));

import { PushSetting } from './PushSetting';

function monter() {
  return render(
    <I18nProvider>
      <ToastProvider>
        <PushSetting />
      </ToastProvider>
    </I18nProvider>
  );
}

const interrupteur = () =>
  screen.getByRole('switch', { name: 'Recevoir sur cet appareil' });

describe('le réglage push', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.userId = 'auth-coach';
    push.deployed = true;
    push.support = { supported: true, reason: null, standalone: false };
    push.denied = false;
    push.currentPushEndpoint.mockImplementation(() => Promise.resolve(null));
    push.enablePush.mockImplementation(() => Promise.resolve('on'));
    push.disablePush.mockImplementation(() => Promise.resolve());
  });

  it('sans clé VAPID au build : il le dit, et ne propose rien', () => {
    push.deployed = false;
    monter();
    expect(
      screen.getByText(
        'Les notifications push ne sont pas encore activées sur cette installation.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(push.currentPushEndpoint).not.toHaveBeenCalled();
  });

  it('un iPhone en onglet : le geste qui lève le refus', () => {
    push.support = {
      supported: false,
      reason: 'requires-installed-app',
      standalone: false,
    };
    monter();
    expect(
      screen.getByText(/ajoutez d'abord l'application à l'écran d'accueil/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('un navigateur qui ne sait pas', () => {
    push.support = {
      supported: false,
      reason: 'no-service-worker',
      standalone: false,
    };
    monter();
    expect(
      screen.getByText(
        'Ce navigateur ne sait pas recevoir de notifications push.'
      )
    ).toBeInTheDocument();
  });

  it('une permission déjà refusée : les réglages du navigateur, pas un bouton', async () => {
    push.denied = true;
    monter();
    expect(
      await screen.findByText(/Les notifications sont bloquées pour ce site/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('s’active, au nom de l’identité de la session, et le consentement est écrit', async () => {
    monter();
    await waitFor(() =>
      expect(interrupteur()).not.toHaveAttribute('aria-busy')
    );
    expect(interrupteur()).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByText(/L'activation vaut consentement/)
    ).toBeInTheDocument();

    await userEvent.click(interrupteur());

    expect(push.enablePush).toHaveBeenCalledWith('auth-coach');
    await waitFor(() =>
      expect(interrupteur()).toHaveAttribute('aria-checked', 'true')
    );
    expect(
      screen.getByText('Notifications push activées sur cet appareil.')
    ).toBeInTheDocument();
  });

  it('un refus à la fenêtre d’autorisation : le message, pas une panne', async () => {
    push.enablePush.mockResolvedValueOnce('denied');
    monter();
    await waitFor(() =>
      expect(interrupteur()).not.toHaveAttribute('aria-busy')
    );
    await userEvent.click(interrupteur());
    expect(
      await screen.findByText(/Les notifications sont bloquées pour ce site/)
    ).toBeInTheDocument();
  });

  it('une panne à l’activation est annoncée, et rien ne s’allume', async () => {
    push.enablePush.mockResolvedValueOnce('error');
    monter();
    await waitFor(() =>
      expect(interrupteur()).not.toHaveAttribute('aria-busy')
    );
    await userEvent.click(interrupteur());
    expect(
      await screen.findByText(/Activation impossible/)
    ).toBeInTheDocument();
    expect(interrupteur()).toHaveAttribute('aria-checked', 'false');
  });

  it('sans identité de session, rien ne part', async () => {
    session.userId = null;
    monter();
    await waitFor(() =>
      expect(interrupteur()).not.toHaveAttribute('aria-busy')
    );
    await userEvent.click(interrupteur());
    expect(push.enablePush).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/Activation impossible/)
    ).toBeInTheDocument();
  });

  it('abonné : se désactive', async () => {
    push.currentPushEndpoint.mockResolvedValue('https://push.exemple.test/a');
    monter();
    await waitFor(() =>
      expect(interrupteur()).toHaveAttribute('aria-checked', 'true')
    );
    await userEvent.click(interrupteur());
    expect(push.disablePush).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(interrupteur()).toHaveAttribute('aria-checked', 'false')
    );
    expect(
      screen.getByText('Notifications push désactivées sur cet appareil.')
    ).toBeInTheDocument();
  });

  it('un désabonnement qui échoue laisse l’interrupteur allumé, et le dit', async () => {
    push.currentPushEndpoint.mockResolvedValue('https://push.exemple.test/a');
    push.disablePush.mockRejectedValueOnce(new Error('offline'));
    monter();
    await waitFor(() =>
      expect(interrupteur()).toHaveAttribute('aria-checked', 'true')
    );
    await userEvent.click(interrupteur());
    expect(
      await screen.findByText(/Désactivation impossible/)
    ).toBeInTheDocument();
    expect(interrupteur()).toHaveAttribute('aria-checked', 'true');
  });

  it('un état illisible vaut « désactivé »', async () => {
    push.currentPushEndpoint.mockRejectedValueOnce(new Error('boom'));
    monter();
    await waitFor(() =>
      expect(interrupteur()).not.toHaveAttribute('aria-busy')
    );
    expect(interrupteur()).toHaveAttribute('aria-checked', 'false');
  });

  it('démonté avant la réponse : rien n’est écrit dans un écran parti', async () => {
    let livrer: (value: string | null) => void = () => {};
    let refuser: (error: Error) => void = () => {};
    push.currentPushEndpoint
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            livrer = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            refuser = reject;
          })
      );
    monter().unmount();
    monter().unmount();
    livrer('https://push.exemple.test/a');
    refuser(new Error('boom'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('un clic pendant le chargement ne fait rien', async () => {
    let livrer: (value: string | null) => void = () => {};
    push.currentPushEndpoint.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          livrer = resolve;
        })
    );
    monter();
    expect(interrupteur()).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(interrupteur());
    expect(push.enablePush).not.toHaveBeenCalled();
    livrer(null);
    await waitFor(() =>
      expect(interrupteur()).not.toHaveAttribute('aria-busy')
    );
  });
});
