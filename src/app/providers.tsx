import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AdaptiveAssessmentEngine, type Question } from '../adaptive';
import { computeStreak, dailyActivity } from '../domain/activity';
import { buildCurriculum, mergeQuestions, SEED_QUESTIONS } from '../domain/curriculum';
import { detectGaps } from '../domain/gaps';
import { computeConceptStats } from '../domain/mastery';
import { nextActions } from '../domain/recommendations';
import { computeReviewSchedule, dueReviews } from '../domain/review';
import { resolveStatus } from '../domain/status';
import { fetchHealth, fetchQuestions } from '../services/content';
import { learnerStore, useLearnerData } from '../store';
import { useToast } from '../components/ui/feedback-context';
import {
  ContentContext, ThemeContext, WorkspaceContext, type ContentState, type ThemePreference, type Workspace,
} from './contexts';

const THEME_KEY = 'gaplearning:theme';

function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      if (next === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // The choice still applies for this visit.
    }
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Loads the curated bank and AI availability once; the bundled bank keeps the app usable offline. */
export function ContentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<ContentState, 'retry'>>({
    status: 'loading',
    serverQuestions: null,
    ai: { enabled: false, model: null },
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchHealth(controller.signal), fetchQuestions(controller.signal)])
      .then(([health, questions]) => {
        setState({ status: 'online', serverQuestions: questions, ai: health.ai });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'offline', serverQuestions: null, ai: { enabled: false, model: null } });
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading' }));
    setAttempt((value) => value + 1);
  }, []);

  const value = useMemo(() => ({ ...state, retry }), [state, retry]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

/** Re-evaluates time-dependent state (due reviews, streaks) periodically and when the tab regains focus. */
function useClock(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, intervalMs);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}

const SERIES_SLOTS = 8;

export function WorkspaceProvider({ serverQuestions, children }: { serverQuestions: Question[] | null; children: ReactNode }) {
  const data = useLearnerData();
  const now = useClock(5 * 60 * 1000);

  const curriculum = useMemo(
    () => buildCurriculum({ subjects: data.customSubjects, concepts: data.customConcepts, misconceptions: data.customMisconceptions }),
    [data.customSubjects, data.customConcepts, data.customMisconceptions],
  );

  const questions = useMemo(
    () => mergeQuestions(curriculum, serverQuestions ?? SEED_QUESTIONS, data.customQuestions),
    [curriculum, serverQuestions, data.customQuestions],
  );

  const workspace = useMemo<Workspace>(() => {
    const attempts = data.attempts.filter((attempt) => curriculum.graph.has(attempt.conceptId));
    const stats = computeConceptStats(attempts);
    const statuses = new Map(curriculum.concepts.map((concept) => [concept.id, resolveStatus(data.topics[concept.id], stats.get(concept.id))]));
    const gaps = detectGaps({
      graph: curriculum.graph,
      stats,
      overlays: data.topics,
      statuses,
      conceptName: (id) => curriculum.concept(id)?.name ?? id,
      misconceptionTitle: (id) => curriculum.misconception(id)?.title ?? id,
    });
    const reviews = computeReviewSchedule(attempts, now);
    const due = dueReviews(reviews);
    const activity = dailyActivity(attempts);
    const counts = new Map<string, number>();
    questions.forEach((question) => counts.set(question.concept, (counts.get(question.concept) ?? 0) + 1));
    const questionCount = (conceptId: string) => counts.get(conceptId) ?? 0;
    const subjectIndex = new Map(curriculum.subjects.map((subject, index) => [subject.id, index]));

    return {
      data,
      curriculum,
      questions,
      questionCount,
      stats,
      statuses,
      gaps,
      gapById: new Map(gaps.map((gap) => [gap.conceptId, gap])),
      reviews,
      due,
      activity,
      streak: computeStreak(activity.keys(), now),
      nextActions: nextActions({ curriculum, stats, statuses, gaps, dueReviews: due, questionCount }),
      now,
      createEngine: () => new AdaptiveAssessmentEngine({ graph: curriculum.graph, questions, misconceptions: curriculum.misconception }),
      subjectColor: (subjectId) => {
        const index = subjectIndex.get(subjectId) ?? SERIES_SLOTS;
        // Color follows the subject's fixed position; past eight subjects fold into a neutral.
        return index < SERIES_SLOTS ? `var(--series-${index + 1})` : 'var(--text-3)';
      },
    };
  }, [data, curriculum, questions, now]);

  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}

/** Surfaces persistence problems from the store as toasts. */
export function StoreNotices() {
  const toast = useToast();
  useEffect(() => learnerStore.onNotice((notice) => {
    toast({
      tone: notice.kind === 'load-warning' ? 'info' : 'error',
      title: notice.kind === 'save-error' ? 'Changes not saved' : notice.kind === 'load-error' ? 'Saved data could not be read' : 'Some saved data was skipped',
      description: notice.message,
    });
  }), [toast]);
  return null;
}
