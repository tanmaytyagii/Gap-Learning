import curriculumJson from '../../shared/curriculum.json';
import questionBankJson from '../../shared/question-bank.json';
import { KnowledgeGraph, type Misconception, type Question } from '../adaptive';
import type { Concept, Subject } from './types';

export const BUILT_IN_SUBJECTS: Subject[] = curriculumJson.subjects.map((subject) => ({ ...subject, builtIn: true }));

export const BUILT_IN_CONCEPTS: Concept[] = curriculumJson.concepts.map((concept) => ({
  ...concept,
  difficulty: concept.difficulty as Concept['difficulty'],
  builtIn: true,
}));

export const BUILT_IN_MISCONCEPTIONS: Misconception[] = curriculumJson.misconceptions;

/**
 * Curated questions bundled with the app, used when the API is unreachable. Their shape is
 * enforced by the content-integrity tests rather than by the JSON import's inferred type.
 */
export const SEED_QUESTIONS = questionBankJson as unknown as Question[];

export interface Curriculum {
  subjects: Subject[];
  concepts: Concept[];
  graph: KnowledgeGraph;
  misconceptions: Misconception[];
  subject(id: string): Subject | undefined;
  concept(id: string): Concept | undefined;
  misconception(id: string): Misconception | undefined;
  conceptsBySubject(subjectId: string): Concept[];
}

export function buildCurriculum(custom: {
  subjects: Subject[];
  concepts: Concept[];
  misconceptions: Misconception[];
}): Curriculum {
  const subjects = [...BUILT_IN_SUBJECTS, ...custom.subjects];
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  // Built-in content wins on id collisions so imported data can never shadow the curriculum.
  const builtInIds = new Set(BUILT_IN_CONCEPTS.map((concept) => concept.id));
  const concepts = [
    ...BUILT_IN_CONCEPTS,
    ...custom.concepts.filter((concept) => !builtInIds.has(concept.id) && subjectIds.has(concept.subject)),
  ];
  const graph = new KnowledgeGraph(concepts);
  const conceptById = new Map(graph.all().map((node) => {
    const concept = concepts.find((item) => item.id === node.id)!;
    return [node.id, { ...concept, prerequisites: node.prerequisites }];
  }));
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const misconceptions = [...BUILT_IN_MISCONCEPTIONS, ...custom.misconceptions];
  const misconceptionById = new Map(misconceptions.map((item) => [item.id, item]));
  const order = graph.topologicalOrder();
  const ordered = [...conceptById.values()].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  return {
    subjects,
    concepts: ordered,
    graph,
    misconceptions,
    subject: (id) => subjectById.get(id),
    concept: (id) => conceptById.get(id),
    misconception: (id) => misconceptionById.get(id),
    conceptsBySubject: (subjectId) => ordered.filter((concept) => concept.subject === subjectId),
  };
}

/** Merges question sources; later sources win on id collisions. Questions for unknown concepts are dropped. */
export function mergeQuestions(curriculum: Curriculum, ...sources: Question[][]): Question[] {
  const byId = new Map<string, Question>();
  sources.flat().forEach((question) => {
    if (curriculum.graph.has(question.concept)) byId.set(question.id, question);
  });
  return [...byId.values()];
}
