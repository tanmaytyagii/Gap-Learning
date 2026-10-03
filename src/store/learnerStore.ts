import type { LearnerData } from '../domain/types';
import { createEmptyData, parseLearnerData } from './schema';

export const STORAGE_KEY = 'gaplearning:data';
export const BACKUP_KEY = 'gaplearning:data:unreadable-backup';

export type StoreNotice =
  | { kind: 'load-error'; message: string }
  | { kind: 'load-warning'; message: string }
  | { kind: 'save-error'; message: string };

export interface LearnerStore {
  getState(): LearnerData;
  subscribe(listener: () => void): () => void;
  update(recipe: (state: LearnerData) => LearnerData): void;
  /** Receives persistence problems. Notices raised before anyone listened are replayed. */
  onNotice(listener: (notice: StoreNotice) => void): () => void;
}

/** localStorage can be missing or throw (private mode, blocked site data); treat that as no storage. */
export function getBrowserStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    storage.getItem(STORAGE_KEY);
    return storage;
  } catch {
    return null;
  }
}

function load(storage: Storage | null, notify: (notice: StoreNotice) => void): LearnerData {
  if (!storage) return createEmptyData();
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return createEmptyData();
  try {
    const { data, dropped } = parseLearnerData(JSON.parse(raw));
    if (dropped > 0) {
      notify({ kind: 'load-warning', message: `${dropped} saved ${dropped === 1 ? 'record was' : 'records were'} unreadable and skipped.` });
    }
    return data;
  } catch {
    try {
      storage.setItem(BACKUP_KEY, raw);
    } catch {
      // Nothing more we can do; the notice below still tells the learner.
    }
    notify({ kind: 'load-error', message: 'Your saved data could not be read, so a fresh workspace was started. A copy of the old data was kept in this browser.' });
    return createEmptyData();
  }
}

export function createLearnerStore(storage: Storage | null): LearnerStore {
  const listeners = new Set<() => void>();
  const noticeListeners = new Set<(notice: StoreNotice) => void>();
  const pendingNotices: StoreNotice[] = [];
  let persistScheduled = false;

  const notify = (notice: StoreNotice) => {
    if (noticeListeners.size === 0) pendingNotices.push(notice);
    noticeListeners.forEach((listener) => listener(notice));
  };

  let state = load(storage, notify);

  const emit = () => listeners.forEach((listener) => listener());

  const persist = () => {
    persistScheduled = false;
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      notify({ kind: 'save-error', message: 'Changes could not be saved in this browser (storage is full or blocked). Export your data to keep a copy.' });
    }
  };

  if (typeof window !== 'undefined') {
    // Keep multiple open tabs in sync.
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) return;
      state = load(storage, notify);
      emit();
    });
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(recipe) {
      const next = recipe(state);
      if (next === state) return;
      state = next;
      emit();
      if (!persistScheduled) {
        persistScheduled = true;
        queueMicrotask(persist);
      }
    },
    onNotice(listener) {
      noticeListeners.add(listener);
      pendingNotices.splice(0).forEach(listener);
      return () => noticeListeners.delete(listener);
    },
  };
}
