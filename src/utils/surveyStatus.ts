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
  // UNE LIGNE DE POSTGRES PORTE `null`, PAS `undefined`. Sans ce repli, une
  // réponse lue en base où seul le parent a répondu passait pour une
  // « divergence » (`null` ≠ « absent »), et une réponse vide pour une
  // confirmation. Le type du domaine ne le dit pas ; la donnée, si.
  const intention = resp?.intentionJoueur ?? undefined;
  const confirmation = resp?.confirmationParent ?? undefined;
  const divergence =
    intention !== undefined &&
    confirmation !== undefined &&
    intention !== confirmation;

  if (confirmation !== undefined) {
    return {
      value: confirmation,
      confirmed: true,
      answered: true,
      divergence,
    };
  }
  if (intention !== undefined) {
    return {
      value: intention,
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
  'all' | 'confirmed_present' | 'confirmed_absent' | 'unanswered';

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
