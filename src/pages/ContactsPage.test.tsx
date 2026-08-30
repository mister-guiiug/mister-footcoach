import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import ContactsPage from './ContactsPage';

describe('ContactsPage', () => {
  beforeEach(() => localStorage.clear());

  it('renders the seeded contacts with consent badges', () => {
    renderWithProviders(<ContactsPage />);
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('Pierre Dupont')).toBeInTheDocument();
    expect(screen.getAllByText('Consenti').length).toBeGreaterThan(0);
  });

  it('creates a new contact via the dialog', async () => {
    renderWithProviders(<ContactsPage />);
    await userEvent.click(screen.getByRole('button', { name: /Nouveau/ }));
    expect(screen.getByText('Nouveau contact')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Prénom'), 'Marie');
    await userEvent.type(screen.getByLabelText('Nom'), 'Testeuse');
    await userEvent.type(screen.getByLabelText('Email'), 'marie@test.fr');
    // attach to a player
    await userEvent.click(screen.getByRole('button', { name: /Lucas Dupont/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));

    expect(screen.getByText('Marie Testeuse')).toBeInTheDocument();
  });

  it('rejects an invalid email', async () => {
    renderWithProviders(<ContactsPage />);
    await userEvent.click(screen.getByRole('button', { name: /Nouveau/ }));
    await userEvent.type(screen.getByLabelText('Prénom'), 'A');
    await userEvent.type(screen.getByLabelText('Nom'), 'B');
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));
    expect(screen.getByText('Email invalide.')).toBeInTheDocument();
  });

  it('blocks deletion of the sole contact of an active player (RG-CONTACT-03)', async () => {
    renderWithProviders(<ContactsPage />);
    // Jean Martin is the only contact of p2/p3 → deletion blocked.
    const card = screen
      .getByText('Jean Martin')
      .closest('div.rounded-2xl') as HTMLElement;
    await userEvent.click(within(card).getByLabelText('Supprimer'));

    // Le refus est une alerte du socle, plus un `window.alert` : son texte est
    // dans le DOM, donc vérifiable — le spy ne disait que « ça a sonné ».
    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).getByText(/^Suppression impossible/)
    ).toBeInTheDocument();
    // Mono-action : une seule issue, pas d'« Annuler » à côté.
    expect(
      within(dialog).queryByRole('button', { name: 'Annuler' })
    ).not.toBeInTheDocument();

    // La prise d'acte referme, et le contact est toujours là.
    await userEvent.click(within(dialog).getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('Jean Martin')).toBeInTheDocument();
  });

  // ── Suppression : la boîte du socle, pas `window.confirm` ────────────
  // L'appel natif était synchrone et hors du DOM : seul le « oui » pouvait
  // être simulé (en forçant le retour du spy), jamais l'ouverture ni le
  // refus. Les trois chemins sont désormais des clics ordinaires.

  /** Ouvre la suppression de Pierre Dupont. Lucas (p1) a deux contacts,
   *  Pierre est donc supprimable (RG-CONTACT-03). */
  async function askDeletePierre(): Promise<HTMLElement> {
    const card = screen
      .getByText('Pierre Dupont')
      .closest('div.rounded-2xl') as HTMLElement;
    await userEvent.click(within(card).getByLabelText('Supprimer'));
    return screen.getByRole('alertdialog');
  }

  it('asks for confirmation before deleting a contact', async () => {
    renderWithProviders(<ContactsPage />);
    const dialog = await askDeletePierre();
    expect(
      within(dialog).getByText('Supprimer Pierre Dupont ?')
    ).toBeInTheDocument();
    // Rien n'est parti tant que rien n'est confirmé.
    expect(screen.getByText('Pierre Dupont')).toBeInTheDocument();
  });

  it('deletes the contact once the confirmation is accepted', async () => {
    renderWithProviders(<ContactsPage />);
    const dialog = await askDeletePierre();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Supprimer' })
    );
    expect(screen.queryByText('Pierre Dupont')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('keeps the contact when the confirmation is cancelled', async () => {
    renderWithProviders(<ContactsPage />);
    const dialog = await askDeletePierre();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Annuler' })
    );
    expect(screen.getByText('Pierre Dupont')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
