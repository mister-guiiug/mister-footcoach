import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { I18nProvider } from '../i18n';
import { ConnectionBanner } from './ConnectionBanner';

/**
 * CE QUE CES TESTS VERROUILLENT, DANS L'ORDRE D'IMPORTANCE.
 *
 * 1. LE BANDEAU SE TAIT AVEC LE BACKEND LOCAL. C'est le défaut de
 *    `VITE_BACKEND`, et le mode dans lequel tourne la majorité des
 *    installations : tout l'état vit dans `localStorage`, une séance créée
 *    sans réseau est enregistrée comme les autres. Annoncer « hors connexion »
 *    y serait une FAUSSE ALERTE — et une fausse alerte apprend à ignorer les
 *    vraies. Rien dans le typage ni dans le rendu ne signalerait cette
 *    régression : le bandeau s'afficherait, simplement, à tort.
 *
 * 2. IL NE CLIGNOTE PAS. La temporisation du socle (1,5 s hors ligne CONTINU)
 *    est ce qui distingue un signal d'un scintillement au bord du terrain. Un
 *    test qui se contenterait de « offline ⇒ bandeau » passerait tout aussi
 *    bien avec une version SANS temporisation : on éprouve donc les deux
 *    bords, 1499 ms et 1500 ms.
 *
 * `BACKEND` est lu à l'import du module ; le double est donc un GETTER, sur le
 * modèle de `UpdateBanner.test.tsx` — chaque test choisit son backend sans
 * réimporter quoi que ce soit.
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

function goOffline() {
  setNavigatorOnline(false);
  act(() => {
    window.dispatchEvent(new Event('offline'));
  });
}

function goOnline() {
  setNavigatorOnline(true);
  act(() => {
    window.dispatchEvent(new Event('online'));
  });
}

/** Laisse passer `ms` de temps simulé, rendus React compris. */
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function mount() {
  return render(
    <I18nProvider>
      <ConnectionBanner />
    </I18nProvider>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  // La locale est persistée : sans ce nettoyage, le dernier test imposerait sa
  // langue aux suivants.
  localStorage.clear();
  backend.current = 'supabase';
  setNavigatorOnline(true);
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  setNavigatorOnline(true);
});

describe('ConnectionBanner', () => {
  it('reste muet avec le backend local, même hors ligne', () => {
    backend.current = 'local';
    const { container } = mount();

    goOffline();
    advance(5000);

    expect(container).toBeEmptyDOMElement();
  });

  it('ne rend rien tant que le réseau est là', () => {
    const { container } = mount();

    expect(container).toBeEmptyDOMElement();
  });

  it('ne clignote pas : rien avant la temporisation', () => {
    mount();

    goOffline();
    advance(1499);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('s’affiche après 1,5 s hors ligne continu', () => {
    mount();

    goOffline();
    advance(1500);

    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('data-dwc', 'connection-banner');
    // Il ne promet PAS un envoi différé : il n'y a pas de file d'attente.
    expect(banner).toHaveTextContent(
      'Hors connexion — les modifications ne seront pas enregistrées sur le serveur.'
    );
  });

  it('disparaît dès le retour du réseau, sans attendre', () => {
    mount();
    goOffline();
    advance(1500);
    expect(screen.getByRole('status')).toBeInTheDocument();

    goOnline();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('deux coupures brèves ne s’additionnent pas', () => {
    mount();

    goOffline();
    advance(1000);
    goOnline();
    goOffline();
    advance(1000);

    // 2 000 ms hors ligne au total, mais jamais 1 500 d'affilée.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    advance(500);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('parle la langue choisie dans l’application', () => {
    localStorage.setItem('footcoach_locale', 'en');
    mount();

    goOffline();
    advance(1500);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Offline — changes will not be saved to the server.'
    );
  });
});
