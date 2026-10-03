import { calendarDaysBetween, parseDayKey } from '../utils/date';
import type { ConceptStats } from './mastery';
import { MASTERED_THRESHOLD, type ResolvedStatus } from './status';
import type { Goal } from './types';

export type GoalStatus = 'completed' | 'on-track' | 'at-risk' | 'overdue' | 'open';

export interface GoalProgress {
  goalId: string;
  total: number;
  mastered: number;
  /** 0–100: each topic contributes its mastery relative to the mastered threshold. */
  percent: number;
  status: GoalStatus;
  daysLeft: number | null;
}

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  completed: 'Completed',
  'on-track': 'On track',
  'at-risk': 'At risk',
  overdue: 'Overdue',
  open: 'In progress',
};

export function goalProgress(
  goal: Goal,
  stats: Map<string, ConceptStats>,
  statuses: Map<string, ResolvedStatus>,
  now: Date,
): GoalProgress {
  const conceptIds = goal.conceptIds.filter((id) => statuses.has(id));
  const total = conceptIds.length;
  const mastered = conceptIds.filter((id) => statuses.get(id)?.status === 'mastered').length;
  const percent = total === 0
    ? 0
    : Math.round(conceptIds.reduce((sum, id) => {
      if (statuses.get(id)?.status === 'mastered') return sum + 100;
      return sum + Math.min(100, ((stats.get(id)?.mastery ?? 0) / MASTERED_THRESHOLD) * 100);
    }, 0) / total);

  const daysLeft = goal.targetDate ? calendarDaysBetween(now, parseDayKey(goal.targetDate)) : null;

  let status: GoalStatus;
  if (total > 0 && mastered === total) status = 'completed';
  else if (daysLeft === null) status = 'open';
  else if (daysLeft < 0) status = 'overdue';
  else {
    const span = Math.max(1, calendarDaysBetween(new Date(goal.createdAt), parseDayKey(goal.targetDate!)));
    const elapsed = Math.min(1, Math.max(0, (span - daysLeft) / span));
    // Behind the straight-line pace by more than 15 points counts as at risk.
    status = percent / 100 < elapsed - 0.15 ? 'at-risk' : 'on-track';
  }

  return { goalId: goal.id, total, mastered, percent, status, daysLeft };
}
