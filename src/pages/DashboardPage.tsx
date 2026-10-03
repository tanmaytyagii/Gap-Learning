import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, Compass, PlusCircle, Sparkles, SlidersHorizontal, TrendingDown, TrendingUp,
} from 'lucide-react';
import { useWorkspace } from '../app/contexts';
import { ActivityHeatmap } from '../components/charts/ActivityHeatmap';
import { MasteryMeter, SeverityBadge, SubjectDot } from '../components/learning/badges';
import { SystemBadge } from '../components/learning/provenance';
import { SelfAssessDialog } from '../components/learning/SelfAssessDialog';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { useToast } from '../components/ui/feedback-context';
import { EmptyState, PageHeader } from '../components/ui/misc';
import { ProgressBar } from '../components/ui/Progress';
import { heatmapWeeks } from '../domain/activity';
import { triggersAndModifiers } from '../domain/gapInsight';
import { goalProgress, GOAL_STATUS_LABEL } from '../domain/goals';
import { progressSummary, type ProgressSummary } from '../domain/progress';
import { diagnosticHref, topicHref } from '../domain/recommendations';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { loadSampleData } from '../store';
import { cn } from '../utils/cn';
import { addDays, dayKey, formatDuration } from '../utils/date';

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function Onboarding() {
  const { curriculum, questionCount } = useWorkspace();
  const toast = useToast();
  const [rating, setRating] = useState(false);
  const subjects = curriculum.subjects.filter((subject) => curriculum.conceptsBySubject(subject.id).some((concept) => questionCount(concept.id) > 0));

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="p-6 sm:p-8">
          <p className="text-[13px] font-medium text-accent-fg">Getting started</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Find your first gaps</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-fg-2">
            GapLearning builds a picture of what you know from your answers. Each wrong answer is traced to the misconception behind it,
            so the gaps it finds are specific and fixable. Pick a starting point.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col rounded-xl border border-border p-4">
              <Compass className="size-5 text-accent-fg" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold">Take a diagnostic</h3>
              <p className="mt-1 flex-1 text-[13px] leading-5 text-fg-3">About 8 adaptive questions. Mistakes send it back to prerequisites; successes move it forward.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {subjects.map((subject) => (
                  <ButtonLink key={subject.id} to={diagnosticHref(subject.id)} size="sm" variant={subject === subjects[0] ? 'primary' : 'secondary'}>
                    {subject.name}
                  </ButtonLink>
                ))}
              </div>
            </div>
            <div className="flex flex-col rounded-xl border border-border p-4">
              <SlidersHorizontal className="size-5 text-accent-fg" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold">Rate your confidence</h3>
              <p className="mt-1 flex-1 text-[13px] leading-5 text-fg-3">A one-minute self-assessment. Topics you rate low become gaps until practice says otherwise.</p>
              <Button size="sm" className="mt-4 self-start" onClick={() => setRating(true)}>Rate topics</Button>
            </div>
            <div className="flex flex-col rounded-xl border border-border p-4">
              <PlusCircle className="size-5 text-accent-fg" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold">Track your own topics</h3>
              <p className="mt-1 flex-1 text-[13px] leading-5 text-fg-3">Add any skill you are learning, with prerequisites, notes, resources, and your own questions.</p>
              <ButtonLink to="/app/topics?new=topic" size="sm" className="mt-4 self-start">Add a topic</ButtonLink>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-5 text-[13px] text-fg-3">
            <Sparkles className="size-4" aria-hidden />
            <span>Just looking around?</span>
            <button
              type="button"
              className="font-medium text-accent-fg hover:underline"
              onClick={() => {
                loadSampleData();
                toast({ title: 'Sample workspace loaded', description: 'Four weeks of simulated practice. Clear it any time from the banner.' });
              }}
            >
              Explore with sample data
            </button>
          </div>
        </CardBody>
      </Card>
      <SelfAssessDialog open={rating} onClose={() => setRating(false)} />
    </div>
  );
}

function NextStep() {
  const { nextActions } = useWorkspace();
  const [primary, ...others] = nextActions;
  return (
    <Card className="flex flex-col lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
        <h2 className="text-[13px] font-medium text-fg-3">Do this now</h2>
        <SystemBadge label="Recommended by the adaptive engine" />
      </div>
      {primary ? (
        <>
          <div className="px-5 pb-5 pt-2">
            <p className="text-lg font-semibold tracking-tight text-fg">{primary.title}</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-fg-2">{primary.detail}</p>
            <ButtonLink to={primary.href} variant="primary" className="mt-4" icon={<ArrowRight className="size-4" />}>{primary.cta}</ButtonLink>
          </div>
          {others.length > 0 && (
            <div className="border-t border-border px-5 py-4">
              <p className="mb-2 text-xs font-medium text-fg-3">After that</p>
              <ol className="space-y-2.5">
                {others.map((action) => (
                  <li key={action.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{action.title}</p>
                      <p className="truncate text-xs text-fg-3">{action.detail}</p>
                    </div>
                    <ButtonLink to={action.href} size="sm">{action.cta}</ButtonLink>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <p className="mt-auto border-t border-border px-5 py-3 text-xs leading-5 text-fg-3">
            Order: reviews that are due, then the most severe gaps whose prerequisites are sound, then the next unlocked topic.{' '}
            <Link to="/app/gaps#scoring" className="font-medium text-accent-fg hover:underline">How gaps are scored</Link>
          </p>
        </>
      ) : (
        <EmptyState compact icon={<CheckCircle2 />} title="You're all caught up" description="No reviews are due and no gaps need attention. Explore the next topic on your roadmap." action={<ButtonLink to="/app/roadmap" size="sm">Open roadmap</ButtonLink>} />
      )}
    </Card>
  );
}

function AtAGlance() {
  const { due, gaps, statuses, curriculum, streak } = useWorkspace();
  const mastered = [...statuses.values()].filter((status) => status.status === 'mastered').length;
  const critical = gaps.filter((gap) => gap.severity === 'critical').length;
  const high = gaps.filter((gap) => gap.severity === 'high').length;
  const rows = [
    { label: 'Reviews due', value: String(due.length), detail: due.length === 0 ? 'Nothing due today' : 'Spaced reviews waiting', to: '/app/practice' },
    { label: 'Open gaps', value: String(gaps.length), detail: gaps.length === 0 ? 'Nothing flagged' : `${critical} critical · ${high} high`, to: '/app/gaps' },
    { label: 'Topics mastered', value: `${mastered}/${curriculum.concepts.length}`, detail: '85%+ over at least 3 answers', to: '/app/topics' },
    { label: 'Practice streak', value: `${streak.current}d`, detail: streak.activeToday ? `Practiced today · best ${streak.longest}d` : `Best ${streak.longest}d`, to: '/app/analytics' },
  ];
  return (
    <Card>
      <CardHeader title="At a glance" />
      <ul className="mt-2 divide-y divide-border">
        {rows.map((row) => (
          <li key={row.label}>
            <Link to={row.to} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60">
              <span className="min-w-0">
                <span className="block text-sm text-fg">{row.label}</span>
                <span className="block truncate text-xs text-fg-3">{row.detail}</span>
              </span>
              <span className="tabular text-lg font-semibold text-fg">{row.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Struggling() {
  const { gaps, curriculum, statuses, subjectColor } = useWorkspace();
  return (
    <Card>
      <CardHeader
        title="What you're struggling with"
        description="Top gaps by severity, with the main reason and the misconception behind each."
        action={gaps.length > 0 ? <Link to="/app/gaps" className="text-[13px] font-medium text-accent-fg hover:underline">All {gaps.length}</Link> : undefined}
      />
      <CardBody className="pt-3">
        {gaps.length === 0 ? (
          <p className="text-[13px] leading-5 text-fg-3">Nothing is flagged. A topic becomes a gap when mastery drops below 70%, a misconception repeats, or you rate it low.</p>
        ) : (
          <ul className="divide-y divide-border">
            {gaps.slice(0, 3).map((gap) => {
              const concept = curriculum.concept(gap.conceptId)!;
              const lead = triggersAndModifiers(gap).triggers[0];
              const misconception = gap.misconceptions[0] ? curriculum.misconception(gap.misconceptions[0].id) : undefined;
              return (
                <li key={gap.conceptId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`${topicHref(gap.conceptId)}#gap`} className="flex min-w-0 items-center gap-2 text-sm font-medium text-fg hover:underline">
                      <SubjectDot color={subjectColor(concept.subject)} />
                      <span className="truncate">{concept.name}</span>
                    </Link>
                    <SeverityBadge severity={gap.severity} />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-fg-2">{lead?.label}{misconception && misconception.id !== 'unknown' ? <> · likely misconception: <span className="font-medium text-fg">{misconception.title}</span></> : null}</p>
                  <MasteryMeter className="mt-1.5" mastery={gap.mastery} status={statuses.get(gap.conceptId)!.status} label={concept.name} />
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function ChangeRow({ conceptId, from, to, delta }: { conceptId: string; from: number; to: number; delta: number }) {
  const { curriculum } = useWorkspace();
  const up = delta > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <li className="flex items-center justify-between gap-3 text-[13px]">
      <Link to={topicHref(conceptId)} className="flex min-w-0 items-center gap-2 text-fg hover:underline">
        <Icon className={cn('size-4 shrink-0', up ? 'text-success' : 'text-danger')} aria-hidden />
        <span className="truncate">{curriculum.concept(conceptId)?.name}</span>
      </Link>
      <span className="tabular shrink-0 text-fg-2">
        {from}% → {to}% <span className={cn('font-medium', up ? 'text-success' : 'text-danger')}>({up ? '+' : '−'}{Math.abs(delta)})</span>
      </span>
    </li>
  );
}

function Improving({ progress, attempted }: { progress: ProgressSummary; attempted: boolean }) {
  const accuracy = progress.answers > 0 ? Math.round((progress.correct / progress.answers) * 100) : null;
  return (
    <Card>
      <CardHeader
        title="Are you improving?"
        description={`Last ${progress.days} days, with each topic compared against its own earlier results.`}
        action={<Link to="/app/analytics" className="text-[13px] font-medium text-accent-fg hover:underline">Analytics</Link>}
      />
      <CardBody className="pt-3">
        {!attempted ? (
          <p className="text-[13px] leading-5 text-fg-3">Answer some questions to start measuring change.</p>
        ) : !progress.hasBaseline ? (
          <p className="text-[13px] leading-5 text-fg-3">
            Too early to tell: everything you've practiced started within this period. Come back after practicing on a few more days and this will show which topics are moving.
            {progress.started.length > 0 && ` So far you've started ${progress.started.length} ${progress.started.length === 1 ? 'topic' : 'topics'}.`}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-surface-2 px-3 py-2.5">
                <p className="tabular text-xl font-semibold text-fg">{progress.closed.length}</p>
                <p className="text-xs text-fg-3">rose above 70% mastery</p>
              </div>
              <div className="rounded-lg bg-surface-2 px-3 py-2.5">
                <p className="tabular text-xl font-semibold text-fg">{progress.opened.length}</p>
                <p className="text-xs text-fg-3">below 70% that weren't before</p>
              </div>
            </div>
            {progress.improved.length + progress.declined.length === 0 ? (
              <p className="text-[13px] text-fg-3">No topic you practiced in this period changed by 5 points or more.</p>
            ) : (
              <ul className="space-y-2">
                {progress.improved.slice(0, 3).map((change) => <ChangeRow key={change.conceptId} {...change} />)}
                {progress.declined.slice(0, 2).map((change) => <ChangeRow key={change.conceptId} {...change} />)}
              </ul>
            )}
            {accuracy !== null && <p className="text-xs text-fg-3">{progress.answers} answers in this period, {accuracy}% correct.</p>}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default function DashboardPage() {
  const workspace = useWorkspace();
  const { data, curriculum, stats, statuses, activity, now, streak } = workspace;
  useDocumentTitle('Dashboard');

  const attempts = useMemo(() => data.attempts.filter((attempt) => curriculum.graph.has(attempt.conceptId)), [data.attempts, curriculum]);
  const progress = useMemo(() => {
    const month = progressSummary(attempts, now, 30);
    // A newer learner has no month-old baseline; a week still shows short-term movement.
    return month.hasBaseline ? month : progressSummary(attempts, now, 7);
  }, [attempts, now]);
  const weeks = useMemo(() => heatmapWeeks(activity, now, 52), [activity, now]);
  const lastMonth = useMemo(() => {
    const cutoff = dayKey(addDays(now, -29));
    const days = [...activity.entries()].filter(([key]) => key >= cutoff);
    return { answers: days.reduce((sum, [, day]) => sum + day.attempts, 0), days: days.length, time: days.reduce((sum, [, day]) => sum + day.durationMs, 0) };
  }, [activity, now]);

  const hasActivity = data.attempts.length > 0;
  const hasSetup = hasActivity || Object.keys(data.topics).length > 0 || data.customConcepts.length > 0;
  const name = data.profile.name.trim();

  return (
    <>
      <PageHeader
        eyebrow={now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        title={name ? `${greeting(now)}, ${name}` : greeting(now)}
        description={hasSetup ? "What to do now, what you're struggling with, and whether it's working." : undefined}
      />

      {!hasSetup ? <Onboarding /> : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <NextStep />
            <AtAGlance />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Struggling />
            <Improving progress={progress} attempted={hasActivity} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Activity"
                description={lastMonth.answers > 0
                  ? `Last 30 days: ${lastMonth.answers} answers on ${lastMonth.days} ${lastMonth.days === 1 ? 'day' : 'days'}, ${formatDuration(lastMonth.time)} of practice.`
                  : 'Questions answered per day.'}
                action={streak.current > 0 ? <span className="text-[13px] text-fg-2">{streak.current}-day streak</span> : undefined}
              />
              <CardBody className="pt-4">
                {hasActivity ? <ActivityHeatmap weeks={weeks} /> : (
                  <p className="text-[13px] text-fg-3">Your practice calendar fills in as you answer questions.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Goals" action={<Link to="/app/goals" className="text-[13px] font-medium text-accent-fg hover:underline">{data.goals.length > 0 ? 'Manage' : 'Set a goal'}</Link>} />
              <CardBody className="pt-3">
                {data.goals.length === 0 ? (
                  <p className="text-[13px] leading-5 text-fg-3">Group topics into a goal with a deadline to see whether you're on pace.</p>
                ) : (
                  <ul className="space-y-4">
                    {data.goals.slice(0, 3).map((goal) => {
                      const goalState = goalProgress(goal, stats, statuses, now);
                      return (
                        <li key={goal.id}>
                          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                            <span className="truncate font-medium">{goal.title}</span>
                            <span className="shrink-0 text-xs text-fg-3">{GOAL_STATUS_LABEL[goalState.status]}</span>
                          </div>
                          <ProgressBar value={goalState.percent} label={`${goal.title} progress`} tone={goalState.status === 'at-risk' || goalState.status === 'overdue' ? 'warning' : goalState.status === 'completed' ? 'success' : 'accent'} />
                          <p className="mt-1 text-xs text-fg-3">{goalState.mastered} of {goalState.total} mastered · {goalState.percent}%</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
