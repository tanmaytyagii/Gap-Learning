import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../adaptive';
import { addDays, dayKey } from '../utils/date';
import { buildCurriculum, SEED_QUESTIONS } from './curriculum';
import { clearanceFor, triggersAndModifiers } from './gapInsight';
import { detectGaps, GAP_MASTERY_THRESHOLD } from './gaps';
import { computeConceptStats, correctAnswersToReach, masteryAsOf, masteryFromAttempts } from './mastery';
import { progressSummary, topicTrend } from './progress';
import { normalizeQuestionText, validateQuestion, type QuestionDraft } from './questionValidation';
import { computeReviewSchedule, describeReview } from './review';
import { resolveStatus, type ResolvedStatus } from './status';
import type { Attempt, TopicOverlay } from './types';

const curriculum = buildCurriculum({ subjects: [], concepts: [], misconceptions: [] });
const NOW = new Date(2026, 5, 15, 12, 0, 0);

let counter = 0;
function attempt(conceptId: string, correct: boolean, at: Date, options: Partial<Attempt> = {}): Attempt {
  counter += 1;
  return {
    id: `i${counter}`,
    sessionId: options.sessionId ?? `s-${dayKey(at)}-${conceptId}`,
    questionId: `q${counter}`,
    conceptId,
    difficulty: (options.difficulty ?? 'medium') as Difficulty,
    correct,
    selectedAnswer: '',
    misconceptionId: correct ? null : options.misconceptionId ?? 'unknown',
    mode: 'practice',
    answeredAt: at.toISOString(),
    durationMs: 30000,
    hintUsed: false,
  };
}

function gapsFor(attempts: Attempt[], overlays: Record<string, TopicOverlay> = {}) {
  const stats = computeConceptStats(attempts);
  const statuses = new Map<string, ResolvedStatus>(curriculum.concepts.map((concept) => [concept.id, resolveStatus(overlays[concept.id], stats.get(concept.id))]));
  return {
    stats,
    gaps: detectGaps({
      graph: curriculum.graph, stats, overlays, statuses,
      conceptName: (id) => curriculum.concept(id)?.name ?? id,
      misconceptionTitle: (id) => curriculum.misconception(id)?.title ?? id,
    }),
  };
}

describe('mastery over time', () => {
  it('reports mastery as of a past date, or null before any evidence', () => {
    const attempts = [attempt('frac_visual', false, addDays(NOW, -10)), attempt('frac_visual', true, addDays(NOW, -1))];
    expect(masteryAsOf(attempts, addDays(NOW, -20))).toBeNull();
    expect(masteryAsOf(attempts, addDays(NOW, -5))).toBe(masteryFromAttempts(attempts.slice(0, 1)));
    expect(masteryAsOf(attempts, NOW)).toBe(masteryFromAttempts(attempts));
  });

  it('finds the fewest correct answers that reach a target, by simulation', () => {
    const history = [false, false, false].map((correct) => ({ correct, difficulty: 'medium' as const }));
    const needed = correctAnswersToReach(history, 70)!;
    expect(needed).toBeGreaterThan(0);
    const reached = [...history, ...Array.from({ length: needed }, () => ({ correct: true, difficulty: 'medium' as const }))];
    expect(masteryFromAttempts(reached)).toBeGreaterThanOrEqual(70);
    expect(masteryFromAttempts(reached.slice(0, -1))).toBeLessThan(70);
    expect(correctAnswersToReach([{ correct: true, difficulty: 'hard' }, { correct: true, difficulty: 'hard' }], 70)).toBe(0);
    expect(correctAnswersToReach(history, 101, 'medium', 5)).toBeNull();
  });
});

describe('gap explanations', () => {
  it('separates the triggers that create a gap from the modifiers that rank it', () => {
    const { gaps } = gapsFor(
      [attempt('frac_equiv', false, addDays(NOW, -1)), attempt('frac_equiv', false, addDays(NOW, -1))],
      { frac_equiv: { priority: 'high' } },
    );
    const gap = gaps.find((item) => item.conceptId === 'frac_equiv')!;
    const { triggers, modifiers } = triggersAndModifiers(gap);
    expect(triggers.map((reason) => reason.kind)).toEqual(['mastery']);
    expect(modifiers.map((reason) => reason.kind)).toEqual(['impact', 'priority']);
    expect([...triggers, ...modifiers].reduce((sum, reason) => sum + reason.points, 0)).toBe(gap.score);
  });

  it('states a concrete, correct way to clear each trigger', () => {
    const attempts = [
      attempt('frac_operations', false, addDays(NOW, -1), { misconceptionId: 'direct_denom_addition' }),
      attempt('frac_operations', false, addDays(NOW, -1), { misconceptionId: 'direct_denom_addition' }),
    ];
    const { gaps, stats } = gapsFor(attempts);
    const gap = gaps.find((item) => item.conceptId === 'frac_operations')!;
    const context = { gap, stats: stats.get('frac_operations'), attempts, misconceptionTitle: (id: string) => curriculum.misconception(id)!.title };
    const mastery = clearanceFor(gap.reasons.find((reason) => reason.kind === 'mastery')!, context)!;
    const needed = correctAnswersToReach(attempts, GAP_MASTERY_THRESHOLD)!;
    expect(mastery).toContain(`About ${needed} correct medium answers`);
    expect(clearanceFor(gap.reasons.find((reason) => reason.kind === 'misconception')!, context)).toContain('Combining Denominators');
    expect(clearanceFor({ kind: 'priority', role: 'modifier', label: 'Marked high priority', points: 15 }, context)).toBeNull();
  });

  it('explains how many answers replace a low self-rating', () => {
    const attempts = [attempt('sci_gravity', true, addDays(NOW, -1))];
    const { gaps, stats } = gapsFor(attempts, { sci_gravity: { selfRating: { value: 1, ratedAt: NOW.toISOString() } } });
    const gap = gaps.find((item) => item.conceptId === 'sci_gravity')!;
    const text = clearanceFor(gap.reasons.find((reason) => reason.kind === 'self-rating')!, {
      gap, stats: stats.get('sci_gravity'), attempts, misconceptionTitle: (id) => id,
    });
    expect(text).toContain('Answer 2 more questions');
  });
});

describe('review explanations', () => {
  it('records whether the last sitting passed and explains the next step', () => {
    const passed = computeReviewSchedule([attempt('frac_visual', true, addDays(NOW, -4))], NOW).get('frac_visual')!;
    expect(passed).toMatchObject({ box: 2, lastPassed: true, isDue: true });
    const text = describeReview(passed, NOW);
    expect(text).toContain('You passed it 4 days ago, so it was scheduled 3 days later.');
    expect(text).toContain('moves out to 7 days');

    const failed = computeReviewSchedule([attempt('frac_visual', false, addDays(NOW, -2))], NOW).get('frac_visual')!;
    expect(failed.lastPassed).toBe(false);
    expect(describeReview(failed, NOW)).toContain('You scored under 80% 2 days ago, so it came back after 1 day.');

    const notDue = computeReviewSchedule([attempt('frac_visual', true, NOW)], NOW).get('frac_visual')!;
    expect(describeReview(notDue, NOW)).toContain('It is not due yet.');
  });
});

describe('progress summary', () => {
  const at = (days: number) => addDays(NOW, -days);

  it('compares each topic with its own past instead of averaging across topics', () => {
    const attempts = [
      // Improved and closed: weak before the window, strong within it.
      attempt('frac_equiv', false, at(40)), attempt('frac_equiv', false, at(40)),
      ...[0, 1, 2, 3].map(() => attempt('frac_equiv', true, at(5))),
      // Declined below the threshold.
      ...[0, 1, 2].map(() => attempt('sci_force', true, at(40), { difficulty: 'hard' })),
      ...[0, 1, 2].map(() => attempt('sci_force', false, at(3))),
      // Started in the window and still weak.
      attempt('eng_past', false, at(2)),
      // Practiced only before the window: unchanged, not reported.
      attempt('eng_present', true, at(45)),
    ].sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
    const summary = progressSummary(attempts, NOW, 30);
    expect(summary.hasBaseline).toBe(true);
    expect(summary.improved.map((change) => change.conceptId)).toEqual(['frac_equiv']);
    expect(summary.declined.map((change) => change.conceptId)).toEqual(['sci_force']);
    expect(summary.closed).toEqual(['frac_equiv']);
    expect(summary.opened.sort()).toEqual(['eng_past', 'sci_force']);
    expect(summary.started).toEqual(['eng_past']);
    expect(summary.answers).toBe(8);
    expect(summary.correct).toBe(4);
  });

  it('has no baseline for a brand-new learner', () => {
    const summary = progressSummary([attempt('frac_visual', true, at(1))], NOW, 30);
    expect(summary.hasBaseline).toBe(false);
    expect(summary.improved).toEqual([]);
  });

  it('reports a single topic trend', () => {
    const attempts = [attempt('frac_visual', false, at(20)), attempt('frac_visual', true, at(1)), attempt('frac_visual', true, at(1))];
    const trend = topicTrend(attempts, NOW, 14);
    expect(trend.from).toBe(masteryFromAttempts(attempts.slice(0, 1)));
    expect(trend.to).toBe(masteryFromAttempts(attempts));
    expect(topicTrend([], NOW).to).toBeNull();
  });
});

describe('question validation', () => {
  const draft: QuestionDraft = {
    concept: 'frac_equiv',
    difficulty: 'easy',
    question: 'Which fraction equals 3/9?',
    options: ['1/3', '3/3', '9/3'],
    correctAnswer: '1/3',
    misconceptionMap: { '9/3': 'numerator_denominator_reversal' },
  };
  const context = { curriculum, existing: SEED_QUESTIONS };

  it('accepts a well-formed question', () => {
    expect(validateQuestion(draft, context)).toEqual([]);
  });

  it('reports every problem with the field it belongs to', () => {
    const issues = validateQuestion({
      ...draft,
      concept: 'nope',
      question: 'Hi',
      options: ['1/3', '1/3 '],
      correctAnswer: '2/3',
      misconceptionMap: { '1/3': 'made_up' },
    }, context);
    expect(issues.map((issue) => issue.field).sort()).toEqual(['concept', 'correctAnswer', 'misconceptionMap', 'options', 'question']);
  });

  it('rejects duplicates of existing questions on the same topic, ignoring case and punctuation', () => {
    const existing = SEED_QUESTIONS.find((question) => question.concept === 'frac_equiv')!;
    const duplicate = { ...draft, question: `  ${existing.question.toUpperCase()}  ` };
    expect(validateQuestion(duplicate, context)[0].message).toMatch(/same wording/);
    expect(validateQuestion(duplicate, { ...context, ignoreId: existing.id })).toEqual([]);
    expect(normalizeQuestionText('What is 1/2 + 1/3?')).toBe(normalizeQuestionText('what is 1/2 +  1/3'));
  });

  it('accepts misconceptions created alongside the question', () => {
    const fresh = { ...draft, misconceptionMap: { '9/3': 'custom-new' } };
    expect(validateQuestion(fresh, context)[0].field).toBe('misconceptionMap');
    expect(validateQuestion(fresh, { ...context, pendingMisconceptionIds: new Set(['custom-new']) })).toEqual([]);
  });
});
