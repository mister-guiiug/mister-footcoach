import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import { MOCK_DATA } from '../data/mock';
import { SCHEMA_VERSION, STORAGE_KEY } from '../store/storage';
import SettingsPage from './SettingsPage';

/**
 * SAUVEGARDER ET RESTAURER — CE QUI N'EXISTAIT PAS DU TOUT.
 *
 * En mode local, qui est le DÉFAUT, toute la saison tient dans une seule clé
 * de `localStorage`. Jusqu'ici la seule sortie de l'application était l'export
 * RGPD d'UN joueur, qui ne se réimporte pas : aucun `<input type="file">`,
 * aucun `FileReader` dans `src/`. Autrement dit, un navigateur nettoyé, un
 * téléphone changé, et il n'y avait aucun chemin de retour.
 *
 * Ce que ce fichier établit, et qu'une relecture du code ne peut pas établir :
 *  - le fichier exporté PORTE L'ENVELOPPE versionnée, donc il repassera par
 *    les migrations d'une version future au lieu d'être relu à l'aveugle ;
 *  - il se relit LUI-MÊME, à l'écran, sans perte ;
 *  - le fichier d'une AUTRE application est refusé SANS RIEN EFFACER — c'est
 *    la promesse qui compte, et la seule qu'un utilisateur remarquera ;
 *  - un import qui remplace des données DEMANDE, et un « Annuler » n'écrit
 *    rien.
 */

// L'export se termine par un téléchargement : on intercepte `downloadText`
// pour lire le fichier réellement produit plutôt qu'un intermédiaire.
const downloadText = vi.hoisted(() => vi.fn());
vi.mock('@mister-guiiug/dev-pwa-config/download', async importOriginal => ({
  ...(await importOriginal<object>()),
  downloadText,
}));

/** Écrit un instantané NU sous la clé historique, comme avant l'enveloppe. */
function seedRaw(patch: Record<string, unknown> = {}): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...MOCK_DATA,
      selectedTeamId: MOCK_DATA.teams[0]!.id,
      ...patch,
    })
  );
}

/** Donne un fichier au champ masqué, comme le ferait le sélecteur système. */
async function chooseFile(contents: string): Promise<void> {
  const input = screen.getByLabelText('Importer') as HTMLInputElement;
  await userEvent.upload(
    input,
    new File([contents], 'sauvegarde.json', { type: 'application/json' })
  );
}

/** Clique « Exporter » et rend le texte du fichier téléchargé. */
async function exportFile(): Promise<string> {
  downloadText.mockClear();
  await userEvent.click(screen.getByRole('button', { name: /Exporter/ }));
  expect(downloadText).toHaveBeenCalledOnce();
  return downloadText.mock.calls[0]![0] as string;
}

describe('Réglages — sauvegarde et restauration', () => {
  beforeEach(() => {
    localStorage.clear();
    downloadText.mockReset();
  });

  it('exporte l’enveloppe versionnée, sous un nom daté', async () => {
    seedRaw({ season: { ...MOCK_DATA.season, name: 'Saison à moi' } });
    renderWithProviders(<SettingsPage />);

    const json = await exportFile();
    const parsed = JSON.parse(json) as {
      v: number;
      data: { season: { name: string }; players: unknown[] };
    };

    // L'enveloppe est le point : sans elle, une version future relirait ce
    // fichier sans savoir d'où il vient.
    expect(parsed.v).toBe(SCHEMA_VERSION);
    expect(parsed.data.season.name).toBe('Saison à moi');
    expect(parsed.data.players).toHaveLength(MOCK_DATA.players.length);

    const [, filename, mime] = downloadText.mock.calls[0]!;
    expect(filename).toMatch(/^mister-footcoach-\d{4}-\d{2}-\d{2}\.json$/);
    expect(mime).toBe('application/json');
  });

  it('se relit lui-même : exporté ici, réimporté ailleurs, rien ne manque', async () => {
    seedRaw({ season: { ...MOCK_DATA.season, name: 'Saison à moi' } });
    const first = renderWithProviders(<SettingsPage />);
    const backup = await exportFile();
    first.unmount();

    // Le navigateur d'à côté : rien en magasin, donc les données d'exemple.
    localStorage.clear();
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText(MOCK_DATA.season.name)).toBeInTheDocument();

    await chooseFile(backup);
    // Des données existent (celles d'exemple) : l'import DEMANDE.
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Importer',
      })
    );

    expect(screen.getByText('Saison à moi')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      `${MOCK_DATA.players.length} joueur(s)`
    );
    // Et c'est ÉCRIT : rouvrir l'application doit retrouver le fichier.
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as {
      v: number;
      data: { season: { name: string } };
    };
    expect(stored.v).toBe(SCHEMA_VERSION);
    expect(stored.data.season.name).toBe('Saison à moi');
  });

  it('relit aussi un instantané NU, écrit avant l’enveloppe', async () => {
    renderWithProviders(<SettingsPage />);

    await chooseFile(
      JSON.stringify({
        ...MOCK_DATA,
        season: { ...MOCK_DATA.season, name: 'Saison d’avant' },
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Importer',
      })
    );

    expect(screen.getByText('Saison d’avant')).toBeInTheDocument();
  });

  it('refuse le fichier d’une AUTRE application sans rien effacer', async () => {
    seedRaw({ season: { ...MOCK_DATA.season, name: 'Saison à moi' } });
    renderWithProviders(<SettingsPage />);

    // La forme d'un export de miss-genius : du JSON valide, un autre modèle.
    await chooseFile(
      JSON.stringify({ v: 1, data: { subjects: [], grades: [] } })
    );
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Importer',
      })
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Fichier refusé — rien n'a été modifié."
    );
    // Ce qui compte : la saison est toujours là, à l'écran ET en magasin.
    expect(screen.getByText('Saison à moi')).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as {
      data: { season: { name: string } };
    };
    expect(stored.data.season.name).toBe('Saison à moi');
  });

  it('refuse un fichier illisible sans rien effacer', async () => {
    seedRaw({ season: { ...MOCK_DATA.season, name: 'Saison à moi' } });
    renderWithProviders(<SettingsPage />);

    await chooseFile('{"players": [oups');
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Importer',
      })
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Saison à moi')).toBeInTheDocument();
  });

  it('refuse un fichier exporté par une version PLUS RÉCENTE', async () => {
    seedRaw({ season: { ...MOCK_DATA.season, name: 'Saison à moi' } });
    renderWithProviders(<SettingsPage />);

    await chooseFile(
      JSON.stringify({ v: SCHEMA_VERSION + 1, data: { ...MOCK_DATA } })
    );
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Importer',
      })
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/version/i);
    expect(screen.getByText('Saison à moi')).toBeInTheDocument();
  });

  it('« Annuler » sur la confirmation n’écrit rien', async () => {
    seedRaw({ season: { ...MOCK_DATA.season, name: 'Saison à moi' } });
    renderWithProviders(<SettingsPage />);

    await chooseFile(
      JSON.stringify({
        ...MOCK_DATA,
        season: { ...MOCK_DATA.season, name: 'Saison importée' },
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).getByText('Remplacer toutes les données par ce fichier ?')
    ).toBeInTheDocument();

    await userEvent.click(
      within(dialog).getByRole('button', { name: /Annuler/ })
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('Saison à moi')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('n’interroge pas quand il n’y a rien à perdre', async () => {
    // Ni équipe, ni joueur, ni match : demander « voulez-vous vraiment
    // remplacer ? » serait une cérémonie sur du vide.
    seedRaw({ teams: [], players: [], matches: [], selectedTeamId: '' });
    renderWithProviders(<SettingsPage />);

    await chooseFile(
      JSON.stringify({
        ...MOCK_DATA,
        season: { ...MOCK_DATA.season, name: 'Saison importée' },
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('Saison importée')).toBeInTheDocument();
  });
});
