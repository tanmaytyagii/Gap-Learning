export type Difficulty = 'easy' | 'medium' | 'hard';

export type MasteryLevel = 'beginning' | 'developing' | 'proficient' | 'mastered';

export interface ConceptNode {
  id: string;
  subject: string;
  topic: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  prerequisites: string[];
  learningObjective: string;
}

export interface Question {
  id: string;
  topic: string;
  concept: string;
  difficulty: Difficulty;
  prerequisites: string[];
  learningObjective: string;
  question: string;
  options: string[];
  correctAnswer: string;
  hint: string;
  solutionSteps: string;
  misconceptionMap: Record<string, string>;
}

export interface StudentResponse {
  questionId: string;
  conceptId: string;
  difficulty: Difficulty;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  misconceptionId: string;
  studentWorking: string;
  answeredAt: string;
}

export interface DiagnosticResult {
  isCorrect: boolean;
  misconceptionId: string;
  explanation: string;
  suggestedNextConcept: string;
  reasoning: string;
}

export interface ConceptEvidence {
  conceptId: string;
  attempts: number;
  correct: number;
  masteryScore: number;
  confidenceScore: number;
  masteryLevel: MasteryLevel;
  evidence: 'observed' | 'inferred';
  misconceptionIds: string[];
}

export interface GapAnalysis {
  strongConcepts: string[];
  weakConcepts: string[];
  confidenceScore: Record<string, number>;
  masteryLevel: Record<string, MasteryLevel>;
  conceptEvidence: Record<string, ConceptEvidence>;
}

export interface LearningPathStep {
  order: number;
  conceptId: string;
  conceptName: string;
  reason: string;
  status: 'review' | 'practice' | 'ready';
}

export interface QuestionRecommendation {
  question: Question;
  type: 'baseline' | 'challenge' | 'progression' | 'remediation';
  reason: string;
  targetConcept: string;
  targetDifficulty: Difficulty;
}

export interface AssessmentReport {
  assessmentId: string;
  generatedAt: string;
  strengths: string[];
  weaknesses: string[];
  masteryChart: Array<{
    conceptId: string;
    concept: string;
    mastery: number;
    confidence: number;
    level: MasteryLevel;
  }>;
  confidenceScore: number;
  recommendedTopics: string[];
  suggestedNextAssessment: {
    conceptId: string;
    concept: string;
    difficulty: Difficulty;
    reason: string;
  };
  learningPath: LearningPathStep[];
  feedback: string[];
  analysis: GapAnalysis;
}

export interface AssessmentSession {
  id: string;
  subject: string;
  startingConceptId: string;
  currentConceptId: string;
  currentDifficulty: Difficulty;
  maxQuestions: number;
  responses: StudentResponse[];
  askedQuestionIds: string[];
  pendingRecommendation: QuestionRecommendation | null;
  status: 'active' | 'completed';
  startedAt: string;
}

export interface SubmissionResult {
  diagnostic: DiagnosticResult;
  response: StudentResponse;
  nextRecommendation: QuestionRecommendation | null;
  report: AssessmentReport | null;
}
