import type {
  AssessmentReport, ConceptNode, Difficulty, Misconception, Question, SessionMode,
} from '../adaptive';

export type TopicStatus = 'not_started' | 'learning' | 'practicing' | 'mastered';
export type Priority = 'low' | 'normal' | 'high';
export type SelfRating = 1 | 2 | 3 | 4 | 5;
export type ResourceKind = 'article' | 'video' | 'course' | 'book' | 'exercise' | 'other';

export interface Lesson {
  summary: string;
  keyPoints: string[];
  example: { problem: string; steps: string[] };
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  builtIn: boolean;
}

export interface Concept extends ConceptNode {
  builtIn: boolean;
  lesson: Lesson | null;
}

/** One answered question. Attempts are the single source of truth for all progress metrics. */
export interface Attempt {
  id: string;
  sessionId: string;
  questionId: string;
  conceptId: string;
  difficulty: Difficulty;
  correct: boolean;
  selectedAnswer: string;
  /** Null when the answer was correct. */
  misconceptionId: string | null;
  mode: SessionMode;
  answeredAt: string;
  durationMs: number;
  hintUsed: boolean;
}

export type StoredReport = Omit<AssessmentReport, 'analysis'>;

export interface SessionRecord {
  id: string;
  mode: SessionMode;
  subjectId: string;
  conceptIds: string[];
  startedAt: string;
  endedAt: string;
  questionCount: number;
  correctCount: number;
  completed: boolean;
  report: StoredReport | null;
}

export interface TopicOverlay {
  statusOverride?: { status: TopicStatus; setAt: string };
  priority?: Priority;
  selfRating?: { value: SelfRating; ratedAt: string };
}

export interface Note {
  id: string;
  conceptId: string;
  body: string;
  /** Set when the note was saved from an AI explanation, so it stays labeled as AI output. */
  source?: 'ai';
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  conceptId: string;
  title: string;
  url: string;
  kind: ResourceKind;
  done: boolean;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  conceptIds: string[];
  /** Local calendar date, YYYY-MM-DD. */
  targetDate: string | null;
  createdAt: string;
}

export interface StoredQuestion extends Question {
  origin: 'manual' | 'ai';
  createdAt: string;
}

export interface LearnerData {
  version: 1;
  profile: { name: string; createdAt: string };
  attempts: Attempt[];
  sessions: SessionRecord[];
  topics: Record<string, TopicOverlay>;
  notes: Note[];
  resources: Resource[];
  goals: Goal[];
  customSubjects: Subject[];
  customConcepts: Concept[];
  customQuestions: StoredQuestion[];
  customMisconceptions: Misconception[];
  meta: { sample: boolean };
}
