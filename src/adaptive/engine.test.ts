import { describe, expect, it } from 'vitest';
import { buildCurriculum, SEED_QUESTIONS } from '../domain/curriculum';
import { AdaptiveAssessmentEngine, DIFFICULTIES, KnowledgeGraph, type Question } from '.';

const curriculum = buildCurriculum({ subjects: [], concepts: [], misconceptions: [] });

function seeded(seed = 1): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function engineWith(questions: Question[] = SEED_QUESTIONS) {
  return new AdaptiveAssessmentEngine({
    graph: curriculum.graph,
    questions,
    misconceptions: curriculum.misconception,
    random: seeded(),
  });
}

describe('content integrity', () => {
  it('every seed question is valid against the curriculum', () => {
    const ids = new Set<string>();
    SEED_QUESTIONS.forEach((question) => {
      expect(ids.has(question.id), `duplicate id ${question.id}`).toBe(false);
      ids.add(question.id);
      expect(curriculum.graph.has(question.concept), question.id).toBe(true);
      expect(question.options).toContain(question.correctAnswer);
      expect(new Set(question.options).size).toBe(question.options.length);
      Object.entries(question.misconceptionMap).forEach(([option, misconceptionId]) => {
        expect(question.options, question.id).toContain(option);
        expect(option).not.toBe(question.correctAnswer);
        expect(curriculum.misconception(misconceptionId), `${question.id} → ${misconceptionId}`).toBeDefined();
      });
    });
  });

  it('has no duplicate questions (same stem and same options)', () => {
    const keys = SEED_QUESTIONS.map((question) => `${question.question.trim().toLowerCase()}|${[...question.options].sort().join('|')}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('tags distractors only with misconceptions from the same subject', () => {
    SEED_QUESTIONS.forEach((question) => {
      const subject = curriculum.concept(question.concept)!.subject;
      Object.values(question.misconceptionMap).forEach((id) => {
        expect(['general', subject], `${question.id} → ${id}`).toContain(curriculum.misconception(id)!.subject);
      });
    });
  });

  it('keeps prerequisites inside a subject and free of cycles', () => {
    curriculum.subjects.forEach((subject) => {
      const order = curriculum.graph.topologicalOrder(subject.id);
      expect(order).toHaveLength(curriculum.conceptsBySubject(subject.id).length);
      curriculum.conceptsBySubject(subject.id).forEach((concept) => {
        concept.prerequisites.forEach((prerequisite) => {
          expect(curriculum.concept(prerequisite)!.subject).toBe(subject.id);
          expect(order.indexOf(prerequisite)).toBeLessThan(order.indexOf(concept.id));
        });
      });
    });
  });

  it('every concept has questions at every difficulty and a lesson', () => {
    curriculum.concepts.forEach((concept) => {
      DIFFICULTIES.forEach((difficulty) => {
        const count = SEED_QUESTIONS.filter((question) => question.concept === concept.id && question.difficulty === difficulty).length;
        expect(count, `${concept.id} ${difficulty}`).toBeGreaterThanOrEqual(2);
      });
      expect(concept.lesson?.keyPoints.length).toBeGreaterThan(0);
    });
  });
});

describe('KnowledgeGraph', () => {
  it('orders prerequisites before dependents', () => {
    const order = curriculum.graph.topologicalOrder('math');
    curriculum.graph.bySubject('math').forEach((concept) => {
      concept.prerequisites.forEach((prerequisite) => {
        expect(order.indexOf(prerequisite)).toBeLessThan(order.indexOf(concept.id));
      });
    });
  });

  it('finds transitive dependents and detects cycles', () => {
    expect(curriculum.graph.transitiveDependents('frac_visual').sort()).toEqual(['frac_compare', 'frac_equiv', 'frac_operations']);
    expect(curriculum.graph.wouldCreateCycle('frac_visual', 'frac_operations')).toBe(true);
    expect(curriculum.graph.wouldCreateCycle('frac_operations', 'frac_visual')).toBe(false);
  });

  it('drops prerequisites that point at unknown concepts and survives cycles', () => {
    const graph = new KnowledgeGraph([
      { id: 'a', subject: 's', topic: 't', name: 'A', description: '', difficulty: 'easy', prerequisites: ['b', 'ghost'], learningObjective: '' },
      { id: 'b', subject: 's', topic: 't', name: 'B', description: '', difficulty: 'easy', prerequisites: ['a'], learningObjective: '' },
    ]);
    expect(graph.get('a').prerequisites).toEqual(['b']);
    expect(graph.topologicalOrder('s')).toHaveLength(2);
  });
});

describe('AdaptiveAssessmentEngine', () => {
  it('ignores questions for unknown concepts instead of crashing (regression)', () => {
    const broken = { ...SEED_QUESTIONS[0], id: 'broken', concept: 'frac_basic' };
    const engine = engineWith([...SEED_QUESTIONS, broken]);
    const session = engine.createSession({ mode: 'diagnostic', conceptIds: curriculum.graph.topologicalOrder('math'), maxQuestions: 5 });
    expect(engine.getCurrentQuestion(session).concept).toBe('frac_visual');
  });

  it('does not repeat questions within a session (regression)', () => {
    const engine = engineWith();
    let session = engine.createSession({ mode: 'diagnostic', conceptIds: curriculum.graph.topologicalOrder('english'), maxQuestions: 8 });
    const asked: string[] = [];
    while (session.status === 'active') {
      const question = engine.getCurrentQuestion(session);
      asked.push(question.id);
      session = engine.submitAnswer(session, question.correctAnswer).session;
    }
    expect(asked).toHaveLength(8);
    expect(new Set(asked).size).toBe(8);
  });

  it('clamps the session length to the questions available', () => {
    const engine = engineWith();
    const session = engine.createSession({ mode: 'practice', conceptIds: ['frac_visual'], maxQuestions: 50 });
    expect(session.maxQuestions).toBe(6);
  });

  it('diagnoses the misconception behind a distractor', () => {
    const engine = engineWith();
    const session = engine.createSession({ mode: 'practice', conceptIds: ['frac_operations'], maxQuestions: 3, startDifficulty: 'medium' });
    const question = engine.getCurrentQuestion(session);
    const [distractor, misconceptionId] = Object.entries(question.misconceptionMap)[0];
    const result = engine.submitAnswer(session, distractor);
    expect(result.diagnostic.isCorrect).toBe(false);
    expect(result.diagnostic.misconceptionId).toBe(misconceptionId);
    expect(result.diagnostic.misconceptionTitle).toBe(curriculum.misconception(misconceptionId)?.title);
    expect(result.diagnostic.reviewConceptIds).toEqual(['frac_equiv', 'frac_compare']);
  });

  it('practice stays on one concept and adapts difficulty', () => {
    const engine = engineWith();
    let session = engine.createSession({ mode: 'practice', conceptIds: ['frac_equiv'], maxQuestions: 4, startDifficulty: 'easy' });
    const first = engine.getCurrentQuestion(session);
    expect(first.difficulty).toBe('easy');
    session = engine.submitAnswer(session, first.correctAnswer).session;
    const second = engine.getCurrentQuestion(session);
    expect(second.concept).toBe('frac_equiv');
    expect(second.difficulty).toBe('medium');
    const wrong = second.options.find((option) => option !== second.correctAnswer)!;
    session = engine.submitAnswer(session, wrong).session;
    expect(engine.getCurrentQuestion(session).difficulty).toBe('easy');
  });

  it('diagnostics step back to a prerequisite after an error', () => {
    const engine = engineWith();
    const session = engine.createSession({
      mode: 'diagnostic', conceptIds: curriculum.graph.topologicalOrder('math'), maxQuestions: 6, startConceptId: 'frac_compare',
    });
    const question = engine.getCurrentQuestion(session);
    const wrong = question.options.find((option) => option !== question.correctAnswer)!;
    const next = engine.submitAnswer(session, wrong);
    expect(['frac_visual', 'frac_equiv']).toContain(next.nextRecommendation?.targetConcept);
    expect(next.nextRecommendation?.type).toBe('remediation');
  });

  it('review rotates through the due concepts', () => {
    const engine = engineWith();
    let session = engine.createSession({ mode: 'review', conceptIds: ['frac_visual', 'sci_force', 'eng_present'], maxQuestions: 3 });
    const concepts: string[] = [];
    while (session.status === 'active') {
      const question = engine.getCurrentQuestion(session);
      concepts.push(question.concept);
      session = engine.submitAnswer(session, question.correctAnswer).session;
    }
    expect(concepts).toEqual(['frac_visual', 'sci_force', 'eng_present']);
  });

  it('produces a report on completion and when finished early', () => {
    const engine = engineWith();
    let session = engine.createSession({ mode: 'practice', conceptIds: ['sci_force'], maxQuestions: 2 });
    const first = engine.getCurrentQuestion(session);
    session = engine.submitAnswer(session, first.correctAnswer).session;
    const early = engine.finish(session);
    expect(early.report?.masteryChart.map((item) => item.conceptId)).toEqual(['sci_force']);

    const second = engine.getCurrentQuestion(session);
    const done = engine.submitAnswer(session, second.correctAnswer);
    expect(done.session.status).toBe('completed');
    expect(done.report?.strengths).toContain('Concept of Force');
    expect(engine.finish(engine.createSession({ mode: 'practice', conceptIds: ['sci_force'], maxQuestions: 2 })).report).toBeNull();
  });

  it('refuses to start a session with no questions', () => {
    const engine = engineWith([]);
    expect(() => engine.createSession({ mode: 'practice', conceptIds: ['frac_visual'], maxQuestions: 3 })).toThrow(/no questions/i);
  });
});
