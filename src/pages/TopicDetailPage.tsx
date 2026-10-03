import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowUpRight, BookOpen, CalendarClock, CheckCircle2, ChevronRight, ExternalLink, Pencil, Plus, Sparkles, Trash2,
} from 'lucide-react';
import { useContent, useWorkspace } from '../app/contexts';
import type { MasteryLevel, Question } from '../adaptive';
import { BarList } from '../components/charts/BarList';
import { ChartCard, DataTable } from '../components/charts/ChartCard';
import { DifficultyBadge, SeverityBadge, StatusBadge, SubjectDot } from '../components/learning/badges';
import { DIFFICULTY_LABEL } from '../components/learning/labels';
import { GapAnalysis } from '../components/learning/GapAnalysis';
import { priorityToast, statusToast } from '../components/learning/overlayFeedback';
import { AiBadge, SystemBadge } from '../components/learning/provenance';
import { TopicFormDialog } from '../components/learning/TopicFormDialog';
import { GenerateQuestionsDialog } from '../components/questions/GenerateQuestionsDialog';
import { QuestionFormDialog } from '../components/questions/QuestionFormDialog';
import { Badge } from '../components/ui/Badge';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { useConfirm, useToast } from '../components/ui/feedback-context';
import { EmptyState, Skeleton, Spinner } from '../components/ui/misc';
import { RichText } from '../components/ui/RichText';
import { Tabs } from '../components/ui/Tabs';
import { DIFFICULTIES } from '../adaptive';
import { GAP_MASTERY_THRESHOLD } from '../domain/gaps';
import { masteryFromAttempts } from '../domain/mastery';
import { practiceHref, topicHref } from '../domain/recommendations';
import { REVIEW_INTERVALS_DAYS } from '../domain/review';
import { STATUS_LABEL, TOPIC_STATUSES } from '../domain/status';
import type { Concept, Priority, Resource, ResourceKind, SelfRating, TopicStatus } from '../domain/types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ApiError } from '../services/api';
import { explainConcept } from '../services/ai';
import { actions } from '../store';
import { isSafeUrl, RESOURCE_KINDS } from '../store/schema';
import { cn } from '../utils/cn';
import { formatDate, formatRelative } from '../utils/date';
import { createId } from '../utils/id';
import { NotFoundPage } from './ErrorPages';

type Tab = 'overview' | 'progress' | 'notes' | 'resources' | 'questions';

const TAB_LABEL: Record<Tab, string> = {
  overview: 'Overview', progress: 'Progress', notes: 'Notes', resources: 'Resources', questions: 'Questions',
};

const MASTERY_LEVEL_LABEL: Record<MasteryLevel, string> = {
  beginning: 'Beginning',
  developing: 'Developing',
  proficient: 'Proficient',
  mastered: 'Mastered',
};

// The charting library is only needed on the Progress tab, so it loads on demand.
const LineTrend = lazy(() => import('../components/charts/LineTrend').then((module) => ({ default: module.LineTrend })));

const RESOURCE_LABEL: Record<ResourceKind, string> = {
  article: 'Article', video: 'Video', course: 'Course', book: 'Book', exercise: 'Exercise', other: 'Other',
};

// ---- Overview ------------------------------------------------------------------------------------

function ExplainWithAI({ concept }: { concept: Concept }) {
  const { curriculum, stats, data } = useWorkspace();
  const toast = useToast();
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; text: string }>({ status: 'idle', text: '' });
  const controller = useRef<AbortController | null>(null);

  const run = async () => {
    setState({ status: 'loading', text: '' });
    controller.current?.abort();
    controller.current = new AbortController();
    const misconceptions = (stats.get(concept.id)?.misconceptions ?? []).slice(0, 4)
      .map((item) => curriculum.misconception(item.id))
      .filter((item) => item !== undefined)
      .map((item) => ({ title: item.title, description: item.description }));
    try {
      const text = await explainConcept({
        concept: {
          name: concept.name,
          subject: curriculum.subject(concept.subject)?.name ?? '',
          description: concept.description,
          learningObjective: concept.learningObjective,
          keyPoints: concept.lesson?.keyPoints ?? [],
        },
        misconceptions,
        notes: data.notes.filter((note) => note.conceptId === concept.id).map((note) => note.body).join('\n\n').slice(0, 4000),
      }, controller.current.signal);
      setState({ status: 'done', text });
    } catch (error) {
      if (controller.current.signal.aborted) return;
      setState({ status: 'error', text: error instanceof ApiError ? error.message : 'The explanation could not be generated.' });
    }
  };

  const saveToNotes = () => {
    const now = new Date().toISOString();
    actions.addNote({ id: createId('note'), conceptId: concept.id, body: state.text, source: 'ai', createdAt: now, updatedAt: now });
    toast({ title: 'Saved to your notes', description: 'It stays labeled as AI-generated.' });
  };

  return (
    <Card>
      <CardHeader
        icon={<Sparkles className="size-4" />}
        title="Explain it for me"
        description="A personalized explanation from the AI tutor that targets the mistakes you've actually made."
        action={state.status !== 'loading' && (
          <Button size="sm" variant={state.status === 'done' ? 'secondary' : 'primary'} onClick={run}>
            {state.status === 'done' ? 'Regenerate' : 'Explain'}
          </Button>
        )}
      />
      {state.status !== 'idle' && (
        <CardBody className="pt-4">
          {state.status === 'loading' && <p className="flex items-center gap-2 text-[13px] text-fg-3"><Spinner /> Writing an explanation…</p>}
          {state.status === 'error' && <p role="alert" className="text-[13px] text-danger">{state.text}</p>}
          {state.status === 'done' && (
            <>
              <div className="mb-3"><AiBadge /></div>
              <RichText text={state.text} />
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                <p className="text-xs text-fg-3">Generated by AI. Check anything that seems off against the lesson.</p>
                <Button size="sm" onClick={saveToNotes}>Save to notes</Button>
              </div>
            </>
          )}
        </CardBody>
      )}
    </Card>
  );
}

function Overview({ concept, questions }: { concept: Concept; questions: Question[] }) {
  const { curriculum, statuses, stats } = useWorkspace();
  const content = useContent();
  const observed = new Map((stats.get(concept.id)?.misconceptions ?? []).map((item) => [item.id, item.count]));
  const common = [...new Set(questions.flatMap((question) => Object.values(question.misconceptionMap)))]
    .map((id) => curriculum.misconception(id))
    .filter((item) => item !== undefined)
    .sort((a, b) => (observed.get(b.id) ?? 0) - (observed.get(a.id) ?? 0));
  const prerequisites = concept.prerequisites.map((id) => curriculum.concept(id)).filter((item) => item !== undefined);
  const unlocks = curriculum.graph.successors(concept.id).map((node) => curriculum.concept(node.id)!);

  const linkList = (items: Concept[], empty: string) => items.length === 0 ? <p className="text-[13px] text-fg-3">{empty}</p> : (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link to={topicHref(item.id)} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2">
            <span className="truncate font-medium">{item.name}</span>
            <StatusBadge status={statuses.get(item.id)!.status} />
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader icon={<BookOpen className="size-4" />} title="Lesson" description={concept.learningObjective ? `Goal: ${concept.learningObjective}` : undefined} />
          <CardBody className="pt-4">
            {concept.lesson ? (
              <div className="space-y-5 text-sm leading-6 text-fg-2">
                <p>{concept.lesson.summary}</p>
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold text-fg">Key ideas</h3>
                  <ul className="list-disc space-y-1 pl-5">{concept.lesson.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>
                </div>
                <div className="rounded-lg bg-surface-2 p-4">
                  <h3 className="text-[13px] font-semibold text-fg">Worked example</h3>
                  <p className="mt-1 font-medium text-fg">{concept.lesson.example.problem}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">{concept.lesson.example.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm leading-6 text-fg-2">
                <p>{concept.description || 'No description yet.'}</p>
                <p className="text-[13px] text-fg-3">
                  This is your own topic, so there's no built-in lesson. Collect what you learn in Notes and link study material in Resources
                  {content.ai.enabled ? ', or ask the AI to explain it below.' : '.'}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {content.ai.enabled && <ExplainWithAI concept={concept} />}

        {common.length > 0 && (
          <Card>
            <CardHeader title="Common mistakes" description="Misconceptions this topic's questions are designed to catch. Yours are marked." />
            <CardBody className="pt-3">
              <ul className="divide-y divide-border">
                {common.map((item) => (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                      {item.title}
                      {observed.has(item.id) && <Badge tone="danger">You: {observed.get(item.id)}×</Badge>}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-5 text-fg-2">{item.description}</p>
                    <p className="mt-1 text-[13px] leading-5 text-fg-3"><span className="font-medium text-fg-2">Fix: </span>{item.remedy}</p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Builds on" description="Prerequisites to have in place first." />
          <CardBody className="pt-3">{linkList(prerequisites, 'No prerequisites: a good starting point.')}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Unlocks" description="Topics that depend on this one." />
          <CardBody className="pt-3">{linkList(unlocks, 'Nothing depends on this topic yet.')}</CardBody>
        </Card>
      </div>
    </div>
  );
}

// ---- Progress ------------------------------------------------------------------------------------

function Progress({ concept }: { concept: Concept }) {
  const { data, stats, curriculum } = useWorkspace();
  const conceptStats = stats.get(concept.id);
  const attempts = useMemo(() => data.attempts.filter((attempt) => attempt.conceptId === concept.id), [data.attempts, concept.id]);
  const history = useMemo(() => attempts.map((attempt, index) => ({
    answer: String(index + 1),
    date: attempt.answeredAt,
    mastery: masteryFromAttempts(attempts.slice(0, index + 1)),
  })), [attempts]);

  if (!conceptStats) {
    return (
      <Card>
        <EmptyState icon={<CalendarClock />} title="No answers yet" description="Your mastery history, accuracy by difficulty, and misconceptions appear after you practice this topic." />
      </Card>
    );
  }

  const byDifficulty = DIFFICULTIES.map((difficulty) => {
    const bucket = conceptStats.byDifficulty[difficulty];
    return {
      key: difficulty,
      label: `${DIFFICULTY_LABEL[difficulty]} · ${bucket.attempts} ${bucket.attempts === 1 ? 'answer' : 'answers'}`,
      value: bucket.attempts > 0 ? Math.round((bucket.correct / bucket.attempts) * 100) : null,
      color: 'var(--accent-solid)',
    };
  });
  const byIndex = new Map(history.map((point) => [point.answer, point.date]));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <ChartCard
        className="lg:col-span-2"
        title="Mastery after each answer"
        description="Recent and harder answers count more, so the line reacts to how you're doing now."
        chart={(
          <Suspense fallback={<Skeleton className="h-60 w-full rounded-lg" />}>
          <LineTrend
            data={history}
            xKey="answer"
            series={[{ key: 'mastery', label: 'Mastery', color: 'var(--accent-solid)' }]}
            formatX={(value) => `#${value}`}
            area
            ariaLabel={`Mastery of ${concept.name} over ${history.length} answers, now ${conceptStats.mastery}%`}
          />
          </Suspense>
        )}
        table={(
          <DataTable
            caption={`Mastery of ${concept.name} after each answer`}
            columns={['Answer', 'Date', 'Mastery']}
            rows={history.map((point) => [point.answer, formatDate(byIndex.get(point.answer)!), `${point.mastery}%`])}
          />
        )}
      />
      <Card>
        <CardHeader title="Accuracy by difficulty" />
        <CardBody className="pt-4">
          <BarList items={byDifficulty} emptyLabel="Not tried" />
        </CardBody>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader title="Recent answers" />
        <CardBody className="pt-3">
          <ul className="divide-y divide-border">
            {[...attempts].reverse().slice(0, 10).map((attempt) => (
              <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn('size-2 shrink-0 rounded-full', attempt.correct ? 'bg-success' : 'bg-danger')} aria-hidden />
                  <span className="sr-only">{attempt.correct ? 'Correct' : 'Incorrect'}:</span>
                  <span className="truncate text-fg-2">
                    {attempt.selectedAnswer}
                    {!attempt.correct && attempt.misconceptionId && attempt.misconceptionId !== 'unknown' && (
                      <span className="text-fg-3"> · {curriculum.misconception(attempt.misconceptionId)?.title}</span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-fg-3">{DIFFICULTY_LABEL[attempt.difficulty]} · {formatRelative(attempt.answeredAt)}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

// ---- Notes ---------------------------------------------------------------------------------------

function Notes({ concept, onGenerate }: { concept: Concept; onGenerate: () => void }) {
  const { data } = useWorkspace();
  const content = useContent();
  const confirm = useConfirm();
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const notes = data.notes.filter((note) => note.conceptId === concept.id);

  const add = (event?: FormEvent) => {
    event?.preventDefault();
    const body = draft.trim();
    if (!body) return;
    const now = new Date().toISOString();
    actions.addNote({ id: createId('note'), conceptId: concept.id, body: body.slice(0, 5000), createdAt: now, updatedAt: now });
    setDraft('');
    toast({ title: 'Note saved', description: 'Notes are searchable from the Topics page.' });
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Delete this note?', description: 'This cannot be undone.', confirmLabel: 'Delete note', destructive: true }))) return;
    actions.deleteNote(id);
    toast({ title: 'Note deleted' });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <form onSubmit={add} className="p-4">
            <label htmlFor="new-note" className="sr-only">New note</label>
            <Textarea
              id="new-note"
              rows={3}
              value={draft}
              maxLength={5000}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) add(); }}
              placeholder="Write down a rule, an example, or the mistake you keep making…"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="hidden text-xs text-fg-3 sm:block">Ctrl/⌘ + Enter to save</p>
              <Button type="submit" variant="primary" size="sm" disabled={!draft.trim()}>Add note</Button>
            </div>
          </form>
        </Card>
        {notes.length === 0 ? (
          <Card><EmptyState compact icon={<Pencil />} title="No notes yet" description="Notes are searchable from the Topics page and can be turned into practice questions." /></Card>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id}>
                <Card className="p-4">
                  {editing?.id === note.id ? (
                    <div>
                      <Textarea rows={4} value={editing.body} maxLength={5000} onChange={(event) => setEditing({ id: note.id, body: event.target.value })} aria-label="Edit note" autoFocus />
                      <div className="mt-3 flex justify-end gap-2">
                        <Button size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                        <Button size="sm" variant="primary" disabled={!editing.body.trim()} onClick={() => { actions.updateNote(note.id, editing.body.trim()); setEditing(null); toast({ title: 'Note updated' }); }}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {note.source === 'ai' && <div className="mb-2"><AiBadge label="From an AI explanation" /></div>}
                      <RichText text={note.body} />
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-fg-3">{note.updatedAt !== note.createdAt ? `Edited ${formatRelative(note.updatedAt)}` : formatRelative(note.createdAt)}</p>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-sm" aria-label="Edit note" onClick={() => setEditing({ id: note.id, body: note.body })}><Pencil className="size-4" /></Button>
                          <Button variant="ghost" size="icon-sm" aria-label="Delete note" onClick={() => remove(note.id)}><Trash2 className="size-4" /></Button>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Card className="h-fit">
        <CardHeader icon={<Sparkles className="size-4" />} title="Turn notes into questions" description="Practice what you wrote down, not just what the bank covers." />
        <CardBody className="pt-4">
          {content.ai.enabled ? (
            <Button onClick={onGenerate} disabled={notes.length === 0}>{notes.length === 0 ? 'Write a note first' : 'Generate from my notes'}</Button>
          ) : (
            <p className="text-[13px] leading-5 text-fg-3">Needs the AI service. Set GEMINI_API_KEY on the server to enable it.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ---- Resources -----------------------------------------------------------------------------------

function Resources({ concept }: { concept: Concept }) {
  const { data } = useWorkspace();
  const confirm = useConfirm();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [kind, setKind] = useState<ResourceKind>('article');
  const [errors, setErrors] = useState<{ title?: string; url?: string }>({});
  const resources = data.resources.filter((resource) => resource.conceptId === concept.id);

  const add = (event: FormEvent) => {
    event.preventDefault();
    const trimmedUrl = url.trim();
    const withProtocol = /^[a-z]+:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Give the resource a title.';
    if (!trimmedUrl || !isSafeUrl(withProtocol)) next.url = 'Enter a valid http or https link.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    actions.addResource({ id: createId('resource'), conceptId: concept.id, title: title.trim().slice(0, 120), url: withProtocol, kind, done: false, createdAt: new Date().toISOString() });
    setTitle('');
    setUrl('');
    toast({ title: 'Resource added', description: title.trim() });
  };

  const remove = async (resource: Resource) => {
    if (!(await confirm({ title: 'Remove this resource?', description: resource.title, confirmLabel: 'Remove', destructive: true }))) return;
    actions.deleteResource(resource.id);
    toast({ title: 'Resource removed' });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="h-fit">
        <CardHeader title="Add a resource" />
        <CardBody className="pt-4">
          <form onSubmit={add} noValidate className="space-y-3">
            <Field label="Title" error={errors.title}>
              {(control) => <Input {...control} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="e.g. Khan Academy: Fractions" />}
            </Field>
            <Field label="Link" error={errors.url}>
              {(control) => <Input {...control} type="url" inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" />}
            </Field>
            <Field label="Type">
              {(control) => (
                <Select {...control} value={kind} onChange={(event) => setKind(event.target.value as ResourceKind)}>
                  {RESOURCE_KINDS.map((item) => <option key={item} value={item}>{RESOURCE_LABEL[item]}</option>)}
                </Select>
              )}
            </Field>
            <Button type="submit" variant="primary" icon={<Plus className="size-4" />}>Add resource</Button>
          </form>
        </CardBody>
      </Card>
      <div className="lg:col-span-2">
        {resources.length === 0 ? (
          <Card><EmptyState compact icon={<ExternalLink />} title="No resources yet" description="Keep the articles, videos, and exercises you use for this topic in one place, and tick them off as you go." /></Card>
        ) : (
          <Card className="divide-y divide-border">
            {resources.map((resource) => (
              <div key={resource.id} className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  className="size-4 shrink-0 accent-[var(--accent-solid)]"
                  checked={resource.done}
                  onChange={() => actions.updateResource(resource.id, { done: !resource.done })}
                  aria-label={`Mark ${resource.title} as ${resource.done ? 'not done' : 'done'}`}
                />
                <div className="min-w-0 flex-1">
                  <a href={resource.url} target="_blank" rel="noopener noreferrer" className={cn('inline-flex max-w-full items-center gap-1 text-sm font-medium hover:underline', resource.done && 'text-fg-3 line-through')}>
                    <span className="truncate">{resource.title}</span>
                    <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                  <p className="truncate text-xs text-fg-3">{RESOURCE_LABEL[resource.kind]} · {new URL(resource.url).hostname}</p>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${resource.title}`} onClick={() => remove(resource)}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

// ---- Questions -----------------------------------------------------------------------------------

function Questions({ concept, questions, onGenerate }: { concept: Concept; questions: Question[]; onGenerate: () => void }) {
  const { data } = useWorkspace();
  const content = useContent();
  const [writing, setWriting] = useState(false);
  const mine = new Set(data.customQuestions.map((question) => question.id));
  const aiIds = new Set(data.customQuestions.filter((question) => question.origin === 'ai').map((question) => question.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg-2">
          {questions.length} {questions.length === 1 ? 'question' : 'questions'}
          {questions.length > 0 && ` · ${DIFFICULTIES.map((difficulty) => `${questions.filter((question) => question.difficulty === difficulty).length} ${difficulty}`).join(', ')}`}
        </p>
        <div className="flex flex-wrap gap-2">
          {content.ai.enabled && <Button icon={<Sparkles className="size-4" />} onClick={onGenerate}>Generate with AI</Button>}
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setWriting(true)}>Write a question</Button>
        </div>
      </div>
      {questions.length === 0 ? (
        <Card><EmptyState icon={<Plus />} title="No questions yet" description="Questions power practice, reviews, and misconception diagnosis for this topic." /></Card>
      ) : (
        <Card className="divide-y divide-border">
          {questions.map((question) => (
            <div key={question.id} className="px-4 py-3">
              <p className="text-sm text-fg">{question.question}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={question.difficulty} />
                {aiIds.has(question.id) ? <AiBadge /> : mine.has(question.id) ? <Badge tone="accent">Yours</Badge> : <Badge>Curated</Badge>}
                <span className="text-xs text-fg-3">Answer: {question.correctAnswer}</span>
              </div>
            </div>
          ))}
        </Card>
      )}
      <p className="text-[13px] text-fg-3">
        Edit or remove your questions in the <Link to={`/app/questions?concept=${encodeURIComponent(concept.id)}`} className="font-medium text-accent-fg hover:underline">question bank</Link>.
      </p>
      <QuestionFormDialog open={writing} onClose={() => setWriting(false)} defaultConceptId={concept.id} />
    </div>
  );
}

// ---- Page ----------------------------------------------------------------------------------------

function SelfRatingControl({ concept }: { concept: Concept }) {
  const { data } = useWorkspace();
  const value = data.topics[concept.id]?.selfRating?.value;
  return (
    <div role="radiogroup" aria-label="Your confidence" className="flex gap-1">
      {([1, 2, 3, 4, 5] as SelfRating[]).map((rating) => (
        <button
          key={rating}
          type="button"
          role="radio"
          aria-checked={value === rating}
          onClick={() => actions.setSelfRating(concept.id, value === rating ? null : rating)}
          className={cn(
            'h-7 w-7 rounded-md border text-xs font-medium transition-colors',
            value === rating ? 'border-accent bg-accent text-white' : 'border-border text-fg-2 hover:border-border-strong hover:text-fg',
          )}
        >
          {rating}
        </button>
      ))}
    </div>
  );
}

export default function TopicDetailPage() {
  const { conceptId = '' } = useParams();
  const workspace = useWorkspace();
  const { curriculum, stats, statuses, gapById, reviews, data, questions, subjectColor } = workspace;
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState<null | 'topic' | 'notes'>(null);
  const concept = curriculum.concept(conceptId);
  // When the topic is missing, NotFoundPage renders inside; keep its title (parent effects run last).
  useDocumentTitle(concept?.name ?? 'Page not found');

  const conceptQuestions = useMemo(() => questions.filter((question) => question.concept === conceptId), [questions, conceptId]);
  const location = useLocation();

  // Links from the gaps page jump straight to the analysis panel.
  useEffect(() => {
    if (location.hash === '#gap') document.getElementById('gap')?.scrollIntoView();
  }, [location.hash, conceptId]);

  if (!concept) return <NotFoundPage inApp />;

  const subject = curriculum.subject(concept.subject);
  const conceptStats = stats.get(concept.id);
  const status = statuses.get(concept.id)!;
  const gap = gapById.get(concept.id);
  const review = reviews.get(concept.id);
  const overlay = data.topics[concept.id];
  const noteCount = data.notes.filter((note) => note.conceptId === concept.id).length;
  const resourceCount = data.resources.filter((resource) => resource.conceptId === concept.id).length;

  const remove = async () => {
    const answerCount = conceptStats?.attempts ?? 0;
    const ok = await confirm({
      title: `Delete “${concept.name}”?`,
      description: `This permanently removes the topic with its ${answerCount} ${answerCount === 1 ? 'answer' : 'answers'}, notes, resources, and your questions for it.`,
      confirmLabel: 'Delete topic',
      destructive: true,
    });
    if (!ok) return;
    actions.deleteConcept(concept.id);
    // A custom subject with no topics left would only clutter every subject list.
    if (!subject?.builtIn && curriculum.conceptsBySubject(concept.subject).length === 1) actions.deleteSubject(concept.subject);
    toast({ title: 'Topic deleted', description: concept.name });
    navigate('/app/topics');
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-[13px] text-fg-3">
        <Link to="/app/topics" className="hover:text-fg">Topics</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="flex items-center gap-1.5"><SubjectDot color={subjectColor(concept.subject)} />{subject?.name}</span>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="text-fg-2" aria-current="page">{concept.name}</span>
      </nav>

      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{concept.name}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-fg-2">{concept.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status.status} manual={status.source === 'manual'} />
            {gap && <SeverityBadge severity={gap.severity} />}
            <DifficultyBadge difficulty={concept.difficulty} />
            {!concept.builtIn && <Badge>Custom topic</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            className="w-40"
            aria-label="Status"
            value={overlay?.statusOverride && status.source === 'manual' ? status.status : 'auto'}
            onChange={(event) => {
              const value = event.target.value === 'auto' ? null : event.target.value as TopicStatus;
              actions.setStatus(concept.id, value);
              toast(statusToast(value));
            }}
          >
            <option value="auto">Status: automatic</option>
            {TOPIC_STATUSES.map((item) => <option key={item} value={item}>Status: {STATUS_LABEL[item]}</option>)}
          </Select>
          <Select
            className="w-40"
            aria-label="Priority"
            value={overlay?.priority ?? 'normal'}
            onChange={(event) => {
              const value = event.target.value as Priority;
              actions.setPriority(concept.id, value);
              toast(priorityToast(value));
            }}
          >
            <option value="high">High priority</option>
            <option value="normal">Normal priority</option>
            <option value="low">Low priority</option>
          </Select>
          {!concept.builtIn && (
            <>
              <Button icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>Edit</Button>
              <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={remove}>Delete</Button>
            </>
          )}
          {conceptQuestions.length > 0 && (
            <ButtonLink to={practiceHref(concept.id)} variant="primary">Practice</ButtonLink>
          )}
        </div>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <p className="text-[13px] font-medium text-fg-3">Mastery</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{conceptStats ? `${conceptStats.mastery}%` : '—'}</p>
          <p className="mt-1 text-[13px] text-fg-2">
            {conceptStats ? `${MASTERY_LEVEL_LABEL[conceptStats.level]} · ${conceptStats.confidence}% confidence` : 'No evidence yet'}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <p className="text-[13px] font-medium text-fg-3">Answers</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{conceptStats?.attempts ?? 0}</p>
          <p className="mt-1 text-[13px] text-fg-2">{conceptStats ? `${conceptStats.accuracy}% correct · last practiced ${formatRelative(conceptStats.lastAttemptAt)}` : 'Not practiced yet'}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <p className="text-[13px] font-medium text-fg-3">Next review</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{review ? (review.isDue ? 'Due now' : formatRelative(review.dueAt)) : '—'}</p>
          <p className="mt-1 text-[13px] text-fg-2">{review ? `Interval ${REVIEW_INTERVALS_DAYS[review.box - 1]} ${REVIEW_INTERVALS_DAYS[review.box - 1] === 1 ? 'day' : 'days'} · box ${review.box} of 5` : 'Scheduled after your first practice'}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <p className="text-[13px] font-medium text-fg-3">Your confidence</p>
          <div className="mt-2.5"><SelfRatingControl concept={concept} /></div>
          <p className="mt-2 text-[13px] text-fg-2">
            {overlay?.selfRating
              ? conceptStats && conceptStats.attempts >= 3 ? `Rated ${overlay.selfRating.value}/5 · measured ${conceptStats.mastery}%` : `Rated ${overlay.selfRating.value}/5 ${formatRelative(overlay.selfRating.ratedAt)}`
              : '1 = no idea, 5 = solid'}
          </p>
        </div>
      </div>

      {gap ? (
        <div className="mb-6"><GapAnalysis gap={gap} /></div>
      ) : conceptStats && (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3 text-[13px] shadow-card">
          <CheckCircle2 className="size-4 text-success" aria-hidden />
          <span className="font-medium text-fg">Not a gap.</span>
          <span className="text-fg-2">
            Mastery is {conceptStats.mastery}% (gaps start below {GAP_MASTERY_THRESHOLD}%) with no repeated misconception
            {overlay?.selfRating && overlay.selfRating.value <= 2 ? ', and your results now outweigh your low self-rating' : ''}.
          </span>
          <SystemBadge />
        </div>
      )}

      <div className="mb-5">
        <Tabs
          label="Topic sections"
          panelId="topic-panel"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'progress', label: 'Progress' },
            { value: 'notes', label: 'Notes', count: noteCount },
            { value: 'resources', label: 'Resources', count: resourceCount },
            { value: 'questions', label: 'Questions', count: conceptQuestions.length },
          ]}
        />
      </div>
      <div id="topic-panel" role="tabpanel" aria-label={TAB_LABEL[tab]}>
        {tab === 'overview' && <Overview concept={concept} questions={conceptQuestions} />}
        {tab === 'progress' && <Progress concept={concept} />}
        {tab === 'notes' && <Notes concept={concept} onGenerate={() => setGenerating('notes')} />}
        {tab === 'resources' && <Resources concept={concept} />}
        {tab === 'questions' && <Questions concept={concept} questions={conceptQuestions} onGenerate={() => setGenerating('topic')} />}
      </div>

      <TopicFormDialog open={editing} onClose={() => setEditing(false)} concept={concept} />
      <GenerateQuestionsDialog open={generating !== null} onClose={() => setGenerating(null)} concept={concept} initialSource={generating ?? 'topic'} />
    </>
  );
}
