import { describe, it, expect } from 'vitest';
import { retainedStatus, matchesFilter } from './surveyStatus';
import type { SurveyResponse } from '../types';

function resp(p: Partial<SurveyResponse>): SurveyResponse {
  return { id: 'r', surveyId: 's', playerId: 'p', ...p };
}

describe('retainedStatus', () => {
  it('is unanswered when there is no response', () => {
    const s = retainedStatus(undefined);
    expect(s.answered).toBe(false);
    expect(s.confirmed).toBe(false);
    expect(s.value).toBeNull();
  });

  it('uses the parent confirmation as the official value', () => {
    const s = retainedStatus(resp({ confirmationParent: 'absent' }));
    expect(s.value).toBe('absent');
    expect(s.confirmed).toBe(true);
    expect(s.answered).toBe(true);
  });

  it('falls back to the unconfirmed player intention', () => {
    const s = retainedStatus(resp({ intentionJoueur: 'present' }));
    expect(s.value).toBe('present');
    expect(s.confirmed).toBe(false);
    expect(s.answered).toBe(true);
  });

  it('flags divergence between intention and confirmation', () => {
    const s = retainedStatus(
      resp({ intentionJoueur: 'present', confirmationParent: 'absent' })
    );
    expect(s.divergence).toBe(true);
    expect(s.value).toBe('absent'); // parent prevails
  });

  it('does not flag divergence when they agree', () => {
    const s = retainedStatus(
      resp({ intentionJoueur: 'present', confirmationParent: 'present' })
    );
    expect(s.divergence).toBe(false);
  });
});

describe('matchesFilter', () => {
  const confirmedPresent = retainedStatus(
    resp({ confirmationParent: 'present' })
  );
  const confirmedAbsent = retainedStatus(
    resp({ confirmationParent: 'absent' })
  );
  const intentionOnly = retainedStatus(resp({ intentionJoueur: 'present' }));
  const none = retainedStatus(undefined);

  it('all matches everything', () => {
    expect(matchesFilter(none, 'all')).toBe(true);
    expect(matchesFilter(confirmedPresent, 'all')).toBe(true);
  });

  it('confirmed_present only matches parent-confirmed present', () => {
    expect(matchesFilter(confirmedPresent, 'confirmed_present')).toBe(true);
    expect(matchesFilter(intentionOnly, 'confirmed_present')).toBe(false);
  });

  it('confirmed_absent only matches parent-confirmed absent', () => {
    expect(matchesFilter(confirmedAbsent, 'confirmed_absent')).toBe(true);
    expect(matchesFilter(confirmedPresent, 'confirmed_absent')).toBe(false);
  });

  it('unanswered matches anything not parent-confirmed', () => {
    expect(matchesFilter(none, 'unanswered')).toBe(true);
    expect(matchesFilter(intentionOnly, 'unanswered')).toBe(true);
    expect(matchesFilter(confirmedPresent, 'unanswered')).toBe(false);
  });
});
