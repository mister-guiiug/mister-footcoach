// Épingle le contrat du Button PARTAGÉ (dev-pwa-config/react/button) tel que
// l'app l'utilise depuis la migration du kit local (variantes, tailles,
// chargement). Le socle ne teste pas le blocage du clic pendant `loading` :
// c'est le comportement que le kit local garantissait, on le garde vérifié ici.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';

describe('Button (socle)', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole('button', { name: 'Click me' })
    ).toBeInTheDocument();
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

  it('shows a spinner and announces busy state when loading=true', () => {
    render(<Button loading>Save</Button>);
    // Écart voulu vs kit local : le libellé RESTE visible à côté du spinner,
    // et le bouton garde le focus (`aria-disabled`, pas `disabled`).
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).not.toBeDisabled();
    expect(
      btn.querySelector('[data-dwc="button-spinner"]')
    ).toBeInTheDocument();
  });

  it('does not fire onClick while loading', async () => {
    const handler = vi.fn();
    render(
      <Button loading onClick={handler}>
        Save
      </Button>
    );
    await userEvent.click(screen.getByRole('button'));
    expect(handler).not.toHaveBeenCalled();
  });

  (['primary', 'secondary', 'outline', 'ghost', 'danger'] as const).forEach(
    v => {
      it(`renders variant "${v}"`, () => {
        render(<Button variant={v}>{v}</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('data-variant', v);
      });
    }
  );

  (['sm', 'md', 'lg'] as const).forEach(s => {
    it(`renders size "${s}"`, () => {
      render(<Button size={s}>x</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-size', s);
    });
  });

  it('requires an accessible name in icon-only mode', () => {
    render(
      <Button iconOnly aria-label="Fermer">
        ×
      </Button>
    );
    expect(screen.getByRole('button', { name: 'Fermer' })).toHaveAttribute(
      'data-icon-only'
    );
  });

  it('accepts extra className', () => {
    render(<Button className="extra">x</Button>);
    expect(screen.getByRole('button')).toHaveClass('extra');
  });
});
