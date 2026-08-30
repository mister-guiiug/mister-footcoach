import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RegisterSW } from '@mister-guiiug/dev-wpa-config/react/use-update-prompt';
import { I18nProvider } from '../i18n';
import { UpdateBanner } from './UpdateBanner';

/**
 * `virtual:pwa-register` n'existe qu'au build Vite ; le setup partagé le
 * remplace par un `registerSW` inerte, qui ne signale JAMAIS rien. On le
 * re-mocke ici par un double pilotable : c'est le seul moyen de rejouer ce que
 * fait un vrai service worker (« une nouvelle version attend »), donc de
 * prouver que le bandeau peut réellement apparaître — un bandeau muet compile
 * exactement comme un bandeau qui marche.
 *
 * Le getter n'est pas une coquetterie. Le hook du socle mémorise sa connexion
 * PAR fonction `registerSW` (WeakMap), pour ne pas doubler les écouteurs : un
 * double unique garderait `needRefresh` à vrai d'un test au suivant. Chaque
 * test reçoit donc sa propre fonction.
 */
const sw = vi.hoisted(() => ({
  register: null as RegisterSW | null,
  /** Rappel capté à l'enregistrement, `null` tant que rien n'a enregistré. */
  onNeedRefresh: null as (() => void) | null,
}));

vi.mock('virtual:pwa-register', () => ({
  get registerSW() {
    return sw.register;
  },
}));

function mount() {
  return render(
    <I18nProvider>
      <UpdateBanner />
    </I18nProvider>
  );
}

/** Rejoue le signal du service worker : une nouvelle version est prête. */
function announceUpdate() {
  expect(sw.onNeedRefresh).toBeTypeOf('function');
  act(() => sw.onNeedRefresh?.());
}

describe('UpdateBanner', () => {
  beforeEach(() => {
    // La locale est persistée : sans ce nettoyage, le dernier test imposerait
    // l'anglais aux suivants.
    localStorage.clear();
    sw.onNeedRefresh = null;
    sw.register = vi.fn(options => {
      sw.onNeedRefresh = options?.onNeedRefresh ?? null;
      return () => Promise.resolve();
    });
  });

  it('injects registerSW into the shared hook', () => {
    mount();
    expect(sw.register).toHaveBeenCalledWith(
      expect.objectContaining({ onNeedRefresh: expect.any(Function) })
    );
  });

  it('renders nothing while no update has been announced', () => {
    const { container } = mount();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the banner when the service worker announces an update', () => {
    mount();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    announceUpdate();

    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('data-dwc', 'update-banner');
    expect(banner).toHaveTextContent('Mise à jour disponible');
    expect(
      screen.getByRole('button', { name: 'Actualiser' })
    ).toBeInTheDocument();
  });

  // Changement observable : l'ancien bandeau local n'avait qu'un bouton, donc
  // aucune issue autre que recharger. Celui du socle en offre toujours une.
  it('lets the user set the banner aside', async () => {
    mount();
    announceUpdate();

    await userEvent.click(screen.getByRole('button', { name: 'Plus tard' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('speaks the language selected in the app', () => {
    localStorage.setItem('footcoach_locale', 'en');
    mount();
    announceUpdate();

    expect(screen.getByRole('status')).toHaveTextContent('Update available');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Later' })).toBeInTheDocument();
  });
});
