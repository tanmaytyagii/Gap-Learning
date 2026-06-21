import { getConcept } from '../data/knowledgeGraph';
import type { ConceptEvidence, GapAnalysis, MasteryLevel, StudentResponse } from '../models';

const DIFFICULTY_WEIGHT = { easy: 0.8, medium: 1, hard: 1.2 } as const;

function toMasteryLevel(score: number): MasteryLevel {
  if (score >= 85) return 'mastered';
  if (score >= 70) return 'proficient';
  if (score >= 50) return 'developing';
  return 'beginning';
}

export class GapAnalysisEngine {
  analyze(responses: StudentResponse[]): GapAnalysis {
    const grouped = new Map<string, StudentResponse[]>();
    responses.forEach((response) => {
      const current = grouped.get(response.conceptId) ?? [];
      current.push(response);
      grouped.set(response.conceptId, current);
    });

    const conceptEvidence: Record<string, ConceptEvidence> = {};

    grouped.forEach((conceptResponses, conceptId) => {
      const totalWeight = conceptResponses.reduce((sum, response) => sum + DIFFICULTY_WEIGHT[response.difficulty], 0);
      const earnedWeight = conceptResponses.reduce(
        (sum, response) => sum + (response.isCorrect ? DIFFICULTY_WEIGHT[response.difficulty] : 0),
        0,
      );
      // A small neutral prior prevents a single answer from claiming absolute mastery.
      const masteryScore = Math.round(((earnedWeight + 0.5) / (totalWeight + 1)) * 100);
      const confidenceScore = Math.min(95, 40 + conceptResponses.length * 15);
      const misconceptionIds = [...new Set(
        conceptResponses.filter((response) => !response.isCorrect).map((response) => response.misconceptionId),
      )];

      conceptEvidence[conceptId] = {
        conceptId,
        attempts: conceptResponses.length,
        correct: conceptResponses.filter((response) => response.isCorrect).length,
        masteryScore,
        confidenceScore,
        masteryLevel: toMasteryLevel(masteryScore),
        evidence: 'observed',
        misconceptionIds,
      };
    });

    // A failed advanced concept is also evidence that an unobserved prerequisite should be checked.
    Object.values(conceptEvidence).forEach((evidence) => {
      if (evidence.masteryScore >= 50) return;
      getConcept(evidence.conceptId).prerequisites.forEach((prerequisiteId) => {
        if (conceptEvidence[prerequisiteId]) return;
        conceptEvidence[prerequisiteId] = {
          conceptId: prerequisiteId,
          attempts: 0,
          correct: 0,
          masteryScore: 35,
          confidenceScore: 30,
          masteryLevel: 'beginning',
          evidence: 'inferred',
          misconceptionIds: ['prerequisite_not_confirmed'],
        };
      });
    });

    const evidenceList = Object.values(conceptEvidence);
    return {
      strongConcepts: evidenceList.filter((item) => item.masteryScore >= 70).map((item) => item.conceptId),
      weakConcepts: evidenceList.filter((item) => item.masteryScore < 50).map((item) => item.conceptId),
      confidenceScore: Object.fromEntries(evidenceList.map((item) => [item.conceptId, item.confidenceScore])),
      masteryLevel: Object.fromEntries(evidenceList.map((item) => [item.conceptId, item.masteryLevel])),
      conceptEvidence,
    };
  }
}
