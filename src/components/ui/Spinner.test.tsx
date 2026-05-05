import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders an svg by default', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  (['sm', 'md', 'lg'] as const).forEach((size) => {
    it(`renders size "${size}"`, () => {
      const { container } = render(<Spinner size={size} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('renders as fullscreen overlay when fullscreen=true', () => {
    const { container } = render(<Spinner fullscreen />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('fixed');
    expect(wrapper).toHaveClass('inset-0');
  });

  it('does not wrap in overlay when fullscreen=false', () => {
    const { container } = render(<Spinner fullscreen={false} />);
    // root is the svg directly, not a div wrapper
    expect(container.firstChild?.nodeName).toBe('svg');
  });
});
