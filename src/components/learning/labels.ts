import type { Difficulty, SessionMode } from '../../adaptive';
import type { GapSeverity } from '../../domain/gaps';
import type { TopicStatus } from '../../domain/types';
import type { ProgressTone } from '../ui/Progress';

export const SEVERITY_LABEL: Record<GapSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export const MODE_LABEL: Record<SessionMode, string> = {
  diagnostic: 'Diagnostic',
  practice: 'Practice',
  review: 'Review',
};

const STATUS_TONE: Record<TopicStatus, ProgressTone> = {
  not_started: 'neutral',
  learning: 'warning',
  practicing: 'accent',
  mastered: 'success',
};

export function masteryTone(status: TopicStatus): ProgressTone {
  return STATUS_TONE[status];
}
