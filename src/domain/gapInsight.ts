import { GAP_MASTERY_THRESHOLD, MISCONCEPTION_CLEAR_THRESHOLD, type Gap, type GapReason } from './gaps';
import { correctAnswersToReach, type ConceptStats } from './mastery';
import type { Attempt } from './types';

/** Answers needed before results replace a self-rating as the evidence for a gap. */
export const SELF_RATING_EVIDENCE = 3;

interface ClearanceContext {
  gap: Gap;
  stats: ConceptStats | undefined;
  attempts: Attempt[];
  misconceptionTitle: (id: string) => string;
}

/**
 * What would make a trigger stop applying, phrased as something the learner can act on.
 * Modifiers have no clearance of their own: they only matter while a trigger holds.
 */
export function clearanceFor(reason: GapReason, context: ClearanceContext): string | null {
  const { stats, attempts } = context;
  switch (reason.kind) {
    case 'mastery': {
      const needed = correctAnswersToReach(attempts, GAP_MASTERY_THRESHOLD, 'medium');
      const now = stats?.mastery ?? 0;
      if (needed === null) return `Reach ${GAP_MASTERY_THRESHOLD}% mastery (now ${now}%). Recent answers count most, so steady correct answers will get there.`;
      return `Reach ${GAP_MASTERY_THRESHOLD}% mastery (now ${now}%). About ${needed} correct medium ${needed === 1 ? 'answer' : 'answers'} in a row would do it.`;
    }
    case 'misconception': {
      const titles = (stats?.recurringMisconceptions ?? []).map(context.misconceptionTitle).join(', ');
      return `Stop repeating ${titles || 'the same mistake'}: fewer than two times in your last 10 answers, or mastery above ${MISCONCEPTION_CLEAR_THRESHOLD}%.`;
    }
    case 'self-rating': {
      const remaining = Math.max(1, SELF_RATING_EVIDENCE - (stats?.attempts ?? 0));
      return `Answer ${remaining} more ${remaining === 1 ? 'question' : 'questions'} so your results replace the self-rating, or re-rate yourself.`;
    }
    case 'prerequisite':
      return 'Answer a few questions on this topic to confirm the foundation is in place.';
    default:
      return null;
  }
}

/** Splits a gap's reasons into the triggers that make it a gap and the modifiers that rank it. */
export function triggersAndModifiers(gap: Gap): { triggers: GapReason[]; modifiers: GapReason[] } {
  return {
    triggers: gap.reasons.filter((reason) => reason.role === 'trigger'),
    modifiers: gap.reasons.filter((reason) => reason.role === 'modifier'),
  };
}
