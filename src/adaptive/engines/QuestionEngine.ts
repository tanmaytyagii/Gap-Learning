import questionBankData from '../data/question-bank.json';
import { getConcept } from '../data/knowledgeGraph';
import type { Difficulty, Question } from '../models';

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

export class QuestionEngine {
  private readonly questions = questionBankData as unknown as Question[];

  getById(questionId: string): Question {
    const question = this.questions.find((item) => item.id === questionId);
    if (!question) throw new Error(`Unknown question: ${questionId}`);
    return question;
  }

  getQuestion(conceptId: string, difficulty: Difficulty, excludedIds: string[]): Question {
    const unseen = this.questions.filter((question) => !excludedIds.includes(question.id));
    const conceptCandidates = unseen.filter((question) => question.concept === conceptId);
    const subject = getConcept(conceptId).subject;
    const subjectCandidates = unseen.filter((question) => getConcept(question.concept).subject === subject);
    const candidates = conceptCandidates.length > 0 ? conceptCandidates : subjectCandidates;
    const reusable = this.questions.filter((question) => question.concept === conceptId);
    const pool = candidates.length > 0 ? candidates : reusable;

    if (pool.length === 0) throw new Error(`No questions available for concept: ${conceptId}`);

    return [...pool].sort((a, b) => {
      const difficultyDelta = Math.abs(DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[difficulty])
        - Math.abs(DIFFICULTY_RANK[b.difficulty] - DIFFICULTY_RANK[difficulty]);
      return difficultyDelta || a.id.localeCompare(b.id);
    })[0];
  }

  getAll(): Question[] {
    return [...this.questions];
  }
}
