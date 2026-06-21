import { getConcept } from '../data/knowledgeGraph';
import type { DiagnosticResult, Question } from '../models';

const MISCONCEPTION_EXPLANATIONS: Record<string, string> = {
  answered_eaten_not_remaining: 'You identified the eaten part instead of the remaining part. Read the quantity being asked for before forming the numerator.',
  answered_unshaded_not_shaded: 'You counted the unshaded parts. The numerator must count only the parts named in the question.',
  numerator_denominator_reversal: 'You reversed the fraction. The numerator counts selected parts; the denominator records all equal parts.',
  denominator_ignored: 'Your answer omitted the whole. A fraction needs the denominator to show how many equal parts make the whole.',
  additive_scaling_error: 'You used addition to scale the fraction. Equivalent fractions preserve a ratio only when numerator and denominator are multiplied by the same factor.',
  unequal_scaling: 'The numerator and denominator were changed by different factors, so the value of the fraction changed.',
  denominator_only_scaling: 'Only the denominator was scaled. Both parts must be multiplied by the same number to preserve the value.',
  incomplete_simplification: 'Your value is equivalent, but it is not in lowest terms. Continue dividing numerator and denominator by a common factor.',
  whole_number_comparison: 'You compared numerator or denominator as separate whole numbers. Rewrite both fractions with a common denominator, then compare equal-sized parts.',
  comparison_strategy_missing: 'Unlike fractions can be compared. Use a common denominator or a benchmark such as one-half.',
  direct_denom_addition: 'You added denominators directly. Denominators describe part sizes, so make the part sizes equal before adding numerators.',
  numerator_only_addition: 'You added numerators without first renaming the fractions as equal-sized parts.',
  cross_multiply_confusion: 'You used a comparison shortcut as a multiplication rule. For fraction multiplication, multiply straight across and simplify.',
  force_motion_link: 'You linked motion itself to net force. Net force causes acceleration; constant velocity means the forces balance to zero.',
  mass_weight_equivalence: 'You treated mass and weight as the same quantity. Mass measures matter, while weight depends on local gravity.',
  mass_dominant_collision: 'You assumed the heavier object applies more interaction force. Newton\'s third law says the two forces are equal and opposite.',
  past_habit_confusion: 'You used a habitual tense for an event happening now. Time markers such as “right now” require the progressive form.',
  perfect_simple_past_overlap: 'You placed an ongoing situation entirely in the past. “Since” plus a condition continuing now calls for present perfect.',
  prerequisite_not_confirmed: 'Performance on an advanced skill suggests its prerequisite knowledge should be checked directly.',
  unknown: 'The selected answer does not match a known misconception pattern, so the underlying concept needs another targeted check.',
};

export class FeedbackEngine {
  diagnose(question: Question, selectedAnswer: string): DiagnosticResult {
    const isCorrect = selectedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    const concept = getConcept(question.concept);

    if (isCorrect) {
      return {
        isCorrect: true,
        misconceptionId: 'none',
        explanation: `Your answer shows that you can ${question.learningObjective.charAt(0).toLowerCase()}${question.learningObjective.slice(1)}`,
        suggestedNextConcept: question.concept,
        reasoning: `Correct evidence on ${concept.name} at ${question.difficulty} difficulty raises mastery and unlocks a harder or dependent skill.`,
      };
    }

    const misconceptionId = question.misconceptionMap[selectedAnswer] ?? 'unknown';
    const prerequisite = concept.prerequisites[0] ? getConcept(concept.prerequisites[0]) : concept;
    const cause = MISCONCEPTION_EXPLANATIONS[misconceptionId] ?? MISCONCEPTION_EXPLANATIONS.unknown;
    return {
      isCorrect: false,
      misconceptionId,
      explanation: `You struggled with ${concept.name} because this answer suggests: ${cause} Review ${prerequisite.name} before advancing, then retry this objective: ${concept.learningObjective}`,
      suggestedNextConcept: prerequisite.id,
      reasoning: `The distractor “${selectedAnswer}” maps to ${misconceptionId}; the knowledge graph points to ${prerequisite.name} for remediation.`,
    };
  }

  explainGap(conceptId: string, misconceptionIds: string[]): string {
    const concept = getConcept(conceptId);
    const explanation = misconceptionIds.map((id) => MISCONCEPTION_EXPLANATIONS[id]).find(Boolean)
      ?? MISCONCEPTION_EXPLANATIONS.unknown;
    return `${concept.name}: ${explanation}`;
  }
}
