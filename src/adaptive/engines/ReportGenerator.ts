import type { KnowledgeGraph } from '../KnowledgeGraph';
import type { AssessmentReport, AssessmentSession, GapAnalysis, LearningPathStep } from '../models';
import type { FeedbackEngine } from './FeedbackEngine';

export class ReportGenerator {
  private readonly feedbackEngine: FeedbackEngine;
  private readonly graph: KnowledgeGraph;

  constructor(feedbackEngine: FeedbackEngine, graph: KnowledgeGraph) {
    this.feedbackEngine = feedbackEngine;
    this.graph = graph;
  }

  generate(session: AssessmentSession, analysis: GapAnalysis): AssessmentReport {
    const evidence = Object.values(analysis.conceptEvidence).filter((item) => this.graph.has(item.conceptId));
    const strongSet = new Set(analysis.strongConcepts);
    const weakSet = new Set(analysis.weakConcepts);
    const orderedConcepts = this.graph.topologicalOrder(session.subject);
    const firstWeak = orderedConcepts.find((id) => weakSet.has(id));
    const lastResponse = session.responses[session.responses.length - 1];
    const progression = lastResponse ? this.graph.successors(lastResponse.conceptId)[0] : undefined;
    const nextConceptId = firstWeak ?? progression?.id ?? lastResponse?.conceptId ?? session.startingConceptId;
    const nextConcept = this.graph.get(nextConceptId);

    const learningPath: LearningPathStep[] = orderedConcepts.map((conceptId, index) => {
      const concept = this.graph.get(conceptId);
      const evidenceItem = analysis.conceptEvidence[conceptId];
      const status: LearningPathStep['status'] = weakSet.has(conceptId)
        ? 'review'
        : strongSet.has(conceptId) ? 'ready' : 'practice';
      const reason = evidenceItem?.evidence === 'inferred'
        ? 'Check this prerequisite because a dependent skill exposed uncertainty.'
        : weakSet.has(conceptId)
          ? 'Rebuild this concept before moving to its dependent skills.'
          : strongSet.has(conceptId)
            ? 'Current evidence is strong; use this foundation to progress.'
            : 'Collect more evidence to confirm mastery.';
      return { order: index + 1, conceptId, conceptName: concept.name, reason, status };
    });

    const feedback = analysis.weakConcepts
      .filter((conceptId) => this.graph.has(conceptId))
      .map((conceptId) => this.feedbackEngine.explainGap(conceptId, analysis.conceptEvidence[conceptId]?.misconceptionIds ?? ['unknown']));

    if (feedback.length === 0) {
      feedback.push(`No critical gap was detected. Continue with ${nextConcept.name} to increase confidence in the estimate.`);
    }

    const averageConfidence = evidence.length === 0
      ? 0
      : Math.round(evidence.reduce((sum, item) => sum + item.confidenceScore, 0) / evidence.length);

    return {
      assessmentId: session.id,
      generatedAt: new Date().toISOString(),
      strengths: analysis.strongConcepts.filter((id) => this.graph.has(id)).map((id) => this.graph.get(id).name),
      weaknesses: analysis.weakConcepts.filter((id) => this.graph.has(id)).map((id) => this.graph.get(id).name),
      masteryChart: evidence
        .map((item) => ({
          conceptId: item.conceptId,
          concept: this.graph.get(item.conceptId).name,
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
          ? 'This is the earliest weak prerequisite in your path.'
          : 'No blocking gap was found, so the next step continues along the knowledge graph.',
      },
      learningPath,
      feedback,
      analysis,
    };
  }
}
