import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * LES QUATRE APPELS DU COMPTE JOUEUR — leur forme, et la traduction des refus.
 *
 * Ce qui DÉCIDE est en base (`0006_compte_joueur.sql`, prouvé par
 * `supabase/tests/compte-joueur.test.sql`). Ici : le bon nom de RPC, les bons
 * paramètres, jamais `select *` sur les invitations (le haché n'est pas
 * lisible), et un refus rendu avec son motif plutôt qu'avalé.
 */
type Reponse = { data: unknown; error: { message: string } | null };

const { rpc, select, from } = vi.hoisted(() => {
  const select = vi.fn<(columns: string) => Promise<Reponse>>();
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn<(name: string, args: unknown) => Promise<Reponse>>();
  return { rpc, select, from };
});
vi.mock('../lib/supabase', () => ({
  getSupabase: () => Promise.resolve({ from, rpc }),
}));

import {
  INVITATION_COLUMNS,
  PlayerAccountError,
  createInvitation,
  listInvitations,
  redeemInvitation,
  revokePlayerAccess,
  toPlayerAccountError,
} from './playerAccounts';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('toPlayerAccountError', () => {
  it('garde le motif que la base nomme', () => {
    const error = toPlayerAccountError({ message: 'invitation_invalide' });
    expect(error).toBeInstanceOf(PlayerAccountError);
    expect(error.code).toBe('invitation_invalide');
    expect(error.message).toBe('invitation_invalide');
  });

  it('range tout le reste sous « inconnue », sans prétendre savoir', () => {
    expect(toPlayerAccountError({ message: 'Failed to fetch' }).code).toBe(
      'inconnue'
    );
    expect(toPlayerAccountError({}).code).toBe('inconnue');
  });
});

describe('listInvitations', () => {
  it('nomme ses colonnes — le haché n’en fait pas partie', async () => {
    select.mockResolvedValueOnce({ data: [{ id: 'i1' }], error: null });
    await expect(listInvitations()).resolves.toEqual([{ id: 'i1' }]);
    expect(from).toHaveBeenCalledWith('player_invitations');
    expect(select).toHaveBeenCalledWith(INVITATION_COLUMNS);
    expect(INVITATION_COLUMNS).not.toContain('codeHash');
    expect(INVITATION_COLUMNS).not.toContain('*');
  });

  it('une réponse vide est une liste vide', async () => {
    select.mockResolvedValueOnce({ data: null, error: null });
    await expect(listInvitations()).resolves.toEqual([]);
  });

  it('un refus remonte', async () => {
    select.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied for table player_invitations' },
    });
    await expect(listInvitations()).rejects.toBeInstanceOf(PlayerAccountError);
  });
});

describe('les RPC', () => {
  it('créer un code', async () => {
    const issued = {
      id: 'i1',
      code: 'K7PQ9XMR2DNB',
      expiresAt: '2026-10-02T10:00:00+00:00',
    };
    rpc.mockResolvedValueOnce({ data: issued, error: null });
    await expect(createInvitation('p1')).resolves.toEqual(issued);
    expect(rpc).toHaveBeenCalledWith('create_player_invitation', {
      p_player_id: 'p1',
    });
  });

  it('un parent non lié est refusé, avec son motif', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'parent_non_lie' },
    });
    await expect(createInvitation('p1')).rejects.toMatchObject({
      code: 'parent_non_lie',
    });
  });

  it('utiliser un code', async () => {
    rpc.mockResolvedValueOnce({ data: 'p1', error: null });
    await expect(redeemInvitation('K7PQ9XMR2DNB')).resolves.toBe('p1');
    expect(rpc).toHaveBeenCalledWith('redeem_player_invitation', {
      p_code: 'K7PQ9XMR2DNB',
    });
  });

  it('un code refusé', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'invitation_invalide' },
    });
    await expect(redeemInvitation('X')).rejects.toMatchObject({
      code: 'invitation_invalide',
    });
  });

  it('couper l’accès', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(revokePlayerAccess('p1')).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('revoke_player_access', {
      p_player_id: 'p1',
    });
  });

  it('un refus de couper remonte', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'parent_non_lie' },
    });
    await expect(revokePlayerAccess('p1')).rejects.toMatchObject({
      code: 'parent_non_lie',
    });
  });
});
