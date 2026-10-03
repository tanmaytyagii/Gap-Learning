import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarClock, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { useWorkspace } from '../app/contexts';
import { MasteryMeter, SeverityBadge, SubjectDot } from '../components/learning/badges';
import { statusToast } from '../components/learning/overlayFeedback';
import { SelfAssessDialog } from '../components/learning/SelfAssessDialog';
import { TopicFormDialog } from '../components/learning/TopicFormDialog';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import { useToast } from '../components/ui/feedback-context';
import { EmptyState, PageHeader } from '../components/ui/misc';
import { SegmentedControl } from '../components/ui/Tabs';
import { topicHref } from '../domain/recommendations';
import { STATUS_LABEL, TOPIC_STATUSES } from '../domain/status';
import type { Concept, TopicStatus } from '../domain/types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { actions } from '../store';
import { formatRelative } from '../utils/date';

type Sort = 'path' | 'mastery-asc' | 'mastery-desc' | 'recent' | 'name';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'path', label: 'Learning order' },
  { value: 'mastery-asc', label: 'Weakest first' },
  { value: 'mastery-desc', label: 'Strongest first' },
  { value: 'recent', label: 'Recently practiced' },
  { value: 'name', label: 'Name' },
];

function StatusSelect({ concept }: { concept: Concept }) {
  const { statuses, stats, data } = useWorkspace();
  const toast = useToast();
  const resolved = statuses.get(concept.id)!;
  const manual = data.topics[concept.id]?.statusOverride && resolved.source === 'manual';
  const auto = !stats.has(concept.id) ? 'not_started' : resolved.source === 'auto' ? resolved.status : undefined;
  return (
    <Select
      className="w-full sm:w-40"
      aria-label={`Status of ${concept.name}`}
      value={manual ? resolved.status : 'auto'}
      onChange={(event) => {
        const value = event.target.value === 'auto' ? null : event.target.value as TopicStatus;
        actions.setStatus(concept.id, value);
        toast(statusToast(value));
      }}
    >
      <option value="auto">{auto ? `Auto: ${STATUS_LABEL[auto]}` : 'Auto (from answers)'}</option>
      {TOPIC_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
    </Select>
  );
}

export default function TopicsPage() {
  const { curriculum, stats, statuses, gapById, reviews, data, now, subjectColor, questionCount } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState('all');
  const [status, setStatus] = useState<TopicStatus | 'all'>('all');
  const [sort, setSort] = useState<Sort>('path');
  const [rating, setRating] = useState(false);
  const creating = params.get('new') === 'topic';
  useDocumentTitle('Topics');

  const setCreating = (open: boolean) => {
    const next = new URLSearchParams(params);
    if (open) next.set('new', 'topic');
    else next.delete('new');
    setParams(next, { replace: true });
  };

  const notesByConcept = useMemo(() => {
    const map = new Map<string, string>();
    data.notes.forEach((note) => map.set(note.conceptId, `${map.get(note.conceptId) ?? ''} ${note.body.toLowerCase()}`));
    return map;
  }, [data.notes]);

  const needle = query.trim().toLowerCase();
  const filtered = curriculum.concepts.filter((concept) => {
    if (subjectId !== 'all' && concept.subject !== subjectId) return false;
    if (status !== 'all' && statuses.get(concept.id)?.status !== status) return false;
    if (!needle) return true;
    return [concept.name, concept.description, concept.topic].some((text) => text.toLowerCase().includes(needle))
      || (notesByConcept.get(concept.id)?.includes(needle) ?? false);
  });

  const sorted = [...filtered].sort((a, b) => {
    const masteryA = stats.get(a.id)?.mastery ?? -1;
    const masteryB = stats.get(b.id)?.mastery ?? -1;
    if (sort === 'mastery-asc') return masteryA - masteryB;
    if (sort === 'mastery-desc') return masteryB - masteryA;
    if (sort === 'recent') return (stats.get(b.id)?.lastAttemptAt ?? '').localeCompare(stats.get(a.id)?.lastAttemptAt ?? '');
    if (sort === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const groups = sort === 'path'
    ? curriculum.subjects.map((subject) => ({ subject, concepts: sorted.filter((concept) => concept.subject === subject.id) })).filter((group) => group.concepts.length > 0)
    : [{ subject: null, concepts: sorted }];

  const filtersActive = needle !== '' || subjectId !== 'all' || status !== 'all';
  const scoped = curriculum.concepts.filter((concept) => subjectId === 'all' || concept.subject === subjectId);

  return (
    <>
      <PageHeader
        title="Topics"
        description="Everything you are tracking, in prerequisite order. Status updates automatically from your answers; override it whenever you like."
        actions={(
          <>
            <Button icon={<SlidersHorizontal className="size-4" />} onClick={() => setRating(true)}>Rate confidence</Button>
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>Add topic</Button>
          </>
        )}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-3" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search topics and notes"
            aria-label="Search topics and notes"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select className="w-40" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} aria-label="Filter by subject">
            <option value="all">All subjects</option>
            {curriculum.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </Select>
          <Select className="w-44" value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="Sort topics">
            {SORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
        </div>
      </div>
      <div className="relative mb-5 overflow-x-auto">
        <SegmentedControl
          label="Filter by status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All', count: scoped.length },
            ...TOPIC_STATUSES.map((item) => ({ value: item, label: STATUS_LABEL[item], count: scoped.filter((concept) => statuses.get(concept.id)?.status === item).length })),
          ]}
        />
      </div>

      {sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search />}
            title="No topics match"
            description={filtersActive ? 'Try a different search or clear the filters.' : 'Add a topic to start tracking it.'}
            action={filtersActive ? (
              <Button icon={<X className="size-4" />} onClick={() => { setQuery(''); setSubjectId('all'); setStatus('all'); }}>Clear filters</Button>
            ) : <Button variant="primary" onClick={() => setCreating(true)}>Add topic</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(({ subject, concepts }) => (
            <section key={subject?.id ?? 'all'} aria-labelledby={subject ? `subject-${subject.id}` : undefined}>
              {subject && (
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 id={`subject-${subject.id}`} className="flex items-center gap-2 text-[15px] font-semibold">
                    <SubjectDot color={subjectColor(subject.id)} />
                    {subject.name}
                    {!subject.builtIn && <Badge>Custom</Badge>}
                  </h2>
                  <p className="text-xs text-fg-3">
                    {concepts.filter((concept) => statuses.get(concept.id)?.status === 'mastered').length} of {concepts.length} mastered
                  </p>
                </div>
              )}
              <Card className="divide-y divide-border">
                <div className="hidden grid-cols-[minmax(0,1.6fr)_10rem_minmax(0,1fr)_8rem] gap-4 px-4 py-2 text-xs font-medium text-fg-3 md:grid">
                  <span>Topic</span><span>Status</span><span>Mastery</span><span className="text-right">Last practiced</span>
                </div>
                {concepts.map((concept) => {
                  const conceptStats = stats.get(concept.id);
                  const gap = gapById.get(concept.id);
                  const review = reviews.get(concept.id);
                  const noteMatch = needle && !concept.name.toLowerCase().includes(needle) && notesByConcept.get(concept.id)?.includes(needle);
                  return (
                    <div
                      key={concept.id}
                      className="grid cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60 md:grid-cols-[minmax(0,1.6fr)_10rem_minmax(0,1fr)_8rem] md:items-center md:gap-4"
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest('a, button, select, input')) return;
                        navigate(topicHref(concept.id));
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={topicHref(concept.id)} className="truncate text-sm font-medium text-fg hover:underline">{concept.name}</Link>
                          {gap && <SeverityBadge severity={gap.severity} />}
                          {review?.isDue && <Badge tone="accent" icon={<CalendarClock aria-hidden />}>Review due</Badge>}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-fg-3">
                          {!subject && `${curriculum.subject(concept.subject)?.name} · `}{concept.topic}
                          {questionCount(concept.id) === 0 && ' · no questions yet'}
                          {noteMatch && ' · matched in your notes'}
                        </p>
                      </div>
                      <StatusSelect concept={concept} />
                      <MasteryMeter mastery={conceptStats?.mastery ?? null} status={statuses.get(concept.id)!.status} label={concept.name} />
                      <p className="text-xs text-fg-3 md:text-right">
                        {conceptStats ? formatRelative(conceptStats.lastAttemptAt, now) : 'Never'}
                      </p>
                    </div>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      )}

      <TopicFormDialog open={creating} onClose={() => setCreating(false)} onSaved={(id) => navigate(topicHref(id))} />
      <SelfAssessDialog open={rating} onClose={() => setRating(false)} />
    </>
  );
}
