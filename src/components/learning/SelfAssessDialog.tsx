import { useState } from 'react';
import { useWorkspace } from '../../app/contexts';
import type { SelfRating } from '../../domain/types';
import { actions } from '../../store';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { useToast } from '../ui/feedback-context';
import { SubjectDot } from './badges';

const RATINGS: { value: SelfRating; label: string }[] = [
  { value: 1, label: 'No idea' },
  { value: 2, label: 'Shaky' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Solid' },
];

/**
 * Quick confidence ratings for every topic. Low ratings seed gaps before any practice, and later
 * comparisons with measured mastery surface over-confidence.
 */
export function SelfAssessDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { curriculum, data, subjectColor } = useWorkspace();
  const toast = useToast();
  const [ratings, setRatings] = useState<Record<string, SelfRating | undefined>>({});

  const current = (conceptId: string) => (conceptId in ratings ? ratings[conceptId] : data.topics[conceptId]?.selfRating?.value);
  const changed = Object.keys(ratings).length;

  const save = () => {
    Object.entries(ratings).forEach(([conceptId, value]) => actions.setSelfRating(conceptId, value ?? null));
    toast({ title: 'Confidence ratings saved', description: 'Low ratings now show up as gaps until you practice those topics.' });
    setRatings({});
    onClose();
  };

  const close = () => {
    setRatings({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      title="Rate your confidence"
      description="How well do you know each topic right now? Be honest: this is only a starting point, and practice results take over as evidence builds."
      footer={(
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={changed === 0}>
            {changed === 0 ? 'Save ratings' : `Save ${changed} ${changed === 1 ? 'rating' : 'ratings'}`}
          </Button>
        </>
      )}
    >
      <div className="space-y-6">
        {curriculum.subjects.map((subject) => {
          const concepts = curriculum.conceptsBySubject(subject.id);
          if (concepts.length === 0) return null;
          return (
            <section key={subject.id}>
              <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-fg">
                <SubjectDot color={subjectColor(subject.id)} />
                {subject.name}
              </h3>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {concepts.map((concept) => {
                  const value = current(concept.id);
                  return (
                    <li key={concept.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <span id={`rate-${concept.id}`} className="text-sm text-fg">{concept.name}</span>
                      <div role="radiogroup" aria-labelledby={`rate-${concept.id}`} className="flex gap-1">
                        {RATINGS.map((rating) => (
                          <button
                            key={rating.value}
                            type="button"
                            role="radio"
                            aria-checked={value === rating.value}
                            title={rating.label}
                            onClick={() => setRatings((previous) => ({ ...previous, [concept.id]: value === rating.value ? undefined : rating.value }))}
                            className={cn(
                              'h-7 min-w-9 rounded-md border px-2 text-xs font-medium transition-colors',
                              value === rating.value
                                ? 'border-accent bg-accent text-white'
                                : 'border-border bg-surface text-fg-2 hover:border-border-strong hover:text-fg',
                            )}
                          >
                            {rating.value}
                            <span className="sr-only"> – {rating.label}</span>
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <p className="text-xs text-fg-3">1 = no idea · 3 = okay · 5 = solid. Click a selected rating again to clear it.</p>
      </div>
    </Dialog>
  );
}
