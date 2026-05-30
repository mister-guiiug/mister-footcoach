import { describe, it, expect } from 'vitest';
import {
  retainedStatus,
  matchesFilter,
  tutorDivergence,
  sortedTutorResponses,
} from './surveyStatus';
import type { SurveyResponse, TutorResponse } from '../types';

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

describe('tutorDivergence', () => {
  it('is false with fewer than two tutor answers', () => {
    expect(tutorDivergence(undefined)).toBe(false);
    expect(
      tutorDivergence([{ userId: 'u4', value: 'present', date: '2026-05-06' }])
    ).toBe(false);
  });

  it('is false when tutors agree', () => {
    expect(
      tutorDivergence([
        { userId: 'u4', value: 'present', date: '2026-05-06' },
        { userId: 'u5', value: 'present', date: '2026-05-07' },
      ])
    ).toBe(false);
  });

  it('is true when tutors disagree', () => {
    expect(
      tutorDivergence([
        { userId: 'u4', value: 'present', date: '2026-05-06' },
        { userId: 'u5', value: 'absent', date: '2026-05-07' },
      ])
    ).toBe(true);
  });
});

describe('sortedTutorResponses', () => {
  it('returns the most recent answer first', () => {
    const list: TutorResponse[] = [
      { userId: 'u4', value: 'present', date: '2026-05-06' },
      { userId: 'u5', value: 'absent', date: '2026-05-07' },
    ];
    expect(sortedTutorResponses(list).map(t => t.userId)).toEqual(['u5', 'u4']);
  });

  it('returns an empty array for no responses', () => {
    expect(sortedTutorResponses(undefined)).toEqual([]);
  });
});
