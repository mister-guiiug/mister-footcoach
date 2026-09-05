// Épingle le contrat de l'EmptyState PARTAGÉ (dev-pwa-config/react/empty-state)
// tel que l'app l'utilise depuis la migration du kit local. Le socle n'a pas de
// test dédié à ce composant : les comportements que le kit local garantissait
// restent donc vérifiés ici, contre le composant du paquet.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';

describe('EmptyState (socle)', () => {
  it('renders title', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="T" description="Some detail" />);
    expect(screen.getByText('Some detail')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    const { container } = render(<EmptyState title="T" />);
    expect(
      container.querySelector('[data-dwc="empty-state-desc"]')
    ).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<EmptyState title="T" icon={<span data-testid="icon">🏆</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('does not render icon wrapper when icon is omitted', () => {
    const { container } = render(<EmptyState title="T" />);
    expect(
      container.querySelector('[data-dwc="empty-state-icon"]')
    ).not.toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(<EmptyState title="T" action={<button>Add</button>} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});
