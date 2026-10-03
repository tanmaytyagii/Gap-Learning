import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CalendarClock, PlayCircle, TrendingUp } from 'lucide-react';
import { useWorkspace } from '../../app/contexts';
import { clearanceFor, triggersAndModifiers } from '../../domain/gapInsight';
import { GAP_MASTERY_THRESHOLD, SEVERITY_BANDS, type Gap, type GapReason } from '../../domain/gaps';
import { topicTrend } from '../../domain/progress';
import { practiceHref } from '../../domain/recommendations';
import { describeReview } from '../../domain/review';
import { cn } from '../../utils/cn';
import { formatRelative } from '../../utils/date';
import { ButtonLink } from '../ui/Button';
import { Card } from '../ui/Card';
import { SeverityBadge } from './badges';
import { SEVERITY_LABEL } from './labels';
import { SystemBadge } from './provenance';

const BAND_FILL = { low: 'bg-surface-3', medium: 'bg-warning/35', high: 'bg-orange/40', critical: 'bg-danger/40' } as const;

/** The 0–100 severity scale with its four bands and a marker at the gap's score. */
export function SeverityScale({ gap }: { gap: Gap }) {
  const bands = [...SEVERITY_BANDS].reverse();
  const band = SEVERITY_BANDS.find((item) => gap.score >= item.min)!;
  const upper = SEVERITY_BANDS[SEVERITY_BANDS.indexOf(band) - 1]?.min;
  return (
    <div role="img" aria-label={`Score ${gap.score} of 100: ${SEVERITY_LABEL[gap.severity]} severity (${band.min}${upper ? `–${upper - 1}` : '+'})`}>
      <div className="relative">
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          {bands.map((item, index) => {
            const end = bands[index + 1]?.min ?? 100;
            return <div key={item.severity} className={BAND_FILL[item.severity]} style={{ width: `${end - item.min}%` }} />;
          })}
        </div>
        <div className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-fg shadow-card" style={{ left: `${Math.min(99, Math.max(1, gap.score))}%` }} aria-hidden />
      </div>
      <div className="mt-1.5 flex text-[11px] text-fg-3" aria-hidden>
        {bands.map((item, index) => {
          const end = bands[index + 1]?.min ?? 100;
          return <span key={item.severity} style={{ width: `${end - item.min}%` }} className={cn(item.severity === gap.severity && 'font-medium text-fg-2')}>{SEVERITY_LABEL[item.severity]}</span>;
        })}
      </div>
    </div>
  );
}

function ReasonRow({ reason, clearance }: { reason: GapReason; clearance?: string | null }) {
  return (
    <li className="py-2">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-fg">{reason.label}</span>
        <span className={cn('tabular shrink-0 text-xs font-medium', reason.points < 0 ? 'text-success' : 'text-fg-2')}>
          {reason.points > 0 ? '+' : ''}{reason.points}
        </span>
      </div>
      {clearance && <p className="mt-0.5 text-xs leading-5 text-fg-3"><span className="font-medium text-fg-2">To clear: </span>{clearance}</p>}
    </li>
  );
}

/** Triggers (why it is a gap) and modifiers (why it ranks here), with the arithmetic shown. */
export function GapBreakdown({ gap, showClearance = true }: { gap: Gap; showClearance?: boolean }) {
  const { stats, data, curriculum } = useWorkspace();
  const attempts = useMemo(() => data.attempts.filter((attempt) => attempt.conceptId === gap.conceptId), [data.attempts, gap.conceptId]);
  const { triggers, modifiers } = triggersAndModifiers(gap);
  const context = { gap, stats: stats.get(gap.conceptId), attempts, misconceptionTitle: (id: string) => curriculum.misconception(id)?.title ?? id };
  const band = SEVERITY_BANDS.find((item) => gap.score >= item.min)!;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-fg-3">Why it's a gap</p>
        <ul className="divide-y divide-border">
          {triggers.map((reason) => <ReasonRow key={reason.kind} reason={reason} clearance={showClearance ? clearanceFor(reason, context) : null} />)}
        </ul>
      </div>
      {modifiers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-fg-3">Why it ranks here</p>
          <ul className="divide-y divide-border">
            {modifiers.map((reason) => <ReasonRow key={reason.kind} reason={reason} />)}
          </ul>
        </div>
      )}
      <p className="tabular border-t border-border pt-2 text-xs text-fg-2">
        Score {gap.reasons.map((reason) => (reason.points < 0 ? `− ${-reason.points}` : `+ ${reason.points}`)).join(' ').replace(/^\+ /, '')} = <span className="font-semibold text-fg">{gap.score}</span>
        {' → '}{SEVERITY_LABEL[gap.severity]} ({gap.severity === 'critical' ? `${band.min} or more` : `${band.min}–${SEVERITY_BANDS[SEVERITY_BANDS.indexOf(band) - 1].min - 1}`})
      </p>
    </div>
  );
}

/**
 * The full answer to "what am I weak at, why, and what now?" for one topic: score breakdown,
 * the misconception behind it, and the understand → practice → review → measure loop.
 */
export function GapAnalysis({ gap }: { gap: Gap }) {
  const { curriculum, data, reviews, now, questionCount } = useWorkspace();
  const concept = curriculum.concept(gap.conceptId)!;
  const attempts = useMemo(() => data.attempts.filter((attempt) => attempt.conceptId === gap.conceptId), [data.attempts, gap.conceptId]);
  const trend = topicTrend(attempts, now, 14);
  const review = reviews.get(gap.conceptId);
  const topMisconception = gap.misconceptions[0] ? curriculum.misconception(gap.misconceptions[0].id) : undefined;
  const delta = trend.from !== null && trend.to !== null ? trend.to - trend.from : null;

  return (
    <Card id="gap" className="scroll-mt-20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Gap analysis</h2>
          <p className="mt-0.5 text-[13px] text-fg-3">Every point of the score below comes from your answers, ratings, or priorities.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="tabular text-[13px] text-fg-2">Score <span className="font-semibold text-fg">{gap.score}</span>/100</span>
          <SeverityBadge severity={gap.severity} />
        </div>
      </div>

      <div className="mt-4"><SeverityScale gap={gap} /></div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <GapBreakdown gap={gap} />
        <div className="space-y-4">
          {topMisconception && topMisconception.id !== 'unknown' ? (
            <div className="rounded-lg bg-surface-2 px-4 py-3">
              <p className="text-xs font-medium text-fg-3">Most frequent misconception · seen {gap.misconceptions[0].count}×</p>
              <p className="mt-1 text-sm font-medium text-fg">{topMisconception.title}</p>
              <p className="mt-1 text-[13px] leading-5 text-fg-2">{topMisconception.description}</p>
              <p className="mt-2 text-[13px] leading-5 text-fg-2"><span className="font-medium text-fg">Fix: </span>{topMisconception.remedy}</p>
            </div>
          ) : (
            <div className="rounded-lg bg-surface-2 px-4 py-3 text-[13px] leading-5 text-fg-2">
              {gap.attempts === 0
                ? 'No answers on this topic yet, so no misconception has been observed. Practice it to find out what, if anything, is going wrong.'
                : 'Your wrong answers here did not match a known misconception pattern.'}
            </div>
          )}
          <ol className="space-y-2.5 text-[13px]" aria-label="Next steps">
            <li className="flex items-start gap-2.5">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-fg-3" aria-hidden />
              <span><span className="font-medium text-fg">Understand: </span>
                <span className="text-fg-2">{concept.lesson ? 'read the lesson and the common mistakes below.' : 'collect the rule in your notes, or ask the AI to explain it.'}</span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <PlayCircle className="mt-0.5 size-4 shrink-0 text-fg-3" aria-hidden />
              <span><span className="font-medium text-fg">Practice: </span>
                <span className="text-fg-2">{questionCount(concept.id) > 0 ? 'a short set that adapts to your answers.' : 'add questions for this topic first.'}</span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-fg-3" aria-hidden />
              <span><span className="font-medium text-fg">Review: </span>
                <span className="text-fg-2">{review ? `${review.isDue ? 'due now' : `next ${formatRelative(review.dueAt, now)}`}. ${describeReview(review, now)}` : 'scheduled automatically after you practice.'}</span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <TrendingUp className="mt-0.5 size-4 shrink-0 text-fg-3" aria-hidden />
              <span><span className="font-medium text-fg">Measure: </span>
                <span className="text-fg-2">
                  {trend.to === null ? 'mastery appears after your first answer.'
                    : delta === null ? `mastery is ${trend.to}%; target ${GAP_MASTERY_THRESHOLD}%.`
                      : <>mastery {trend.from}% → {trend.to}% over 14 days
                        {delta !== 0 && (
                          <span className={cn('font-medium', delta > 0 ? 'text-success' : 'text-danger')}> ({delta > 0 ? '+' : '−'}{Math.abs(delta)})</span>
                        )}; target {GAP_MASTERY_THRESHOLD}%.</>}
                </span>
              </span>
            </li>
          </ol>
          {questionCount(concept.id) > 0 && <ButtonLink to={practiceHref(concept.id)} variant="primary" size="sm">Practice {concept.name}</ButtonLink>}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-fg-3">
        <SystemBadge />
        <span>Fixed rules, no AI. </span>
        <Link to="/app/gaps#scoring" className="font-medium text-accent-fg hover:underline">How scoring works</Link>
      </div>
    </Card>
  );
}
