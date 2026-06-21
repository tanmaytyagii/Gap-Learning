import { getConcept, getSuccessors, KNOWLEDGE_GRAPH } from '../data/knowledgeGraph';
import type { AssessmentReport, AssessmentSession, GapAnalysis, LearningPathStep } from '../models';
import { FeedbackEngine } from './FeedbackEngine';

function topologicalConcepts(subject: string): string[] {
  const subjectConcepts = Object.values(KNOWLEDGE_GRAPH).filter((concept) => concept.subject === subject);
  const available = new Set(subjectConcepts.map((concept) => concept.id));
  const visited = new Set<string>();
  const ordered: string[] = [];

  const visit = (conceptId: string) => {
    if (visited.has(conceptId) || !available.has(conceptId)) return;
    getConcept(conceptId).prerequisites.forEach(visit);
    visited.add(conceptId);
    ordered.push(conceptId);
  };

  subjectConcepts.forEach((concept) => visit(concept.id));
  return ordered;
}

export class ReportGenerator {
  private readonly feedbackEngine: FeedbackEngine;

  constructor(feedbackEngine: FeedbackEngine) {
    this.feedbackEngine = feedbackEngine;
  }

  generate(session: AssessmentSession, analysis: GapAnalysis): AssessmentReport {
    const evidence = Object.values(analysis.conceptEvidence);
    const strongSet = new Set(analysis.strongConcepts);
    const weakSet = new Set(analysis.weakConcepts);
    const orderedConcepts = topologicalConcepts(session.subject);
    const firstWeak = orderedConcepts.find((id) => weakSet.has(id));
    const lastResponse = session.responses[session.responses.length - 1];
    const progression = lastResponse ? getSuccessors(lastResponse.conceptId)[0] : undefined;
    const nextConceptId = firstWeak ?? progression?.id ?? lastResponse?.conceptId ?? session.startingConceptId;
    const nextConcept = getConcept(nextConceptId);

    const learningPath: LearningPathStep[] = orderedConcepts.map((conceptId, index) => {
      const concept = getConcept(conceptId);
      const evidenceItem = analysis.conceptEvidence[conceptId];
      const status: LearningPathStep['status'] = weakSet.has(conceptId)
        ? 'review'
        : strongSet.has(conceptId) ? 'ready' : 'practice';
      const reason = evidenceItem?.evidence === 'inferred'
        ? `Check this prerequisite because a dependent skill exposed uncertainty.`
        : weakSet.has(conceptId)
          ? `Rebuild this concept before moving to its dependent skills.`
          : strongSet.has(conceptId)
            ? `Current evidence is strong; use this foundation to progress.`
            : `Collect more evidence to confirm mastery.`;
      return { order: index + 1, conceptId, conceptName: concept.name, reason, status };
    });

    const feedback = analysis.weakConcepts.map((conceptId) => {
      const misconceptionIds = analysis.conceptEvidence[conceptId]?.misconceptionIds ?? ['unknown'];
      return this.feedbackEngine.explainGap(conceptId, misconceptionIds);
    });

    if (feedback.length === 0) {
      feedback.push(`No critical gap was detected. Continue with ${nextConcept.name} to increase confidence in the current estimate.`);
    }

    const averageConfidence = evidence.length === 0
      ? 0
      : Math.round(evidence.reduce((sum, item) => sum + item.confidenceScore, 0) / evidence.length);

    return {
      assessmentId: session.id,
      generatedAt: new Date().toISOString(),
      strengths: analysis.strongConcepts.map((id) => getConcept(id).name),
      weaknesses: analysis.weakConcepts.map((id) => getConcept(id).name),
      masteryChart: evidence
        .map((item) => ({
          conceptId: item.conceptId,
          concept: getConcept(item.conceptId).name,
          mastery: item.masteryScore,
          confidence: item.confidenceScore,
          level: item.masteryLevel,
        }))
        .sort((a, b) => orderedConcepts.indexOf(a.conceptId) - orderedConcepts.indexOf(b.conceptId)),
      confidenceScore: averageConfidence,
      recommendedTopics: learningPath.filter((step) => step.status !== 'ready').map((step) => step.conceptName),
      suggestedNextAssessment: {
        conceptId: nextConcept.id,
        concept: nextConcept.name,
        difficulty: nextConcept.difficulty,
        reason: firstWeak
          ? `This is the earliest weak prerequisite in the personalized path.`
          : `No blocking gap was found, so the next assessment continues along the knowledge graph.`,
      },
      learningPath,
      feedback,
      analysis,
    };
  }
}
