import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';

/**
 * La carte vient du socle depuis l'adoption (PARC.md, chantier 3). Le paquet
 * teste son rendu ; ce qui reste utile ici, c'est le contrat sur lequel les
 * pages de l'app s'appuient — l'attribut `data-dwc="card"` que leurs tests
 * utilisent pour retrouver une carte, et le retrait du padding.
 */
describe('Card (socle)', () => {
  it('rend ses enfants et se retrouve par data-dwc', () => {
    render(<Card>Contenu</Card>);
    expect(screen.getByText('Contenu')).toBeInTheDocument();
    expect(
      screen.getByText('Contenu').closest('[data-dwc="card"]')
    ).not.toBeNull();
  });

  it('signale le retrait du padding par data-padding', () => {
    const { container } = render(<Card padding={false}>X</Card>);
    expect(container.firstChild).toHaveAttribute('data-padding', 'none');
  });

  it('relaie les autres props du div', () => {
    const { container } = render(<Card data-testid="carte">X</Card>);
    expect(container.firstChild).toHaveAttribute('data-testid', 'carte');
  });

  it('CardHeader rend titre, sous-titre et action', () => {
    render(
      <CardHeader
        title="Titre"
        subtitle="Sous-titre"
        action={<button type="button">Agir</button>}
      />
    );
    expect(screen.getByText('Titre')).toBeInTheDocument();
    expect(screen.getByText('Sous-titre')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agir' })).toBeInTheDocument();
  });
});
