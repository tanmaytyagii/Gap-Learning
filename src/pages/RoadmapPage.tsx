import { Link, useSearchParams } from 'react-router-dom';
import { Route } from 'lucide-react';
import { useWorkspace } from '../app/contexts';
import { ConceptGraph } from '../components/learning/ConceptGraph';
import { MasteryMeter, StatusBadge } from '../components/learning/badges';
import { Badge } from '../components/ui/Badge';
import { ButtonLink } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Select } from '../components/ui/Field';
import { EmptyState, PageHeader } from '../components/ui/misc';
import { SegmentedControl } from '../components/ui/Tabs';
import { practiceHref, topicHref } from '../domain/recommendations';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function RoadmapPage() {
  const { curriculum, statuses, stats, gapById, questionCount, reviews } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const subjects = curriculum.subjects.filter((subject) => curriculum.conceptsBySubject(subject.id).length > 0);
  const subjectId = subjects.some((subject) => subject.id === params.get('subject')) ? params.get('subject')! : subjects[0]?.id;
  const subject = subjectId ? curriculum.subject(subjectId) : undefined;
  useDocumentTitle('Roadmap');

  if (!subject) {
    return (
      <>
        <PageHeader title="Roadmap" />
        <Card><EmptyState icon={<Route />} title="No topics yet" description="Add a topic to see its learning path." action={<ButtonLink to="/app/topics?new=topic" variant="primary">Add a topic</ButtonLink>} /></Card>
      </>
    );
  }

  const order = curriculum.graph.topologicalOrder(subject.id);
  // The recommended step: the earliest topic that isn't mastered and whose prerequisites are in place.
  const nextId = order.find((id) => statuses.get(id)?.status !== 'mastered'
    && curriculum.graph.get(id).prerequisites.every((prerequisite) => ['practicing', 'mastered'].includes(statuses.get(prerequisite)?.status ?? '')))
    ?? order.find((id) => statuses.get(id)?.status !== 'mastered');
  const mastered = order.filter((id) => statuses.get(id)?.status === 'mastered').length;
  const selectSubject = (id: string) => setParams({ subject: id }, { replace: true });

  return (
    <>
      <PageHeader
        title="Roadmap"
        description="How topics build on each other. Work down the path: each step assumes the ones above it."
        actions={subjects.length > 4 ? (
          <Select className="w-52" value={subject.id} onChange={(event) => selectSubject(event.target.value)} aria-label="Subject">
            {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        ) : (
          <SegmentedControl label="Subject" value={subject.id} onChange={selectSubject} options={subjects.map((item) => ({ value: item.id, label: item.name }))} />
        )}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title={`${subject.name} prerequisite map`} description={`${mastered} of ${order.length} topics mastered. Green arrows mean the prerequisite is mastered.`} />
          <CardBody className="pt-5">
            <ConceptGraph subjectId={subject.id} highlight={nextId} />
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-3" aria-label="Legend">
              <li className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-sm bg-border-strong" aria-hidden />Not started</li>
              <li className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-sm bg-warning" aria-hidden />Learning</li>
              <li className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-sm bg-info" aria-hidden />Practicing</li>
              <li className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-sm bg-success" aria-hidden />Mastered</li>
            </ul>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Learning path" description="Prerequisite order, with the recommended next step marked." />
          <CardBody className="pt-3">
            <ol className="space-y-2">
              {order.map((id, index) => {
                const concept = curriculum.concept(id)!;
                const status = statuses.get(id)!;
                const isNext = id === nextId;
                const gap = gapById.get(id);
                const due = reviews.get(id)?.isDue;
                return (
                  <li key={id} className={isNext ? 'rounded-lg border border-accent bg-accent-soft/40 p-3' : 'rounded-lg border border-border p-3'}>
                    <div className="flex items-start gap-3">
                      <span className="tabular mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-surface-2 text-xs font-medium text-fg-3">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={topicHref(id)} className="text-sm font-medium hover:underline">{concept.name}</Link>
                          {isNext && <Badge tone="accent">Next</Badge>}
                          {due && <Badge tone="info">Review due</Badge>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <StatusBadge status={status.status} manual={status.source === 'manual'} />
                          {gap && <span className="text-xs text-fg-3">{gap.reasons[0]?.label}</span>}
                        </div>
                        <MasteryMeter className="mt-2" mastery={stats.get(id)?.mastery ?? null} status={status.status} label={concept.name} />
                      </div>
                    </div>
                    {isNext && questionCount(id) > 0 && (
                      <ButtonLink to={practiceHref(id)} size="sm" variant="primary" className="ml-8 mt-3">Practice this next</ButtonLink>
                    )}
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
