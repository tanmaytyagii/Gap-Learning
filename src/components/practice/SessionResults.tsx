import { Link } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Clock, Target, XCircle } from 'lucide-react';
import type { Question } from '../../adaptive';
import type { Curriculum } from '../../domain/curriculum';
import type { ConceptStats } from '../../domain/mastery';
import { topicHref } from '../../domain/recommendations';
import { intervalDays, type ReviewState } from '../../domain/review';
import type { ResolvedStatus } from '../../domain/status';
import type { Attempt, SessionRecord } from '../../domain/types';
import { cn } from '../../utils/cn';
import { formatDuration, formatRelative } from '../../utils/date';
import { Badge } from '../ui/Badge';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { StatusBadge } from '../learning/badges';

interface SessionResultsProps {
  record: SessionRecord;
  attempts: Attempt[];
  curriculum: Curriculum;
  questionsById: Map<string, Question>;
  statuses: Map<string, ResolvedStatus>;
  /** Mastery before the session started; when present, before → after changes are shown. */
  baseline?: Map<string, ConceptStats>;
  current?: Map<string, ConceptStats>;
  /** Review schedule before the session; when present, interval changes are shown. */
  reviewBaseline?: Map<string, ReviewState>;
  reviews: Map<string, ReviewState>;
  now: Date;
}

function scheduleChange(before: ReviewState | undefined, after: ReviewState, hasBaseline: boolean): string {
  const interval = intervalDays(after.box);
  const span = `${interval} ${interval === 1 ? 'day' : 'days'}`;
  if (!hasBaseline) return `${span} between reviews`;
  if (!before) return `Added to your reviews: ${span} between reviews`;
  if (after.box > before.box) return `Passed: interval grew from ${intervalDays(before.box)} to ${span}`;
  if (after.box < before.box) return `Missed: back to ${span} so it returns soon`;
  return `Interval unchanged at ${span}`;
}

export function SessionResults({ record, attempts, curriculum, questionsById, statuses, baseline, current, reviewBaseline, reviews, now }: SessionResultsProps) {
  const accuracy = record.questionCount > 0 ? Math.round((record.correctCount / record.questionCount) * 100) : 0;
  const duration = attempts.reduce((sum, attempt) => sum + attempt.durationMs, 0);
  const conceptIds = [...new Set(attempts.map((attempt) => attempt.conceptId))].filter((id) => curriculum.concept(id));
  const misconceptionIds = [...new Set(attempts.filter((attempt) => !attempt.correct && attempt.misconceptionId && attempt.misconceptionId !== 'unknown').map((attempt) => attempt.misconceptionId!))];
  const path = record.mode === 'diagnostic' ? record.report?.learningPath ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-fg-3"><CheckCircle2 className="size-4" aria-hidden />Score</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{record.correctCount}<span className="text-base font-normal text-fg-3"> / {record.questionCount}</span></p>
          <p className="mt-1 text-[13px] text-fg-2">{accuracy}% correct</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-fg-3"><Target className="size-4" aria-hidden />Misconceptions spotted</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{misconceptionIds.length}</p>
          <p className="mt-1 text-[13px] text-fg-2">{misconceptionIds.length === 0 ? 'None this time' : 'Listed below with fixes'}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-fg-3"><Clock className="size-4" aria-hidden />Time</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{formatDuration(duration)}</p>
          <p className="mt-1 text-[13px] text-fg-2">{record.questionCount > 0 ? `${formatDuration(duration / record.questionCount)} per question` : '—'}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={baseline ? 'Mastery changes' : 'Topics covered'} description={baseline ? 'Your overall mastery before and after this session.' : 'Mastery measured in this session.'} />
          <CardBody className="pt-3">
            <ul className="divide-y divide-border">
              {conceptIds.map((id) => {
                const concept = curriculum.concept(id)!;
                const before = baseline?.get(id)?.mastery ?? null;
                const after = current?.get(id)?.mastery ?? null;
                const sessionMastery = record.report?.masteryChart.find((item) => item.conceptId === id)?.mastery ?? null;
                const delta = before !== null && after !== null ? after - before : null;
                return (
                  <li key={id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link to={topicHref(id)} className="block truncate text-sm font-medium hover:underline">{concept.name}</Link>
                      <div className="mt-1"><StatusBadge status={statuses.get(id)?.status ?? 'not_started'} /></div>
                    </div>
                    <div className="tabular shrink-0 text-right text-sm">
                      {baseline ? (
                        <>
                          <span className="text-fg-3">{before === null ? 'new' : `${before}%`}</span>
                          <span className="mx-1.5 text-fg-3" aria-hidden>→</span>
                          <span className="sr-only"> to </span>
                          <span className="font-semibold">{after === null ? '—' : `${after}%`}</span>
                          {delta !== null && delta !== 0 && (
                            <span className={cn('ml-2 text-xs font-medium', delta > 0 ? 'text-success' : 'text-danger')}>{delta > 0 ? '+' : ''}{delta}</span>
                          )}
                        </>
                      ) : (
                        <span className="font-semibold">{sessionMastery === null ? '—' : `${sessionMastery}%`}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Misconceptions spotted" description="What your wrong answers suggest, and how to fix it." />
          <CardBody className="pt-3">
            {misconceptionIds.length === 0 ? (
              <p className="text-[13px] leading-5 text-fg-3">None of your answers matched a known misconception pattern.</p>
            ) : (
              <ul className="space-y-4">
                {misconceptionIds.map((id) => {
                  const misconception = curriculum.misconception(id);
                  if (!misconception) return null;
                  return (
                    <li key={id}>
                      <p className="text-sm font-medium text-fg">{misconception.title}</p>
                      <p className="mt-0.5 text-[13px] leading-5 text-fg-2">{misconception.description}</p>
                      <p className="mt-1 text-[13px] leading-5 text-fg-3"><span className="font-medium text-fg-2">Fix: </span>{misconception.remedy}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={reviewBaseline ? 'When these come back for review' : 'Current review schedule'}
          description="Spaced review: each pass at 80% or more stretches the gap to the next review; a miss shortens it."
        />
        <CardBody className="pt-3">
          <ul className="divide-y divide-border">
            {conceptIds.map((id) => {
              const after = reviews.get(id);
              if (!after) return null;
              return (
                <li key={id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link to={topicHref(id)} className="text-sm font-medium hover:underline">{curriculum.concept(id)!.name}</Link>
                    <p className="text-xs text-fg-3">{scheduleChange(reviewBaseline?.get(id), after, Boolean(reviewBaseline))}</p>
                  </div>
                  <p className="flex shrink-0 items-center gap-1.5 text-[13px] text-fg-2">
                    <CalendarClock className="size-3.5 text-fg-3" aria-hidden />
                    {after.isDue ? 'Due now' : `Next review ${formatRelative(after.dueAt, now)}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      {path.length > 0 && (
        <Card>
          <CardHeader title="Your path through this subject" description="Prerequisite order, marked with what this diagnostic found." />
          <CardBody className="pt-3">
            <ol className="grid gap-2 sm:grid-cols-2">
              {path.map((step) => (
                <li key={step.conceptId} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
                  <span className="tabular mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-surface-2 text-xs font-medium text-fg-3">{step.order}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={topicHref(step.conceptId)} className="text-sm font-medium hover:underline">{step.conceptName}</Link>
                      <Badge tone={step.status === 'review' ? 'warning' : step.status === 'ready' ? 'success' : 'neutral'}>
                        {step.status === 'review' ? 'Review' : step.status === 'ready' ? 'Secure' : 'Needs evidence'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs leading-5 text-fg-3">{step.reason}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Question by question" />
        <CardBody className="pt-3">
          <ol className="divide-y divide-border">
            {attempts.map((attempt, index) => {
              const question = questionsById.get(attempt.questionId);
              const misconception = attempt.misconceptionId ? curriculum.misconception(attempt.misconceptionId) : undefined;
              return (
                <li key={attempt.id} className="flex gap-3 py-3">
                  {attempt.correct
                    ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Correct" />
                    : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Incorrect" />}
                  <div className="min-w-0 text-sm">
                    <p className="text-fg">
                      <span className="tabular mr-1.5 text-fg-3">{index + 1}.</span>
                      {question?.question ?? 'This question is no longer in the bank.'}
                    </p>
                    <p className="mt-1 text-[13px] text-fg-3">
                      {curriculum.concept(attempt.conceptId)?.name} · {attempt.difficulty}
                      {' · '}Your answer: <span className={attempt.correct ? 'text-success' : 'text-danger'}>{attempt.selectedAnswer}</span>
                      {!attempt.correct && question && <> · Correct: <span className="text-fg-2">{question.correctAnswer}</span></>}
                    </p>
                    {!attempt.correct && misconception && misconception.id !== 'unknown' && (
                      <p className="mt-1 text-[13px] text-fg-2">{misconception.title}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </CardBody>
      </Card>
    </div>
  );
}
