import type { KnowledgeGraph } from './KnowledgeGraph';
import { FeedbackEngine, type MisconceptionLookup } from './engines/FeedbackEngine';
import { GapAnalysisEngine } from './engines/GapAnalysisEngine';
import { QuestionEngine, type RandomSource } from './engines/QuestionEngine';
import { RecommendationEngine } from './engines/RecommendationEngine';
import { ReportGenerator } from './engines/ReportGenerator';
import type {
  AssessmentReport, AssessmentSession, GapAnalysis, Question, SessionOptions, StudentResponse, SubmissionResult,
} from './models';

export interface EngineContent {
  graph: KnowledgeGraph;
  questions: Question[];
  misconceptions: MisconceptionLookup;
  random?: RandomSource;
}

export type SessionSubmission = SubmissionResult & { session: AssessmentSession };

function createId(): string {
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Facade over the question, gap-analysis, feedback, recommendation, and report engines.
 * Sessions are plain serializable objects; every transition returns a new session.
 */
export class AdaptiveAssessmentEngine {
  private readonly graph: KnowledgeGraph;
  private readonly questionEngine: QuestionEngine;
  private readonly gapAnalysisEngine: GapAnalysisEngine;
  private readonly feedbackEngine: FeedbackEngine;
  private readonly recommendationEngine: RecommendationEngine;
  private readonly reportGenerator: ReportGenerator;

  constructor(content: EngineContent) {
    this.graph = content.graph;
    this.questionEngine = new QuestionEngine(content.questions, content.graph, content.random);
    this.gapAnalysisEngine = new GapAnalysisEngine(content.graph);
    this.feedbackEngine = new FeedbackEngine(content.graph, content.misconceptions);
    this.recommendationEngine = new RecommendationEngine(this.questionEngine, content.graph);
    this.reportGenerator = new ReportGenerator(this.feedbackEngine, content.graph);
  }

  /** Number of distinct questions available to a session over these concepts. */
  availableQuestions(conceptIds: string[]): number {
    return this.questionEngine.countFor(conceptIds);
  }

  createSession(options: SessionOptions & { startConceptId?: string }): AssessmentSession {
    const scope = options.conceptIds.filter((id) => this.graph.has(id));
    const available = this.questionEngine.countFor(scope);
    if (scope.length === 0 || available === 0) {
      throw new Error('There are no questions for this selection yet.');
    }
    if (!Number.isInteger(options.maxQuestions) || options.maxQuestions < 1) {
      throw new Error('maxQuestions must be a positive integer');
    }

    const startingConceptId = options.startConceptId && scope.includes(options.startConceptId)
      ? options.startConceptId
      : scope.find((id) => this.questionEngine.countFor([id]) > 0)!;
    const startingConcept = this.graph.get(startingConceptId);

    const draft: AssessmentSession = {
      id: createId(),
      mode: options.mode,
      subject: startingConcept.subject,
      scope,
      startingConceptId,
      currentConceptId: startingConceptId,
      currentDifficulty: options.startDifficulty ?? startingConcept.difficulty,
      // Never ask more questions than exist, so a session does not have to repeat itself.
      maxQuestions: Math.min(options.maxQuestions, available),
      responses: [],
      askedQuestionIds: [],
      pendingRecommendation: null,
      status: 'active',
      startedAt: new Date().toISOString(),
    };

    const pendingRecommendation = this.recommendationEngine.recommendInitial(draft);
    if (!pendingRecommendation) throw new Error('There are no questions for this selection yet.');
    return {
      ...draft,
      currentConceptId: pendingRecommendation.targetConcept,
      currentDifficulty: pendingRecommendation.targetDifficulty,
      pendingRecommendation,
    };
  }

  getCurrentQuestion(session: AssessmentSession): Question {
    if (session.status !== 'active' || !session.pendingRecommendation) {
      throw new Error('This session has no active question');
    }
    return session.pendingRecommendation.question;
  }

  submitAnswer(session: AssessmentSession, selectedAnswer: string, studentWorking = ''): SessionSubmission {
    const question = this.getCurrentQuestion(session);
    const diagnostic = this.feedbackEngine.diagnose(question, selectedAnswer);
    const response: StudentResponse = {
      questionId: question.id,
      conceptId: question.concept,
      difficulty: question.difficulty,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect: diagnostic.isCorrect,
      misconceptionId: diagnostic.misconceptionId,
      studentWorking,
      answeredAt: new Date().toISOString(),
    };

    const answered: AssessmentSession = {
      ...session,
      responses: [...session.responses, response],
      askedQuestionIds: [...session.askedQuestionIds, question.id],
    };
    const analysis = this.gapAnalysisEngine.analyze(answered.responses);

    const nextRecommendation = answered.responses.length >= answered.maxQuestions
      ? null
      : this.recommendationEngine.recommendNext(answered, response, analysis);

    if (!nextRecommendation) {
      const completed: AssessmentSession = { ...answered, status: 'completed', pendingRecommendation: null };
      return {
        session: completed,
        diagnostic,
        response,
        nextRecommendation: null,
        report: this.reportGenerator.generate(completed, analysis),
      };
    }

    if (answered.mode === 'diagnostic') {
      diagnostic.suggestedNextConcept = nextRecommendation.targetConcept;
      diagnostic.reasoning += ` ${nextRecommendation.reason}`;
    }
    return {
      session: {
        ...answered,
        currentConceptId: nextRecommendation.targetConcept,
        currentDifficulty: nextRecommendation.targetDifficulty,
        pendingRecommendation: nextRecommendation,
      },
      diagnostic,
      response,
      nextRecommendation,
      report: null,
    };
  }

  /** Ends a session early. Returns null when nothing was answered, since there is nothing to report. */
  finish(session: AssessmentSession): { session: AssessmentSession; report: AssessmentReport | null } {
    const completed: AssessmentSession = { ...session, status: 'completed', pendingRecommendation: null };
    if (session.responses.length === 0) return { session: completed, report: null };
    return { session: completed, report: this.reportGenerator.generate(completed, this.getLiveAnalysis(session)) };
  }

  getLiveAnalysis(session: AssessmentSession): GapAnalysis {
    return this.gapAnalysisEngine.analyze(session.responses);
  }

  describeMisconception(id: string) {
    return this.feedbackEngine.misconception(id);
  }
}
