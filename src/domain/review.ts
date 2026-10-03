import { addDays } from '../utils/date';
import type { Attempt } from './types';

/** Leitner boxes: days until the next review for box 1…5. */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;
/** Accuracy within one sitting needed to count a review as passed. */
export const REVIEW_PASS_ACCURACY = 0.8;

export interface ReviewState {
  conceptId: string;
  box: number;
  lastReviewedAt: string;
  /** Whether the most recent sitting reached the pass mark. */
  lastPassed: boolean;
  dueAt: string;
  isDue: boolean;
}

interface ReviewEvent {
  conceptId: string;
  at: string;
  passed: boolean;
}

/**
 * Derives a spaced-repetition schedule from attempts alone. Every sitting on a concept (one session)
 * is a review: passing on or after the due date moves it up a box, failing sends it back to box 1,
 * and early reviews never promote, so cramming cannot skip intervals.
 */
export function computeReviewSchedule(attempts: Attempt[], now: Date): Map<string, ReviewState> {
  const sittings = new Map<string, { conceptId: string; at: string; correct: number; total: number }>();
  attempts.forEach((attempt) => {
    const key = `${attempt.sessionId}|${attempt.conceptId}`;
    const sitting = sittings.get(key) ?? { conceptId: attempt.conceptId, at: attempt.answeredAt, correct: 0, total: 0 };
    sitting.total += 1;
    if (attempt.correct) sitting.correct += 1;
    if (attempt.answeredAt > sitting.at) sitting.at = attempt.answeredAt;
    sittings.set(key, sitting);
  });

  const events: ReviewEvent[] = [...sittings.values()]
    .map((sitting) => ({ conceptId: sitting.conceptId, at: sitting.at, passed: sitting.correct / sitting.total >= REVIEW_PASS_ACCURACY }))
    .sort((a, b) => a.at.localeCompare(b.at));

  const schedule = new Map<string, ReviewState>();
  events.forEach((event) => {
    const previous = schedule.get(event.conceptId);
    let box: number;
    if (!previous) box = event.passed ? 2 : 1;
    else if (!event.passed) box = 1;
    else if (event.at >= previous.dueAt) box = Math.min(REVIEW_INTERVALS_DAYS.length, previous.box + 1);
    else box = previous.box;

    const dueAt = addDays(new Date(event.at), REVIEW_INTERVALS_DAYS[box - 1]).toISOString();
    schedule.set(event.conceptId, { conceptId: event.conceptId, box, lastReviewedAt: event.at, lastPassed: event.passed, dueAt, isDue: false });
  });

  const nowIso = now.toISOString();
  schedule.forEach((state) => { state.isDue = state.dueAt <= nowIso; });
  return schedule;
}

export function dueReviews(schedule: Map<string, ReviewState>): ReviewState[] {
  return [...schedule.values()].filter((state) => state.isDue).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function intervalDays(box: number): number {
  return REVIEW_INTERVALS_DAYS[Math.min(REVIEW_INTERVALS_DAYS.length, Math.max(1, box)) - 1];
}

const days = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`;

/**
 * Plain-language reason a topic is (or will be) up for review, and what the next sitting will do
 * to its schedule. Mirrors the promotion rules in computeReviewSchedule.
 */
export function describeReview(state: ReviewState, now: Date): string {
  const sinceDays = Math.max(0, Math.round((now.getTime() - new Date(state.lastReviewedAt).getTime()) / (24 * 60 * 60 * 1000)));
  const when = sinceDays === 0 ? 'earlier today' : sinceDays === 1 ? 'yesterday' : `${sinceDays} days ago`;
  const last = state.lastPassed
    ? `You passed it ${when}, so it was scheduled ${days(intervalDays(state.box))} later.`
    : `You scored under ${Math.round(REVIEW_PASS_ACCURACY * 100)}% ${when}, so it came back after ${days(intervalDays(1))}.`;
  if (!state.isDue) return `${last} It is not due yet.`;
  const nextBox = Math.min(REVIEW_INTERVALS_DAYS.length, state.box + 1);
  return `${last} Pass now and the next review moves out to ${days(intervalDays(nextBox))}; miss it and it returns after ${days(intervalDays(1))}.`;
}
