import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, CalendarClock, LayoutDashboard, X } from 'lucide-react';
import { AiBadge } from '../components/learning/provenance';
import { useContent, useWorkspace, type Workspace } from '../app/contexts';
import {
  DIFFICULTIES, type AssessmentReport, type AssessmentSession, type DiagnosticResult, type Difficulty, type Question,
  type QuestionRecommendation, type SessionMode,
} from '../adaptive';
import { DifficultyBadge } from '../components/learning/badges';
import { MODE_LABEL } from '../components/learning/labels';
import { FeedbackPanel } from '../components/practice/FeedbackPanel';
import { QuestionCard } from '../components/practice/QuestionCard';
import { SessionResults } from '../components/practice/SessionResults';
import { TutorPanel } from '../components/practice/TutorPanel';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { useConfirm } from '../components/ui/feedback-context';
import { EmptyState, PageHeader } from '../components/ui/misc';
import { ProgressBar } from '../components/ui/Progress';
import { practiceHref, topicHref } from '../domain/recommendations';
import { describeReview } from '../domain/review';
import type { SessionRecord, StoredReport } from '../domain/types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { actions } from '../store';
import { createId } from '../utils/id';
import { seededShuffle } from '../utils/shuffle';
import { formatRelative } from '../utils/date';

interface SessionPlan {
  mode: SessionMode;
  title: string;
  conceptIds: string[];
  startConceptId?: string;
  startDifficulty?: Difficulty;
  maxQuestions: number;
}

type PlanResult = { plan: SessionPlan } | { error: { title: string; description: string; action?: { label: string; to: string } } };

function suggestedDifficulty(mastery: number | undefined): Difficulty {
  if (mastery === undefined || mastery < 50) return 'easy';
  return mastery < 80 ? 'medium' : 'hard';
}

/** Turns the URL into a concrete session, or explains why one can't start. */
function planSession(params: URLSearchParams, workspace: Workspace): PlanResult {
  const { curriculum, questionCount, statuses, stats, due, reviews } = workspace;
  const mode = params.get('mode');

  if (mode === 'diagnostic') {
    const subject = curriculum.subject(params.get('subject') ?? '');
    if (!subject) return { error: { title: 'Subject not found', description: 'The diagnostic link points to a subject that does not exist.', action: { label: 'Choose a practice mode', to: '/app/practice' } } };
    const conceptIds = curriculum.graph.topologicalOrder(subject.id).filter((id) => questionCount(id) > 0);
    if (conceptIds.length === 0) {
      return { error: { title: `No questions for ${subject.name} yet`, description: 'Add questions to its topics in the question bank, or generate some with AI from a topic page.', action: { label: 'Open question bank', to: '/app/questions' } } };
    }
    // Start where the learner is: the first topic in prerequisite order that is not yet mastered.
    const startConceptId = conceptIds.find((id) => statuses.get(id)?.status !== 'mastered') ?? conceptIds[0];
    return { plan: { mode: 'diagnostic', title: `${subject.name} diagnostic`, conceptIds, startConceptId, maxQuestions: 8 } };
  }

  if (mode === 'practice') {
    const concept = curriculum.concept(params.get('concept') ?? '');
    if (!concept) return { error: { title: 'Topic not found', description: 'This practice link points to a topic that no longer exists.', action: { label: 'Browse topics', to: '/app/topics' } } };
    if (questionCount(concept.id) === 0) {
      return { error: { title: `No questions for ${concept.name} yet`, description: 'Write a few in the question bank, or generate them with AI from the topic page.', action: { label: 'Open topic', to: topicHref(concept.id) } } };
    }
    const requested = params.get('difficulty');
    const startDifficulty = DIFFICULTIES.includes(requested as Difficulty) ? requested as Difficulty : suggestedDifficulty(stats.get(concept.id)?.mastery);
    const count = Math.min(10, Math.max(3, Number(params.get('count')) || 6));
    return { plan: { mode: 'practice', title: concept.name, conceptIds: [concept.id], startDifficulty, maxQuestions: count } };
  }

  if (mode === 'review') {
    const conceptIds = due.map((review) => review.conceptId).filter((id) => questionCount(id) > 0).slice(0, 6);
    if (conceptIds.length === 0) {
      const next = [...reviews.values()].sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
      return {
        error: {
          title: 'Nothing is due for review',
          description: next
            ? `Your next review (${curriculum.concept(next.conceptId)?.name ?? 'a topic'}) is due ${formatRelative(next.dueAt)}. Reviews are spaced out so they land just before you would forget.`
            : 'Topics join the review schedule after you practice them.',
          action: { label: 'Back to practice', to: '/app/practice' },
        },
      };
    }
    return { plan: { mode: 'review', title: 'Review', conceptIds, maxQuestions: Math.min(10, Math.max(4, conceptIds.length * 2)) } };
  }

  return { error: { title: 'Choose what to practice', description: 'This session link is incomplete.', action: { label: 'Go to practice', to: '/app/practice' } } };
}

function withoutAnalysis(report: AssessmentReport): StoredReport {
  const { analysis: _analysis, ...rest } = report;
  return rest;
}

function toRecord(session: AssessmentSession, report: AssessmentReport | null): SessionRecord {
  return {
    id: session.id,
    mode: session.mode,
    subjectId: session.subject,
    conceptIds: session.scope,
    startedAt: session.startedAt,
    endedAt: new Date().toISOString(),
    questionCount: session.responses.length,
    correctCount: session.responses.filter((response) => response.isCorrect).length,
    completed: session.status === 'completed',
    report: report ? withoutAnalysis(report) : null,
  };
}

interface Answered {
  question: Question;
  selectedAnswer: string;
  reasoning: string;
  diagnostic: DiagnosticResult;
  next: QuestionRecommendation | null;
}

function SessionRunner({ plan }: { plan: SessionPlan }) {
  const workspace = useWorkspace();
  const { curriculum } = workspace;
  const content = useContent();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [engine] = useState(() => workspace.createEngine());
  const [session, setSession] = useState(() => engine.createSession({
    mode: plan.mode,
    conceptIds: plan.conceptIds,
    maxQuestions: plan.maxQuestions,
    startConceptId: plan.startConceptId,
    startDifficulty: plan.startDifficulty,
  }));
  const [baseline] = useState(() => workspace.stats);
  // Snapshot of the review schedule before this session, to explain why topics are due and how it moved.
  const [reviewBaseline] = useState(() => workspace.reviews);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [finished, setFinished] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const shownAt = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const questionNumber = session.responses.length + (answered ? 0 : 1);
  // Options are shown in a shuffled but stable order, so the correct answer's position in the
  // bank (usually first) is never a cue. Answers are matched by text, so diagnosis is unaffected.
  const present = useCallback((question: Question): Question => ({
    ...question,
    options: seededShuffle(question.options, `${session.id}:${question.id}`),
  }), [session.id]);
  const pending = session.pendingRecommendation?.question;
  const current = useMemo(() => (pending ? present(pending) : null), [pending, present]);

  useEffect(() => {
    shownAt.current = Date.now();
    cardRef.current?.focus({ preventScroll: true });
  }, [session.askedQuestionIds.length]);

  const submit = useCallback((selectedAnswer: string, reasoning: string, hintUsed: boolean) => {
    if (answered || session.status !== 'active') return;
    const question = engine.getCurrentQuestion(session);
    const result = engine.submitAnswer(session, selectedAnswer, reasoning);
    actions.recordAttempt({
      id: createId('attempt'),
      sessionId: session.id,
      questionId: question.id,
      conceptId: question.concept,
      difficulty: question.difficulty,
      correct: result.diagnostic.isCorrect,
      selectedAnswer,
      misconceptionId: result.diagnostic.isCorrect ? null : result.diagnostic.misconceptionId,
      mode: session.mode,
      answeredAt: result.response.answeredAt,
      durationMs: Math.max(0, Date.now() - shownAt.current),
      hintUsed,
    });
    // The session record is kept current after every answer, so leaving early loses nothing.
    actions.recordSession(toRecord(result.session, result.report));
    setSession(result.session);
    setReport(result.report);
    setAnswered({ question: present(question), selectedAnswer, reasoning, diagnostic: result.diagnostic, next: result.nextRecommendation });
  }, [answered, engine, session, present]);

  const next = useCallback(() => {
    setTutorOpen(false);
    if (session.status === 'completed') setFinished(true);
    setAnswered(null);
    window.scrollTo({ top: 0 });
  }, [session.status]);

  const end = async () => {
    if (session.responses.length === 0) {
      navigate('/app/practice');
      return;
    }
    const ok = await confirm({
      title: 'End this session?',
      description: `Your ${session.responses.length} ${session.responses.length === 1 ? 'answer is' : 'answers are'} already saved and count toward your progress.`,
      confirmLabel: 'End session',
    });
    if (!ok) return;
    const result = engine.finish(session);
    actions.recordSession(toRecord(result.session, result.report));
    setSession(result.session);
    setReport(result.report);
    setAnswered(null);
    setFinished(true);
  };

  const questionsById = useMemo(() => new Map(workspace.questions.map((question) => [question.id, question])), [workspace.questions]);

  if (finished) {
    const record = workspace.data.sessions.find((item) => item.id === session.id);
    if (!record) return null;
    const attempts = workspace.data.attempts.filter((attempt) => attempt.sessionId === session.id);
    const suggestion = report?.suggestedNextAssessment;
    const suggestionPracticable = suggestion && workspace.questionCount(suggestion.conceptId) > 0;
    return (
      <>
        <PageHeader
          eyebrow={`${MODE_LABEL[plan.mode]} complete`}
          title={plan.title}
          description={suggestion ? `${suggestion.reason} Suggested next: ${suggestion.concept}.` : undefined}
          actions={(
            <>
              <ButtonLink to="/app" icon={<LayoutDashboard className="size-4" />}>Dashboard</ButtonLink>
              {suggestion && suggestionPracticable && (
                <ButtonLink to={practiceHref(suggestion.conceptId)} variant="primary" icon={<ArrowRight className="size-4" />}>
                  Practice {suggestion.concept}
                </ButtonLink>
              )}
            </>
          )}
        />
        <SessionResults
          record={record}
          attempts={attempts}
          curriculum={curriculum}
          questionsById={questionsById}
          statuses={workspace.statuses}
          baseline={baseline}
          current={workspace.stats}
          reviewBaseline={reviewBaseline}
          reviews={workspace.reviews}
          now={workspace.now}
        />
      </>
    );
  }

  const progress = ((session.responses.length) / session.maxQuestions) * 100;
  const shown = answered?.question ?? current;
  const concept = shown ? curriculum.concept(shown.concept) : undefined;
  const shownReview = plan.mode === 'review' && shown ? reviewBaseline.get(shown.concept) : undefined;
  const aiQuestionIds = new Set(workspace.data.customQuestions.filter((question) => question.origin === 'ai').map((question) => question.id));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg-3">{MODE_LABEL[plan.mode]}</p>
          <h1 className="truncate text-xl font-semibold tracking-tight">{plan.title}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={end} icon={<X className="size-4" />}>End session</Button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span className="tabular shrink-0 text-[13px] text-fg-2" aria-live="polite">Question {Math.min(questionNumber, session.maxQuestions)} of {session.maxQuestions}</span>
        <ProgressBar value={progress} label="Session progress" className="flex-1" />
      </div>

      <Card>
        <CardBody className="p-5 sm:p-6">
          <div ref={cardRef} tabIndex={-1} className="focus:outline-none">
            {shown && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {concept && (
                  <Link to={topicHref(concept.id)} target="_blank" rel="noopener" className="text-[13px] font-medium text-fg-2 hover:text-fg hover:underline">
                    {concept.name}<span className="sr-only"> (opens in a new tab)</span>
                  </Link>
                )}
                <DifficultyBadge difficulty={shown.difficulty} />
                {aiQuestionIds.has(shown.id) && <AiBadge label="AI-generated question" />}
              </div>
            )}
            {!answered && shownReview && (
              <p className="mb-5 flex gap-2.5 rounded-lg bg-surface-2 px-3.5 py-2.5 text-[13px] leading-5 text-fg-2">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-fg-3" aria-hidden />
                <span><span className="font-medium text-fg">Why this is in your review: </span>{describeReview(shownReview, workspace.now)}</span>
              </p>
            )}
            {answered && concept ? (
              <FeedbackPanel
                concept={concept}
                question={answered.question}
                selectedAnswer={answered.selectedAnswer}
                diagnostic={answered.diagnostic}
                next={answered.next}
                isLast={session.status === 'completed'}
                curriculum={curriculum}
                onNext={next}
                onAskTutor={() => setTutorOpen(true)}
              />
            ) : current ? (
              <QuestionCard key={current.id + session.responses.length} question={current} onSubmit={submit} />
            ) : null}
          </div>
        </CardBody>
      </Card>

      {tutorOpen && answered && concept && (
        <TutorPanel
          concept={concept}
          question={answered.question}
          selectedAnswer={answered.selectedAnswer}
          misconception={curriculum.misconception(answered.diagnostic.misconceptionId) ?? null}
          reasoning={answered.reasoning}
          aiEnabled={content.ai.enabled}
          onClose={() => setTutorOpen(false)}
        />
      )}
    </div>
  );
}

export default function PracticeSessionPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const workspace = useWorkspace();
  // Plan once per navigation; later changes to the workspace must not restart a running session.
  const [planned, setPlanned] = useState(() => ({ key: location.key, result: planSession(params, workspace) }));
  if (planned.key !== location.key) setPlanned({ key: location.key, result: planSession(params, workspace) });
  const { result } = planned;
  useDocumentTitle('plan' in result ? result.plan.title : 'Practice');

  if ('error' in result) {
    return (
      <Card className="mx-auto max-w-xl">
        <EmptyState
          icon={result.error.title.startsWith('Nothing') ? <CalendarClock /> : <BookOpenCheck />}
          title={result.error.title}
          description={result.error.description}
          action={result.error.action && <ButtonLink to={result.error.action.to} variant="primary">{result.error.action.label}</ButtonLink>}
        />
      </Card>
    );
  }
  return <SessionRunner key={location.key} plan={result.plan} />;
}
