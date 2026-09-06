import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { I18nProvider } from '../i18n';
import { RemoteWriteNotice } from './RemoteWriteNotice';

/**
 * CE QUE CES TESTS VERROUILLENT, DANS L'ORDRE D'IMPORTANCE.
 *
 * 1. RIEN NE S'AFFICHE AVEC LE BACKEND LOCAL — jamais, même hors ligne. C'est
 *    le défaut de `VITE_BACKEND`, et le mode dans lequel tourne la majorité des
 *    installations : une suppression y aboutit sans réseau comme avec. Un
 *    motif de blocage y serait un mensonge, et un mensonge répété dans quatre
 *    listes.
 *
 * 2. LE MOTIF EST DU TEXTE, PAS UN `title`. C'est toute la raison d'être de ce
 *    composant : les corbeilles de l'application sont des icônes sans texte, et
 *    une infobulle ne s'ouvre qu'à la souris — or on se sert de cette
 *    application sur un téléphone, au bord d'un terrain. Un test qui se
 *    contenterait de « le garde bloque » passerait tout aussi bien avec la
 *    version d'AVANT, où le motif ne vivait que dans l'`aria-label`.
 *
 * `BACKEND` est lu à l'import du module ; le double est donc un GETTER, sur le
 * modèle de `ConnectionBanner.test.tsx`.
 */
const backend = vi.hoisted(() => ({
  current: 'supabase' as 'local' | 'supabase',
}));

vi.mock('../backend/config', () => ({
  get BACKEND() {
    return backend.current;
  },
}));

/** `navigator.onLine` est en lecture seule : jsdom laisse la redéfinir. */
function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
}

/**
 * Bascule hors ligne. L'événement DOIT partir DANS `act` : sinon le
 * `useSyncExternalStore` du socle met à jour son instantané sans que React
 * repasse, et l'assertion suivante lit un rendu périmé.
 */
function goOffline() {
  setNavigatorOnline(false);
  act(() => {
    window.dispatchEvent(new Event('offline'));
  });
}

function renderNotice() {
  return render(
    <I18nProvider>
      <RemoteWriteNotice />
    </I18nProvider>
  );
}

describe('RemoteWriteNotice', () => {
  beforeEach(() => {
    backend.current = 'supabase';
    setNavigatorOnline(true);
  });

  afterEach(() => {
    setNavigatorOnline(true);
  });

  it('ne rend RIEN quand le réseau est là', () => {
    const { container } = renderNotice();
    expect(container).toBeEmptyDOMElement();
  });

  it('avec le backend local, ne rend rien MÊME hors ligne', () => {
    backend.current = 'local';
    const { container } = renderNotice();
    goOffline();
    // Pas un pixel, pas un nœud : le garde est inerte, il n'y a rien à dire.
    expect(container).toBeEmptyDOMElement();
  });

  it('hors ligne en mode Supabase, affiche le motif EN TEXTE', () => {
    renderNotice();
    goOffline();

    // Le motif est du TEXTE VISIBLE, dans la langue de l'app : le libellé
    // vient du socle, traduit par le `LabelsProvider` que monte
    // `I18nProvider`. L'asserter au mot près est ce qui distingue ce test de
    // la version d'avant, où le motif ne vivait que dans l'`aria-label` d'une
    // icône — c'est-à-dire nulle part pour un doigt.
    const notice = screen.getByText('Indisponible hors ligne');
    expect(notice).toBeVisible();
    expect(notice).toHaveAttribute('role', 'status');
  });

  it('repart quand le réseau revient', () => {
    renderNotice();
    goOffline();
    expect(screen.getByRole('status')).toBeInTheDocument();

    setNavigatorOnline(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
