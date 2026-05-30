import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderWithProviders(<ContactsPage />);
    // Jean Martin is the only contact of p2/p3 → deletion blocked.
    const card = screen
      .getByText('Jean Martin')
      .closest('div.rounded-2xl') as HTMLElement;
    await userEvent.click(within(card).getByLabelText('Supprimer'));
    expect(alertSpy).toHaveBeenCalled();
    expect(screen.getByText('Jean Martin')).toBeInTheDocument();
    alertSpy.mockRestore();
  });

  it('deletes a contact when another remains for the player', async () => {
    const confirmSpy = vi
      .spyOn(window, 'confirm')
      .mockImplementation(() => true);
    renderWithProviders(<ContactsPage />);
    // Lucas (p1) has two contacts → Pierre can be removed.
    const card = screen
      .getByText('Pierre Dupont')
      .closest('div.rounded-2xl') as HTMLElement;
    await userEvent.click(within(card).getByLabelText('Supprimer'));
    expect(screen.queryByText('Pierre Dupont')).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
