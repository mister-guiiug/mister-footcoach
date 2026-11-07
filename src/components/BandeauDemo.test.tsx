import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BandeauDemo } from './BandeauDemo';

const CLE = 'mister-footcoach-bandeau-demo-replie';

function renderBandeau() {
  return render(
    <BandeauDemo
      etiquette="Démonstration"
      message="Données fictives, enregistrées sur cet appareil seulement."
      cleStockage={CLE}
    />
  );
}

describe('BandeauDemo', () => {
  beforeEach(() => localStorage.clear());

  it('dit la démonstration, déplié par défaut', () => {
    renderBandeau();
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent(
      'Démonstration' +
        'Données fictives, enregistrées sur cet appareil seulement.'
    );
    expect(
      screen.getByRole('button', { name: 'Démonstration' })
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('se replie sans disparaître : l’étiquette reste, la phrase revient d’un appui', async () => {
    renderBandeau();
    const bascule = screen.getByRole('button', { name: 'Démonstration' });
    await userEvent.click(bascule);
    expect(bascule).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('note')).toHaveTextContent(/^Démonstration$/);

    await userEvent.click(bascule);
    expect(bascule).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('note')).toHaveTextContent(/Données fictives/);
  });

  it('retient le repli d’un montage à l’autre, sous SA clé préfixée', async () => {
    const { unmount } = renderBandeau();
    await userEvent.click(
      screen.getByRole('button', { name: 'Démonstration' })
    );
    expect(localStorage.getItem(CLE)).toBe('true');
    unmount();

    renderBandeau();
    expect(
      screen.getByRole('button', { name: 'Démonstration' })
    ).toHaveAttribute('aria-expanded', 'false');
  });
});
