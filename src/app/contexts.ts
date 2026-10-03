import { createContext, useContext } from 'react';
import type { AdaptiveAssessmentEngine, Question } from '../adaptive';
import type { DayActivity, Streak } from '../domain/activity';
import type { Curriculum } from '../domain/curriculum';
import type { Gap } from '../domain/gaps';
import type { ConceptStats } from '../domain/mastery';
import type { NextAction } from '../domain/recommendations';
import type { ReviewState } from '../domain/review';
import type { ResolvedStatus } from '../domain/status';
import type { LearnerData } from '../domain/types';

// ---- Theme

export type ThemePreference = 'system' | 'light' | 'dark';

export interface ThemeState {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeState>({ preference: 'system', resolved: 'light', setPreference: () => {} });
export const useTheme = () => useContext(ThemeContext);

// ---- Content (curated question bank + AI availability from the API)

export interface ContentState {
  status: 'loading' | 'online' | 'offline';
  /** Questions from the API, or null when the bundled bank is in use. */
  serverQuestions: Question[] | null;
  ai: { enabled: boolean; model: string | null };
  retry: () => void;
}

export const ContentContext = createContext<ContentState>({
  status: 'loading',
  serverQuestions: null,
  ai: { enabled: false, model: null },
  retry: () => {},
});
export const useContent = () => useContext(ContentContext);

// ---- Workspace (everything derived from the learner's data)

export interface Workspace {
  data: LearnerData;
  curriculum: Curriculum;
  questions: Question[];
  questionCount: (conceptId: string) => number;
  stats: Map<string, ConceptStats>;
  statuses: Map<string, ResolvedStatus>;
  gaps: Gap[];
  gapById: Map<string, Gap>;
  reviews: Map<string, ReviewState>;
  due: ReviewState[];
  activity: Map<string, DayActivity>;
  streak: Streak;
  nextActions: NextAction[];
  now: Date;
  createEngine: () => AdaptiveAssessmentEngine;
  subjectColor: (subjectId: string) => string;
}

export const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace(): Workspace {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return workspace;
}
