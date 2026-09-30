import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  isAnalyticsLoaded,
  resetAnalytics,
} from '@mister-guiiug/dev-pwa-config/analytics';
import {
  readConsentChoice,
  writeConsentChoice,
} from '@mister-guiiug/dev-pwa-config/react/consent-banner';
import { CLE_DE_TEST } from '@mister-guiiug/dev-pwa-config/testing/posthog';
import { renderWithProviders } from '../test/helpers';
import SettingsPage from './SettingsPage';

/**
 * REVENIR SUR SON CHOIX DE MESURE D'AUDIENCE, DEPUIS LES RÉGLAGES.
 *
 * Le bandeau recueille l'accord ; rien ne permettait de le retirer, sinon
 * d'effacer les données du site. L'article 7.3 du RGPD veut que retirer soit
 * aussi simple que donner : un clic, ici, sur le VRAI écran.
 */

// La vraie bibliothèque, initialisée dans jsdom, partirait interroger PostHog.
// Le double est aussi ce qui fait COURIR le `loader` de l'écran : l'accord
// rejoué au montage l'appelle.
vi.mock('posthog-js/dist/module.slim.js', async () => {
  const { fauxPosthog } =
    await import('@mister-guiiug/dev-pwa-config/testing/posthog');
  return { default: fauxPosthog() };
});

beforeEach(() => {
  // Le setup ne vide pas le stockage : un choix fuirait d'un test à l'autre.
  localStorage.clear();
  vi.stubEnv('VITE_POSTHOG_KEY', CLE_DE_TEST);
  // L'état de la mesure est celui d'un module : il survit d'un test à l'autre.
  resetAnalytics();
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('SettingsPage — la mesure d’audience', () => {
  it('permet de retirer son consentement, en un clic', async () => {
    writeConsentChoice('granted');
    renderWithProviders(<SettingsPage />);

    const titre = await screen.findByRole('heading', {
      name: 'Mesure d’audience',
    });
    const section = titre.closest('section')!;
    expect(within(section).getByRole('status')).toHaveTextContent(
      'Vous avez accepté cette mesure.'
    );
    // L'accord d'hier, rejoué au montage, a chargé la bibliothèque.
    await waitFor(() => expect(isAnalyticsLoaded()).toBe(true));

    fireEvent.click(
      within(section).getByRole('button', { name: 'Retirer mon consentement' })
    );

    expect(readConsentChoice()).toBe('denied');
    const posthog = (await import('posthog-js/dist/module.slim.js')).default;
    expect(posthog.has_opted_out_capturing()).toBe(true);
    expect(within(section).getByRole('status')).toHaveTextContent(
      'Vous avez refusé cette mesure.'
    );
  });

  it('parle la langue de l’app : en anglais, « Withdraw my consent »', async () => {
    localStorage.setItem('footcoach_locale', 'en');
    writeConsentChoice('granted');
    renderWithProviders(<SettingsPage />);

    const titre = await screen.findByRole('heading', {
      name: 'Audience measurement',
    });
    expect(
      within(titre.closest('section')!).getByRole('button', {
        name: 'Withdraw my consent',
      })
    ).toBeInTheDocument();
    // Le chargement rejoué s'achève ICI, et non dans le test suivant.
    await waitFor(() => expect(isAnalyticsLoaded()).toBe(true));
  });

  it('sans identifiant de mesure, aucune carte vide', () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '');
    renderWithProviders(<SettingsPage />);

    expect(screen.getByText('Données de démonstration')).toBeInTheDocument();
    for (const carte of document.querySelectorAll('[data-dwc="card"]'))
      expect(carte).not.toBeEmptyDOMElement();
  });
});
