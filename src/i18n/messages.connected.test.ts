import { describe, expect, it } from 'vitest';
import { connectedMessages } from './messages.connected';
import { messages } from './messages';

/** Toutes les clés feuilles d'un catalogue, en notation pointée. */
function leaves(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(
    ([key, value]) => leaves(value, prefix ? `${prefix}.${key}` : key)
  );
}

/**
 * LE CATALOGUE DU MODE CONNECTÉ, TENU AUX MÊMES RÈGLES QUE L'AUTRE — et à une
 * de plus : la fusion est superficielle (`i18n/index.ts`), donc aucun de ses
 * groupes ne doit exister dans `messages.ts`, où il en écraserait un entier.
 */
describe('messages.connected', () => {
  it('l’anglais reflète exactement les clés du français', () => {
    expect(leaves(connectedMessages.en).sort()).toEqual(
      leaves(connectedMessages.fr).sort()
    );
  });

  it('aucun libellé vide', () => {
    for (const locale of ['fr', 'en'] as const) {
      for (const path of leaves(connectedMessages[locale])) {
        const value = path
          .split('.')
          .reduce<unknown>(
            (node, key) => (node as Record<string, unknown>)[key],
            connectedMessages[locale]
          );
        expect(String(value).trim(), `${locale}.${path}`).not.toBe('');
      }
    }
  });

  it('aucun groupe en commun avec le catalogue principal', () => {
    const base = Object.keys(messages.fr);
    for (const group of Object.keys(connectedMessages.fr)) {
      expect(base, group).not.toContain(group);
    }
  });

  it('un libellé par refus que la base peut rendre', async () => {
    const { PLAYER_ACCOUNT_ERRORS } = await import('../backend/playerAccounts');
    for (const code of [...PLAYER_ACCOUNT_ERRORS, 'inconnue']) {
      expect(connectedMessages.fr.playerAccount.errors, code).toHaveProperty(
        code
      );
    }
  });
});
