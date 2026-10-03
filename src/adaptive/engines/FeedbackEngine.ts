import type { KnowledgeGraph } from '../KnowledgeGraph';
import type { DiagnosticResult, Misconception, Question } from '../models';

export type MisconceptionLookup = (id: string) => Misconception | undefined;

const FALLBACK: Misconception = {
  id: 'unknown',
  subject: 'general',
  title: 'Unclassified Error',
  description: 'The answer is incorrect but does not match a known misconception pattern.',
  explanation: "This answer doesn't match a known misconception pattern, so the underlying concept needs another targeted check.",
  remedy: 'Explain your first step out loud, then try another question on the same concept.',
};

export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export class FeedbackEngine {
  private readonly graph: KnowledgeGraph;
  private readonly lookup: MisconceptionLookup;

  constructor(graph: KnowledgeGraph, lookup: MisconceptionLookup) {
    this.graph = graph;
    this.lookup = lookup;
  }

  misconception(id: string): Misconception {
    return this.lookup(id) ?? this.lookup('unknown') ?? FALLBACK;
  }

  diagnose(question: Question, selectedAnswer: string): DiagnosticResult {
    const isCorrect = normalizeAnswer(selectedAnswer) === normalizeAnswer(question.correctAnswer);
    const concept = this.graph.get(question.concept);
    const objective = question.learningObjective || concept.learningObjective;

    if (isCorrect) {
      return {
        isCorrect: true,
        misconceptionId: 'none',
        misconceptionTitle: null,
        explanation: `Your answer shows that you can ${lowerFirst(objective)}`,
        remedy: null,
        reviewConceptIds: [],
        suggestedNextConcept: question.concept,
        reasoning: `Correct evidence on ${concept.name} at ${question.difficulty} difficulty raises mastery.`,
      };
    }

    const misconceptionId = question.misconceptionMap[selectedAnswer] ?? 'unknown';
    const misconception = this.misconception(misconceptionId);
    const known = misconception.id !== 'unknown';
    return {
      isCorrect: false,
      misconceptionId: misconception.id,
      misconceptionTitle: known ? misconception.title : null,
      explanation: misconception.explanation,
      remedy: misconception.remedy,
      reviewConceptIds: concept.prerequisites,
      suggestedNextConcept: concept.prerequisites[0] ?? concept.id,
      reasoning: known
        ? `The option “${selectedAnswer}” is the distractor for ${misconception.title}.`
        : `The option “${selectedAnswer}” is not linked to a known misconception.`,
    };
  }

  explainGap(conceptId: string, misconceptionIds: string[]): string {
    const concept = this.graph.get(conceptId);
    const explanation = misconceptionIds
      .map((id) => this.lookup(id))
      .find((item): item is Misconception => Boolean(item) && item?.id !== 'unknown');
    return `${concept.name}: ${(explanation ?? this.misconception('unknown')).explanation}`;
  }
}
