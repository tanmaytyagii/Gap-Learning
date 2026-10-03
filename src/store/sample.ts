import { AdaptiveAssessmentEngine, type Difficulty, type Question, type SessionMode } from '../adaptive';
import type { Curriculum } from '../domain/curriculum';
import type { Attempt, LearnerData, SessionRecord } from '../domain/types';
import { addDays, dayKey, startOfDay } from '../utils/date';
import { createEmptyData } from './schema';

/**
 * Builds a clearly labeled sample workspace by simulating a learner who answers real questions
 * through the real adaptive engine over the past four weeks. Nothing is hand-written into the
 * metrics: every chart and gap comes from the same code paths as real use.
 */

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Probability of a correct answer at the start and end of the four weeks, plus a typical mistake. */
const LEARNER: Record<string, { start: number; end: number; habit?: string }> = {
  frac_visual: { start: 0.9, end: 1 },
  frac_equiv: { start: 0.45, end: 0.9, habit: 'additive_scaling_error' },
  frac_compare: { start: 0.4, end: 0.72, habit: 'whole_number_comparison' },
  frac_operations: { start: 0.25, end: 0.4, habit: 'direct_denom_addition' },
  sci_force: { start: 0.8, end: 1 },
  sci_gravity: { start: 0.6, end: 0.82, habit: 'mass_weight_equivalence' },
  sci_net_force: { start: 0.3, end: 0.42, habit: 'force_motion_link' },
  sci_action_reaction: { start: 0.35, end: 0.5, habit: 'mass_dominant_collision' },
  eng_present: { start: 0.9, end: 1 },
  eng_past: { start: 0.6, end: 0.85, habit: 'past_continuous_confusion' },
  eng_perfect: { start: 0.35, end: 0.55, habit: 'perfect_simple_past_overlap' },
};
const DIFFICULTY_SHIFT: Record<Difficulty, number> = { easy: 0.1, medium: 0, hard: -0.12 };
const SPAN_DAYS = 29;

type Plan = [dayOffset: number, mode: SessionMode, target: string];

const PLAN: Plan[] = [
  [-29, 'diagnostic', 'math'], [-28, 'diagnostic', 'science'], [-27, 'diagnostic', 'english'],
  [-25, 'practice', 'frac_equiv'], [-24, 'practice', 'sci_force'], [-22, 'practice', 'frac_equiv'],
  [-20, 'practice', 'eng_past'], [-19, 'diagnostic', 'math'], [-17, 'practice', 'sci_gravity'],
  [-15, 'practice', 'frac_compare'], [-14, 'practice', 'frac_equiv'], [-12, 'practice', 'eng_perfect'],
  [-10, 'diagnostic', 'science'], [-9, 'practice', 'frac_compare'], [-8, 'practice', 'sci_force'],
  [-7, 'practice', 'frac_operations'], [-6, 'practice', 'sci_net_force'], [-5, 'practice', 'frac_visual'],
  [-4, 'practice', 'eng_present'], [-3, 'practice', 'frac_equiv'],
  [-2, 'practice', 'frac_compare'], [-1, 'practice', 'eng_past'], [0, 'practice', 'frac_operations'],
];

/**
 * Van der Corput sequence (0.5, 0.25, 0.75, …), phase-shifted per concept. Comparing it with the
 * learner's ability gives hit rates that track ability closely without long unlucky streaks.
 */
function lowDiscrepancy(index: number, phase: number): number {
  let value = 0;
  let denominator = 1;
  let n = index + 1;
  while (n > 0) {
    denominator *= 2;
    value += (n % 2) / denominator;
    n = Math.floor(n / 2);
  }
  return (value + phase) % 1;
}

function phaseFor(conceptId: string): number {
  let hash = 0;
  for (const char of conceptId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 1000) / 1000;
}

function pickAnswer(question: Question, correct: boolean, habit: string | undefined, random: () => number): string {
  if (correct) return question.correctAnswer;
  const wrong = question.options.filter((option) => option !== question.correctAnswer);
  const habitual = wrong.find((option) => habit && question.misconceptionMap[option] === habit);
  if (habitual && random() < 0.7) return habitual;
  return wrong[Math.floor(random() * wrong.length)];
}

export function createSampleData(curriculum: Curriculum, questions: Question[], now = new Date()): LearnerData {
  const random = seededRandom(20260401);
  const engine = new AdaptiveAssessmentEngine({
    graph: curriculum.graph,
    questions,
    misconceptions: curriculum.misconception,
    random,
  });
  const today = startOfDay(now);
  const attempts: Attempt[] = [];
  const sessions: SessionRecord[] = [];
  const answeredPerConcept = new Map<string, number>();

  PLAN.forEach(([dayOffset, mode, target], planIndex) => {
    const progress = (SPAN_DAYS + dayOffset) / SPAN_DAYS;
    const conceptIds = mode === 'diagnostic' ? curriculum.graph.topologicalOrder(target) : [target];
    // Sessions happen in the early evening; today's session is placed safely in the past.
    const start = dayOffset === 0
      ? new Date(now.getTime() - 45 * 60 * 1000)
      : new Date(addDays(today, dayOffset).getTime() + (18 * 60 + Math.floor(random() * 120)) * 60 * 1000);
    let clock = start.getTime();

    let session = engine.createSession({ mode, conceptIds, maxQuestions: mode === 'diagnostic' ? 8 : 6 });
    session = { ...session, id: `sample-session-${planIndex}`, startedAt: start.toISOString() };
    let report = null;

    while (session.status === 'active') {
      const question = engine.getCurrentQuestion(session);
      const learner = LEARNER[question.concept] ?? { start: 0.6, end: 0.8 };
      const ability = learner.start + (learner.end - learner.start) * progress + DIFFICULTY_SHIFT[question.difficulty];
      const answered = answeredPerConcept.get(question.concept) ?? 0;
      answeredPerConcept.set(question.concept, answered + 1);
      const correct = lowDiscrepancy(answered, phaseFor(question.concept)) < Math.min(0.97, Math.max(0.05, ability));
      const durationMs = Math.round((25 + random() * 70) * 1000);
      clock += durationMs;

      const result = engine.submitAnswer(session, pickAnswer(question, correct, learner.habit, random));
      const answeredAt = new Date(clock).toISOString();
      attempts.push({
        id: `sample-attempt-${attempts.length}`,
        sessionId: session.id,
        questionId: question.id,
        conceptId: question.concept,
        difficulty: question.difficulty,
        correct: result.diagnostic.isCorrect,
        selectedAnswer: result.response.selectedAnswer,
        misconceptionId: result.diagnostic.isCorrect ? null : result.diagnostic.misconceptionId,
        mode,
        answeredAt,
        durationMs,
        hintUsed: !result.diagnostic.isCorrect && random() < 0.3,
      });
      session = result.session;
      report = result.report;
    }

    const sessionAttempts = attempts.filter((attempt) => attempt.sessionId === session.id);
    const { analysis: _analysis, ...storedReport } = report!;
    sessions.push({
      id: session.id,
      mode,
      subjectId: session.subject,
      conceptIds: session.scope,
      startedAt: start.toISOString(),
      endedAt: new Date(clock).toISOString(),
      questionCount: sessionAttempts.length,
      correctCount: sessionAttempts.filter((attempt) => attempt.correct).length,
      completed: true,
      report: { ...storedReport, generatedAt: new Date(clock).toISOString() },
    });
  });

  const at = (offset: number) => new Date(addDays(today, offset).getTime() + 20 * 60 * 60 * 1000).toISOString();
  const data = createEmptyData(addDays(today, -SPAN_DAYS));

  return {
    ...data,
    profile: { name: 'Sample learner', createdAt: addDays(today, -SPAN_DAYS).toISOString() },
    attempts,
    sessions,
    topics: {
      frac_operations: { selfRating: { value: 4, ratedAt: at(-26) } },
      sci_net_force: { priority: 'high' },
      sci_action_reaction: { selfRating: { value: 2, ratedAt: at(-26) } },
      eng_perfect: { priority: 'high' },
    },
    notes: [
      {
        id: 'sample-note-1',
        conceptId: 'frac_equiv',
        body: 'Scale factor first: new ÷ old. Then apply it to BOTH numbers. Adding the same number to top and bottom changes the value.',
        createdAt: at(-22),
        updatedAt: at(-14),
      },
      {
        id: 'sample-note-2',
        conceptId: 'sci_net_force',
        body: 'Constant velocity means a = 0, so the net force is 0. Moving does not need a net force; changing motion does.',
        createdAt: at(-6),
        updatedAt: at(-6),
      },
    ],
    resources: [
      { id: 'sample-resource-1', conceptId: 'frac_operations', title: 'Khan Academy: Arithmetic', url: 'https://www.khanacademy.org/math/arithmetic', kind: 'course', done: false, createdAt: at(-7) },
      { id: 'sample-resource-2', conceptId: 'sci_net_force', title: "The Physics Classroom: Newton's Laws", url: 'https://www.physicsclassroom.com/class/newtlaws', kind: 'article', done: true, createdAt: at(-6) },
      { id: 'sample-resource-3', conceptId: 'eng_perfect', title: 'British Council: English grammar', url: 'https://learnenglish.britishcouncil.org/grammar', kind: 'article', done: false, createdAt: at(-12) },
    ],
    goals: [
      {
        id: 'sample-goal-1',
        title: 'Close my fraction gaps',
        conceptIds: curriculum.graph.topologicalOrder('math'),
        targetDate: dayKey(addDays(today, 21)),
        createdAt: at(-10),
      },
    ],
    meta: { sample: true },
  };
}
