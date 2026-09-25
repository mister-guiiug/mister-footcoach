import { describe, expect, it } from 'vitest';
import { hasClubRole, invitationStatus, isPlayerOnly } from './playerAccount';
import type { PlayerInvitation } from '../types';

function invitation(p: Partial<PlayerInvitation>): PlayerInvitation {
  return {
    id: 'i',
    playerId: 'p1',
    createdBy: 'u4',
    consentedAt: '2026-09-01T10:00:00+00:00',
    expiresAt: '2026-09-08T10:00:00+00:00',
    redeemedAt: null,
    redeemedBy: null,
    revokedAt: null,
    revokedBy: null,
    ...p,
  };
}

const NOW = new Date('2026-09-05T12:00:00Z');

describe('isPlayerOnly — la définition de `app_is_player_only()`', () => {
  it('un compte QUE joueur', () => {
    expect(isPlayerOnly({ roles: ['player'] })).toBe(true);
  });

  it('un rôle cumulé garde l’union de ses droits (§ 3.2)', () => {
    expect(isPlayerOnly({ roles: ['player', 'coach'] })).toBe(false);
    expect(isPlayerOnly({ roles: ['player', 'parent'] })).toBe(false);
    expect(isPlayerOnly({ roles: ['admin', 'player'] })).toBe(false);
  });

  it('ni un parent, ni une fiche sans rôle', () => {
    expect(isPlayerOnly({ roles: ['parent'] })).toBe(false);
    expect(isPlayerOnly({ roles: [] })).toBe(false);
  });
});

describe('hasClubRole — la définition de `app_is_member()`', () => {
  it('chacun des quatre rôles suffit', () => {
    for (const role of ['admin', 'coach', 'parent', 'player'] as const) {
      expect(hasClubRole({ roles: [role] })).toBe(true);
    }
  });

  it('une fiche sans rôle n’est pas membre', () => {
    expect(hasClubRole({ roles: [] })).toBe(false);
  });
});

describe('invitationStatus', () => {
  it('rien : pas de compte', () => {
    expect(invitationStatus([], 'p1', NOW)).toEqual({ kind: 'none' });
  });

  it('ne lit que les invitations du joueur demandé', () => {
    expect(
      invitationStatus([invitation({ playerId: 'p2' })], 'p1', NOW)
    ).toEqual({ kind: 'none' });
  });

  it('un code en attente, jusqu’à son expiration', () => {
    expect(invitationStatus([invitation({})], 'p1', NOW)).toEqual({
      kind: 'pending',
      expiresAt: '2026-09-08T10:00:00+00:00',
    });
  });

  it('le plus récent des codes jamais utilisés fait foi', () => {
    const older = invitation({
      id: 'old',
      expiresAt: '2026-09-02T10:00:00+00:00',
    });
    expect(invitationStatus([older, invitation({})], 'p1', NOW).kind).toBe(
      'pending'
    );
  });

  it('… dans quelque ordre que la base les rende', () => {
    const older = invitation({
      id: 'old',
      expiresAt: '2026-09-02T10:00:00+00:00',
    });
    expect(invitationStatus([invitation({}), older], 'p1', NOW)).toEqual({
      kind: 'pending',
      expiresAt: '2026-09-08T10:00:00+00:00',
    });
  });

  it('un code expiré', () => {
    expect(
      invitationStatus(
        [invitation({ expiresAt: '2026-09-04T10:00:00+00:00' })],
        'p1',
        NOW
      )
    ).toEqual({ kind: 'expired', expiresAt: '2026-09-04T10:00:00+00:00' });
  });

  it('un code révoqué ne compte plus', () => {
    expect(
      invitationStatus(
        [invitation({ revokedAt: '2026-09-03T10:00:00+00:00' })],
        'p1',
        NOW
      )
    ).toEqual({ kind: 'none' });
  });

  it('un compte ouvert : depuis quand, et qui a consenti', () => {
    expect(
      invitationStatus(
        [
          invitation({
            redeemedAt: '2026-09-02T18:00:00+00:00',
            redeemedBy: 'u-kid',
          }),
        ],
        'p1',
        NOW
      )
    ).toEqual({
      kind: 'active',
      since: '2026-09-02T18:00:00+00:00',
      consentedBy: 'u4',
    });
  });

  it('un compte fermé (`redeemedBy` remis à null) n’est plus actif', () => {
    expect(
      invitationStatus(
        [
          invitation({
            redeemedAt: '2026-09-02T18:00:00+00:00',
            redeemedBy: null,
          }),
        ],
        'p1',
        NOW
      )
    ).toEqual({ kind: 'none' });
  });

  it('sans date d’utilisation lisible, l’activité part du consentement', () => {
    const status = invitationStatus(
      [invitation({ redeemedBy: 'u-kid', redeemedAt: null })],
      'p1',
      NOW
    );
    expect(status).toEqual({
      kind: 'active',
      since: '2026-09-01T10:00:00+00:00',
      consentedBy: 'u4',
    });
  });
});
