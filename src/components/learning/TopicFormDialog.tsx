import { useMemo, useState, type FormEvent } from 'react';
import { useWorkspace } from '../../app/contexts';
import { DIFFICULTIES, type Difficulty } from '../../adaptive';
import type { Concept } from '../../domain/types';
import { actions } from '../../store';
import { createId, slugify } from '../../utils/id';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { useToast } from '../ui/feedback-context';
import { SegmentedControl } from '../ui/Tabs';
import { DIFFICULTY_LABEL } from './labels';

const NEW_SUBJECT = '__new__';

interface TopicFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Editing an existing custom topic; omitted when creating. */
  concept?: Concept;
  onSaved?: (conceptId: string) => void;
}

interface Draft {
  subjectId: string;
  newSubject: string;
  group: string;
  name: string;
  description: string;
  objective: string;
  difficulty: Difficulty;
  prerequisites: string[];
}

function initialDraft(concept: Concept | undefined, defaultSubject: string): Draft {
  return {
    subjectId: concept?.subject ?? defaultSubject,
    newSubject: '',
    group: concept?.topic ?? '',
    name: concept?.name ?? '',
    description: concept?.description ?? '',
    objective: concept?.learningObjective ?? '',
    difficulty: concept?.difficulty ?? 'medium',
    prerequisites: concept?.prerequisites ?? [],
  };
}

export function TopicFormDialog(props: TopicFormDialogProps) {
  // Remount the form whenever it opens so it always starts from fresh values.
  if (!props.open) return null;
  return <TopicForm key={props.concept?.id ?? 'new'} {...props} />;
}

function TopicForm({ open, onClose, concept, onSaved }: TopicFormDialogProps) {
  const { curriculum } = useWorkspace();
  const toast = useToast();
  const editing = Boolean(concept);
  const [draft, setDraft] = useState<Draft>(() => initialDraft(concept, curriculum.subjects[0]?.id ?? NEW_SUBJECT));
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const candidates = useMemo(() => {
    if (draft.subjectId === NEW_SUBJECT) return [];
    return curriculum.conceptsBySubject(draft.subjectId).filter((item) =>
      item.id !== concept?.id && !(concept && curriculum.graph.wouldCreateCycle(concept.id, item.id)));
  }, [curriculum, draft.subjectId, concept]);

  const validate = (): boolean => {
    const next: typeof errors = {};
    const name = draft.name.trim();
    if (!name) next.name = 'Give the topic a name.';
    else if (name.length > 80) next.name = 'Keep the name under 80 characters.';
    else if (
      draft.subjectId !== NEW_SUBJECT
      && curriculum.conceptsBySubject(draft.subjectId).some((item) => item.id !== concept?.id && item.name.toLowerCase() === name.toLowerCase())
    ) next.name = 'A topic with this name already exists in this subject.';
    if (draft.subjectId === NEW_SUBJECT) {
      const subjectName = draft.newSubject.trim();
      if (!subjectName) next.newSubject = 'Name the new subject.';
      else if (curriculum.subjects.some((subject) => subject.name.toLowerCase() === subjectName.toLowerCase())) next.newSubject = 'That subject already exists. Pick it from the list instead.';
    }
    if (draft.description.length > 300) next.description = 'Keep the description under 300 characters.';
    if (draft.objective.length > 200) next.objective = 'Keep the objective under 200 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    let subjectId = draft.subjectId;
    if (subjectId === NEW_SUBJECT) {
      subjectId = `subject-${slugify(draft.newSubject)}-${createId('s').slice(-4)}`;
      actions.saveSubject({ id: subjectId, name: draft.newSubject.trim(), description: '', builtIn: false });
    }
    const subjectName = curriculum.subject(subjectId)?.name ?? draft.newSubject.trim();
    const id = concept?.id ?? `topic-${slugify(draft.name)}-${createId('t').slice(-4)}`;
    actions.saveConcept({
      id,
      subject: subjectId,
      topic: draft.group.trim() || subjectName,
      name: draft.name.trim(),
      description: draft.description.trim(),
      learningObjective: draft.objective.trim(),
      difficulty: draft.difficulty,
      prerequisites: draft.subjectId === NEW_SUBJECT ? [] : draft.prerequisites,
      builtIn: false,
      lesson: null,
    });
    toast({ title: editing ? 'Topic updated' : 'Topic added', description: draft.name.trim() });
    // Close first: onSaved may navigate, and that navigation must be the last one.
    onClose();
    onSaved?.(id);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? 'Edit topic' : 'Add a topic'}
      description={editing ? undefined : 'Track any skill you want to improve. Add practice questions for it later, or generate them with AI.'}
      footer={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="topic-form">{editing ? 'Save changes' : 'Add topic'}</Button>
        </>
      )}
    >
      <form id="topic-form" onSubmit={submit} className="space-y-4" noValidate>
        {editing ? (
          <p className="text-[13px] text-fg-3">Subject: <span className="font-medium text-fg">{curriculum.subject(draft.subjectId)?.name}</span></p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subject">
              {(control) => (
                <Select {...control} value={draft.subjectId} onChange={(event) => { set('subjectId', event.target.value); set('prerequisites', []); }}>
                  {curriculum.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                  <option value={NEW_SUBJECT}>New subject…</option>
                </Select>
              )}
            </Field>
            {draft.subjectId === NEW_SUBJECT && (
              <Field label="New subject name" error={errors.newSubject}>
                {(control) => <Input {...control} value={draft.newSubject} onChange={(event) => set('newSubject', event.target.value)} placeholder="e.g. Web development" maxLength={60} autoFocus />}
              </Field>
            )}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Topic name" error={errors.name}>
            {(control) => <Input {...control} value={draft.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. React hooks" maxLength={80} data-autofocus={editing || draft.subjectId !== NEW_SUBJECT ? true : undefined} />}
          </Field>
          <Field label="Group" optional hint="Groups related topics inside a subject.">
            {(control) => <Input {...control} value={draft.group} onChange={(event) => set('group', event.target.value)} placeholder="e.g. React" maxLength={60} />}
          </Field>
        </div>
        <Field label="Description" optional error={errors.description}>
          {(control) => <Textarea {...control} rows={2} value={draft.description} onChange={(event) => set('description', event.target.value)} placeholder="What does this topic cover?" />}
        </Field>
        <Field label="Learning objective" optional error={errors.objective} hint="What you should be able to do once you've mastered it.">
          {(control) => <Input {...control} value={draft.objective} onChange={(event) => set('objective', event.target.value)} placeholder="e.g. Build components that manage state with hooks" />}
        </Field>
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-fg" id="difficulty-label">Difficulty</p>
          <SegmentedControl
            label="Difficulty"
            value={draft.difficulty}
            onChange={(value) => set('difficulty', value)}
            options={DIFFICULTIES.map((difficulty) => ({ value: difficulty, label: DIFFICULTY_LABEL[difficulty] }))}
          />
        </div>
        {candidates.length > 0 && (
          <fieldset className="space-y-1.5">
            <legend className="text-[13px] font-medium text-fg">Prerequisites <span className="font-normal text-fg-3">· optional</span></legend>
            <p className="text-xs text-fg-3">Topics you should know first. They shape the roadmap and gap ranking.</p>
            <div className="relative mt-2 grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
              {candidates.map((item) => (
                <label key={item.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--accent-solid)]"
                    checked={draft.prerequisites.includes(item.id)}
                    onChange={(event) => set('prerequisites', event.target.checked
                      ? [...draft.prerequisites, item.id]
                      : draft.prerequisites.filter((id) => id !== item.id))}
                  />
                  <span className="truncate">{item.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </form>
    </Dialog>
  );
}
