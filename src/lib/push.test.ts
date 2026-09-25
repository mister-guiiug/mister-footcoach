import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * LE PUSH CÔTÉ CLIENT — le câblage du socle sur NOTRE client Supabase.
 *
 * Le socle est éprouvé chez lui ; ce qui se joue ici est ce que ce fichier
 * ajoute : la clé lue au build, le transport branché sur la table
 * `push_subscriptions` au nom de l'identité d'authentification, la garde
 * « pas de service worker » (sans elle, `serviceWorker.ready` ne rend jamais
 * la main), et la traduction des issues en trois mots pour l'écran.
 *
 * Le navigateur est un DOUBLE passé en `env` : jsdom n'a ni `PushManager`, ni
 * `Notification`, ni service worker.
 */
const { upsert, eq, from } = vi.hoisted(() => {
  const upsert = vi.fn<(row: unknown, options: unknown) => Promise<unknown>>(
    () => Promise.resolve({ error: null })
  );
  const eq = vi.fn<(column: string, value: string) => Promise<unknown>>(() =>
    Promise.resolve({ error: null })
  );
  const from = vi.fn(() => ({ upsert, delete: () => ({ eq }) }));
  return { upsert, eq, from };
});
vi.mock('./supabase', () => ({
  getSupabase: () =>
    Promise.resolve({
      from,
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: 'depuis-la-session' } } }),
      },
    }),
}));

import {
  currentPushEndpoint,
  disablePush,
  enablePush,
  pushBrowserSupport,
  pushDeployed,
  pushPermissionDenied,
  vapidPublicKey,
} from './push';

function fakeSubscription(endpoint = 'https://push.exemple.test/abc') {
  return {
    endpoint,
    expirationTime: null,
    getKey: () => new Uint8Array([1, 2, 3]).buffer,
    unsubscribe: vi.fn(() => Promise.resolve(true)),
  };
}

interface EnvOptions {
  worker?: boolean;
  subscription?: ReturnType<typeof fakeSubscription> | null;
  permission?: NotificationPermission;
  answer?: NotificationPermission;
  pushManager?: boolean;
  registrationFails?: boolean;
}

/** Un navigateur de poche, capable de tout sauf ce qu'on lui retire. */
function fakeEnv({
  worker = true,
  subscription = null,
  permission = 'granted',
  answer = 'granted',
  pushManager = true,
  registrationFails = false,
}: EnvOptions = {}) {
  let current = subscription;
  const registration = {
    pushManager: {
      getSubscription: vi.fn(() => Promise.resolve(current)),
      subscribe: vi.fn(() => {
        current = fakeSubscription();
        return Promise.resolve(current);
      }),
    },
  };
  const env: Record<string, unknown> = {
    navigator: worker
      ? {
          serviceWorker: {
            getRegistration: () =>
              registrationFails
                ? Promise.reject(new Error('SecurityError'))
                : Promise.resolve(registration),
            ready: Promise.resolve(registration),
          },
        }
      : {},
    Notification: {
      permission,
      requestPermission: vi.fn(() => Promise.resolve(answer)),
    },
    matchMedia: () => ({ matches: false }),
  };
  if (pushManager) env.PushManager = function PushManager() {};
  return { env, registration };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BPubliqueDeTest');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('la clé publique VAPID', () => {
  it('posée au build : le push est prévu sur ce déploiement', () => {
    expect(vapidPublicKey()).toBe('BPubliqueDeTest');
    expect(pushDeployed()).toBe(true);
  });

  it('absente : rien n’est prévu', () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
    expect(pushDeployed()).toBe(false);
  });
});

describe('ce que sait le navigateur', () => {
  it('rapporte le support, et sa raison quand il manque', () => {
    expect(pushBrowserSupport(fakeEnv().env).supported).toBe(true);
    // L'iPhone en onglet : un worker, mais pas de PushManager.
    expect(
      pushBrowserSupport(fakeEnv({ pushManager: false }).env)
    ).toMatchObject({ supported: false, reason: 'requires-installed-app' });
  });

  it('sait qu’une permission refusée ne se redemande pas', () => {
    expect(pushPermissionDenied(fakeEnv({ permission: 'denied' }).env)).toBe(
      true
    );
    expect(pushPermissionDenied(fakeEnv().env)).toBe(false);
  });
});

describe('currentPushEndpoint', () => {
  it('sans service worker, ne l’attend pas : null tout de suite', async () => {
    await expect(
      currentPushEndpoint(fakeEnv({ worker: false }).env)
    ).resolves.toBeNull();
  });

  it('un enregistrement illisible vaut « pas de worker »', async () => {
    await expect(
      currentPushEndpoint(fakeEnv({ registrationFails: true }).env)
    ).resolves.toBeNull();
  });

  it('rend l’adresse de l’abonnement de cet appareil', async () => {
    const { env } = fakeEnv({ subscription: fakeSubscription() });
    await expect(currentPushEndpoint(env)).resolves.toBe(
      'https://push.exemple.test/abc'
    );
  });

  it('null quand l’appareil n’est pas abonné', async () => {
    await expect(currentPushEndpoint(fakeEnv().env)).resolves.toBeNull();
  });
});

describe('enablePush', () => {
  it('abonne et enregistre au nom de l’identité d’authentification donnée', async () => {
    await expect(enablePush('auth-uuid', fakeEnv().env)).resolves.toBe('on');
    expect(from).toHaveBeenCalledWith('push_subscriptions');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://push.exemple.test/abc',
        user_id: 'auth-uuid',
      }),
      { onConflict: 'endpoint' }
    );
  });

  it('un refus de l’utilisateur n’est pas une panne', async () => {
    await expect(
      enablePush(
        'auth-uuid',
        fakeEnv({ permission: 'default', answer: 'denied' }).env
      )
    ).resolves.toBe('denied');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('une panne en est une', async () => {
    upsert.mockResolvedValueOnce({ error: { message: 'new row violates' } });
    await expect(enablePush('auth-uuid', fakeEnv().env)).resolves.toBe('error');
  });

  it('sans service worker : une panne, rendue tout de suite', async () => {
    await expect(
      enablePush('auth-uuid', fakeEnv({ worker: false }).env)
    ).resolves.toBe('error');
  });
});

describe('disablePush', () => {
  it('oublie en base D’ABORD, puis désabonne le navigateur', async () => {
    const subscription = fakeSubscription();
    await disablePush(fakeEnv({ subscription }).env);
    expect(eq).toHaveBeenCalledWith(
      'endpoint',
      'https://push.exemple.test/abc'
    );
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(eq.mock.invocationCallOrder[0]!).toBeLessThan(
      subscription.unsubscribe.mock.invocationCallOrder[0]!
    );
  });

  it('rien à faire sans abonnement, ni sans worker', async () => {
    await expect(disablePush(fakeEnv().env)).resolves.toBeUndefined();
    await expect(
      disablePush(fakeEnv({ worker: false }).env)
    ).resolves.toBeUndefined();
    expect(eq).not.toHaveBeenCalled();
  });

  it('lève si la base n’a pas oublié : on n’annonce pas un arrêt qui n’a pas eu lieu', async () => {
    eq.mockResolvedValueOnce({ error: { message: 'offline' } });
    const subscription = fakeSubscription();
    await expect(disablePush(fakeEnv({ subscription }).env)).rejects.toThrow(
      /désabonnement impossible/
    );
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
  });
});
