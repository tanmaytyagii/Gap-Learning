import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, MessageCircleQuestion, XCircle } from 'lucide-react';
import type { DiagnosticResult, Question, QuestionRecommendation } from '../../adaptive';
import type { Curriculum } from '../../domain/curriculum';
import { topicHref } from '../../domain/recommendations';
import type { Concept } from '../../domain/types';
import { cn } from '../../utils/cn';
import { SystemBadge } from '../learning/provenance';
import { Button } from '../ui/Button';
import { Kbd } from '../ui/misc';
import { RichText } from '../ui/RichText';

interface FeedbackPanelProps {
  question: Question;
  concept: Concept;
  selectedAnswer: string;
  diagnostic: DiagnosticResult;
  next: QuestionRecommendation | null;
  isLast: boolean;
  curriculum: Curriculum;
  onNext: () => void;
  onAskTutor: () => void;
}

/** The first sentence of the lesson summary: the one idea to hold on to after a mistake. */
function keyIdea(concept: Concept): string | null {
  if (concept.lesson) return concept.lesson.summary.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? concept.lesson.summary;
  return concept.learningObjective ? `Goal: ${concept.learningObjective}` : null;
}

/**
 * Feedback in a fixed order, from most to least essential: verdict, why, the key idea, the worked
 * solution (collapsed), and the engine's next step. Nothing beyond the verdict is required reading.
 */
export function FeedbackPanel({ question, concept, selectedAnswer, diagnostic, next, isLast, curriculum, onNext, onAskTutor }: FeedbackPanelProps) {
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    nextRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || (event.target as HTMLElement).closest('textarea, input, button, a, summary, dialog, [role="dialog"]')) return;
      event.preventDefault();
      onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext]);

  const correct = diagnostic.isCorrect;
  const reviewConcepts = diagnostic.reviewConceptIds.map((id) => curriculum.concept(id)).filter((item) => item !== undefined);
  const idea = correct ? null : keyIdea(concept);

  return (
    <div className="animate-fade-in">
      <p className="text-base font-medium leading-7 text-fg sm:text-[17px]">{question.question}</p>
      <ul className="mt-5 grid gap-2" aria-label="Answer options">
        {question.options.map((option) => {
          const isAnswer = option === question.correctAnswer;
          const isChosen = option === selectedAnswer;
          return (
            <li
              key={option}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm',
                isAnswer ? 'border-success bg-success-soft' : isChosen ? 'border-danger bg-danger-soft' : 'border-border text-fg-3',
              )}
            >
              {isAnswer ? <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden /> : isChosen ? <XCircle className="size-4 shrink-0 text-danger" aria-hidden /> : <span className="size-4 shrink-0" />}
              <span className={cn(isAnswer || isChosen ? 'text-fg' : undefined)}>{option}</span>
              {isAnswer && <span className="ml-auto text-xs font-medium text-success">Correct answer</span>}
              {isChosen && !isAnswer && <span className="ml-auto text-xs font-medium text-danger">Your answer</span>}
            </li>
          );
        })}
      </ul>

      {/* 1–2. Verdict and why. */}
      <div role="status" className={cn('mt-5 rounded-lg border px-4 py-3.5', correct ? 'border-success/30 bg-success-soft' : 'border-danger/30 bg-danger-soft')}>
        <p className={cn('flex items-center gap-2 text-sm font-semibold', correct ? 'text-success' : 'text-danger')}>
          {correct ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
          {correct ? 'Correct' : 'Not quite'}
        </p>
        {!correct && diagnostic.misconceptionTitle && (
          <p className="mt-1.5 text-[13px] text-fg-2">Misconception: <span className="font-medium text-fg">{diagnostic.misconceptionTitle}</span></p>
        )}
        <p className="mt-1.5 text-sm leading-6 text-fg">{diagnostic.explanation}</p>
        {!correct && diagnostic.remedy && (
          <p className="mt-2 text-[13px] leading-5 text-fg-2"><span className="font-medium text-fg">Try this: </span>{diagnostic.remedy}</p>
        )}
      </div>

      {/* 3. The concept, in one sentence. */}
      {idea && (
        <div className="mt-3 flex gap-2.5 rounded-lg border border-border px-4 py-3 text-[13px] leading-5">
          <BookOpen className="mt-0.5 size-4 shrink-0 text-fg-3" aria-hidden />
          <p className="text-fg-2">
            <span className="font-medium text-fg">Key idea: </span>{idea}{' '}
            {concept.lesson && (
              <Link to={topicHref(concept.id)} target="_blank" rel="noopener" className="whitespace-nowrap font-medium text-accent-fg hover:underline">
                Full lesson<span className="sr-only"> (opens in a new tab)</span>
              </Link>
            )}
          </p>
        </div>
      )}

      {/* 4. Detail on demand. */}
      {question.solutionSteps && (
        <details className="mt-3 rounded-lg border border-border px-4 py-3">
          <summary className="text-[13px] font-medium text-fg marker:text-fg-3">Worked solution</summary>
          <RichText text={question.solutionSteps} className="mt-2" />
        </details>
      )}

      {/* 5. What happens next, decided by the engine. */}
      <div className="mt-4 flex flex-wrap items-start gap-x-2 gap-y-1.5 text-[13px] leading-5 text-fg-2">
        <SystemBadge label="Next step" />
        <p className="min-w-0 flex-1">
          {isLast ? 'That was the last question. Your results show what changed.' : next?.reason}
          {!correct && reviewConcepts.length > 0 && (
            <> If this keeps happening, revisit{' '}
              {reviewConcepts.map((item, index) => (
                <span key={item.id}>
                  {index > 0 && (index === reviewConcepts.length - 1 ? ' and ' : ', ')}
                  <Link to={topicHref(item.id)} className="font-medium text-accent-fg hover:underline">{item.name}</Link>
                </span>
              ))}.
            </>
          )}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div>
          {!correct && (
            <Button onClick={onAskTutor} icon={<MessageCircleQuestion className="size-4" />}>Work through it with the tutor</Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1 text-xs text-fg-3 sm:flex"><Kbd>Enter</Kbd> continue</span>
          <Button ref={nextRef} variant="primary" onClick={onNext} icon={<ArrowRight className="size-4" />}>
            {isLast ? 'See results' : 'Next question'}
          </Button>
        </div>
      </div>
    </div>
  );
}
