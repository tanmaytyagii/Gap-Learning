import { DIFFICULTIES, type Difficulty, type Misconception, type SessionMode } from '../adaptive';
import { sortAttempts } from '../domain/mastery';
import { TOPIC_STATUSES } from '../domain/status';
import type {
  Attempt, Concept, Goal, LearnerData, Note, Priority, Resource, ResourceKind, SessionRecord,
  StoredQuestion, Subject, TopicOverlay, TopicStatus,
} from '../domain/types';

export const SCHEMA_VERSION = 1;
export const MAX_ATTEMPTS = 20000;

export const RESOURCE_KINDS: readonly ResourceKind[] = ['article', 'video', 'course', 'book', 'exercise', 'other'];
const PRIORITIES: readonly Priority[] = ['low', 'normal', 'high'];
const MODES: readonly SessionMode[] = ['diagnostic', 'practice', 'review'];

export function createEmptyData(now = new Date()): LearnerData {
  return {
    version: SCHEMA_VERSION,
    profile: { name: '', createdAt: now.toISOString() },
    attempts: [],
    sessions: [],
    topics: {},
    notes: [],
    resources: [],
    goals: [],
    customSubjects: [],
    customConcepts: [],
    customQuestions: [],
    customMisconceptions: [],
    meta: { sample: false },
  };
}

// ---------------------------------------------------------------------------------------------
// Validation. Stored and imported data is untrusted: records that fail validation are dropped
// individually so one bad entry never costs the learner the rest of their data.

type Guard<T> = (value: unknown) => value is T;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isNonEmpty = (value: unknown): value is string => isString(value) && value.trim().length > 0;
const isIso = (value: unknown): value is string => isString(value) && !Number.isNaN(Date.parse(value));
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);
const isDifficulty = (value: unknown): value is Difficulty => DIFFICULTIES.includes(value as Difficulty);
const isDayKey = (value: unknown): value is string => isString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value);

const isAttempt: Guard<Attempt> = (value): value is Attempt => isObject(value)
  && isNonEmpty(value.id) && isNonEmpty(value.sessionId) && isString(value.questionId) && isNonEmpty(value.conceptId)
  && isDifficulty(value.difficulty) && typeof value.correct === 'boolean' && isString(value.selectedAnswer)
  && (value.misconceptionId === null || isString(value.misconceptionId)) && MODES.includes(value.mode as SessionMode)
  && isIso(value.answeredAt) && typeof value.durationMs === 'number' && value.durationMs >= 0
  && typeof value.hintUsed === 'boolean';

const isSession: Guard<SessionRecord> = (value): value is SessionRecord => isObject(value)
  && isNonEmpty(value.id) && MODES.includes(value.mode as SessionMode) && isString(value.subjectId)
  && isStringArray(value.conceptIds) && isIso(value.startedAt) && isIso(value.endedAt)
  && typeof value.questionCount === 'number' && typeof value.correctCount === 'number'
  && typeof value.completed === 'boolean' && (value.report === null || isObject(value.report));

const isNote: Guard<Note> = (value): value is Note => isObject(value)
  && isNonEmpty(value.id) && isNonEmpty(value.conceptId) && isString(value.body)
  && (value.source === undefined || value.source === 'ai')
  && isIso(value.createdAt) && isIso(value.updatedAt);

const isResource: Guard<Resource> = (value): value is Resource => isObject(value)
  && isNonEmpty(value.id) && isNonEmpty(value.conceptId) && isNonEmpty(value.title) && isSafeUrl(value.url)
  && RESOURCE_KINDS.includes(value.kind as ResourceKind) && typeof value.done === 'boolean' && isIso(value.createdAt);

const isGoal: Guard<Goal> = (value): value is Goal => isObject(value)
  && isNonEmpty(value.id) && isNonEmpty(value.title) && isStringArray(value.conceptIds)
  && (value.targetDate === null || isDayKey(value.targetDate)) && isIso(value.createdAt);

const isSubject: Guard<Subject> = (value): value is Subject => isObject(value)
  && isNonEmpty(value.id) && isNonEmpty(value.name) && isString(value.description);

const isConcept: Guard<Concept> = (value): value is Concept => isObject(value)
  && isNonEmpty(value.id) && isNonEmpty(value.subject) && isString(value.topic) && isNonEmpty(value.name)
  && isString(value.description) && isDifficulty(value.difficulty) && isStringArray(value.prerequisites)
  && isString(value.learningObjective);

const isMisconception: Guard<Misconception> = (value): value is Misconception => isObject(value)
  && isNonEmpty(value.id) && isString(value.subject) && isNonEmpty(value.title) && isString(value.description)
  && isString(value.explanation) && isString(value.remedy);

export function isValidQuestionShape(value: unknown): value is StoredQuestion {
  if (!isObject(value)) return false;
  if (!isNonEmpty(value.id) || !isNonEmpty(value.concept) || !isDifficulty(value.difficulty)) return false;
  if (!isNonEmpty(value.question) || !isStringArray(value.options) || value.options.length < 2) return false;
  if (!isString(value.correctAnswer) || !value.options.includes(value.correctAnswer)) return false;
  if (!isString(value.hint) || !isString(value.solutionSteps) || !isString(value.learningObjective)) return false;
  if (!isObject(value.misconceptionMap) || !Object.values(value.misconceptionMap).every(isString)) return false;
  return (value.origin === 'manual' || value.origin === 'ai') && isIso(value.createdAt);
}

function parseOverlay(value: unknown): TopicOverlay | null {
  if (!isObject(value)) return null;
  const overlay: TopicOverlay = {};
  const override = value.statusOverride;
  if (isObject(override) && TOPIC_STATUSES.includes(override.status as TopicStatus) && isIso(override.setAt)) {
    overlay.statusOverride = { status: override.status as TopicStatus, setAt: override.setAt };
  }
  if (PRIORITIES.includes(value.priority as Priority)) overlay.priority = value.priority as Priority;
  const rating = value.selfRating;
  if (isObject(rating) && [1, 2, 3, 4, 5].includes(rating.value as number) && isIso(rating.ratedAt)) {
    overlay.selfRating = { value: rating.value as 1 | 2 | 3 | 4 | 5, ratedAt: rating.ratedAt };
  }
  return overlay;
}

function list<T>(value: unknown, guard: Guard<T>): { items: T[]; dropped: number } {
  if (!Array.isArray(value)) return { items: [], dropped: 0 };
  const items = value.filter(guard);
  return { items, dropped: value.length - items.length };
}

/** Only http(s) links are stored, so a resource can never become a javascript: URL. */
export function isSafeUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export interface ParseResult {
  data: LearnerData;
  dropped: number;
}

/** Validates unknown JSON into learner data, or throws when it is not learner data at all. */
export function parseLearnerData(raw: unknown): ParseResult {
  if (!isObject(raw) || raw.version !== SCHEMA_VERSION) {
    throw new Error('This file is not a GapLearning export (unsupported format or version).');
  }
  const base = createEmptyData();
  let dropped = 0;
  const take = <T>(value: unknown, guard: Guard<T>) => {
    const result = list(value, guard);
    dropped += result.dropped;
    return result.items;
  };

  const profile = isObject(raw.profile) ? raw.profile : {};
  const topics: Record<string, TopicOverlay> = {};
  if (isObject(raw.topics)) {
    Object.entries(raw.topics).forEach(([id, value]) => {
      const overlay = parseOverlay(value);
      if (overlay) topics[id] = overlay;
      else dropped += 1;
    });
  }

  const data: LearnerData = {
    version: SCHEMA_VERSION,
    profile: {
      name: isString(profile.name) ? profile.name.slice(0, 60) : '',
      createdAt: isIso(profile.createdAt) ? profile.createdAt : base.profile.createdAt,
    },
    attempts: sortAttempts(take(raw.attempts, isAttempt)).slice(-MAX_ATTEMPTS),
    sessions: take(raw.sessions, isSession),
    topics,
    notes: take(raw.notes, isNote),
    resources: take(raw.resources, isResource),
    goals: take(raw.goals, isGoal),
    customSubjects: take(raw.customSubjects, isSubject).map((subject) => ({ ...subject, builtIn: false })),
    customConcepts: take(raw.customConcepts, isConcept).map((concept) => ({ ...concept, builtIn: false, lesson: null })),
    customQuestions: take(raw.customQuestions, isValidQuestionShape),
    customMisconceptions: take(raw.customMisconceptions, isMisconception),
    meta: { sample: isObject(raw.meta) && raw.meta.sample === true },
  };
  return { data, dropped };
}
