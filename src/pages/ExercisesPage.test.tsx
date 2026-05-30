import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/helpers';
import ExercisesPage from './ExercisesPage';

describe('ExercisesPage', () => {
  beforeEach(() => localStorage.clear());

  it('renders the title and seeded exercises', () => {
    renderWithProviders(<ExercisesPage />);
    expect(screen.getByText("Bibliothèque d'exercices")).toBeInTheDocument();
    expect(screen.getByText('Jeu de passes 3 contre 1')).toBeInTheDocument();
  });

  it('filters by search query', async () => {
    renderWithProviders(<ExercisesPage />);
    const input = screen.getByPlaceholderText(/Rechercher/);
    await userEvent.type(input, 'jonglerie');
    expect(
      screen.getByText('Jonglerie et conduite de balle')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Jeu de passes 3 contre 1')
    ).not.toBeInTheDocument();
  });

  it('filters by category', async () => {
    renderWithProviders(<ExercisesPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Échauffement' }));
    expect(screen.getByText(/Course avec ballon/)).toBeInTheDocument();
    expect(
      screen.queryByText('Jeu de passes 3 contre 1')
    ).not.toBeInTheDocument();
  });

  it('shows empty state when search has no match', async () => {
    renderWithProviders(<ExercisesPage />);
    await userEvent.type(
      screen.getByPlaceholderText(/Rechercher/),
      'zzzznotfound'
    );
    expect(screen.getByText('Aucun exercice')).toBeInTheDocument();
  });

  it('creates a new exercise via the dialog', async () => {
    renderWithProviders(<ExercisesPage />);
    await userEvent.click(screen.getByRole('button', { name: /Nouveau/ }));
    expect(screen.getByText('Nouvel exercice')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Titre'), 'Toro à une touche');
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));

    expect(screen.getByText('Toro à une touche')).toBeInTheDocument();
  });

  it('rejects a too-short title', async () => {
    renderWithProviders(<ExercisesPage />);
    await userEvent.click(screen.getByRole('button', { name: /Nouveau/ }));
    await userEvent.type(screen.getByLabelText('Titre'), 'a');
    await userEvent.click(screen.getByRole('button', { name: 'Créer' }));
    expect(screen.getByText(/au moins 2 caractères/)).toBeInTheDocument();
  });

  it('edits an existing exercise with its values prefilled', async () => {
    renderWithProviders(<ExercisesPage />);
    const card = screen
      .getByText('Jeu de passes 3 contre 1')
      .closest('div.rounded-2xl') as HTMLElement;
    await userEvent.click(within(card).getByLabelText('Modifier'));

    const titleInput = screen.getByLabelText('Titre') as HTMLInputElement;
    expect(titleInput.value).toBe('Jeu de passes 3 contre 1');

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Passes renommées');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(screen.getByText('Passes renommées')).toBeInTheDocument();
    expect(
      screen.queryByText('Jeu de passes 3 contre 1')
    ).not.toBeInTheDocument();
  });

  it('deletes an exercise', async () => {
    renderWithProviders(<ExercisesPage />);
    const card = screen
      .getByText('Jeu de passes 3 contre 1')
      .closest('div.rounded-2xl') as HTMLElement;
    await userEvent.click(within(card).getByLabelText('Supprimer'));
    expect(
      screen.queryByText('Jeu de passes 3 contre 1')
    ).not.toBeInTheDocument();
  });
});
