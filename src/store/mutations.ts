import type { Misconception } from '../adaptive';
import type {
  Attempt, Concept, Goal, LearnerData, Note, Priority, Resource, SelfRating, SessionRecord,
  StoredQuestion, Subject, TopicOverlay, TopicStatus,
} from '../domain/types';
import { MAX_ATTEMPTS } from './schema';

/**
 * Pure state transitions. Every function returns a new LearnerData and never mutates its input,
 * which keeps them trivially testable and safe to use with useSyncExternalStore.
 */

const nowIso = () => new Date().toISOString();

function withOverlay(data: LearnerData, conceptId: string, change: (overlay: TopicOverlay) => TopicOverlay): LearnerData {
  const next = change({ ...data.topics[conceptId] });
  const topics = { ...data.topics };
  if (Object.keys(next).length === 0) delete topics[conceptId];
  else topics[conceptId] = next;
  return { ...data, topics };
}

export function recordAttempt(data: LearnerData, attempt: Attempt): LearnerData {
  const attempts = [...data.attempts, attempt];
  return { ...data, attempts: attempts.length > MAX_ATTEMPTS ? attempts.slice(-MAX_ATTEMPTS) : attempts };
}

export function recordSession(data: LearnerData, session: SessionRecord): LearnerData {
  return { ...data, sessions: [...data.sessions.filter((item) => item.id !== session.id), session] };
}

export function setStatus(data: LearnerData, conceptId: string, status: TopicStatus | null, at = nowIso()): LearnerData {
  return withOverlay(data, conceptId, (overlay) => {
    if (status === null) {
      const { statusOverride: _removed, ...rest } = overlay;
      return rest;
    }
    return { ...overlay, statusOverride: { status, setAt: at } };
  });
}

export function setPriority(data: LearnerData, conceptId: string, priority: Priority): LearnerData {
  return withOverlay(data, conceptId, (overlay) => {
    if (priority === 'normal') {
      const { priority: _removed, ...rest } = overlay;
      return rest;
    }
    return { ...overlay, priority };
  });
}

export function setSelfRating(data: LearnerData, conceptId: string, value: SelfRating | null, at = nowIso()): LearnerData {
  return withOverlay(data, conceptId, (overlay) => {
    if (value === null) {
      const { selfRating: _removed, ...rest } = overlay;
      return rest;
    }
    return { ...overlay, selfRating: { value, ratedAt: at } };
  });
}

export function setProfileName(data: LearnerData, name: string): LearnerData {
  return { ...data, profile: { ...data.profile, name: name.trim().slice(0, 60) } };
}

// ---- Notes & resources

export function addNote(data: LearnerData, note: Note): LearnerData {
  return { ...data, notes: [note, ...data.notes] };
}

export function updateNote(data: LearnerData, id: string, body: string): LearnerData {
  return { ...data, notes: data.notes.map((note) => (note.id === id ? { ...note, body, updatedAt: nowIso() } : note)) };
}

export function deleteNote(data: LearnerData, id: string): LearnerData {
  return { ...data, notes: data.notes.filter((note) => note.id !== id) };
}

export function addResource(data: LearnerData, resource: Resource): LearnerData {
  return { ...data, resources: [...data.resources, resource] };
}

export function updateResource(data: LearnerData, id: string, change: Partial<Omit<Resource, 'id' | 'conceptId' | 'createdAt'>>): LearnerData {
  return { ...data, resources: data.resources.map((resource) => (resource.id === id ? { ...resource, ...change } : resource)) };
}

export function deleteResource(data: LearnerData, id: string): LearnerData {
  return { ...data, resources: data.resources.filter((resource) => resource.id !== id) };
}

// ---- Goals

export function saveGoal(data: LearnerData, goal: Goal): LearnerData {
  const exists = data.goals.some((item) => item.id === goal.id);
  return { ...data, goals: exists ? data.goals.map((item) => (item.id === goal.id ? goal : item)) : [...data.goals, goal] };
}

export function deleteGoal(data: LearnerData, id: string): LearnerData {
  return { ...data, goals: data.goals.filter((goal) => goal.id !== id) };
}

// ---- Custom curriculum

export function saveSubject(data: LearnerData, subject: Subject): LearnerData {
  const exists = data.customSubjects.some((item) => item.id === subject.id);
  return {
    ...data,
    customSubjects: exists
      ? data.customSubjects.map((item) => (item.id === subject.id ? subject : item))
      : [...data.customSubjects, subject],
  };
}

export function saveConcept(data: LearnerData, concept: Concept): LearnerData {
  const exists = data.customConcepts.some((item) => item.id === concept.id);
  return {
    ...data,
    customConcepts: exists
      ? data.customConcepts.map((item) => (item.id === concept.id ? concept : item))
      : [...data.customConcepts, concept],
  };
}

/** Removes a custom topic and everything that only makes sense with it. */
export function deleteConcept(data: LearnerData, conceptId: string): LearnerData {
  const topics = { ...data.topics };
  delete topics[conceptId];
  return {
    ...data,
    customConcepts: data.customConcepts
      .filter((concept) => concept.id !== conceptId)
      .map((concept) => ({ ...concept, prerequisites: concept.prerequisites.filter((id) => id !== conceptId) })),
    attempts: data.attempts.filter((attempt) => attempt.conceptId !== conceptId),
    customQuestions: data.customQuestions.filter((question) => question.concept !== conceptId),
    notes: data.notes.filter((note) => note.conceptId !== conceptId),
    resources: data.resources.filter((resource) => resource.conceptId !== conceptId),
    goals: data.goals.map((goal) => ({ ...goal, conceptIds: goal.conceptIds.filter((id) => id !== conceptId) })),
    topics,
  };
}

/** Removes a custom subject together with all of its custom topics. */
export function deleteSubject(data: LearnerData, subjectId: string): LearnerData {
  const conceptIds = data.customConcepts.filter((concept) => concept.subject === subjectId).map((concept) => concept.id);
  const cleared = conceptIds.reduce(deleteConcept, data);
  return {
    ...cleared,
    customSubjects: cleared.customSubjects.filter((subject) => subject.id !== subjectId),
    sessions: cleared.sessions.filter((session) => session.subjectId !== subjectId),
  };
}

// ---- Questions & misconceptions

export function saveQuestions(data: LearnerData, questions: StoredQuestion[]): LearnerData {
  const ids = new Set(questions.map((question) => question.id));
  return { ...data, customQuestions: [...data.customQuestions.filter((question) => !ids.has(question.id)), ...questions] };
}

export function deleteQuestion(data: LearnerData, id: string): LearnerData {
  return { ...data, customQuestions: data.customQuestions.filter((question) => question.id !== id) };
}

export function saveMisconceptions(data: LearnerData, misconceptions: Misconception[]): LearnerData {
  if (misconceptions.length === 0) return data;
  const ids = new Set(misconceptions.map((item) => item.id));
  return {
    ...data,
    customMisconceptions: [...data.customMisconceptions.filter((item) => !ids.has(item.id)), ...misconceptions],
  };
}
