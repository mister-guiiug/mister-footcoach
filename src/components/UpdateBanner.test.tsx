import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseUpdatePrompt } from '@mister-guiiug/dev-wpa-config/react/use-update-prompt';
import { I18nProvider } from '../i18n';
import { UpdateBanner } from './UpdateBanner';

// Mock local à CE fichier : l'état et l'application de la mise à jour sont
// délégués au hook du socle (testé chez lui) ; on pilote ses retours pour
// vérifier le rendu du bandeau et le câblage du bouton.
const { useUpdatePrompt } = vi.hoisted(() => ({
  useUpdatePrompt: vi.fn<() => UseUpdatePrompt>(),
}));
vi.mock('@mister-guiiug/dev-wpa-config/react/use-update-prompt', () => ({
  useUpdatePrompt,
}));

function prompt(overrides: Partial<UseUpdatePrompt> = {}): UseUpdatePrompt {
  return {
    needRefresh: false,
    offlineReady: false,
    visible: false,
    updating: false,
    update: vi.fn().mockResolvedValue('activated'),
    forceUpdate: vi.fn().mockResolvedValue('activated'),
    dismiss: vi.fn(),
    snooze: vi.fn(),
    ...overrides,
  };
}

describe('UpdateBanner', () => {
  beforeEach(() => {
    useUpdatePrompt.mockReset();
  });

  it('renders nothing when no update is visible', () => {
    useUpdatePrompt.mockReturnValue(prompt());
    const { container } = render(
      <I18nProvider>
        <UpdateBanner />
      </I18nProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the banner when an update is visible', () => {
    useUpdatePrompt.mockReturnValue(prompt({ visible: true }));
    render(
      <I18nProvider>
        <UpdateBanner />
      </I18nProvider>
    );
    expect(screen.getByText('Mise à jour disponible')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Actualiser' })
    ).toBeInTheDocument();
  });

  it('injects registerSW from virtual:pwa-register into the hook', () => {
    useUpdatePrompt.mockReturnValue(prompt());
    render(
      <I18nProvider>
        <UpdateBanner />
      </I18nProvider>
    );
    expect(useUpdatePrompt).toHaveBeenCalledWith(
      expect.objectContaining({ registerSW: expect.any(Function) })
    );
  });

  it('applies the update when the button is clicked', async () => {
    const update = vi.fn().mockResolvedValue('activated');
    useUpdatePrompt.mockReturnValue(prompt({ visible: true, update }));
    render(
      <I18nProvider>
        <UpdateBanner />
      </I18nProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Actualiser' }));
    expect(update).toHaveBeenCalledTimes(1);
  });
});
