import type { ConceptNode } from '../models';

export const KNOWLEDGE_GRAPH: Record<string, ConceptNode> = {
  frac_visual: {
    id: 'frac_visual', subject: 'math', topic: 'Fractions', name: 'Basic Fractions', difficulty: 'easy', prerequisites: [],
    description: 'Recognize numerators, denominators, and fractions as parts of a whole.',
    learningObjective: 'Represent and interpret a fraction as equal parts of one whole.',
  },
  frac_equiv: {
    id: 'frac_equiv', subject: 'math', topic: 'Fractions', name: 'Equivalent Fractions', difficulty: 'medium', prerequisites: ['frac_visual'],
    description: 'Recognize and generate fractions that represent the same value.',
    learningObjective: 'Create equivalent fractions by scaling numerator and denominator equally.',
  },
  frac_compare: {
    id: 'frac_compare', subject: 'math', topic: 'Fractions', name: 'Comparing Fractions', difficulty: 'medium', prerequisites: ['frac_visual', 'frac_equiv'],
    description: 'Compare fractions using benchmarks and common denominators.',
    learningObjective: 'Compare two fractions and justify the comparison using equivalent forms.',
  },
  frac_operations: {
    id: 'frac_operations', subject: 'math', topic: 'Fractions', name: 'Fraction Operations', difficulty: 'hard', prerequisites: ['frac_equiv', 'frac_compare'],
    description: 'Add, subtract, and multiply fractions accurately.',
    learningObjective: 'Select and apply the correct procedure for fraction operations.',
  },
  sci_force: {
    id: 'sci_force', subject: 'science', topic: 'Forces and Motion', name: 'Concept of Force', difficulty: 'easy', prerequisites: [],
    description: 'Understand forces as pushes or pulls measured in Newtons.', learningObjective: 'Identify balanced and unbalanced forces.',
  },
  sci_gravity: {
    id: 'sci_gravity', subject: 'science', topic: 'Forces and Motion', name: 'Gravity, Mass & Weight', difficulty: 'medium', prerequisites: ['sci_force'],
    description: 'Distinguish mass from gravitational weight.', learningObjective: 'Explain how gravity changes weight but not mass.',
  },
  sci_net_force: {
    id: 'sci_net_force', subject: 'science', topic: 'Forces and Motion', name: 'Net Force & Motion', difficulty: 'hard', prerequisites: ['sci_force'],
    description: 'Connect net force, acceleration, and constant velocity.', learningObjective: 'Apply Newton\'s first and second laws to motion.',
  },
  sci_action_reaction: {
    id: 'sci_action_reaction', subject: 'science', topic: 'Forces and Motion', name: 'Action & Reaction', difficulty: 'hard', prerequisites: ['sci_force', 'sci_net_force'],
    description: 'Recognize equal and opposite force pairs.', learningObjective: 'Apply Newton\'s third law to interactions.',
  },
  eng_present: {
    id: 'eng_present', subject: 'english', topic: 'Verb Tenses', name: 'Present & Progressive Tenses', difficulty: 'easy', prerequisites: [],
    description: 'Distinguish habits from actions happening now.', learningObjective: 'Choose simple present or present progressive from context.',
  },
  eng_past: {
    id: 'eng_past', subject: 'english', topic: 'Verb Tenses', name: 'Past Tense Contrast', difficulty: 'medium', prerequisites: ['eng_present'],
    description: 'Distinguish completed and ongoing past events.', learningObjective: 'Choose simple past or past continuous from context.',
  },
  eng_perfect: {
    id: 'eng_perfect', subject: 'english', topic: 'Verb Tenses', name: 'Present Perfect vs. Past', difficulty: 'hard', prerequisites: ['eng_past'],
    description: 'Connect past events to the present accurately.', learningObjective: 'Choose present perfect or simple past from time context.',
  },
};

export const SUBJECT_CONCEPTS = Object.values(KNOWLEDGE_GRAPH).reduce<Record<string, Record<string, ConceptNode>>>((groups, concept) => {
  groups[concept.subject] ??= {};
  groups[concept.subject][concept.id] = concept;
  return groups;
}, {});

export function getConcept(conceptId: string): ConceptNode {
  const concept = KNOWLEDGE_GRAPH[conceptId];
  if (!concept) throw new Error(`Unknown concept: ${conceptId}`);
  return concept;
}

export function getSuccessors(conceptId: string): ConceptNode[] {
  return Object.values(KNOWLEDGE_GRAPH).filter((concept) => concept.prerequisites.includes(conceptId));
}
