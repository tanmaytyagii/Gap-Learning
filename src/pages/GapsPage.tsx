import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, CircleCheckBig, Flag, SlidersHorizontal, Target } from 'lucide-react';
import { useWorkspace } from '../app/contexts';
import { MasteryMeter, SeverityBadge, StatusBadge, SubjectDot } from '../components/learning/badges';
import { GapBreakdown, SeverityScale } from '../components/learning/GapAnalysis';
import { SEVERITY_LABEL } from '../components/learning/labels';
import { priorityToast } from '../components/learning/overlayFeedback';
import { SelfAssessDialog } from '../components/learning/SelfAssessDialog';
import { Badge } from '../components/ui/Badge';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Field';
import { useToast } from '../components/ui/feedback-context';
import { EmptyState, PageHeader } from '../components/ui/misc';
import { SegmentedControl } from '../components/ui/Tabs';
import { GAP_MASTERY_THRESHOLD, type Gap, type GapSeverity } from '../domain/gaps';
import { practiceHref, topicHref } from '../domain/recommendations';
import type { Priority } from '../domain/types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { actions } from '../store';

const SEVERITIES: GapSeverity[] = ['critical', 'high', 'medium', 'low'];

function GapCard({ gap }: { gap: Gap }) {
  const { curriculum, statuses, data, questionCount, subjectColor } = useWorkspace();
  const toast = useToast();
  const concept = curriculum.concept(gap.conceptId)!;
  const subject = curriculum.subject(concept.subject);
  const status = statuses.get(gap.conceptId)!;
  const priority = data.topics[gap.conceptId]?.priority ?? 'normal';
  const canPractice = questionCount(gap.conceptId) > 0;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs text-fg-3">
            <SubjectDot color={subjectColor(concept.subject)} />
            {subject?.name} · {concept.topic}
          </p>
          <h2 className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold">
            <Link to={topicHref(concept.id)} className="hover:underline">{concept.name}</Link>
            {gap.foundational && gap.blocks.length > 0 && <Badge tone="accent" icon={<Flag aria-hidden />}>Start here</Badge>}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="tabular text-[13px] text-fg-3" title="Severity score out of 100">Score {gap.score}</span>
          <SeverityBadge severity={gap.severity} />
        </div>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium text-fg-3">Mastery</p>
            <MasteryMeter mastery={gap.mastery} status={status.status} label={concept.name} />
            <p className="mt-1 text-xs text-fg-3">
              {gap.attempts === 0 ? 'No answers yet' : `${gap.attempts} ${gap.attempts === 1 ? 'answer' : 'answers'}`} · <StatusBadge status={status.status} manual={status.source === 'manual'} />
            </p>
          </div>
          {gap.blocks.length > 0 && (
            <p className="text-[13px] leading-5 text-fg-2">
              <span className="font-medium text-fg">Blocks: </span>
              {gap.blocks.map((id) => curriculum.concept(id)?.name).filter(Boolean).join(', ')}
            </p>
          )}
          <SeverityScale gap={gap} />
        </div>

        <GapBreakdown gap={gap} />
      </div>

      {gap.misconceptions.length > 0 && (
        <div className="mt-4 rounded-lg bg-surface-2 px-3.5 py-3">
          <p className="text-xs font-medium text-fg-3">Misconceptions behind your answers</p>
          <ul className="mt-1.5 space-y-2">
            {gap.misconceptions.slice(0, 2).map((item) => {
              const misconception = curriculum.misconception(item.id);
              if (!misconception) return null;
              return (
                <li key={item.id} className="text-[13px] leading-5">
                  <span className="font-medium text-fg">{misconception.title}</span>
                  <span className="text-fg-3"> · seen {item.count}×</span>
                  <p className="text-fg-2">{misconception.remedy}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex flex-wrap gap-2">
          {canPractice && <ButtonLink to={practiceHref(concept.id)} variant="primary" size="sm">Practice</ButtonLink>}
          <ButtonLink to={`${topicHref(concept.id)}#gap`} size="sm" icon={<BookOpen className="size-4" />}>Full analysis</ButtonLink>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-fg-3">
          Priority
          <Select
            className="w-28"
            value={priority}
            onChange={(event) => {
              const value = event.target.value as Priority;
              actions.setPriority(concept.id, value);
              toast(priorityToast(value));
            }}
            aria-label={`Priority for ${concept.name}`}
          >
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </Select>
        </label>
      </div>
    </Card>
  );
}

export default function GapsPage() {
  const { gaps, curriculum, data } = useWorkspace();
  const [severity, setSeverity] = useState<GapSeverity | 'all'>('all');
  const [subjectId, setSubjectId] = useState('all');
  const [rating, setRating] = useState(false);
  const location = useLocation();
  const scoringOpen = location.hash === '#scoring' || undefined;
  useDocumentTitle('Gaps');

  useEffect(() => {
    if (location.hash === '#scoring') document.getElementById('scoring')?.scrollIntoView();
  }, [location.hash]);

  const inSubject = gaps.filter((gap) => subjectId === 'all' || curriculum.concept(gap.conceptId)?.subject === subjectId);
  const visible = inSubject.filter((gap) => severity === 'all' || gap.severity === severity);
  const hasEvidence = data.attempts.length > 0 || Object.values(data.topics).some((overlay) => overlay.selfRating);

  return (
    <>
      <PageHeader
        title="Knowledge gaps"
        description="Ranked by severity. Each score is the sum of the reasons listed on the card, so you can see exactly why a topic is here."
        actions={<Button icon={<SlidersHorizontal className="size-4" />} onClick={() => setRating(true)}>Rate confidence</Button>}
      />

      {gaps.length === 0 ? (
        <Card>
          <EmptyState
            icon={hasEvidence ? <CircleCheckBig /> : <Target />}
            title={hasEvidence ? 'No gaps right now' : 'No gaps detected yet'}
            description={hasEvidence
              ? `Every topic you've practiced is at or above ${GAP_MASTERY_THRESHOLD}% mastery with no repeating misconceptions. Keep reviewing to hold it there.`
              : 'Gaps come from your answers and self-ratings. Take a diagnostic or rate your confidence to find them.'}
            action={(
              <>
                <ButtonLink to="/app/practice" variant="primary">Go to practice</ButtonLink>
                {!hasEvidence && <Button onClick={() => setRating(true)}>Rate confidence</Button>}
              </>
            )}
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Select className="w-44" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} aria-label="Filter by subject">
              <option value="all">All subjects</option>
              {curriculum.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </Select>
            <SegmentedControl
              label="Filter by severity"
              value={severity}
              onChange={setSeverity}
              options={[
                { value: 'all', label: 'All', count: inSubject.length },
                ...SEVERITIES.map((item) => ({ value: item, label: SEVERITY_LABEL[item], count: inSubject.filter((gap) => gap.severity === item).length })),
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <Card><EmptyState compact icon={<Target />} title="No gaps match these filters" description="Try another severity or subject." /></Card>
          ) : (
            <div className="space-y-4">
              {visible.map((gap) => <GapCard key={gap.conceptId} gap={gap} />)}
            </div>
          )}
        </>
      )}

      <details id="scoring" open={scoringOpen} className="mt-8 scroll-mt-20 rounded-xl border border-border bg-surface px-5 py-4 text-sm">
        <summary className="font-medium text-fg">How gaps are detected and scored</summary>
        <div className="mt-3 space-y-2 text-[13px] leading-6 text-fg-2">
          <p>A topic becomes a gap when any of these is true, and each adds points to its severity score (0–100):</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="font-medium text-fg">Low mastery:</strong> below {GAP_MASTERY_THRESHOLD}% (10–55 points, more the lower it is). Mastery weights recent and harder answers more.</li>
            <li><strong className="font-medium text-fg">Repeated misconception:</strong> the same mistake twice in your last 10 answers on the topic (+10).</li>
            <li><strong className="font-medium text-fg">Low self-rating:</strong> you rated it 1–2 out of 5 and haven't answered 3 questions yet (+25 or +35).</li>
            <li><strong className="font-medium text-fg">Untested prerequisite:</strong> a topic that depends on it is below 50% (+20).</li>
          </ul>
          <p>Gaps then gain points for blocking dependent topics (+5 each, up to +20), for over-confidence (+10), and for your priority (high +15, low −10). Severity: critical ≥ 65, high ≥ 45, medium ≥ 25.</p>
        </div>
      </details>

      <SelfAssessDialog open={rating} onClose={() => setRating(false)} />
    </>
  );
}
