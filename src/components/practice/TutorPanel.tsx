import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Send, X } from 'lucide-react';
import type { Misconception, Question } from '../../adaptive';
import type { Concept } from '../../domain/types';
import { ApiError } from '../../services/api';
import { askTutor, offlineTutorReply, type ChatTurn } from '../../services/ai';
import { cn } from '../../utils/cn';
import { AiBadge, SystemBadge } from '../learning/provenance';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Textarea } from '../ui/Field';
import { Spinner } from '../ui/misc';

interface TutorPanelProps {
  concept: Concept;
  question: Question;
  selectedAnswer: string;
  misconception: Misconception | null;
  reasoning: string;
  aiEnabled: boolean;
  onClose: () => void;
}

/**
 * Socratic tutor for a missed question. With AI configured on the server it holds a real
 * conversation; otherwise it walks through deterministic hints and says so.
 */
export function TutorPanel({ concept, question, selectedAnswer, misconception, reasoning, aiEnabled, onClose }: TutorPanelProps) {
  const [turns, setTurns] = useState<ChatTurn[]>([
    { role: 'tutor', text: `You chose “${selectedAnswer}”. Before looking at the answer, talk me through your first step. What did you do?` },
  ]);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);
  const offlineTurn = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const live = aiEnabled && !aiFailed;

  useEffect(() => {
    const request = controller;
    return () => request.current?.abort();
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, pending]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = message.trim();
    if (!text || pending) return;
    const history = turns;
    setTurns([...history, { role: 'learner', text }]);
    setMessage('');

    if (!live) {
      setTurns((current) => [...current, { role: 'tutor', text: offlineTutorReply(offlineTurn.current++, question, misconception) }]);
      return;
    }

    setPending(true);
    controller.current = new AbortController();
    try {
      const reply = await askTutor({
        concept: { name: concept.name, learningObjective: concept.learningObjective },
        question: { question: question.question, options: question.options, correctAnswer: question.correctAnswer },
        selectedAnswer,
        misconception: misconception && misconception.id !== 'unknown' ? { title: misconception.title, explanation: misconception.explanation } : null,
        reasoning,
        history: history.slice(-12),
        message: text,
      }, controller.current.signal);
      setTurns((current) => [...current, { role: 'tutor', text: reply }]);
    } catch (error) {
      if (controller.current?.signal.aborted) return;
      setAiFailed(true);
      const reason = error instanceof ApiError ? error.message : 'The AI tutor is unavailable.';
      setTurns((current) => [
        ...current,
        { role: 'tutor', text: `${reason} Switching to guided hints. ${offlineTutorReply(offlineTurn.current++, question, misconception)}` },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet open onClose={onClose} side="right" labelledBy="tutor-title">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id="tutor-title" className="flex items-center gap-2 text-base font-semibold">
              <Bot className="size-4 text-fg-3" aria-hidden />
              {live ? 'AI tutor' : 'Guided hints'}
            </h2>
            <p className="mt-0.5 text-[13px] text-fg-3">
              {live ? 'Asks questions to help you spot the error. It will not just give you the answer.' : 'Step-by-step prompts based on this question. Connect the AI service for a live conversation.'}
            </p>
            <div className="mt-2">{live ? <AiBadge label="Replies are AI-generated" /> : <SystemBadge label="Built-in hints, no AI" />}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg" aria-label="Close tutor">
            <X className="size-4" />
          </button>
        </div>

        <div ref={listRef} className="relative flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
          {turns.map((turn, index) => (
            <div
              key={index}
              className={cn(
                'max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6',
                turn.role === 'learner' ? 'ml-auto rounded-br-md bg-accent text-white' : 'rounded-bl-md bg-surface-2 text-fg',
              )}
            >
              <span className="sr-only">{turn.role === 'learner' ? 'You: ' : 'Tutor: '}</span>
              {turn.text}
            </div>
          ))}
          {pending && (
            <div className="flex items-center gap-2 text-[13px] text-fg-3">
              <Spinner label="Tutor is thinking" /> Thinking…
            </div>
          )}
        </div>

        <form onSubmit={send} className="flex items-end gap-2 border-t border-border p-4">
          <Textarea
            rows={2}
            value={message}
            maxLength={1000}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Explain your thinking…"
            aria-label="Message the tutor"
            data-autofocus
            className="min-h-0"
          />
          <Button type="submit" variant="primary" size="icon" disabled={!message.trim() || pending} aria-label="Send message">
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </Sheet>
  );
}
