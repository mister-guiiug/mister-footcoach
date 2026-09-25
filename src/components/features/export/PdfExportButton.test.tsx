import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../../i18n';
import type { PdfOutcome } from '../../../pdf/deliver';
import { PdfExportButton } from './PdfExportButton';

const { trackEvent, recordError } = vi.hoisted(() => ({
  trackEvent: vi.fn((_name: string, _params?: Record<string, unknown>) => true),
  recordError: vi.fn(),
}));
vi.mock('@mister-guiiug/dev-pwa-config/analytics', async importOriginal => ({
  ...(await importOriginal<
    typeof import('@mister-guiiug/dev-pwa-config/analytics')
  >()),
  trackEvent,
}));
vi.mock(
  '@mister-guiiug/dev-pwa-config/react/observability',
  async importOriginal => ({
    ...(await importOriginal<
      typeof import('@mister-guiiug/dev-pwa-config/react/observability')
    >()),
    recordError,
  })
);

afterEach(() => {
  trackEvent.mockClear();
  recordError.mockClear();
});

function renderButton(
  onExport: () => Promise<PdfOutcome>,
  extra: { blocked?: boolean; describedBy?: string } = {}
) {
  render(
    <I18nProvider>
      <PdfExportButton
        onExport={onExport}
        ariaLabel="Exporter en PDF : feuille de match"
        objet="feuille_de_match"
        {...extra}
      />
    </I18nProvider>
  );
  return screen.getByRole('button', {
    name: 'Exporter en PDF : feuille de match',
  });
}

describe('PdfExportButton', () => {
  it('porte le libellé visible au début de son nom accessible', () => {
    const button = renderButton(async () => 'downloaded');
    expect(button).toHaveTextContent('Exporter en PDF');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('annonce la préparation, puis ce qui s’est réellement passé', async () => {
    let resolve!: (outcome: PdfOutcome) => void;
    const button = renderButton(
      () => new Promise<PdfOutcome>(r => (resolve = r))
    );
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Préparation du PDF…');

    resolve('downloaded');
    expect(await screen.findByText('PDF téléchargé.')).toBeInTheDocument();
    expect(button).not.toHaveAttribute('aria-busy');
    // L'issue est comptée, jamais le contenu du document.
    expect(trackEvent).toHaveBeenCalledWith('export', {
      format: 'pdf',
      objet: 'feuille_de_match',
      issue: 'downloaded',
    });
  });

  it('dit « partagé » quand la feuille du système a pris le relais', async () => {
    await userEvent.click(renderButton(async () => 'shared'));
    expect(await screen.findByText('PDF partagé.')).toBeInTheDocument();
  });

  it('ne dit ni ne compte rien quand l’utilisateur a fermé le partage', async () => {
    const onExport = vi.fn(async (): Promise<PdfOutcome> => 'cancelled');
    await userEvent.click(renderButton(onExport));
    expect(onExport).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('dit l’échec d’un module introuvable, et le remonte', async () => {
    const error = new Error('Failed to fetch dynamically imported module');
    await userEvent.click(renderButton(() => Promise.reject(error)));
    expect(
      await screen.findByText("L'export PDF a échoué. Réessayez.")
    ).toBeInTheDocument();
    expect(recordError).toHaveBeenCalledWith(error, {
      source: 'export-pdf',
      objet: 'feuille_de_match',
    });
    expect(trackEvent).toHaveBeenCalledWith('export', {
      format: 'pdf',
      objet: 'feuille_de_match',
      issue: 'failed',
    });
  });

  it('bloqué, garde le focus mais n’exporte rien', async () => {
    const onExport = vi.fn(async (): Promise<PdfOutcome> => 'downloaded');
    const button = renderButton(onExport, {
      blocked: true,
      describedBy: 'raison',
    });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-describedby', 'raison');
    expect(button).not.toBeDisabled();
    await userEvent.click(button);
    expect(onExport).not.toHaveBeenCalled();
  });
});
