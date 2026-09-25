/**
 * La livraison du PDF : partage natif du FICHIER quand la plateforme le
 * permet, téléchargement sinon — et rien dans le dos de l'utilisateur quand
 * il ferme la feuille de partage.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareOrDownloadPdf } from './deliver';

// Le téléchargement est celui du socle ; on l'intercepte pour savoir ce qui
// serait parti, sous quel nom.
const downloadPdf = vi.hoisted(() =>
  vi.fn((_bytes: Uint8Array, _filename: string) => true)
);
vi.mock('@mister-guiiug/dev-pwa-config/pdf', async importOriginal => ({
  ...(await importOriginal<
    typeof import('@mister-guiiug/dev-pwa-config/pdf')
  >()),
  downloadPdf,
}));

const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // « %PDF »
const FILENAME = 'feuille-de-match-2026-05-10-fc-rivale.pdf';

/** Pose des membres sur `navigator`, retirés après chaque test. */
function stubNavigator(members: Record<string, unknown>) {
  for (const [key, value] of Object.entries(members)) {
    Object.defineProperty(globalThis.navigator, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
}

afterEach(() => {
  for (const key of ['share', 'canShare', 'clipboard']) {
    Reflect.deleteProperty(globalThis.navigator, key);
  }
  downloadPdf.mockReset();
  downloadPdf.mockImplementation(() => true);
});

describe('shareOrDownloadPdf', () => {
  it('partage le FICHIER quand la plateforme le permet', async () => {
    const share = vi.fn(async (_data?: ShareData) => {});
    stubNavigator({ share, canShare: () => true });

    await expect(
      shareOrDownloadPdf(bytes, FILENAME, 'Feuille de match U13 A – FC Rivale')
    ).resolves.toBe('shared');

    const payload = share.mock.calls[0]?.[0];
    expect(payload?.title).toBe('Feuille de match U13 A – FC Rivale');
    expect(payload?.files).toHaveLength(1);
    expect(payload?.files?.[0]?.name).toBe(FILENAME);
    expect(payload?.files?.[0]?.type).toBe('application/pdf');
    expect(downloadPdf).not.toHaveBeenCalled();
  });

  it('télécharge quand la plateforme refuse les fichiers', async () => {
    const share = vi.fn(async () => {});
    stubNavigator({ share, canShare: () => false });

    await expect(shareOrDownloadPdf(bytes, FILENAME, 't')).resolves.toBe(
      'downloaded'
    );
    expect(share).not.toHaveBeenCalled();
    expect(downloadPdf).toHaveBeenCalledWith(bytes, FILENAME);
  });

  it('télécharge quand le navigateur partage, mais sans savoir dire s’il prend un fichier', async () => {
    // `share` sans `canShare` : rien ne garantit que les fichiers passent.
    const share = vi.fn(async () => {});
    stubNavigator({ share });

    await expect(shareOrDownloadPdf(bytes, FILENAME, 't')).resolves.toBe(
      'downloaded'
    );
    expect(share).not.toHaveBeenCalled();
  });

  it('télécharge quand le navigateur ne partage pas du tout', async () => {
    // jsdom, comme Firefox de bureau : ni `share` ni `canShare`.
    await expect(shareOrDownloadPdf(bytes, FILENAME, 't')).resolves.toBe(
      'downloaded'
    );
    expect(downloadPdf).toHaveBeenCalledOnce();
  });

  it('ne télécharge RIEN quand l’utilisateur ferme la feuille de partage', async () => {
    const abort = Object.assign(new Error('abort'), { name: 'AbortError' });
    stubNavigator({
      share: vi.fn(async () => {
        throw abort;
      }),
      canShare: () => true,
    });

    await expect(shareOrDownloadPdf(bytes, FILENAME, 't')).resolves.toBe(
      'cancelled'
    );
    expect(downloadPdf).not.toHaveBeenCalled();
  });

  it('télécharge après un refus de la plateforme, sans toucher au presse-papiers', async () => {
    // L'activation utilisateur a expiré, par exemple. `shareOrCopy` du socle
    // aurait copié le titre dans le presse-papiers : ici, rien de tel.
    const writeText = vi.fn(async () => {});
    const refused = Object.assign(new Error('refus'), {
      name: 'NotAllowedError',
    });
    stubNavigator({
      share: vi.fn(async () => {
        throw refused;
      }),
      canShare: () => true,
      clipboard: { writeText },
    });

    await expect(shareOrDownloadPdf(bytes, FILENAME, 't')).resolves.toBe(
      'downloaded'
    );
    expect(writeText).not.toHaveBeenCalled();
  });

  it('dit l’échec quand même le téléchargement est impossible', async () => {
    downloadPdf.mockImplementation(() => false);
    await expect(shareOrDownloadPdf(bytes, FILENAME, 't')).resolves.toBe(
      'failed'
    );
  });
});
