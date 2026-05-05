import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('has padding by default', () => {
    const { container } = render(<Card>X</Card>);
    expect(container.firstChild).toHaveClass('p-4');
  });

  it('has no padding when padding=false', () => {
    const { container } = render(<Card padding={false}>X</Card>);
    expect(container.firstChild).not.toHaveClass('p-4');
  });

  it('accepts extra className', () => {
    const { container } = render(<Card className="extra">X</Card>);
    expect(container.firstChild).toHaveClass('extra');
  });

  it('forwards other HTML div props', () => {
    const { container } = render(<Card data-testid="card">X</Card>);
    expect(container.firstChild).toHaveAttribute('data-testid', 'card');
  });
});

describe('CardHeader', () => {
  it('renders title', () => {
    render(<CardHeader title="My Title" />);
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<CardHeader title="T" subtitle="Sub" />);
    expect(screen.getByText('Sub')).toBeInTheDocument();
  });

  it('does not render subtitle when omitted', () => {
    const { container } = render(<CardHeader title="T" />);
    // title uses <h3>, no <p> when subtitle is omitted
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('renders action slot when provided', () => {
    render(<CardHeader title="T" action={<button>Act</button>} />);
    expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument();
  });
});
