import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../app/contexts';
import { DIFFICULTIES, type Difficulty, type Misconception } from '../../adaptive';
import type { StoredQuestion } from '../../domain/types';
import { validateQuestion } from '../../domain/questionValidation';
import { actions } from '../../store';
import { cn } from '../../utils/cn';
import { createId, slugify } from '../../utils/id';
import { DIFFICULTY_LABEL } from '../learning/labels';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { useToast } from '../ui/feedback-context';
import { SegmentedControl } from '../ui/Tabs';

const NEW = '__new__';

interface Draft {
  conceptId: string;
  difficulty: Difficulty;
  question: string;
  options: string[];
  correctIndex: number;
  /** Per option index: '' (none), a misconception id, or NEW. */
  mapping: Record<number, string>;
  newMisconceptions: Record<number, { title: string; explanation: string }>;
  hint: string;
  solution: string;
}

interface QuestionFormDialogProps {
  open: boolean;
  onClose: () => void;
  question?: StoredQuestion;
  defaultConceptId?: string;
}

export function QuestionFormDialog(props: QuestionFormDialogProps) {
  if (!props.open) return null;
  return <QuestionForm key={props.question?.id ?? 'new'} {...props} />;
}

function QuestionForm({ open, onClose, question, defaultConceptId }: QuestionFormDialogProps) {
  const { curriculum, questions } = useWorkspace();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(() => {
    if (!question) {
      return {
        conceptId: defaultConceptId ?? curriculum.concepts[0]?.id ?? '',
        difficulty: 'medium',
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        mapping: {},
        newMisconceptions: {},
        hint: '',
        solution: '',
      };
    }
    return {
      conceptId: question.concept,
      difficulty: question.difficulty,
      question: question.question,
      options: [...question.options],
      correctIndex: question.options.indexOf(question.correctAnswer),
      mapping: Object.fromEntries(question.options.map((option, index) => [index, question.misconceptionMap[option] ?? ''])),
      newMisconceptions: {},
      hint: question.hint,
      solution: question.solutionSteps,
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const concept = curriculum.concept(draft.conceptId);
  const catalog = curriculum.misconceptions
    .filter((item) => item.id !== 'unknown' && item.id !== 'prerequisite_not_confirmed' && item.subject === concept?.subject)
    .sort((a, b) => a.title.localeCompare(b.title));

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const setOption = (index: number, value: string) => set('options', draft.options.map((option, i) => (i === index ? value : option)));

  const removeOption = (index: number) => {
    const reindex = <T,>(record: Record<number, T>) => Object.fromEntries(
      Object.entries(record).filter(([key]) => Number(key) !== index).map(([key, value]) => [Number(key) > index ? Number(key) - 1 : Number(key), value]),
    ) as Record<number, T>;
    setDraft((current) => ({
      ...current,
      options: current.options.filter((_, i) => i !== index),
      correctIndex: current.correctIndex === index ? 0 : current.correctIndex > index ? current.correctIndex - 1 : current.correctIndex,
      mapping: reindex(current.mapping),
      newMisconceptions: reindex(current.newMisconceptions),
    }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    const options = draft.options.map((option) => option.trim());
    // The same rules as AI-generated questions, including the duplicate check.
    validateQuestion(
      { concept: draft.conceptId, difficulty: draft.difficulty, question: draft.question, options, correctAnswer: options[draft.correctIndex] ?? '', misconceptionMap: {} },
      { curriculum, existing: questions, ignoreId: question?.id },
    ).forEach((issue) => {
      const field = issue.field === 'concept' ? 'conceptId' : issue.field === 'correctAnswer' ? 'options' : issue.field;
      next[field] ??= issue.message;
    });
    Object.entries(draft.mapping).forEach(([index, value]) => {
      if (value === NEW && Number(index) !== draft.correctIndex && !draft.newMisconceptions[Number(index)]?.title.trim()) {
        next[`mis-${index}`] = 'Name the misconception.';
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!validate() || !concept) return;
    const options = draft.options.map((option) => option.trim());
    const created: Misconception[] = [];
    const misconceptionMap: Record<string, string> = {};
    options.forEach((option, index) => {
      if (index === draft.correctIndex) return;
      const value = draft.mapping[index];
      if (value === NEW) {
        const entry = draft.newMisconceptions[index];
        const id = `custom-${slugify(entry.title)}-${createId('m').slice(-4)}`;
        created.push({
          id,
          subject: concept.subject,
          title: entry.title.trim(),
          description: entry.explanation.trim() || entry.title.trim(),
          explanation: entry.explanation.trim() || `This answer suggests: ${entry.title.trim()}.`,
          remedy: 'Re-read the worked solution, then try a similar question.',
        });
        misconceptionMap[option] = id;
      } else if (value) {
        misconceptionMap[option] = value;
      }
    });

    actions.saveMisconceptions(created);
    actions.saveQuestions([{
      id: question?.id ?? `q-${slugify(concept.name)}-${createId('q').slice(-6)}`,
      concept: concept.id,
      difficulty: draft.difficulty,
      learningObjective: question?.learningObjective || concept.learningObjective,
      question: draft.question.trim(),
      options,
      correctAnswer: options[draft.correctIndex],
      hint: draft.hint.trim(),
      solutionSteps: draft.solution.trim(),
      misconceptionMap,
      origin: question?.origin ?? 'manual',
      createdAt: question?.createdAt ?? new Date().toISOString(),
    }]);
    toast({ title: question ? 'Question updated' : 'Question added', description: `${concept.name} · ${DIFFICULTY_LABEL[draft.difficulty]}` });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={question ? 'Edit question' : 'Write a question'}
      description="Link each wrong option to the misconception it reveals. That's what lets GapLearning explain why an answer is wrong."
      footer={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="question-form">{question ? 'Save changes' : 'Add question'}</Button>
        </>
      )}
    >
      <form id="question-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Field label="Topic" error={errors.conceptId}>
            {(control) => (
              <Select {...control} value={draft.conceptId} onChange={(event) => setDraft((current) => ({ ...current, conceptId: event.target.value, mapping: {}, newMisconceptions: {} }))}>
                {curriculum.subjects.map((subject) => (
                  <optgroup key={subject.id} label={subject.name}>
                    {curriculum.conceptsBySubject(subject.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </optgroup>
                ))}
              </Select>
            )}
          </Field>
          <div className="space-y-1.5">
            <p className="text-[13px] font-medium">Difficulty</p>
            <SegmentedControl label="Difficulty" value={draft.difficulty} onChange={(value) => set('difficulty', value)} options={DIFFICULTIES.map((item) => ({ value: item, label: DIFFICULTY_LABEL[item] }))} />
          </div>
        </div>

        <Field label="Question" error={errors.question}>
          {(control) => <Textarea {...control} rows={2} value={draft.question} onChange={(event) => set('question', event.target.value)} maxLength={500} placeholder="e.g. What is 3/4 of 20?" />}
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-[13px] font-medium">Options <span className="font-normal text-fg-3">· select the correct one</span></legend>
          {errors.options && <p className="text-xs text-danger">{errors.options}</p>}
          {draft.options.map((option, index) => {
            const isCorrect = draft.correctIndex === index;
            const mapping = draft.mapping[index] ?? '';
            return (
              <div key={index} className={cn('rounded-lg border p-3', isCorrect ? 'border-success/50 bg-success-soft' : 'border-border')}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={isCorrect}
                    onChange={() => set('correctIndex', index)}
                    className="size-4 shrink-0 accent-[var(--success)]"
                    aria-label={`Option ${index + 1} is correct`}
                  />
                  <Input value={option} onChange={(event) => setOption(index, event.target.value)} maxLength={200} placeholder={`Option ${index + 1}`} aria-label={`Option ${index + 1}`} />
                  <Button variant="ghost" size="icon-sm" onClick={() => removeOption(index)} disabled={draft.options.length <= 2} aria-label={`Remove option ${index + 1}`}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {!isCorrect && (
                  <div className="mt-2 space-y-2 pl-6">
                    <Select
                      value={mapping}
                      onChange={(event) => setDraft((current) => ({ ...current, mapping: { ...current.mapping, [index]: event.target.value } }))}
                      aria-label={`Misconception behind option ${index + 1}`}
                    >
                      <option value="">No specific misconception</option>
                      {catalog.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                      <option value={NEW}>New misconception…</option>
                    </Select>
                    {mapping === NEW && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          value={draft.newMisconceptions[index]?.title ?? ''}
                          onChange={(event) => setDraft((current) => ({ ...current, newMisconceptions: { ...current.newMisconceptions, [index]: { title: event.target.value, explanation: current.newMisconceptions[index]?.explanation ?? '' } } }))}
                          placeholder="Name, e.g. Forgot to carry"
                          maxLength={80}
                          aria-label="Misconception name"
                          aria-invalid={errors[`mis-${index}`] ? true : undefined}
                        />
                        <Input
                          value={draft.newMisconceptions[index]?.explanation ?? ''}
                          onChange={(event) => setDraft((current) => ({ ...current, newMisconceptions: { ...current.newMisconceptions, [index]: { title: current.newMisconceptions[index]?.title ?? '', explanation: event.target.value } } }))}
                          placeholder="Feedback, e.g. You didn't carry the ten."
                          maxLength={300}
                          aria-label="Feedback shown for this mistake"
                        />
                        {errors[`mis-${index}`] && <p className="text-xs text-danger sm:col-span-2">{errors[`mis-${index}`]}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {draft.options.length < 6 && (
            <Button variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={() => set('options', [...draft.options, ''])}>Add option</Button>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hint" optional>
            {(control) => <Textarea {...control} rows={2} value={draft.hint} onChange={(event) => set('hint', event.target.value)} maxLength={300} placeholder="A nudge that doesn't give it away" />}
          </Field>
          <Field label="Worked solution" optional>
            {(control) => <Textarea {...control} rows={2} value={draft.solution} onChange={(event) => set('solution', event.target.value)} maxLength={1000} placeholder="How to reach the answer" />}
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
