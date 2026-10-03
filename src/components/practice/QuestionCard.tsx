import { useEffect, useId, useState } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';
import type { Question } from '../../adaptive';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Field';
import { Kbd } from '../ui/misc';

interface QuestionCardProps {
  question: Question;
  onSubmit: (answer: string, reasoning: string, hintUsed: boolean) => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** One question with keyboard shortcuts: 1–6 or A–F choose, H toggles the hint, Enter submits. */
export function QuestionCard({ question, onSubmit }: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [reasoning, setReasoning] = useState('');
  const groupId = useId();

  const toggleHint = () => {
    setShowHint((value) => !value);
    setHintUsed(true);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('textarea, input:not([type="radio"]), [contenteditable], dialog, [role="dialog"]')) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toUpperCase();
      const index = /^[1-6]$/.test(key) ? Number(key) - 1 : LETTERS.indexOf(key);
      if (index >= 0 && index < question.options.length) {
        event.preventDefault();
        setSelected(question.options[index]);
      } else if (key === 'H' && question.hint) {
        event.preventDefault();
        setShowHint((value) => !value);
        setHintUsed(true);
      } else if (event.key === 'Enter' && selected && !target.closest('button')) {
        event.preventDefault();
        onSubmit(selected, reasoning, hintUsed);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, selected, reasoning, hintUsed, onSubmit]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (selected) onSubmit(selected, reasoning, hintUsed);
      }}
    >
      <fieldset>
        <legend id={groupId} className="text-base font-medium leading-7 text-fg sm:text-[17px]">{question.question}</legend>
        <div className="mt-5 grid gap-2.5" role="radiogroup" aria-labelledby={groupId}>
          {question.options.map((option, index) => {
            const checked = selected === option;
            return (
              <label
                key={option}
                className={cn(
                  'group flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors',
                  checked ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:border-border-strong hover:bg-surface-2',
                )}
              >
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={checked}
                  onChange={() => setSelected(option)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold',
                    checked ? 'border-accent bg-accent text-white' : 'border-border bg-surface-2 text-fg-3',
                    'group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-[var(--ring)]',
                  )}
                  aria-hidden
                >
                  {LETTERS[index]}
                </span>
                <span className="text-fg">{option}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {showHint && question.hint && (
        <div className="animate-fade-in mt-4 flex gap-2.5 rounded-lg border border-border bg-surface-2 px-3.5 py-3 text-[13px] leading-5 text-fg-2" role="note">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p><span className="font-medium text-fg">Hint: </span>{question.hint}</p>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setReasoningOpen((value) => !value)}
          aria-expanded={reasoningOpen}
          className="flex items-start gap-1 text-left text-[13px] text-fg-2 hover:text-fg"
        >
          <ChevronDown className={cn('mt-0.5 size-4 shrink-0 transition-transform', reasoningOpen && 'rotate-180')} aria-hidden />
          <span>Explain your reasoning <span className="text-fg-3">(optional, helps the tutor)</span></span>
        </button>
        {reasoningOpen && (
          <Textarea
            className="mt-2"
            rows={3}
            value={reasoning}
            maxLength={1000}
            onChange={(event) => setReasoning(event.target.value)}
            placeholder="How did you work it out?"
            aria-label="Your reasoning"
          />
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="hidden items-center gap-3 text-xs text-fg-3 sm:flex">
          <span className="flex items-center gap-1"><Kbd>1</Kbd>–<Kbd>{question.options.length}</Kbd> choose</span>
          {question.hint && <span className="flex items-center gap-1"><Kbd>H</Kbd> hint</span>}
          <span className="flex items-center gap-1"><Kbd>Enter</Kbd> submit</span>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {question.hint && (
            <Button onClick={toggleHint} icon={<Lightbulb className="size-4" />} aria-pressed={showHint}>
              {showHint ? 'Hide hint' : 'Hint'}
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={!selected} className="flex-1 sm:flex-none">
            Check answer
          </Button>
        </div>
      </div>
    </form>
  );
}
