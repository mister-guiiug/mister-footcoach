import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateBanner } from './UpdateBanner';

// The module is mocked in setup.ts with needRefresh: [false] by default
const { useRegisterSW } = await vi.importMock<typeof import('virtual:pwa-register/react')>(
  'virtual:pwa-register/react',
);

describe('UpdateBanner', () => {
  it('renders nothing when needRefresh is false', () => {
    (useRegisterSW as ReturnType<typeof vi.fn>).mockReturnValue({
      needRefresh: [false],
      updateServiceWorker: vi.fn(),
    });
    const { container } = render(<UpdateBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the banner when needRefresh is true', () => {
    (useRegisterSW as ReturnType<typeof vi.fn>).mockReturnValue({
      needRefresh: [true],
      updateServiceWorker: vi.fn(),
    });
    render(<UpdateBanner />);
    expect(screen.getByText('Mise à jour disponible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualiser' })).toBeInTheDocument();
  });

  it('calls updateServiceWorker(true) when button is clicked', async () => {
    const updateServiceWorker = vi.fn();
    (useRegisterSW as ReturnType<typeof vi.fn>).mockReturnValue({
      needRefresh: [true],
      updateServiceWorker,
    });
    render(<UpdateBanner />);
    await userEvent.click(screen.getByRole('button', { name: 'Actualiser' }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
