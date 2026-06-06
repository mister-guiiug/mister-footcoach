import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './Toast';

function Trigger({ variant }: { variant?: 'error' | 'success' | 'info' }) {
  const { show } = useToast();
  return <button onClick={() => show('Échec', variant)}>déclencher</button>;
}

describe('Toast', () => {
  it('shows a toast on demand and exposes errors as alerts', async () => {
    render(
      <ToastProvider>
        <Trigger variant="error" />
      </ToastProvider>
    );
    await userEvent.click(screen.getByText('déclencher'));
    expect(screen.getByRole('alert')).toHaveTextContent('Échec');
  });

  it('dismisses a toast when the close button is clicked', async () => {
    render(
      <ToastProvider>
        <Trigger variant="info" />
      </ToastProvider>
    );
    await userEvent.click(screen.getByText('déclencher'));
    expect(screen.getByText('Échec')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Fermer'));
    await waitFor(() =>
      expect(screen.queryByText('Échec')).not.toBeInTheDocument()
    );
  });

  it('is a no-op when used without a provider', async () => {
    render(<Trigger />);
    // Clicking must not throw even though there is no ToastProvider.
    await userEvent.click(screen.getByText('déclencher'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
