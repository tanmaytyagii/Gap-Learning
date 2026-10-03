import { describe, expect, it } from 'vitest';
import { buildCurriculum, SEED_QUESTIONS } from '../domain/curriculum';
import { detectGaps } from '../domain/gaps';
import { computeConceptStats } from '../domain/mastery';
import { resolveStatus } from '../domain/status';
import type { Concept, LearnerData, StoredQuestion } from '../domain/types';
import { BACKUP_KEY, STORAGE_KEY, createLearnerStore, type StoreNotice } from './learnerStore';
import * as mutations from './mutations';
import { createSampleData } from './sample';
import { createEmptyData, parseLearnerData } from './schema';

const curriculum = buildCurriculum({ subjects: [], concepts: [], misconceptions: [] });

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();
  failWrites = false;
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.get(key) ?? null; }
  key(index: number) { return [...this.map.keys()][index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new DOMException('Quota exceeded', 'QuotaExceededError');
    this.map.set(key, value);
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const customConcept: Concept = {
  id: 'custom-hooks', subject: 'web', topic: 'React', name: 'React hooks', description: '', difficulty: 'medium',
  prerequisites: [], learningObjective: '', builtIn: false, lesson: null,
};

describe('schema validation', () => {
  it('rejects data that is not a GapLearning export', () => {
    expect(() => parseLearnerData({ hello: 'world' })).toThrow(/not a GapLearning export/);
    expect(() => parseLearnerData(null)).toThrow();
  });

  it('drops invalid records individually and keeps the rest', () => {
    const data = createEmptyData();
    const raw = JSON.parse(JSON.stringify({
      ...data,
      resources: [
        { id: 'r1', conceptId: 'frac_visual', title: 'Good', url: 'https://example.com', kind: 'article', done: false, createdAt: data.profile.createdAt },
        { id: 'r2', conceptId: 'frac_visual', title: 'Bad', url: 'javascript:alert(1)', kind: 'article', done: false, createdAt: data.profile.createdAt },
      ],
      notes: [{ id: 'n1' }],
      topics: { frac_visual: { priority: 'high', statusOverride: { status: 'bogus', setAt: 'x' } } },
    }));
    const { data: parsed, dropped } = parseLearnerData(raw);
    expect(parsed.resources.map((resource) => resource.id)).toEqual(['r1']);
    expect(parsed.notes).toEqual([]);
    expect(parsed.topics.frac_visual).toEqual({ priority: 'high' });
    expect(dropped).toBe(2);
  });
});

describe('mutations', () => {
  it('sets and clears overlays without leaving empty entries', () => {
    let data = mutations.setStatus(createEmptyData(), 'frac_visual', 'learning', '2026-01-01T00:00:00.000Z');
    expect(data.topics.frac_visual.statusOverride?.status).toBe('learning');
    data = mutations.setStatus(data, 'frac_visual', null);
    expect(data.topics.frac_visual).toBeUndefined();
    data = mutations.setPriority(data, 'frac_visual', 'high');
    expect(data.topics.frac_visual).toEqual({ priority: 'high' });
    expect(mutations.setPriority(data, 'frac_visual', 'normal').topics.frac_visual).toBeUndefined();
  });

  it('cascades custom topic deletion', () => {
    const question: StoredQuestion = {
      ...SEED_QUESTIONS[0], id: 'mine-1', concept: customConcept.id, origin: 'manual', createdAt: '2026-01-01T00:00:00.000Z',
    };
    let data: LearnerData = mutations.saveSubject(createEmptyData(), { id: 'web', name: 'Web', description: '', builtIn: false });
    data = mutations.saveConcept(data, customConcept);
    data = mutations.saveConcept(data, { ...customConcept, id: 'custom-ctx', name: 'Context', prerequisites: [customConcept.id] });
    data = mutations.saveQuestions(data, [question]);
    data = mutations.addNote(data, { id: 'n', conceptId: customConcept.id, body: 'x', createdAt: question.createdAt, updatedAt: question.createdAt });
    data = mutations.saveGoal(data, { id: 'g', title: 'Web', conceptIds: [customConcept.id, 'custom-ctx'], targetDate: null, createdAt: question.createdAt });

    data = mutations.deleteConcept(data, customConcept.id);
    expect(data.customConcepts.map((concept) => concept.id)).toEqual(['custom-ctx']);
    expect(data.customConcepts[0].prerequisites).toEqual([]);
    expect(data.customQuestions).toEqual([]);
    expect(data.notes).toEqual([]);
    expect(data.goals[0].conceptIds).toEqual(['custom-ctx']);

    data = mutations.deleteSubject(data, 'web');
    expect(data.customSubjects).toEqual([]);
    expect(data.customConcepts).toEqual([]);
  });
});

describe('learner store', () => {
  it('persists updates and reloads them', async () => {
    const storage = new MemoryStorage();
    const store = createLearnerStore(storage);
    store.update((data) => mutations.setProfileName(data, 'Ada'));
    await flush();
    expect(createLearnerStore(storage).getState().profile.name).toBe('Ada');
  });

  it('backs up unreadable data and reports it', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    const store = createLearnerStore(storage);
    const notices: StoreNotice[] = [];
    store.onNotice((notice) => notices.push(notice));
    expect(store.getState().attempts).toEqual([]);
    expect(storage.getItem(BACKUP_KEY)).toBe('{not json');
    expect(notices[0].kind).toBe('load-error');
  });

  it('reports failed writes instead of throwing', async () => {
    const storage = new MemoryStorage();
    const store = createLearnerStore(storage);
    const notices: StoreNotice[] = [];
    store.onNotice((notice) => notices.push(notice));
    storage.failWrites = true;
    store.update((data) => mutations.setProfileName(data, 'Ada'));
    await flush();
    expect(store.getState().profile.name).toBe('Ada');
    expect(notices.map((notice) => notice.kind)).toEqual(['save-error']);
  });

  it('works without any storage', () => {
    const store = createLearnerStore(null);
    store.update((data) => mutations.setProfileName(data, 'Ada'));
    expect(store.getState().profile.name).toBe('Ada');
  });
});

describe('sample workspace', () => {
  const now = new Date(2026, 5, 15, 21, 0, 0);
  const sample = createSampleData(curriculum, SEED_QUESTIONS, now);

  it('is deterministic and passes the same validation as real data', () => {
    expect(createSampleData(curriculum, SEED_QUESTIONS, now)).toEqual(sample);
    const { data, dropped } = parseLearnerData(JSON.parse(JSON.stringify(sample)));
    expect(dropped).toBe(0);
    expect(data.attempts).toHaveLength(sample.attempts.length);
    expect(data.meta.sample).toBe(true);
  });

  it('produces a realistic spread of evidence and gaps', () => {
    expect(sample.sessions).toHaveLength(23);
    expect(sample.attempts.every((attempt) => attempt.answeredAt <= now.toISOString())).toBe(true);
    const stats = computeConceptStats(sample.attempts);
    const statuses = new Map(curriculum.concepts.map((concept) => [concept.id, resolveStatus(sample.topics[concept.id], stats.get(concept.id))]));
    const gaps = detectGaps({
      graph: curriculum.graph, stats, overlays: sample.topics, statuses,
      conceptName: (id) => id, misconceptionTitle: (id) => id,
    });
    expect(gaps.length).toBeGreaterThan(0);
    expect([...statuses.values()].some((status) => status.status === 'mastered')).toBe(true);
  });
});
