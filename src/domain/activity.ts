import { addDays, dayKey, startOfDay } from '../utils/date';
import { GAP_MASTERY_THRESHOLD } from './gaps';
import { masteryFromAttempts } from './mastery';
import type { Attempt } from './types';

export interface DayActivity {
  attempts: number;
  correct: number;
  durationMs: number;
}

export function dailyActivity(attempts: Attempt[]): Map<string, DayActivity> {
  const days = new Map<string, DayActivity>();
  attempts.forEach((attempt) => {
    const key = dayKey(new Date(attempt.answeredAt));
    const day = days.get(key) ?? { attempts: 0, correct: 0, durationMs: 0 };
    day.attempts += 1;
    if (attempt.correct) day.correct += 1;
    day.durationMs += attempt.durationMs;
    days.set(key, day);
  });
  return days;
}

export interface Streak {
  current: number;
  longest: number;
  activeToday: boolean;
}

/** A streak survives until the end of the day after the last active day. */
export function computeStreak(activeDays: Iterable<string>, today: Date): Streak {
  const days = new Set(activeDays);
  const activeToday = days.has(dayKey(today));

  let current = 0;
  let cursor = activeToday ? startOfDay(today) : addDays(startOfDay(today), -1);
  while (days.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let previous: Date | null = null;
  [...days].sort().forEach((key) => {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    run = previous && dayKey(addDays(previous, 1)) === key ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  });

  return { current, longest, activeToday };
}

export interface HeatmapCell {
  date: string;
  count: number;
  inFuture: boolean;
}

/** Calendar columns (weeks, Monday first) ending with the current week. */
export function heatmapWeeks(activity: Map<string, DayActivity>, today: Date, weeks: number): HeatmapCell[][] {
  const end = startOfDay(today);
  const mondayOffset = (end.getDay() + 6) % 7;
  const firstMonday = addDays(end, -mondayOffset - (weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = addDays(firstMonday, week * 7 + weekday);
      const key = dayKey(date);
      return { date: key, count: activity.get(key)?.attempts ?? 0, inFuture: date > end };
    }),
  );
}

export interface TimelinePoint {
  date: string;
  /** Average mastery across topics practiced so far; null before any practice. */
  mastery: number | null;
  bySubject: Record<string, number | null>;
  /** Practiced topics still below the gap threshold at the end of the day. */
  openGaps: number;
  practiced: number;
}

/**
 * Replays attempts day by day to show how mastery and open gaps evolved. Only evidence-based
 * gaps are counted, so the history is not affected by later self-ratings.
 */
export function masteryTimeline(
  attempts: Attempt[],
  subjectOf: (conceptId: string) => string | undefined,
  days: number,
  today: Date,
): TimelinePoint[] {
  const end = startOfDay(today);
  const start = addDays(end, -(days - 1));
  const startKey = dayKey(start);
  const byConcept = new Map<string, Attempt[]>();
  let index = 0;

  const include = (attempt: Attempt) => {
    const list = byConcept.get(attempt.conceptId) ?? [];
    list.push(attempt);
    byConcept.set(attempt.conceptId, list);
  };

  // Everything before the window forms the starting state.
  while (index < attempts.length && dayKey(new Date(attempts[index].answeredAt)) < startKey) {
    include(attempts[index]);
    index += 1;
  }

  const points: TimelinePoint[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const key = dayKey(addDays(start, offset));
    while (index < attempts.length && dayKey(new Date(attempts[index].answeredAt)) <= key) {
      include(attempts[index]);
      index += 1;
    }

    const subjectTotals = new Map<string, { sum: number; count: number }>();
    let sum = 0;
    let openGaps = 0;
    byConcept.forEach((conceptAttempts, conceptId) => {
      const subject = subjectOf(conceptId);
      if (!subject) return;
      const mastery = masteryFromAttempts(conceptAttempts);
      sum += mastery;
      if (mastery < GAP_MASTERY_THRESHOLD) openGaps += 1;
      const total = subjectTotals.get(subject) ?? { sum: 0, count: 0 };
      total.sum += mastery;
      total.count += 1;
      subjectTotals.set(subject, total);
    });
    const practiced = [...subjectTotals.values()].reduce((count, total) => count + total.count, 0);

    points.push({
      date: key,
      mastery: practiced > 0 ? Math.round(sum / practiced) : null,
      bySubject: Object.fromEntries([...subjectTotals.entries()].map(([subject, total]) => [subject, Math.round(total.sum / total.count)])),
      openGaps,
      practiced,
    });
  }
  return points;
}
