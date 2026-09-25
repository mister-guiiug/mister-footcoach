/**
 * Le rapport d'assiduité depuis les statistiques : la période (la saison par
 * défaut), le refus d'une période à l'envers, et le fichier qui part.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MOCK_DATA } from '../data/mock';
import { STORAGE_KEY } from '../store/storage';
import { renderWithProviders } from '../test/helpers';
import { pdfText } from '../test/pdf';
import StatsPage from './StatsPage';

const downloadPdf = vi.hoisted(() =>
  vi.fn((_bytes: Uint8Array, _filename: string) => true)
);
vi.mock('@mister-guiiug/dev-pwa-config/pdf', async importOriginal => ({
  ...(await importOriginal<
    typeof import('@mister-guiiug/dev-pwa-config/pdf')
  >()),
  downloadPdf,
}));

/**
 * Le module PDF est chargé par `import()` au clic : la première fois, Vite le
 * transforme. Sur une machine chargée, ça dépasse la seconde d'attente par
 * défaut de `findBy` et de `vi.waitFor` — on mesure l'export, pas le compilateur.
 */
const LAZY = { timeout: 5000 };

beforeEach(() => {
  localStorage.clear();
  downloadPdf.mockClear();
});

const exportButton = () =>
  screen.getByRole('button', {
    name: "Exporter en PDF : rapport d'assiduité",
  });

describe('StatsPage — rapport d’assiduité en PDF', () => {
  it('propose la saison active comme période par défaut', () => {
    renderWithProviders(<StatsPage />);
    expect(screen.getByText("Rapport d'assiduité")).toBeInTheDocument();
    expect(screen.getByLabelText('Du')).toHaveValue('2025-08-01');
    expect(screen.getByLabelText('Au')).toHaveValue('2026-06-30');
  });

  it('télécharge le rapport de l’équipe filtrée, sur la période choisie', async () => {
    renderWithProviders(<StatsPage />);
    await userEvent.click(exportButton());
    expect(
      await screen.findByText('PDF téléchargé.', {}, LAZY)
    ).toBeInTheDocument();
    const [bytes, filename] = downloadPdf.mock.calls[0]!;
    expect(filename).toBe('assiduite-u13-a-2025-08-01-2026-06-30.pdf');
    const text = pdfText(bytes);
    expect(text).toContain('FC Exemple');
    expect(text).toContain("Total de l'équipe");
    expect(text).toContain('75 %');

    // Autre équipe, autre période : les deux se retrouvent dans le fichier.
    await userEvent.click(screen.getByRole('button', { name: 'U13 B' }));
    fireEvent.change(screen.getByLabelText('Du'), {
      target: { value: '2026-05-01' },
    });
    await userEvent.click(exportButton());
    await vi.waitFor(() => expect(downloadPdf).toHaveBeenCalledTimes(2), LAZY);
    expect(downloadPdf.mock.calls[1]![1]).toBe(
      'assiduite-u13-b-2026-05-01-2026-06-30.pdf'
    );
  });

  it('accepte une période ouverte d’un côté ou des deux', async () => {
    renderWithProviders(<StatsPage />);
    fireEvent.change(screen.getByLabelText('Du'), { target: { value: '' } });
    await userEvent.click(exportButton());
    await vi.waitFor(() => expect(downloadPdf).toHaveBeenCalledTimes(1), LAZY);
    expect(downloadPdf.mock.calls[0]![1]).toBe(
      'assiduite-u13-a-2026-06-30.pdf'
    );
    fireEvent.change(screen.getByLabelText('Au'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Du'), {
      target: { value: '2026-01-01' },
    });
    await userEvent.click(exportButton());
    await vi.waitFor(() => expect(downloadPdf).toHaveBeenCalledTimes(2), LAZY);
    expect(downloadPdf.mock.calls[1]![1]).toBe(
      'assiduite-u13-a-2026-01-01.pdf'
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ne nomme la saison que si la période y tient', async () => {
    renderWithProviders(<StatsPage />);
    await userEvent.click(exportButton());
    await vi.waitFor(() => expect(downloadPdf).toHaveBeenCalledTimes(1), LAZY);
    expect(pdfText(downloadPdf.mock.calls[0]![0])).toContain('2025-2026');

    // Débordement avant la saison, puis après : plus de nom de saison.
    fireEvent.change(screen.getByLabelText('Du'), {
      target: { value: '2025-07-01' },
    });
    await userEvent.click(exportButton());
    await vi.waitFor(() => expect(downloadPdf).toHaveBeenCalledTimes(2), LAZY);
    expect(pdfText(downloadPdf.mock.calls[1]![0])).not.toContain('Saison');

    fireEvent.change(screen.getByLabelText('Du'), {
      target: { value: '2025-08-01' },
    });
    fireEvent.change(screen.getByLabelText('Au'), {
      target: { value: '2026-07-31' },
    });
    await userEvent.click(exportButton());
    await vi.waitFor(() => expect(downloadPdf).toHaveBeenCalledTimes(3), LAZY);
    expect(pdfText(downloadPdf.mock.calls[2]![0])).not.toContain('Saison');
  });

  it('sans équipe, ne propose pas de rapport', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...MOCK_DATA, teams: [], selectedTeamId: '' })
    );
    renderWithProviders(<StatsPage />);
    expect(screen.queryByText("Rapport d'assiduité")).not.toBeInTheDocument();
  });

  it('refuse une période à l’envers, sans voler le focus du bouton', async () => {
    renderWithProviders(<StatsPage />);
    fireEvent.change(screen.getByLabelText('Au'), {
      target: { value: '2025-07-01' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La date de début doit précéder la date de fin.'
    );
    expect(screen.getByLabelText('Du')).toHaveAttribute('aria-invalid', 'true');
    const button = exportButton();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute(
      'aria-describedby',
      'attendance-period-error'
    );
    await userEvent.click(button);
    expect(downloadPdf).not.toHaveBeenCalled();
  });
});
