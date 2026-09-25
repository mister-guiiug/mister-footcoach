import { describe, expect, it } from 'vitest';
import {
  INVITATION_CODE_LENGTH,
  formatInvitationCode,
  normalizeInvitationCode,
} from './invitationCode';

describe('le code d’invitation', () => {
  it('se lit en trois blocs', () => {
    expect(formatInvitationCode('K7PQ9XMR2DNB')).toBe('K7PQ-9XMR-2DNB');
    expect(formatInvitationCode('')).toBe('');
  });

  it('se saisit comme la base le relira : majuscules, tirets et espaces écartés, 12 caractères', () => {
    expect(normalizeInvitationCode(' k7pq-9xmr 2dnb ')).toBe('K7PQ9XMR2DNB');
    expect(normalizeInvitationCode('K7PQ9XMR2DNBZZZZ')).toBe('K7PQ9XMR2DNB');
  });

  it('écarte les caractères hors alphabet (0, O, 1, I), comme la base', () => {
    expect(normalizeInvitationCode('A0B1CODI')).toBe('ABCD');
  });
});

describe('INVITATION_CODE_LENGTH', () => {
  it('vaut la longueur que tire la base (12 caractères de 5 bits : 60 bits)', () => {
    expect(INVITATION_CODE_LENGTH).toBe(12);
  });
});
