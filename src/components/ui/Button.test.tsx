import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Go</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>No</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows spinner and is disabled when loading=true', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    // spinner svg should be present instead of text
    expect(btn.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('does not fire onClick while loading', async () => {
    const handler = vi.fn();
    render(<Button loading onClick={handler}>Save</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handler).not.toHaveBeenCalled();
  });

  (['primary', 'secondary', 'ghost', 'danger'] as const).forEach((v) => {
    it(`renders variant "${v}"`, () => {
      const { container } = render(<Button variant={v}>{v}</Button>);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  (['sm', 'md', 'lg', 'icon'] as const).forEach((s) => {
    it(`renders size "${s}"`, () => {
      const { container } = render(<Button size={s}>x</Button>);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('accepts extra className', () => {
    const { container } = render(<Button className="extra">x</Button>);
    expect(container.firstChild).toHaveClass('extra');
  });
});
