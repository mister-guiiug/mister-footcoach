import type {
  SurveyResponse,
  SurveyResponseValue,
  TutorResponse,
} from '../types';

/**
 * Retained presence status for a survey response (specs §15.5).
 * The parent confirmation always prevails; the player's intention is only
 * used (and flagged as unconfirmed) when no parent confirmation exists.
 */
export interface RetainedStatus {
  value: SurveyResponseValue | null;
  /** True when the value comes from the parent's official confirmation. */
  confirmed: boolean;
  answered: boolean;
  /** Player intention differs from parent confirmation (both present). */
  divergence: boolean;
}

export function retainedStatus(resp?: SurveyResponse): RetainedStatus {
  const divergence =
    resp?.intentionJoueur !== undefined &&
    resp?.confirmationParent !== undefined &&
    resp.intentionJoueur !== resp.confirmationParent;

  if (resp?.confirmationParent !== undefined) {
    return {
      value: resp.confirmationParent,
      confirmed: true,
      answered: true,
      divergence,
    };
  }
  if (resp?.intentionJoueur !== undefined) {
    return {
      value: resp.intentionJoueur,
      confirmed: false,
      answered: true,
      divergence: false,
    };
  }
  return { value: null, confirmed: false, answered: false, divergence: false };
}

/** True when several tutors answered with different values (specs §15.8). */
export function tutorDivergence(tutorResponses?: TutorResponse[]): boolean {
  if (!tutorResponses || tutorResponses.length < 2) return false;
  return new Set(tutorResponses.map(t => t.value)).size > 1;
}

/** Tutor answers ordered with the most recent first (specs §15.8). */
export function sortedTutorResponses(
  tutorResponses?: TutorResponse[]
): TutorResponse[] {
  return [...(tutorResponses ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export type SurveyFilter =
  | 'all'
  | 'confirmed_present'
  | 'confirmed_absent'
  | 'unanswered';

export function matchesFilter(
  status: RetainedStatus,
  filter: SurveyFilter
): boolean {
  switch (filter) {
    case 'confirmed_present':
      return status.confirmed && status.value === 'present';
    case 'confirmed_absent':
      return status.confirmed && status.value === 'absent';
    case 'unanswered':
      return !status.confirmed;
    default:
      return true;
  }
}
