import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { useWorkspace } from '../../app/contexts';
import { DIFFICULTIES, type Difficulty, type Misconception } from '../../adaptive';
import type { Concept, StoredQuestion } from '../../domain/types';
import { ApiError } from '../../services/api';
import { generateQuestions, type GeneratedQuestion } from '../../services/ai';
import { actions } from '../../store';
import { createId, slugify } from '../../utils/id';
import { DIFFICULTY_LABEL } from '../learning/labels';
import { AiBadge } from '../learning/provenance';
import { normalizeQuestionText, validateQuestion } from '../../domain/questionValidation';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Select, Textarea } from '../ui/Field';
import { useToast } from '../ui/feedback-context';
import { Spinner } from '../ui/misc';
import { SegmentedControl } from '../ui/Tabs';

type Source = 'topic' | 'notes' | 'text';

interface GenerateQuestionsDialogProps {
  open: boolean;
  onClose: () => void;
  concept: Concept;
  initialSource?: Source;
}

export function GenerateQuestionsDialog(props: GenerateQuestionsDialogProps) {
  if (!props.open) return null;
  return <GenerateForm {...props} />;
}

function GenerateForm({ open, onClose, concept, initialSource = 'topic' }: GenerateQuestionsDialogProps) {
  const { data, curriculum, questions: bank } = useWorkspace();
  const toast = useToast();
  const notes = data.notes.filter((note) => note.conceptId === concept.id).map((note) => note.body).join('\n\n');
  const [source, setSource] = useState<Source>(initialSource === 'notes' && !notes ? 'topic' : initialSource);
  const [text, setText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(concept.difficulty);
  const [count, setCount] = useState('3');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [results, setResults] = useState<GeneratedQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const controller = useRef<AbortController | null>(null);

  // Generated questions pass the same validation as hand-written ones before they can be saved,
  // including a duplicate check against the existing bank and against each other.
  const problems = useMemo(() => results.map((item, index) => {
    const issues = validateQuestion(
      { concept: concept.id, difficulty: item.difficulty, question: item.question, options: item.options, correctAnswer: item.correctAnswer, misconceptionMap: {} },
      { curriculum, existing: bank },
    ).map((issue) => issue.message);
    const earlier = results.slice(0, index).some((other) => normalizeQuestionText(other.question) === normalizeQuestionText(item.question));
    if (earlier) issues.push('Same wording as another generated question.');
    if (item.distractors.some((distractor) => !item.options.includes(distractor.option) || distractor.option === item.correctAnswer)) {
      issues.push('A misconception is attached to an option that is not a wrong answer.');
    }
    return issues;
  }), [results, concept.id, curriculum, bank]);
  const valid = (index: number) => problems[index]?.length === 0;

  const sourceText = source === 'notes' ? notes : source === 'text' ? text.trim() : '';
  const canGenerate = source === 'topic' || sourceText.length >= 40;

  const run = async () => {
    setStatus('loading');
    setError('');
    controller.current = new AbortController();
    try {
      const questions = await generateQuestions({
        concept: {
          name: concept.name,
          subject: curriculum.subject(concept.subject)?.name ?? '',
          description: concept.description,
          learningObjective: concept.learningObjective,
        },
        count: Number(count),
        difficulty,
        sourceText: sourceText.slice(0, 6000),
      }, controller.current.signal);
      setResults(questions);
      setSelected(new Set(questions.map((_, index) => index)));
      setStatus('done');
    } catch (caught) {
      if (controller.current?.signal.aborted) return;
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong while generating questions.');
      setStatus('error');
    }
  };

  const cancel = () => {
    controller.current?.abort();
    onClose();
  };

  const save = () => {
    const now = new Date().toISOString();
    const existing = new Map(curriculum.misconceptions.map((item) => [item.title.toLowerCase(), item.id]));
    const created: Misconception[] = [];
    const questions: StoredQuestion[] = results.filter((_, index) => selected.has(index) && valid(index)).map((item) => {
      const misconceptionMap: Record<string, string> = {};
      item.distractors.forEach(({ option, misconception }) => {
        const key = misconception.title.toLowerCase();
        let id = existing.get(key);
        if (!id) {
          id = `custom-${slugify(misconception.title)}-${createId('m').slice(-4)}`;
          existing.set(key, id);
          created.push({
            id,
            subject: concept.subject,
            title: misconception.title,
            description: misconception.explanation,
            explanation: misconception.explanation,
            remedy: 'Re-read the worked solution, then try a similar question.',
          });
        }
        misconceptionMap[option] = id;
      });
      return {
        id: `q-${slugify(concept.name)}-${createId('ai').slice(-6)}`,
        concept: concept.id,
        difficulty: item.difficulty,
        learningObjective: concept.learningObjective,
        question: item.question,
        options: item.options,
        correctAnswer: item.correctAnswer,
        hint: item.hint,
        solutionSteps: item.solutionSteps,
        misconceptionMap,
        origin: 'ai',
        createdAt: now,
      };
    });
    actions.saveMisconceptions(created);
    actions.saveQuestions(questions);
    toast({ title: `${questions.length} ${questions.length === 1 ? 'question' : 'questions'} added`, description: `They're now part of ${concept.name} practice.` });
    onClose();
  };

  const selectedValid = results.filter((_, index) => selected.has(index) && valid(index)).length;

  const toggle = (index: number) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    return next;
  });

  return (
    <Dialog
      open={open}
      onClose={cancel}
      size="lg"
      title={<span className="flex flex-wrap items-center gap-2">Generate questions · {concept.name} <AiBadge /></span>}
      description="AI drafts multiple-choice questions whose wrong options each reflect a specific misconception. Review them before adding: AI can make mistakes."
      footer={status === 'done' ? (
        <>
          <Button onClick={() => setStatus('idle')}>Start over</Button>
          <Button variant="primary" onClick={save} disabled={selectedValid === 0}>
            Add {selectedValid} {selectedValid === 1 ? 'question' : 'questions'}
          </Button>
        </>
      ) : (
        <>
          <Button onClick={cancel}>Cancel</Button>
          <Button variant="primary" onClick={run} loading={status === 'loading'} disabled={!canGenerate} icon={<Sparkles className="size-4" />}>
            {status === 'loading' ? 'Generating…' : 'Generate'}
          </Button>
        </>
      )}
    >
      {status === 'done' ? (
        <ul className="space-y-3">
          {results.map((item, index) => (
            <li key={index} className="rounded-lg border border-border p-3.5">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-[var(--accent-solid)] disabled:opacity-40"
                  checked={selected.has(index) && valid(index)}
                  disabled={!valid(index)}
                  onChange={() => toggle(index)}
                  aria-describedby={valid(index) ? undefined : `generated-problem-${index}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">{item.question}</span>
                  <span className="mt-2 grid gap-1 text-[13px]">
                    {item.options.map((option) => {
                      const distractor = item.distractors.find((entry) => entry.option === option);
                      return (
                        <span key={option} className="flex items-start gap-2">
                          {option === item.correctAnswer
                            ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-label="Correct answer" />
                            : <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-fg-3" aria-hidden />}
                          <span className={option === item.correctAnswer ? 'text-fg' : 'text-fg-2'}>
                            {option}
                            {distractor && <span className="text-fg-3"> · {distractor.misconception.title}</span>}
                          </span>
                        </span>
                      );
                    })}
                  </span>
                  {item.solutionSteps && <span className="mt-2 block text-xs leading-5 text-fg-3">Solution: {item.solutionSteps}</span>}
                  {!valid(index) && (
                    <span id={`generated-problem-${index}`} className="mt-2 block text-xs font-medium text-danger">
                      Can't be added: {problems[index].join(' ')}
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-[13px] font-medium">Base questions on</p>
            <SegmentedControl
              label="Question source"
              value={source}
              onChange={setSource}
              options={[
                { value: 'topic', label: 'Topic description' },
                ...(notes ? [{ value: 'notes' as const, label: 'My notes' }] : []),
                { value: 'text', label: 'Pasted text' },
              ]}
            />
          </div>
          {source === 'notes' && (
            <p className="relative max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-surface-2 px-3 py-2 text-[13px] leading-5 text-fg-2">{notes}</p>
          )}
          {source === 'text' && (
            <div className="space-y-1.5">
              <Textarea rows={6} value={text} onChange={(event) => setText(event.target.value)} maxLength={6000} placeholder="Paste study material: textbook paragraphs, lecture notes, an article…" aria-label="Source text" />
              <p className="text-xs text-fg-3">{text.trim().length < 40 ? 'Paste at least 40 characters.' : `${text.trim().length} / 6000 characters`}</p>
            </div>
          )}
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium">Difficulty</p>
              <SegmentedControl label="Difficulty" value={difficulty} onChange={setDifficulty} options={DIFFICULTIES.map((item) => ({ value: item, label: DIFFICULTY_LABEL[item] }))} />
            </div>
            <label className="space-y-1.5 text-[13px] font-medium">
              <span className="block">How many</span>
              <Select className="w-20" value={count} onChange={(event) => setCount(event.target.value)}>
                {['1', '2', '3', '4', '5'].map((value) => <option key={value} value={value}>{value}</option>)}
              </Select>
            </label>
          </div>
          {status === 'loading' && <p className="flex items-center gap-2 text-[13px] text-fg-3"><Spinner /> Writing questions. This can take up to a minute.</p>}
          {status === 'error' && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />{error}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
