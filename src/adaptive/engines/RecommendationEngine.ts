import { getConcept, getSuccessors } from '../data/knowledgeGraph';
import type { Difficulty, GapAnalysis, QuestionRecommendation, StudentResponse } from '../models';
import { QuestionEngine } from './QuestionEngine';

const LOWER: Record<Difficulty, Difficulty> = { easy: 'easy', medium: 'easy', hard: 'medium' };
const HIGHER: Record<Difficulty, Difficulty> = { easy: 'medium', medium: 'hard', hard: 'hard' };

export class RecommendationEngine {
  private readonly questionEngine: QuestionEngine;

  constructor(questionEngine: QuestionEngine) {
    this.questionEngine = questionEngine;
  }

  recommendInitial(conceptId: string, excludedIds: string[]): QuestionRecommendation {
    const concept = getConcept(conceptId);
    const question = this.questionEngine.getQuestion(conceptId, concept.difficulty, excludedIds);
    return {
      question,
      type: 'baseline',
      reason: `Baseline check for ${concept.name} at ${question.difficulty} difficulty.`,
      targetConcept: question.concept,
      targetDifficulty: question.difficulty,
    };
  }

  recommendNext(lastResponse: StudentResponse, analysis: GapAnalysis, excludedIds: string[]): QuestionRecommendation {
    const current = getConcept(lastResponse.conceptId);
    let targetConcept = current.id;
    let targetDifficulty: Difficulty;
    let type: QuestionRecommendation['type'];
    let reason: string;

    if (!lastResponse.isCorrect) {
      const weakestPrerequisite = current.prerequisites
        .map((id) => analysis.conceptEvidence[id] ?? { conceptId: id, masteryScore: 50 })
        .sort((a, b) => a.masteryScore - b.masteryScore)[0];
      targetConcept = weakestPrerequisite?.conceptId ?? current.id;
      targetDifficulty = LOWER[lastResponse.difficulty];
      type = 'remediation';
      reason = targetConcept === current.id
        ? `Incorrect evidence lowers ${current.name} mastery, so the next item is simpler and targets the same foundation.`
        : `The error depends on ${getConcept(targetConcept).name}, so the engine steps back to that prerequisite with lower difficulty.`;
    } else if (lastResponse.difficulty === 'easy') {
      targetDifficulty = HIGHER[lastResponse.difficulty];
      type = 'challenge';
      reason = `Correct evidence raises ${current.name} mastery; difficulty increases to confirm understanding.`;
    } else {
      const successor = getSuccessors(current.id).find((candidate) =>
        candidate.prerequisites.every((id) => (analysis.conceptEvidence[id]?.masteryScore ?? 70) >= 50),
      );
      targetConcept = successor?.id ?? current.id;
      targetDifficulty = successor?.difficulty ?? HIGHER[lastResponse.difficulty];
      type = successor ? 'progression' : 'challenge';
      reason = successor
        ? `${current.name} is secure enough to assess the dependent concept ${successor.name}.`
        : `No untested dependent concept is ready, so the engine increases challenge within ${current.name}.`;
    }

    const question = this.questionEngine.getQuestion(targetConcept, targetDifficulty, excludedIds);
    if (question.concept !== targetConcept) {
      reason += ` The local bank had no unseen item at that target, so ${getConcept(question.concept).name} is used as the nearest valid graph check.`;
    }
    return { question, type, reason, targetConcept: question.concept, targetDifficulty: question.difficulty };
  }
}
