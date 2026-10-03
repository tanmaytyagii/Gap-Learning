import type { KnowledgeGraph } from '../KnowledgeGraph';
import type { Difficulty, Question } from '../models';

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

export type RandomSource = () => number;

export class QuestionEngine {
  private readonly questions: Question[];
  private readonly random: RandomSource;

  constructor(questions: Question[], graph: KnowledgeGraph, random: RandomSource = Math.random) {
    // Questions for concepts outside the graph are ignored so one bad record cannot break a session.
    this.questions = questions.filter((question) => graph.has(question.concept));
    this.random = random;
  }

  getAll(): Question[] {
    return [...this.questions];
  }

  countFor(conceptIds: string[]): number {
    const scope = new Set(conceptIds);
    return this.questions.filter((question) => scope.has(question.concept)).length;
  }

  /**
   * Picks the unseen question for `conceptId` closest to the target difficulty. When that concept
   * is exhausted the search can widen to related concepts, and as a last resort it re-asks the
   * question that was asked longest ago instead of repeating the most recent one.
   */
  getQuestion(conceptId: string, difficulty: Difficulty, askedIds: string[], widenTo: string[] = []): Question | null {
    const asked = new Set(askedIds);
    const sameConcept = this.questions.filter((question) => question.concept === conceptId);

    const unseenSame = sameConcept.filter((question) => !asked.has(question.id));
    if (unseenSame.length > 0) return this.closestTo(unseenSame, difficulty);

    const widenScope = new Set(widenTo);
    const unseenWider = this.questions.filter((question) => widenScope.has(question.concept) && !asked.has(question.id));
    if (unseenWider.length > 0) return this.closestTo(unseenWider, difficulty);

    if (sameConcept.length === 0) return null;
    return [...sameConcept].sort((a, b) => askedIds.lastIndexOf(a.id) - askedIds.lastIndexOf(b.id))[0];
  }

  private closestTo(pool: Question[], difficulty: Difficulty): Question {
    const distance = (question: Question) => Math.abs(DIFFICULTY_RANK[question.difficulty] - DIFFICULTY_RANK[difficulty]);
    const best = Math.min(...pool.map(distance));
    const candidates = pool.filter((question) => distance(question) === best);
    return candidates[Math.floor(this.random() * candidates.length)] ?? candidates[0];
  }
}
