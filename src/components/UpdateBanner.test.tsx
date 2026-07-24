import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateBanner } from './UpdateBanner';

// Mock local à CE fichier : le setup partagé (vitest-setup dev-wpa-config)
// enregistre aussi un mock de ce module, mais en simple fonction — pas un
// spy pilotable. Le vi.mock du fichier de test reprend la main.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: vi.fn(() => ({
    needRefresh: [false],
    updateServiceWorker: vi.fn(),
  })),
}));

const { useRegisterSW } = await vi.importMock<
  typeof import('virtual:pwa-register/react')
>('virtual:pwa-register/react');

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
    expect(
      screen.getByRole('button', { name: 'Actualiser' })
    ).toBeInTheDocument();
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
