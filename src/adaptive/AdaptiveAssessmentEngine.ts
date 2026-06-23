import { getConcept } from './data/knowledgeGraph';
import { FeedbackEngine } from './engines/FeedbackEngine';
import { GapAnalysisEngine } from './engines/GapAnalysisEngine';
import { QuestionEngine } from './engines/QuestionEngine';
import { RecommendationEngine } from './engines/RecommendationEngine';
import { ReportGenerator } from './engines/ReportGenerator';
import type { AssessmentSession, Question, SubmissionResult } from './models';

function createId(): string {
  return `assessment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class AdaptiveAssessmentEngine {
  private readonly questionEngine = new QuestionEngine();

  getQuestionEngine(): QuestionEngine {
    return this.questionEngine;
  }
  private readonly gapAnalysisEngine = new GapAnalysisEngine();
  private readonly feedbackEngine = new FeedbackEngine();
  private readonly recommendationEngine = new RecommendationEngine(this.questionEngine);
  private readonly reportGenerator = new ReportGenerator(this.feedbackEngine);

  createSession(startingConceptId: string, maxQuestions = 5): AssessmentSession {
    if (!Number.isInteger(maxQuestions) || maxQuestions < 1) {
      throw new Error('maxQuestions must be a positive integer');
    }
    const concept = getConcept(startingConceptId);
    const pendingRecommendation = this.recommendationEngine.recommendInitial(startingConceptId, []);

    return {
      id: createId(),
      subject: concept.subject,
      startingConceptId,
      currentConceptId: pendingRecommendation.targetConcept,
      currentDifficulty: pendingRecommendation.targetDifficulty,
      maxQuestions,
      responses: [],
      askedQuestionIds: [],
      pendingRecommendation,
      status: 'active',
      startedAt: new Date().toISOString(),
    };
  }

  getCurrentQuestion(session: AssessmentSession): Question {
    if (session.status !== 'active' || !session.pendingRecommendation) {
      throw new Error('This assessment has no active question');
    }
    return session.pendingRecommendation.question;
  }

  submitAnswer(session: AssessmentSession, selectedAnswer: string, studentWorking = ''): SubmissionResult {
    if (session.status !== 'active' || !session.pendingRecommendation) {
      throw new Error('Cannot submit an answer to a completed assessment');
    }

    const question = session.pendingRecommendation.question;
    const diagnostic = this.feedbackEngine.diagnose(question, selectedAnswer);
    const response = {
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

    session.responses.push(response);
    session.askedQuestionIds.push(question.id);
    const analysis = this.gapAnalysisEngine.analyze(session.responses);

    if (session.responses.length >= session.maxQuestions) {
      session.status = 'completed';
      session.pendingRecommendation = null;
      return {
        diagnostic,
        response,
        nextRecommendation: null,
        report: this.reportGenerator.generate(session, analysis),
      };
    }

    const nextRecommendation = this.recommendationEngine.recommendNext(response, analysis, session.askedQuestionIds);
    diagnostic.suggestedNextConcept = nextRecommendation.targetConcept;
    diagnostic.reasoning += ` Next-question decision: ${nextRecommendation.reason}`;
    session.currentConceptId = nextRecommendation.targetConcept;
    session.currentDifficulty = nextRecommendation.targetDifficulty;
    session.pendingRecommendation = nextRecommendation;

    return { diagnostic, response, nextRecommendation, report: null };
  }

  getLiveAnalysis(session: AssessmentSession) {
    return this.gapAnalysisEngine.analyze(session.responses);
  }
}

export const adaptiveAssessmentEngine = new AdaptiveAssessmentEngine();
