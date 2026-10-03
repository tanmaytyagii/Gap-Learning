import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../adaptive';
import { addDays, dayKey } from '../utils/date';
import { computeStreak, dailyActivity, heatmapWeeks, masteryTimeline } from './activity';
import { buildCurriculum } from './curriculum';
import { detectGaps } from './gaps';
import { goalProgress } from './goals';
import { computeConceptStats, masteryFromAttempts } from './mastery';
import { nextActions } from './recommendations';
import { computeReviewSchedule, dueReviews } from './review';
import { autoStatus, resolveStatus, type ResolvedStatus } from './status';
import type { Attempt, TopicOverlay } from './types';

const curriculum = buildCurriculum({ subjects: [], concepts: [], misconceptions: [] });
const NOW = new Date(2026, 5, 15, 12, 0, 0);

let counter = 0;
function attempt(conceptId: string, correct: boolean, at: Date, options: Partial<Attempt> = {}): Attempt {
  counter += 1;
  return {
    id: `a${counter}`,
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

function resolveAll(stats: ReturnType<typeof computeConceptStats>, overlays: Record<string, TopicOverlay> = {}) {
  return new Map<string, ResolvedStatus>(curriculum.concepts.map((concept) => [concept.id, resolveStatus(overlays[concept.id], stats.get(concept.id))]));
}

function gapsFor(attempts: Attempt[], overlays: Record<string, TopicOverlay> = {}) {
  const stats = computeConceptStats(attempts);
  return detectGaps({
    graph: curriculum.graph,
    stats,
    overlays,
    statuses: resolveAll(stats, overlays),
    conceptName: (id) => curriculum.concept(id)?.name ?? id,
    misconceptionTitle: (id) => curriculum.misconception(id)?.title ?? id,
  });
}

describe('mastery', () => {
  it('weights recent answers more heavily, so improvement shows', () => {
    const improving = [false, false, false, true, true, true].map((correct) => ({ correct, difficulty: 'medium' as const }));
    const declining = [true, true, true, false, false, false].map((correct) => ({ correct, difficulty: 'medium' as const }));
    expect(masteryFromAttempts(improving)).toBeGreaterThan(masteryFromAttempts(declining));
  });

  it('uses a neutral prior so one answer cannot claim full mastery', () => {
    expect(masteryFromAttempts([{ correct: true, difficulty: 'easy' }])).toBe(72);
    expect(masteryFromAttempts([{ correct: false, difficulty: 'easy' }])).toBe(28);
  });

  it('tracks recurring misconceptions in recent answers', () => {
    const day = addDays(NOW, -1);
    const stats = computeConceptStats([
      attempt('frac_operations', false, day, { misconceptionId: 'direct_denom_addition' }),
      attempt('frac_operations', true, day),
      attempt('frac_operations', false, day, { misconceptionId: 'direct_denom_addition' }),
    ]).get('frac_operations')!;
    expect(stats.recurringMisconceptions).toEqual(['direct_denom_addition']);
    expect(stats.misconceptions[0]).toMatchObject({ id: 'direct_denom_addition', count: 2 });
  });
});

describe('status', () => {
  it('requires both a high score and enough answers for mastery', () => {
    const day = addDays(NOW, -1);
    const two = computeConceptStats([attempt('sci_force', true, day, { difficulty: 'hard' }), attempt('sci_force', true, day, { difficulty: 'hard' })]);
    expect(two.get('sci_force')!.mastery).toBeGreaterThanOrEqual(80);
    expect(autoStatus(two.get('sci_force'))).toBe('practicing');
    const three = computeConceptStats([0, 1, 2].map(() => attempt('sci_force', true, day, { difficulty: 'hard' })));
    expect(autoStatus(three.get('sci_force'))).toBe('mastered');
    expect(autoStatus(undefined)).toBe('not_started');
  });

  it('lets a manual status win until newer evidence arrives', () => {
    const earlier = addDays(NOW, -2).toISOString();
    const later = addDays(NOW, -1);
    const stats = computeConceptStats([attempt('sci_force', false, later)]).get('sci_force');
    expect(resolveStatus({ statusOverride: { status: 'mastered', setAt: earlier } }, stats)).toEqual({ status: 'learning', source: 'auto' });
    expect(resolveStatus({ statusOverride: { status: 'mastered', setAt: NOW.toISOString() } }, stats)).toEqual({ status: 'mastered', source: 'manual' });
  });
});

describe('gap detection', () => {
  it('flags low mastery, explains the score, and ranks foundations first', () => {
    const day = addDays(NOW, -1);
    const gaps = gapsFor([
      ...[0, 1, 2].map(() => attempt('frac_visual', true, day, { difficulty: 'hard' })),
      attempt('frac_equiv', false, day), attempt('frac_equiv', false, day),
      attempt('frac_operations', false, day), attempt('frac_operations', true, day),
    ]);
    const equiv = gaps.find((gap) => gap.conceptId === 'frac_equiv')!;
    const operations = gaps.find((gap) => gap.conceptId === 'frac_operations')!;
    expect(equiv.foundational).toBe(true);
    expect(operations.foundational).toBe(false);
    expect(equiv.reasons.map((reason) => reason.kind)).toEqual(['mastery', 'impact']);
    expect(equiv.score).toBe(equiv.reasons.reduce((sum, reason) => sum + reason.points, 0));
    expect(gaps.indexOf(equiv)).toBeLessThan(gaps.indexOf(operations));
  });

  it('infers untested prerequisites of a failing topic', () => {
    const gaps = gapsFor([attempt('eng_perfect', false, addDays(NOW, -1)), attempt('eng_perfect', false, addDays(NOW, -1))]);
    const past = gaps.find((gap) => gap.conceptId === 'eng_past');
    expect(past?.reasons[0].kind).toBe('prerequisite');
  });

  it('uses self-ratings without evidence and reports overconfidence', () => {
    const rated = gapsFor([], { sci_gravity: { selfRating: { value: 1, ratedAt: NOW.toISOString() } } });
    expect(rated.map((gap) => gap.conceptId)).toEqual(['sci_gravity']);

    const day = addDays(NOW, -1);
    const overconfident = gapsFor(
      [attempt('sci_gravity', false, day), attempt('sci_gravity', false, day)],
      { sci_gravity: { selfRating: { value: 5, ratedAt: NOW.toISOString() } } },
    );
    expect(overconfident[0].reasons.some((reason) => reason.kind === 'overconfidence')).toBe(true);
  });

  it('raises severity for high priority', () => {
    const attempts = [attempt('sci_net_force', false, addDays(NOW, -1))];
    const normal = gapsFor(attempts)[0];
    const high = gapsFor(attempts, { sci_net_force: { priority: 'high' } })[0];
    expect(high.score).toBe(normal.score + 15);
  });

  it('reports no gaps for strong evidence', () => {
    const day = addDays(NOW, -1);
    expect(gapsFor([0, 1, 2].map(() => attempt('eng_present', true, day)))).toEqual([]);
  });
});

describe('review schedule', () => {
  it('promotes on-time passes, resets failures, and ignores early reviews', () => {
    const day0 = addDays(NOW, -20);
    let schedule = computeReviewSchedule([attempt('frac_visual', true, day0)], NOW);
    expect(schedule.get('frac_visual')!.box).toBe(2);

    const onTime = [attempt('frac_visual', true, day0), attempt('frac_visual', true, addDays(day0, 4))];
    expect(computeReviewSchedule(onTime, NOW).get('frac_visual')!.box).toBe(3);

    const early = [attempt('frac_visual', true, day0), attempt('frac_visual', true, addDays(day0, 1))];
    expect(computeReviewSchedule(early, NOW).get('frac_visual')!.box).toBe(2);

    schedule = computeReviewSchedule([...onTime, attempt('frac_visual', false, addDays(day0, 12))], NOW);
    expect(schedule.get('frac_visual')!.box).toBe(1);
    expect(dueReviews(schedule).map((state) => state.conceptId)).toEqual(['frac_visual']);
  });

  it('is not due before the interval has passed', () => {
    const schedule = computeReviewSchedule([attempt('frac_visual', true, addDays(NOW, -1))], NOW);
    expect(schedule.get('frac_visual')!.isDue).toBe(false);
  });
});

describe('activity', () => {
  const days = (...offsets: number[]) => offsets.map((offset) => dayKey(addDays(NOW, offset)));

  it('counts a streak that is still alive from yesterday', () => {
    expect(computeStreak(days(0, -1, -2), NOW)).toEqual({ current: 3, longest: 3, activeToday: true });
    expect(computeStreak(days(-1, -2), NOW)).toMatchObject({ current: 2, activeToday: false });
    expect(computeStreak(days(-2, -3, -4, -5), NOW)).toMatchObject({ current: 0, longest: 4 });
  });

  it('builds a Monday-first calendar that ends with the current week', () => {
    const weeks = heatmapWeeks(dailyActivity([attempt('frac_visual', true, NOW)]), NOW, 4);
    expect(weeks).toHaveLength(4);
    weeks.forEach((week) => expect(week).toHaveLength(7));
    const last = weeks[3];
    expect(last.find((cell) => cell.date === dayKey(NOW))?.count).toBe(1);
    expect(new Date(weeks[0][0].date + 'T00:00').getDay()).toBe(1);
  });

  it('replays mastery and open gaps over time', () => {
    const attempts = [
      attempt('frac_visual', false, addDays(NOW, -3)),
      attempt('frac_visual', true, addDays(NOW, -1)), attempt('frac_visual', true, addDays(NOW, -1)), attempt('frac_visual', true, addDays(NOW, -1)),
    ];
    const timeline = masteryTimeline(attempts, (id) => curriculum.concept(id)?.subject, 5, NOW);
    expect(timeline).toHaveLength(5);
    expect(timeline[0].mastery).toBeNull();
    expect(timeline[1].openGaps).toBe(1);
    expect(timeline[3].openGaps).toBe(0);
    expect(timeline[4].mastery).toBeGreaterThan(timeline[1].mastery!);
  });
});

describe('goals', () => {
  const goal = { id: 'g', title: 'Fractions', conceptIds: ['frac_visual', 'frac_equiv'], createdAt: addDays(NOW, -10).toISOString() };
  const day = addDays(NOW, -1);
  const strong = [0, 1, 2].map(() => attempt('frac_visual', true, day, { difficulty: 'hard' }));

  it('computes progress and status against the deadline', () => {
    const stats = computeConceptStats(strong);
    const statuses = resolveAll(stats);
    const onTrack = goalProgress({ ...goal, targetDate: dayKey(addDays(NOW, 20)) }, stats, statuses, NOW);
    expect(onTrack).toMatchObject({ total: 2, mastered: 1, percent: 50, status: 'on-track' });
    expect(goalProgress({ ...goal, targetDate: dayKey(addDays(NOW, 1)) }, stats, statuses, NOW).status).toBe('at-risk');
    expect(goalProgress({ ...goal, targetDate: dayKey(addDays(NOW, -1)) }, stats, statuses, NOW).status).toBe('overdue');
    expect(goalProgress({ ...goal, targetDate: null }, stats, statuses, NOW).status).toBe('open');
  });

  it('is completed when every topic is mastered', () => {
    const stats = computeConceptStats([...strong, ...[0, 1, 2].map(() => attempt('frac_equiv', true, day, { difficulty: 'hard' }))]);
    expect(goalProgress({ ...goal, targetDate: null }, stats, resolveAll(stats), NOW).status).toBe('completed');
  });
});

describe('next actions', () => {
  const questionCount = () => 6;

  it('suggests a diagnostic per subject for a new learner', () => {
    const stats = computeConceptStats([]);
    const actions = nextActions({ curriculum, stats, statuses: resolveAll(stats), gaps: [], dueReviews: [], questionCount });
    expect(actions.map((action) => action.kind)).toEqual(['diagnostic', 'diagnostic', 'diagnostic']);
  });

  it('puts due reviews first, then foundational gaps', () => {
    const attempts = [attempt('frac_equiv', false, addDays(NOW, -5)), attempt('frac_equiv', true, addDays(NOW, -5))];
    const stats = computeConceptStats(attempts);
    const statuses = resolveAll(stats);
    const gaps = gapsFor(attempts);
    const due = dueReviews(computeReviewSchedule(attempts, NOW));
    const actions = nextActions({ curriculum, stats, statuses, gaps, dueReviews: due, questionCount });
    expect(actions[0].kind).toBe('review');
    expect(actions[1]).toMatchObject({ kind: 'practice-gap', conceptId: 'frac_equiv' });
  });
});
