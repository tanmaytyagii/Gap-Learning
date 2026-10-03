import type { KnowledgeGraph } from '../KnowledgeGraph';
import type {
  AssessmentSession, Difficulty, GapAnalysis, QuestionRecommendation, StudentResponse,
} from '../models';
import type { QuestionEngine } from './QuestionEngine';

const LOWER: Record<Difficulty, Difficulty> = { easy: 'easy', medium: 'easy', hard: 'medium' };
const HIGHER: Record<Difficulty, Difficulty> = { easy: 'medium', medium: 'hard', hard: 'hard' };

type Plan = Omit<QuestionRecommendation, 'question'>;

export class RecommendationEngine {
  private readonly questionEngine: QuestionEngine;
  private readonly graph: KnowledgeGraph;

  constructor(questionEngine: QuestionEngine, graph: KnowledgeGraph) {
    this.questionEngine = questionEngine;
    this.graph = graph;
  }

  recommendInitial(session: Pick<AssessmentSession, 'mode' | 'scope' | 'startingConceptId' | 'currentDifficulty'>): QuestionRecommendation | null {
    const concept = this.graph.get(session.startingConceptId);
    const plan: Plan = {
      type: session.mode === 'review' ? 'review' : 'baseline',
      reason: session.mode === 'review'
        ? `${concept.name} is due for review.`
        : `Baseline check for ${concept.name} at ${session.currentDifficulty} difficulty.`,
      targetConcept: concept.id,
      targetDifficulty: session.currentDifficulty,
    };
    return this.resolve(plan, [], this.widenScope(session));
  }

  recommendNext(session: AssessmentSession, lastResponse: StudentResponse, analysis: GapAnalysis): QuestionRecommendation | null {
    const plan = session.mode === 'diagnostic'
      ? this.planDiagnostic(lastResponse, analysis)
      : session.mode === 'practice'
        ? this.planPractice(lastResponse)
        : this.planReview(session, lastResponse);
    return this.resolve(plan, session.askedQuestionIds, this.widenScope(session));
  }

  /** Diagnostics roam the prerequisite graph: step back on errors, advance on secure evidence. */
  private planDiagnostic(lastResponse: StudentResponse, analysis: GapAnalysis): Plan {
    const current = this.graph.get(lastResponse.conceptId);

    if (!lastResponse.isCorrect) {
      const weakestPrerequisite = current.prerequisites
        .map((id) => analysis.conceptEvidence[id] ?? { conceptId: id, masteryScore: 50 })
        .sort((a, b) => a.masteryScore - b.masteryScore)[0];
      const targetConcept = weakestPrerequisite?.conceptId ?? current.id;
      return {
        type: 'remediation',
        targetConcept,
        targetDifficulty: LOWER[lastResponse.difficulty],
        reason: targetConcept === current.id
          ? `That answer lowers ${current.name} mastery, so the next item is simpler and targets the same foundation.`
          : `The error may come from ${this.graph.get(targetConcept).name}, so the next item steps back to that prerequisite.`,
      };
    }

    if (lastResponse.difficulty === 'easy') {
      return {
        type: 'challenge',
        targetConcept: current.id,
        targetDifficulty: HIGHER[lastResponse.difficulty],
        reason: `Correct evidence raises ${current.name} mastery; difficulty increases to confirm understanding.`,
      };
    }

    const successor = this.graph.successors(current.id).find((candidate) =>
      candidate.prerequisites.every((id) => (analysis.conceptEvidence[id]?.masteryScore ?? 70) >= 50)
      && !analysis.conceptEvidence[candidate.id],
    );
    return successor
      ? {
        type: 'progression',
        targetConcept: successor.id,
        targetDifficulty: successor.difficulty,
        reason: `${current.name} looks secure, so the next item checks the dependent concept ${successor.name}.`,
      }
      : {
        type: 'challenge',
        targetConcept: current.id,
        targetDifficulty: HIGHER[lastResponse.difficulty],
        reason: `No untested dependent concept is ready, so the challenge increases within ${current.name}.`,
      };
  }

  /** Practice stays on one concept and moves difficulty up or down with each answer. */
  private planPractice(lastResponse: StudentResponse): Plan {
    const concept = this.graph.get(lastResponse.conceptId);
    const targetDifficulty = (lastResponse.isCorrect ? HIGHER : LOWER)[lastResponse.difficulty];
    const same = targetDifficulty === lastResponse.difficulty;
    let reason: string;
    if (lastResponse.isCorrect) {
      reason = same
        ? `Another ${targetDifficulty} ${concept.name} question: you are already at the top difficulty.`
        : `A harder ${concept.name} question (${targetDifficulty}) to confirm you have it.`;
    } else {
      reason = same
        ? `Another ${targetDifficulty} ${concept.name} question, to practice the same idea again.`
        : `An easier ${concept.name} question (${targetDifficulty}) to rebuild the idea first.`;
    }
    return {
      type: lastResponse.isCorrect ? 'challenge' : 'remediation',
      targetConcept: concept.id,
      targetDifficulty,
      reason,
    };
  }

  /** Review rotates through the due concepts, pitching each one from its last result. */
  private planReview(session: AssessmentSession, lastResponse: StudentResponse): Plan {
    const index = session.scope.indexOf(lastResponse.conceptId);
    const nextId = session.scope[(index + 1) % session.scope.length] ?? lastResponse.conceptId;
    const previous = [...session.responses].reverse().find((response) => response.conceptId === nextId);
    const targetDifficulty: Difficulty = previous
      ? (previous.isCorrect ? HIGHER : LOWER)[previous.difficulty]
      : 'medium';
    return {
      type: 'review',
      targetConcept: nextId,
      targetDifficulty,
      reason: `Reviewing ${this.graph.get(nextId).name}.`,
    };
  }

  private widenScope(session: Pick<AssessmentSession, 'mode' | 'scope'>): string[] {
    // Diagnostics may use any concept in scope when the target is exhausted; practice must not drift.
    return session.mode === 'practice' ? [] : session.scope;
  }

  private resolve(plan: Plan, askedIds: string[], widenTo: string[]): QuestionRecommendation | null {
    const question = this.questionEngine.getQuestion(plan.targetConcept, plan.targetDifficulty, askedIds, widenTo);
    if (!question) return null;
    let reason = plan.reason;
    if (question.concept !== plan.targetConcept) {
      reason += ` No unseen question was left for that concept, so ${this.graph.get(question.concept).name} is checked instead.`;
    }
    return { ...plan, question, reason, targetConcept: question.concept, targetDifficulty: question.difficulty };
  }
}
