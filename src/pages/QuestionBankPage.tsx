import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ListChecks, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useContent, useWorkspace } from '../app/contexts';
import { DIFFICULTIES, type Difficulty, type Question } from '../adaptive';
import { DifficultyBadge } from '../components/learning/badges';
import { DIFFICULTY_LABEL } from '../components/learning/labels';
import { AiBadge } from '../components/learning/provenance';
import { QuestionFormDialog } from '../components/questions/QuestionFormDialog';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import { useConfirm, useToast } from '../components/ui/feedback-context';
import { EmptyState, PageHeader } from '../components/ui/misc';
import { SegmentedControl } from '../components/ui/Tabs';
import { topicHref } from '../domain/recommendations';
import type { StoredQuestion } from '../domain/types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { actions } from '../store';
import { cn } from '../utils/cn';

type Source = 'all' | 'curated' | 'manual' | 'ai';
const PAGE_SIZE = 30;

function QuestionRow({ question, mine, onEdit }: { question: Question; mine?: StoredQuestion; onEdit: (question: StoredQuestion) => void }) {
  const { curriculum, data } = useWorkspace();
  const confirm = useConfirm();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const concept = curriculum.concept(question.concept);
  const answered = data.attempts.filter((attempt) => attempt.questionId === question.id).length;

  const remove = async () => {
    const ok = await confirm({
      title: 'Delete this question?',
      description: answered > 0 ? `You've answered it ${answered} ${answered === 1 ? 'time' : 'times'}. Those answers still count toward your mastery.` : 'This cannot be undone.',
      confirmLabel: 'Delete question',
      destructive: true,
    });
    if (!ok) return;
    actions.deleteQuestion(question.id);
    toast({ title: 'Question deleted' });
  };

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Hide options' : 'Show options'}
          className="mt-0.5 rounded p-0.5 text-fg-3 hover:bg-surface-2 hover:text-fg"
        >
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-fg">{question.question}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-fg-3">
            {concept && <Link to={topicHref(concept.id)} className="font-medium text-fg-2 hover:underline">{concept.name}</Link>}
            <DifficultyBadge difficulty={question.difficulty} />
            {mine?.origin === 'ai' ? <AiBadge /> : mine ? <Badge tone="accent">Yours</Badge> : <Badge>Curated</Badge>}
            {answered > 0 && <span>Answered {answered}×</span>}
          </div>
          {open && (
            <div className="animate-fade-in mt-3 space-y-1.5">
              {question.options.map((option) => {
                const misconception = question.misconceptionMap[option] ? curriculum.misconception(question.misconceptionMap[option]) : undefined;
                const correct = option === question.correctAnswer;
                return (
                  <p key={option} className="flex items-start gap-2 text-[13px]">
                    {correct
                      ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-label="Correct answer" />
                      : <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-fg-3" aria-hidden />}
                    <span className={correct ? 'font-medium text-fg' : 'text-fg-2'}>
                      {option}
                      {misconception && <span className="font-normal text-fg-3"> · catches {misconception.title}</span>}
                    </span>
                  </p>
                );
              })}
              {question.hint && <p className="pt-1 text-xs text-fg-3">Hint: {question.hint}</p>}
            </div>
          )}
        </div>
        {mine && (
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Edit question" onClick={() => onEdit(mine)}><Pencil className="size-4" /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Delete question" onClick={remove}><Trash2 className="size-4" /></Button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function QuestionBankPage() {
  const { questions, curriculum, data } = useWorkspace();
  const content = useContent();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [source, setSource] = useState<Source>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [dialog, setDialog] = useState<{ question?: StoredQuestion } | null>(null);
  useDocumentTitle('Question bank');

  const conceptId = params.get('concept') ?? 'all';
  const setConcept = (value: string) => {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete('concept');
    else next.set('concept', value);
    setParams(next, { replace: true });
  };

  const mine = new Map(data.customQuestions.map((question) => [question.id, question]));
  const curatedCount = questions.filter((question) => !mine.has(question.id)).length;
  const needle = query.trim().toLowerCase();

  const filtered = questions.filter((question) => {
    const concept = curriculum.concept(question.concept);
    if (!concept) return false;
    if (conceptId !== 'all' && question.concept !== conceptId) return false;
    if (conceptId === 'all' && subjectId !== 'all' && concept.subject !== subjectId) return false;
    if (difficulty !== 'all' && question.difficulty !== difficulty) return false;
    const own = mine.get(question.id);
    if (source === 'curated' && own) return false;
    if (source === 'manual' && own?.origin !== 'manual') return false;
    if (source === 'ai' && own?.origin !== 'ai') return false;
    if (needle && ![question.question, ...question.options, concept.name].some((text) => text.toLowerCase().includes(needle))) return false;
    return true;
  });

  const topicOptions = curriculum.concepts.filter((concept) => subjectId === 'all' || concept.subject === subjectId);
  const filtersActive = needle !== '' || subjectId !== 'all' || conceptId !== 'all' || difficulty !== 'all' || source !== 'all';

  return (
    <>
      <PageHeader
        title="Question bank"
        description={(
          <>
            {curatedCount} curated questions {content.status === 'online' ? 'from the server' : 'bundled with the app'} and {data.customQuestions.length} of your own.
            Every wrong option can be tagged with the misconception it reveals.
          </>
        )}
        actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setDialog({})}>Write a question</Button>}
      />

      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-3" aria-hidden />
          <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions" aria-label="Search questions" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Select className="w-40" value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setConcept('all'); }} aria-label="Subject">
            <option value="all">All subjects</option>
            {curriculum.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </Select>
          <Select className="w-52" value={conceptId} onChange={(event) => setConcept(event.target.value)} aria-label="Topic">
            <option value="all">All topics</option>
            {topicOptions.map((concept) => <option key={concept.id} value={concept.id}>{concept.name}</option>)}
          </Select>
          <Select className="w-36" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty | 'all')} aria-label="Difficulty">
            <option value="all">Any difficulty</option>
            {DIFFICULTIES.map((item) => <option key={item} value={item}>{DIFFICULTY_LABEL[item]}</option>)}
          </Select>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Source"
          value={source}
          onChange={setSource}
          options={[{ value: 'all', label: 'All' }, { value: 'curated', label: 'Curated' }, { value: 'manual', label: 'Written by you' }, { value: 'ai', label: 'AI-generated' }]}
        />
        <p className="tabular text-[13px] text-fg-3">{filtered.length} {filtered.length === 1 ? 'question' : 'questions'}</p>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListChecks />}
            title={source === 'manual' || source === 'ai' ? 'No questions of your own here yet' : 'No questions match'}
            description={filtersActive ? 'Try different filters, or write a question for this topic.' : 'Write your first question.'}
            action={(
              <>
                {filtersActive && (
                  <Button icon={<X className="size-4" />} onClick={() => { setQuery(''); setSubjectId('all'); setConcept('all'); setDifficulty('all'); setSource('all'); }}>
                    Clear filters
                  </Button>
                )}
                <Button variant="primary" onClick={() => setDialog({})}>Write a question</Button>
              </>
            )}
          />
        </Card>
      ) : (
        <>
          <Card>
            <ul className="divide-y divide-border">
              {filtered.slice(0, visible).map((question) => (
                <QuestionRow key={question.id} question={question} mine={mine.get(question.id)} onEdit={(item) => setDialog({ question: item })} />
              ))}
            </ul>
          </Card>
          {visible < filtered.length && (
            <Button variant="ghost" className="mt-3" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
              Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
            </Button>
          )}
        </>
      )}

      <QuestionFormDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        question={dialog?.question}
        defaultConceptId={conceptId !== 'all' ? conceptId : undefined}
      />
    </>
  );
}
