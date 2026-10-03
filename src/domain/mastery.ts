import {
  DIFFICULTY_WEIGHT, confidenceFromAttempts, toMasteryLevel, type Difficulty, type MasteryLevel,
} from '../adaptive';
import type { Attempt } from './types';

/**
 * Each older answer counts for this fraction of the one after it, so recent evidence dominates
 * and improvement shows up. Combined with the engine's difficulty weights and neutral prior.
 */
export const RECENCY_DECAY = 0.85;
const RECENT_WINDOW = 10;

export interface MisconceptionCount {
  id: string;
  count: number;
  lastSeenAt: string;
}

export interface ConceptStats {
  conceptId: string;
  attempts: number;
  correct: number;
  accuracy: number;
  mastery: number;
  confidence: number;
  level: MasteryLevel;
  firstAttemptAt: string;
  lastAttemptAt: string;
  byDifficulty: Record<Difficulty, { attempts: number; correct: number }>;
  /** All misconceptions observed on this concept, most frequent first. */
  misconceptions: MisconceptionCount[];
  /** Misconceptions seen at least twice in the most recent answers. */
  recurringMisconceptions: string[];
}

/** Recency- and difficulty-weighted mastery for one concept's attempts in chronological order. */
export function masteryFromAttempts(attempts: Pick<Attempt, 'difficulty' | 'correct'>[]): number {
  let earned = 0;
  let total = 0;
  attempts.forEach((attempt, index) => {
    const weight = DIFFICULTY_WEIGHT[attempt.difficulty] * RECENCY_DECAY ** (attempts.length - 1 - index);
    total += weight;
    if (attempt.correct) earned += weight;
  });
  return Math.round(((earned + 0.5) / (total + 1)) * 100);
}

export function sortAttempts(attempts: Attempt[]): Attempt[] {
  return [...attempts].sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
}

export function groupByConcept(attempts: Attempt[]): Map<string, Attempt[]> {
  const grouped = new Map<string, Attempt[]>();
  attempts.forEach((attempt) => {
    const list = grouped.get(attempt.conceptId) ?? [];
    list.push(attempt);
    grouped.set(attempt.conceptId, list);
  });
  return grouped;
}

export function statsForConcept(conceptId: string, attempts: Attempt[]): ConceptStats {
  const correct = attempts.filter((attempt) => attempt.correct).length;
  const mastery = masteryFromAttempts(attempts);
  const byDifficulty: ConceptStats['byDifficulty'] = {
    easy: { attempts: 0, correct: 0 },
    medium: { attempts: 0, correct: 0 },
    hard: { attempts: 0, correct: 0 },
  };
  const misconceptions = new Map<string, MisconceptionCount>();

  attempts.forEach((attempt) => {
    byDifficulty[attempt.difficulty].attempts += 1;
    if (attempt.correct) byDifficulty[attempt.difficulty].correct += 1;
    if (!attempt.correct && attempt.misconceptionId && attempt.misconceptionId !== 'unknown') {
      const entry = misconceptions.get(attempt.misconceptionId) ?? { id: attempt.misconceptionId, count: 0, lastSeenAt: attempt.answeredAt };
      entry.count += 1;
      entry.lastSeenAt = attempt.answeredAt;
      misconceptions.set(attempt.misconceptionId, entry);
    }
  });

  const recentCounts = new Map<string, number>();
  attempts.slice(-RECENT_WINDOW).forEach((attempt) => {
    if (attempt.correct || !attempt.misconceptionId || attempt.misconceptionId === 'unknown') return;
    recentCounts.set(attempt.misconceptionId, (recentCounts.get(attempt.misconceptionId) ?? 0) + 1);
  });

  return {
    conceptId,
    attempts: attempts.length,
    correct,
    accuracy: Math.round((correct / attempts.length) * 100),
    mastery,
    confidence: confidenceFromAttempts(attempts.length),
    level: toMasteryLevel(mastery),
    firstAttemptAt: attempts[0].answeredAt,
    lastAttemptAt: attempts[attempts.length - 1].answeredAt,
    byDifficulty,
    misconceptions: [...misconceptions.values()].sort((a, b) => b.count - a.count || b.lastSeenAt.localeCompare(a.lastSeenAt)),
    recurringMisconceptions: [...recentCounts.entries()].filter(([, count]) => count >= 2).map(([id]) => id),
  };
}

/** Stats for every concept with at least one attempt. Expects attempts in chronological order. */
export function computeConceptStats(attempts: Attempt[]): Map<string, ConceptStats> {
  const stats = new Map<string, ConceptStats>();
  groupByConcept(attempts).forEach((conceptAttempts, conceptId) => {
    stats.set(conceptId, statsForConcept(conceptId, conceptAttempts));
  });
  return stats;
}

/** Mastery from the attempts answered up to and including `at`; null when there were none. */
export function masteryAsOf(attempts: Attempt[], at: Date): number | null {
  const cutoff = at.toISOString();
  const before = attempts.filter((attempt) => attempt.answeredAt <= cutoff);
  return before.length > 0 ? masteryFromAttempts(before) : null;
}

/**
 * How many consecutive correct answers at `difficulty` would lift mastery to `target`, found by
 * running them through the same formula. Returns null if it would take more than `limit`.
 */
export function correctAnswersToReach(
  attempts: Pick<Attempt, 'difficulty' | 'correct'>[],
  target: number,
  difficulty: Difficulty = 'medium',
  limit = 15,
): number | null {
  const simulated = [...attempts];
  for (let count = 0; count <= limit; count += 1) {
    if (masteryFromAttempts(simulated) >= target) return count;
    simulated.push({ difficulty, correct: true });
  }
  return null;
}
