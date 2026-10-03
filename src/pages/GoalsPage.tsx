import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Circle, Flag, Pencil, Plus, Trash2 } from 'lucide-react';
import { useWorkspace } from '../app/contexts';
import { SubjectDot } from '../components/learning/badges';
import { Badge, type Tone } from '../components/ui/Badge';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Dialog } from '../components/ui/Dialog';
import { Field, Input } from '../components/ui/Field';
import { useConfirm, useToast } from '../components/ui/feedback-context';
import { EmptyState, PageHeader } from '../components/ui/misc';
import { ProgressBar } from '../components/ui/Progress';
import { goalProgress, GOAL_STATUS_LABEL, type GoalStatus } from '../domain/goals';
import { practiceHref, topicHref } from '../domain/recommendations';
import type { Goal } from '../domain/types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { actions } from '../store';
import { dayKey, formatDate, parseDayKey } from '../utils/date';
import { createId } from '../utils/id';

const STATUS_TONE: Record<GoalStatus, Tone> = {
  completed: 'success',
  'on-track': 'accent',
  'at-risk': 'warning',
  overdue: 'danger',
  open: 'neutral',
};

function GoalDialog({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { curriculum, subjectColor } = useWorkspace();
  const toast = useToast();
  const [title, setTitle] = useState(goal?.title ?? '');
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set(goal?.conceptIds ?? []));
  const [errors, setErrors] = useState<{ title?: string; date?: string; topics?: string }>({});
  const today = dayKey(new Date());

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Name your goal.';
    if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) next.date = 'Use a valid date.';
    else if (targetDate && targetDate < today && targetDate !== goal?.targetDate) next.date = 'Pick today or a later date.';
    if (selected.size === 0) next.topics = 'Choose at least one topic.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    actions.saveGoal({
      id: goal?.id ?? createId('goal'),
      title: title.trim().slice(0, 80),
      conceptIds: curriculum.concepts.map((concept) => concept.id).filter((id) => selected.has(id)),
      targetDate: targetDate || null,
      createdAt: goal?.createdAt ?? new Date().toISOString(),
    });
    toast({ title: goal ? 'Goal updated' : 'Goal created', description: title.trim() });
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New goal'}
      description="A goal is complete when every topic in it is mastered."
      footer={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="goal-form">{goal ? 'Save goal' : 'Create goal'}</Button>
        </>
      )}
    >
      <form id="goal-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <Field label="Goal" error={errors.title}>
            {(control) => <Input {...control} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="e.g. Ready for the physics test" data-autofocus />}
          </Field>
          <Field label="Target date" optional error={errors.date}>
            {(control) => <Input {...control} type="date" min={today} value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />}
          </Field>
        </div>
        <fieldset>
          <legend className="text-[13px] font-medium">Topics <span className="font-normal text-fg-3">· {selected.size} selected</span></legend>
          {errors.topics && <p className="mt-1 text-xs text-danger">{errors.topics}</p>}
          <div className="relative mt-2 max-h-72 space-y-3 overflow-y-auto rounded-lg border border-border p-3">
            {curriculum.subjects.map((subject) => {
              const concepts = curriculum.conceptsBySubject(subject.id);
              if (concepts.length === 0) return null;
              const allSelected = concepts.every((concept) => selected.has(concept.id));
              return (
                <div key={subject.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="flex items-center gap-2 text-xs font-semibold text-fg-2"><SubjectDot color={subjectColor(subject.id)} />{subject.name}</p>
                    <button
                      type="button"
                      className="text-xs font-medium text-accent-fg hover:underline"
                      onClick={() => setSelected((current) => {
                        const next = new Set(current);
                        concepts.forEach((concept) => (allSelected ? next.delete(concept.id) : next.add(concept.id)));
                        return next;
                      })}
                    >
                      {allSelected ? 'Clear' : 'Select all'}
                    </button>
                  </div>
                  <div className="grid gap-0.5 sm:grid-cols-2">
                    {concepts.map((concept) => (
                      <label key={concept.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2">
                        <input type="checkbox" className="size-4 accent-[var(--accent-solid)]" checked={selected.has(concept.id)} onChange={() => toggle(concept.id)} />
                        <span className="truncate">{concept.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}

export default function GoalsPage() {
  const { data, curriculum, stats, statuses, now, questionCount } = useWorkspace();
  const confirm = useConfirm();
  const toast = useToast();
  const [dialog, setDialog] = useState<{ goal?: Goal } | null>(null);
  useDocumentTitle('Goals');

  const remove = async (goal: Goal) => {
    if (!(await confirm({ title: `Delete “${goal.title}”?`, description: 'Your topics and progress are not affected.', confirmLabel: 'Delete goal', destructive: true }))) return;
    actions.deleteGoal(goal.id);
    toast({ title: 'Goal deleted' });
  };

  return (
    <>
      <PageHeader
        title="Goals"
        description="Group topics you want to master by a date. Progress comes from your measured mastery, not from ticking boxes."
        actions={data.goals.length > 0 && <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setDialog({})}>New goal</Button>}
      />

      {data.goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Flag />}
            title="No goals yet"
            description="For example “Fractions by the end of the month”. You'll see whether you're on pace and what to practice next."
            action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setDialog({})}>Create a goal</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.goals.map((goal) => {
            const progress = goalProgress(goal, stats, statuses, now);
            const concepts = goal.conceptIds.map((id) => curriculum.concept(id)).filter((concept) => concept !== undefined);
            const weakest = concepts
              .filter((concept) => statuses.get(concept.id)?.status !== 'mastered')
              .sort((a, b) => (stats.get(a.id)?.mastery ?? -1) - (stats.get(b.id)?.mastery ?? -1))[0];
            return (
              <Card key={goal.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">{goal.title}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-[13px] text-fg-3">
                      <CalendarDays className="size-3.5" aria-hidden />
                      {goal.targetDate
                        ? <>{formatDate(parseDayKey(goal.targetDate).toISOString())} · {progress.daysLeft! < 0 ? `${-progress.daysLeft!} days ago` : progress.daysLeft === 0 ? 'today' : `${progress.daysLeft} days left`}</>
                        : 'No deadline'}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[progress.status]}>{GOAL_STATUS_LABEL[progress.status]}</Badge>
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                    <span className="text-fg-2">{progress.mastered} of {progress.total} topics mastered</span>
                    <span className="tabular font-medium">{progress.percent}%</span>
                  </div>
                  <ProgressBar value={progress.percent} label={`${goal.title} progress`} size="md" tone={progress.status === 'completed' ? 'success' : progress.status === 'at-risk' || progress.status === 'overdue' ? 'warning' : 'accent'} />
                </div>
                <ul className="mt-4 flex flex-1 flex-wrap content-start gap-1.5">
                  {concepts.map((concept) => {
                    const done = statuses.get(concept.id)?.status === 'mastered';
                    return (
                      <li key={concept.id}>
                        <Link to={topicHref(concept.id)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-fg-2 hover:bg-surface-2 hover:text-fg">
                          {done ? <CheckCircle2 className="size-3.5 text-success" aria-label="Mastered" /> : <Circle className="size-3.5 text-fg-3" aria-label="Not mastered yet" />}
                          {concept.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4">
                  {weakest ? (
                    questionCount(weakest.id) > 0
                      ? <ButtonLink to={practiceHref(weakest.id)} size="sm" variant="primary">Practice {weakest.name}</ButtonLink>
                      : <ButtonLink to={topicHref(weakest.id)} size="sm">Open {weakest.name}</ButtonLink>
                  ) : <span className="text-[13px] font-medium text-success">Every topic mastered</span>}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${goal.title}`} onClick={() => setDialog({ goal })}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${goal.title}`} onClick={() => remove(goal)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {dialog && <GoalDialog key={dialog.goal?.id ?? 'new'} goal={dialog.goal} onClose={() => setDialog(null)} />}
    </>
  );
}
