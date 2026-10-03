import { GAP_MASTERY_THRESHOLD } from './gaps';
import { groupByConcept, masteryAsOf, masteryFromAttempts } from './mastery';
import type { Attempt } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Changes smaller than this are noise from a single answer, not improvement. */
export const MEANINGFUL_CHANGE = 5;

export interface TopicChange {
  conceptId: string;
  from: number;
  to: number;
  delta: number;
}

export interface ProgressSummary {
  days: number;
  answers: number;
  correct: number;
  /** Topics practiced before and during the window whose mastery rose meaningfully. */
  improved: TopicChange[];
  declined: TopicChange[];
  /** Topics that were below the gap threshold at the start of the window and are above it now. */
  closed: string[];
  /** Topics below the threshold now that were above it, or not yet practiced, at the start. */
  opened: string[];
  /** Topics practiced for the first time in the window. */
  started: string[];
  /** False when nothing was practiced before the window, so there is nothing to compare with. */
  hasBaseline: boolean;
}

/**
 * Honest progress over a window. Average mastery across a changing set of topics would drift
 * whenever a new topic is started, so progress is reported per topic against its own past.
 * Expects attempts in chronological order.
 */
export function progressSummary(attempts: Attempt[], now: Date, days = 30): ProgressSummary {
  const cutoff = new Date(now.getTime() - days * DAY_MS).toISOString();
  const summary: ProgressSummary = {
    days, answers: 0, correct: 0, improved: [], declined: [], closed: [], opened: [], started: [], hasBaseline: false,
  };

  groupByConcept(attempts).forEach((conceptAttempts, conceptId) => {
    const before = conceptAttempts.filter((attempt) => attempt.answeredAt < cutoff);
    const during = conceptAttempts.length - before.length;
    summary.answers += during;
    summary.correct += conceptAttempts.filter((attempt) => attempt.answeredAt >= cutoff && attempt.correct).length;

    const to = masteryFromAttempts(conceptAttempts);
    if (before.length === 0) {
      summary.started.push(conceptId);
      if (to < GAP_MASTERY_THRESHOLD) summary.opened.push(conceptId);
      return;
    }
    summary.hasBaseline = true;
    if (during === 0) return;

    const from = masteryFromAttempts(before);
    const change = { conceptId, from, to, delta: to - from };
    if (change.delta >= MEANINGFUL_CHANGE) summary.improved.push(change);
    if (change.delta <= -MEANINGFUL_CHANGE) summary.declined.push(change);
    if (from < GAP_MASTERY_THRESHOLD && to >= GAP_MASTERY_THRESHOLD) summary.closed.push(conceptId);
    if (from >= GAP_MASTERY_THRESHOLD && to < GAP_MASTERY_THRESHOLD) summary.opened.push(conceptId);
  });

  summary.improved.sort((a, b) => b.delta - a.delta);
  summary.declined.sort((a, b) => a.delta - b.delta);
  return summary;
}

export interface TopicTrend {
  days: number;
  from: number | null;
  to: number | null;
}

/** One topic's mastery now compared with `days` ago. */
export function topicTrend(conceptAttempts: Attempt[], now: Date, days = 14): TopicTrend {
  return {
    days,
    from: masteryAsOf(conceptAttempts, new Date(now.getTime() - days * DAY_MS)),
    to: conceptAttempts.length > 0 ? masteryFromAttempts(conceptAttempts) : null,
  };
}
