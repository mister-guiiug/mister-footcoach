import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="T" description="Some detail" />);
    expect(screen.getByText('Some detail')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    render(<EmptyState title="T" />);
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<EmptyState title="T" icon={<span data-testid="icon">🏆</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('does not render icon wrapper when icon is omitted', () => {
    const { container } = render(<EmptyState title="T" />);
    // no div with mb-3 (the icon wrapper)
    expect(container.querySelector('.mb-3')).not.toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(<EmptyState title="T" action={<button>Add</button>} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});
