import type { ConceptStats } from './mastery';
import type { TopicOverlay, TopicStatus } from './types';

export const TOPIC_STATUSES: readonly TopicStatus[] = ['not_started', 'learning', 'practicing', 'mastered'];

export const STATUS_LABEL: Record<TopicStatus, string> = {
  not_started: 'Not started',
  learning: 'Learning',
  practicing: 'Practicing',
  mastered: 'Mastered',
};

export const MASTERED_THRESHOLD = 85;
export const MASTERED_MIN_ATTEMPTS = 3;
export const PRACTICING_THRESHOLD = 50;

/** Status implied purely by evidence. Mastery needs both a high score and enough answers. */
export function autoStatus(stats: ConceptStats | undefined): TopicStatus {
  if (!stats) return 'not_started';
  if (stats.mastery >= MASTERED_THRESHOLD && stats.attempts >= MASTERED_MIN_ATTEMPTS) return 'mastered';
  if (stats.mastery >= PRACTICING_THRESHOLD) return 'practicing';
  return 'learning';
}

export interface ResolvedStatus {
  status: TopicStatus;
  source: 'auto' | 'manual';
}

/**
 * A manual status wins until the learner answers another question on the topic; after that the
 * evidence takes over again. The most recent signal, manual or measured, always decides.
 */
export function resolveStatus(overlay: TopicOverlay | undefined, stats: ConceptStats | undefined): ResolvedStatus {
  const override = overlay?.statusOverride;
  if (override && (!stats || override.setAt >= stats.lastAttemptAt)) {
    return { status: override.status, source: 'manual' };
  }
  return { status: autoStatus(stats), source: 'auto' };
}
