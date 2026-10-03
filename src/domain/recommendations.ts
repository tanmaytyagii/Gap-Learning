import type { Curriculum } from './curriculum';
import type { Gap } from './gaps';
import type { ConceptStats } from './mastery';
import type { ReviewState } from './review';
import type { ResolvedStatus } from './status';

export type ActionKind = 'review' | 'practice-gap' | 'study-gap' | 'start' | 'diagnostic';

export interface NextAction {
  id: string;
  kind: ActionKind;
  title: string;
  detail: string;
  href: string;
  cta: string;
  conceptId?: string;
}

export interface RecommendationInput {
  curriculum: Curriculum;
  stats: Map<string, ConceptStats>;
  statuses: Map<string, ResolvedStatus>;
  gaps: Gap[];
  dueReviews: ReviewState[];
  questionCount: (conceptId: string) => number;
}

export const practiceHref = (conceptId: string) => `/app/practice/session?mode=practice&concept=${encodeURIComponent(conceptId)}`;
export const diagnosticHref = (subjectId: string) => `/app/practice/session?mode=diagnostic&subject=${encodeURIComponent(subjectId)}`;
export const reviewHref = '/app/practice/session?mode=review';
export const topicHref = (conceptId: string) => `/app/topics/${encodeURIComponent(conceptId)}`;

/**
 * Ranked next steps: due reviews first (forgetting is cheapest to fix early), then the most
 * severe gaps whose foundations are sound, then the next unlocked topic in each subject.
 */
export function nextActions(input: RecommendationInput, limit = 4): NextAction[] {
  const { curriculum, stats, statuses, gaps, dueReviews } = input;
  const actions: NextAction[] = [];
  const name = (id: string) => curriculum.concept(id)?.name ?? id;

  if (dueReviews.length > 0) {
    const names = dueReviews.slice(0, 3).map((review) => name(review.conceptId));
    const more = dueReviews.length > 3 ? ` and ${dueReviews.length - 3} more` : '';
    actions.push({
      id: 'review',
      kind: 'review',
      title: `Review ${dueReviews.length} ${dueReviews.length === 1 ? 'topic' : 'topics'} due`,
      detail: `${names.join(', ')}${more}. Short reviews at the right time keep what you've learned.`,
      href: reviewHref,
      cta: 'Start review',
    });
  }

  gaps.filter((gap) => gap.foundational).slice(0, 2).forEach((gap) => {
    const concept = curriculum.concept(gap.conceptId);
    if (!concept) return;
    const lead = gap.reasons[0]?.label ?? 'Needs attention';
    const canPractice = input.questionCount(gap.conceptId) > 0;
    const needsLesson = (gap.mastery ?? 0) < 35 && concept.lesson !== null;
    if (canPractice && !needsLesson) {
      actions.push({
        id: `gap-${gap.conceptId}`,
        kind: 'practice-gap',
        title: `Practice ${concept.name}`,
        detail: `${lead}. Fixing this first unblocks ${gap.blocks.length} ${gap.blocks.length === 1 ? 'topic' : 'topics'}.`,
        href: practiceHref(gap.conceptId),
        cta: 'Practice',
        conceptId: gap.conceptId,
      });
    } else {
      actions.push({
        id: `gap-${gap.conceptId}`,
        kind: 'study-gap',
        title: `Study ${concept.name}`,
        detail: `${lead}. Read the lesson and your notes before practicing again.`,
        href: topicHref(gap.conceptId),
        cta: 'Open topic',
        conceptId: gap.conceptId,
      });
    }
  });

  const hasAnyEvidence = stats.size > 0;
  curriculum.subjects.forEach((subject) => {
    const concepts = curriculum.conceptsBySubject(subject.id);
    const subjectStarted = concepts.some((concept) => stats.has(concept.id));
    if (!subjectStarted) {
      if (!hasAnyEvidence && concepts.some((concept) => input.questionCount(concept.id) > 0)) {
        actions.push({
          id: `diagnostic-${subject.id}`,
          kind: 'diagnostic',
          title: `Take the ${subject.name} diagnostic`,
          detail: 'An adaptive check that follows your answers through the topic graph and maps your gaps.',
          href: diagnosticHref(subject.id),
          cta: 'Start diagnostic',
        });
      }
      return;
    }
    const next = concepts.find((concept) =>
      statuses.get(concept.id)?.status === 'not_started'
      && input.questionCount(concept.id) > 0
      && concept.prerequisites.every((id) => ['practicing', 'mastered'].includes(statuses.get(id)?.status ?? '')),
    );
    if (next) {
      actions.push({
        id: `start-${next.id}`,
        kind: 'start',
        title: `Start ${next.name}`,
        detail: next.prerequisites.length > 0
          ? `Its prerequisites are in place: ${next.prerequisites.map(name).join(', ')}.`
          : `A good starting point in ${subject.name}.`,
        href: practiceHref(next.id),
        cta: 'Start',
        conceptId: next.id,
      });
    }
  });

  return actions.slice(0, limit);
}
