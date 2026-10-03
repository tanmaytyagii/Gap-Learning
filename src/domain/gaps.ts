import type { KnowledgeGraph } from '../adaptive';
import type { ConceptStats, MisconceptionCount } from './mastery';
import type { ResolvedStatus } from './status';
import type { Priority, TopicOverlay } from './types';

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';

export type GapReasonKind = 'mastery' | 'misconception' | 'self-rating' | 'overconfidence' | 'prerequisite' | 'impact' | 'priority';

/**
 * Triggers are the conditions that make a topic a gap at all; modifiers only change how urgent an
 * existing gap is. Keeping them apart is what lets the UI say both "why is this a gap?" and
 * "why is it ranked here?".
 */
export type GapReasonRole = 'trigger' | 'modifier';

export interface GapReason {
  kind: GapReasonKind;
  role: GapReasonRole;
  label: string;
  points: number;
}

export interface Gap {
  conceptId: string;
  score: number;
  severity: GapSeverity;
  mastery: number | null;
  attempts: number;
  reasons: GapReason[];
  misconceptions: MisconceptionCount[];
  /** Not-yet-mastered concepts that depend on this one, directly or indirectly. */
  blocks: string[];
  /** True when none of this concept's prerequisites is itself a gap: fix these first. */
  foundational: boolean;
}

/** Below this mastery a practiced topic counts as a gap. */
export const GAP_MASTERY_THRESHOLD = 70;
/** Topics with a recurring misconception stay flagged until mastery clears this bar. */
export const MISCONCEPTION_CLEAR_THRESHOLD = 85;

const PRIORITY_POINTS: Record<Priority, number> = { low: -10, normal: 0, high: 15 };

/** Lower bound of each severity band, highest first. */
export const SEVERITY_BANDS: readonly { severity: GapSeverity; min: number }[] = [
  { severity: 'critical', min: 65 },
  { severity: 'high', min: 45 },
  { severity: 'medium', min: 25 },
  { severity: 'low', min: 0 },
];

export function severityFor(score: number): GapSeverity {
  if (score >= 65) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

export interface GapInput {
  graph: KnowledgeGraph;
  stats: Map<string, ConceptStats>;
  overlays: Record<string, TopicOverlay>;
  statuses: Map<string, ResolvedStatus>;
  conceptName: (id: string) => string;
  misconceptionTitle: (id: string) => string;
}

/**
 * Scores every concept for how urgently it needs work. Each contribution is kept as a labeled
 * reason so the UI can show exactly why a gap is ranked where it is.
 */
export function detectGaps(input: GapInput): Gap[] {
  const { graph, stats, overlays, statuses } = input;
  const gaps: Gap[] = [];

  graph.all().forEach((concept) => {
    const conceptStats = stats.get(concept.id);
    const overlay = overlays[concept.id];
    const reasons: GapReason[] = [];
    let isGap = false;

    if (conceptStats && conceptStats.mastery < GAP_MASTERY_THRESHOLD) {
      isGap = true;
      reasons.push({
        kind: 'mastery',
        role: 'trigger',
        label: `Mastery is ${conceptStats.mastery}% after ${conceptStats.attempts} ${conceptStats.attempts === 1 ? 'answer' : 'answers'}`,
        points: Math.round(((GAP_MASTERY_THRESHOLD - conceptStats.mastery) / GAP_MASTERY_THRESHOLD) * 45) + 10,
      });
    }

    if (conceptStats && conceptStats.recurringMisconceptions.length > 0 && conceptStats.mastery < MISCONCEPTION_CLEAR_THRESHOLD) {
      isGap = true;
      const titles = conceptStats.recurringMisconceptions.map(input.misconceptionTitle);
      reasons.push({ kind: 'misconception', role: 'trigger', label: `Repeated misconception: ${titles.join(', ')}`, points: 10 });
    }

    const rating = overlay?.selfRating?.value;
    if (rating !== undefined && rating <= 2 && (!conceptStats || conceptStats.attempts < 3)) {
      isGap = true;
      reasons.push({ kind: 'self-rating', role: 'trigger', label: `You rated your confidence ${rating}/5`, points: rating === 1 ? 35 : 25 });
    }
    if (rating !== undefined && rating >= 4 && conceptStats && conceptStats.attempts >= 2 && conceptStats.mastery < 60) {
      reasons.push({ kind: 'overconfidence', role: 'modifier', label: `Rated ${rating}/5, but measured mastery is ${conceptStats.mastery}%`, points: 10 });
    }

    if (!conceptStats) {
      const strugglingDependents = graph.successors(concept.id)
        .filter((dependent) => (stats.get(dependent.id)?.mastery ?? 100) < 50);
      if (strugglingDependents.length > 0) {
        isGap = true;
        reasons.push({
          kind: 'prerequisite',
          role: 'trigger',
          label: `Untested prerequisite of ${strugglingDependents.map((item) => input.conceptName(item.id)).join(', ')}`,
          points: 20,
        });
      }
    }

    if (!isGap) return;

    const blocks = graph.transitiveDependents(concept.id).filter((id) => statuses.get(id)?.status !== 'mastered');
    if (blocks.length > 0) {
      reasons.push({
        kind: 'impact',
        role: 'modifier',
        label: `Blocks ${blocks.length} dependent ${blocks.length === 1 ? 'topic' : 'topics'}`,
        points: Math.min(20, blocks.length * 5),
      });
    }

    const priority = overlay?.priority ?? 'normal';
    if (priority !== 'normal') {
      reasons.push({ kind: 'priority', role: 'modifier', label: `Marked ${priority} priority`, points: PRIORITY_POINTS[priority] });
    }

    const score = Math.max(0, Math.min(100, reasons.reduce((sum, reason) => sum + reason.points, 0)));
    gaps.push({
      conceptId: concept.id,
      score,
      severity: severityFor(score),
      mastery: conceptStats?.mastery ?? null,
      attempts: conceptStats?.attempts ?? 0,
      reasons,
      misconceptions: conceptStats?.misconceptions ?? [],
      blocks,
      foundational: true,
    });
  });

  const gapIds = new Set(gaps.map((gap) => gap.conceptId));
  const order = graph.topologicalOrder();
  return gaps
    .map((gap) => ({ ...gap, foundational: !graph.get(gap.conceptId).prerequisites.some((id) => gapIds.has(id)) }))
    .sort((a, b) => b.score - a.score || order.indexOf(a.conceptId) - order.indexOf(b.conceptId));
}
