import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

const variants = [
  'default', 'primary', 'success', 'warning', 'danger', 'muted',
  'present', 'absent', 'excuse',
] as const;

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Hello</Badge>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies default variant classes by default', () => {
    const { container } = render(<Badge>X</Badge>);
    expect(container.firstChild).toHaveClass('bg-surface');
  });

  it('accepts extra className', () => {
    const { container } = render(<Badge className="custom-class">X</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  variants.forEach((v) => {
    it(`renders variant "${v}" without crashing`, () => {
      const { container } = render(<Badge variant={v}>{v}</Badge>);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
