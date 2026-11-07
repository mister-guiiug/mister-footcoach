import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import { MOCK_DATA } from '../data/mock';
import SettingsPage from './SettingsPage';

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders page title', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Paramètres')).toBeInTheDocument();
  });

  it('renders theme options', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Clair')).toBeInTheDocument();
    expect(screen.getByText('Sombre')).toBeInTheDocument();
    expect(screen.getByText('Système')).toBeInTheDocument();
  });

  it('clicking Clair sets light theme', async () => {
    renderWithProviders(<SettingsPage />);
    await userEvent.click(screen.getByText('Clair'));
    expect(screen.getByText('Clair').closest('button')).toHaveClass(
      'border-primary'
    );
  });

  it('clicking Sombre sets dark theme', async () => {
    renderWithProviders(<SettingsPage />);
    await userEvent.click(screen.getByText('Sombre'));
    expect(screen.getByText('Sombre').closest('button')).toHaveClass(
      'border-primary'
    );
  });

  it('clicking Système sets system theme', async () => {
    renderWithProviders(<SettingsPage />);
    await userEvent.click(screen.getByText('Système'));
    expect(screen.getByText('Système').closest('button')).toHaveClass(
      'border-primary'
    );
  });

  it('shows season info', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Saison active')).toBeInTheDocument();
    expect(screen.getByText('2025-2026')).toBeInTheDocument();
  });

  it('shows team and player counts', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Équipes')).toBeInTheDocument();
    expect(screen.getByText('Joueurs actifs')).toBeInTheDocument();
  });

  it('shows data management card', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Données de démonstration')).toBeInTheDocument();
    expect(screen.getByText('Restaurer la démo')).toBeInTheDocument();
    expect(screen.getByText('Repartir de zéro')).toBeInTheDocument();
    // La carte dit que les données sont FICTIVES, et où elles vivent.
    expect(screen.getByText(/données fictives/)).toBeInTheDocument();
  });

  it('marque le compte joueur « indisponible dans cette version »', () => {
    renderWithProviders(<SettingsPage />);
    expect(
      screen.getByText('Indisponible dans cette version')
    ).toBeInTheDocument();
  });

  it('shows app info card, sans mention de version', () => {
    // La carte portait « Version MVP — Phase 0 ». Plus aucun écran du parc
    // n'affiche de version : celle qui était liée pointait vers
    // `…/releases/tag/vX.Y.Z`, et aucune app ne pose de tag git.
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Mister Footcoach')).toBeInTheDocument();
    expect(screen.queryByText(/Version/)).not.toBeInTheDocument();
  });

  // ── Réinitialisation : la boîte du socle, pas `window.confirm` ───────
  // L'ancien test ne pouvait vérifier que « l'appel natif a eu lieu avec ce
  // texte » : la remise à zéro elle-même n'était jamais observée. On part
  // ici d'une saison renommée pour VOIR les données d'exemple revenir.

  /** Charge un état où la saison ne porte plus le nom des données d'exemple. */
  function seedRenamedSeason(): void {
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        season: { ...MOCK_DATA.season, name: 'Saison bricolée' },
        selectedTeamId: MOCK_DATA.teams[0]!.id,
      })
    );
  }

  /** Demande la réinitialisation et rend la boîte de confirmation. */
  async function askReset(): Promise<HTMLElement> {
    await userEvent.click(
      screen.getByRole('button', { name: /Restaurer la démo/ })
    );
    return screen.getByRole('alertdialog');
  }

  /** Demande à repartir de zéro et rend la boîte de confirmation. */
  async function askEmpty(): Promise<HTMLElement> {
    await userEvent.click(
      screen.getByRole('button', { name: /Repartir de zéro/ })
    );
    return screen.getByRole('alertdialog');
  }

  it('asks for confirmation before resetting the demo data', async () => {
    seedRenamedSeason();
    renderWithProviders(<SettingsPage />);
    const dialog = await askReset();
    expect(
      within(dialog).getByText(
        'Remplacer toutes les données par celles de la démonstration ?'
      )
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Exportez d'abord/)).toBeInTheDocument();
    // Rien n'est réinitialisé tant que rien n'est confirmé.
    expect(screen.getByText('Saison bricolée')).toBeInTheDocument();
  });

  it('resets the data once the confirmation is accepted', async () => {
    seedRenamedSeason();
    renderWithProviders(<SettingsPage />);
    const dialog = await askReset();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Restaurer la démo' })
    );
    expect(screen.getByText('2025-2026')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  // ── Repartir de zéro ─────────────────────────────────────────────────
  // La démonstration se restaurait, mais rien ne permettait de la QUITTER :
  // un coach qui voulait saisir sa saison devait d'abord supprimer, une à
  // une, les fiches de deux équipes fictives.

  it('demande confirmation avant de repartir de zéro, et ne vide rien sans elle', async () => {
    renderWithProviders(<SettingsPage />);
    const dialog = await askEmpty();
    expect(
      within(dialog).getByText('Tout effacer et repartir de zéro ?')
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Exportez d'abord/)).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Annuler' })
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('2025-2026')).toBeInTheDocument();
  });

  it('confirmé, il ouvre une saison vide — et la démo se restaure ensuite', async () => {
    renderWithProviders(<SettingsPage />);
    const dialog = await askEmpty();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Repartir de zéro' })
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByText('2025-2026')).not.toBeInTheDocument();
    // Plus d'équipe : le flux fédéral n'aurait personne à qui rattacher ses
    // matchs, son bouton se grise.
    expect(
      screen.getByRole('button', { name: /Synchroniser la fédération/ })
    ).toBeDisabled();
    // Et ce qui est écrit est bien vide — relu dans le stockage, pas à l'écran.
    const stored = JSON.parse(
      localStorage.getItem('mister-footcoach-data')!
    ) as { data: { teams: unknown[]; players: unknown[] } };
    expect(stored.data.teams).toEqual([]);
    expect(stored.data.players).toEqual([]);

    const back = await askReset();
    await userEvent.click(
      within(back).getByRole('button', { name: 'Restaurer la démo' })
    );
    expect(screen.getByText('2025-2026')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Synchroniser la fédération/ })
    ).toBeEnabled();
  });

  it('keeps the data when the confirmation is cancelled', async () => {
    seedRenamedSeason();
    renderWithProviders(<SettingsPage />);
    const dialog = await askReset();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Annuler' })
    );
    expect(screen.getByText('Saison bricolée')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  // Règle famille : les Réglages sont le SECOND des deux écrans qui portent
  // les liens — l'accueil est l'autre (`DashboardPage.test.tsx`). Ils ont
  // transité par la coquille, qui les mettait sur les onze écrans ; les voici
  // revenus là où on les cherche.
  //
  // On relit les `href` RENDUS, pas les constantes : un identifiant d'app faux
  // passerait la compilation et le type check pour ne donner qu'un 404.
  it('porte le lien du code source, qui pointe sur CE dépôt', () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByRole('link', { name: 'Code source' })).toHaveAttribute(
      'href',
      'https://github.com/mister-guiiug/mister-footcoach'
    );
  });

  it('porte le lien de soutien, qui pointe sur la page Buy Me a Coffee de la famille', () => {
    renderWithProviders(<SettingsPage />);
    expect(
      screen.getByRole('link', { name: 'M’offrir un café' })
    ).toHaveAttribute('href', 'https://buymeacoffee.com/mister.guiiug');
  });
});
