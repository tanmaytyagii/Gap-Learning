import { useSyncExternalStore } from 'react';
import { buildCurriculum, SEED_QUESTIONS } from '../domain/curriculum';
import type { LearnerData } from '../domain/types';
import { createLearnerStore, getBrowserStorage } from './learnerStore';
import * as mutations from './mutations';
import { createSampleData } from './sample';
import { createEmptyData } from './schema';

export const learnerStore = createLearnerStore(getBrowserStorage());

export function useLearnerData(): LearnerData {
  return useSyncExternalStore(learnerStore.subscribe, learnerStore.getState);
}

type Mutations = typeof mutations;
type BoundMutations = {
  [K in keyof Mutations]: Mutations[K] extends (data: LearnerData, ...args: infer A) => LearnerData ? (...args: A) => void : never;
};

/** Every pure mutation, bound to the app store. */
export const actions = Object.fromEntries(
  Object.entries(mutations).map(([name, mutation]) => [
    name,
    (...args: unknown[]) => learnerStore.update((data) => (mutation as (data: LearnerData, ...rest: unknown[]) => LearnerData)(data, ...args)),
  ]),
) as BoundMutations;

export function replaceData(data: LearnerData): void {
  learnerStore.update(() => data);
}

export function resetData(): void {
  learnerStore.update(() => createEmptyData());
}

/** Replaces the workspace with the clearly labeled sample learner (built-in curriculum only). */
export function loadSampleData(): void {
  const curriculum = buildCurriculum({ subjects: [], concepts: [], misconceptions: [] });
  replaceData(createSampleData(curriculum, SEED_QUESTIONS));
}
