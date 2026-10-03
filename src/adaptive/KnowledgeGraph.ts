import type { ConceptNode } from './models';

/**
 * Read-only prerequisite graph over concepts. Built-in and user-defined concepts share one
 * graph; prerequisites that point at unknown concepts are dropped so a bad record can never
 * break traversal.
 */
export class KnowledgeGraph {
  private readonly nodes = new Map<string, ConceptNode>();
  private readonly dependents = new Map<string, string[]>();

  constructor(concepts: ConceptNode[]) {
    concepts.forEach((concept) => this.nodes.set(concept.id, concept));
    this.nodes.forEach((concept, id) => {
      const prerequisites = concept.prerequisites.filter((prerequisite) => prerequisite !== id && this.nodes.has(prerequisite));
      if (prerequisites.length !== concept.prerequisites.length) {
        this.nodes.set(id, { ...concept, prerequisites });
      }
      prerequisites.forEach((prerequisite) => {
        const list = this.dependents.get(prerequisite) ?? [];
        list.push(id);
        this.dependents.set(prerequisite, list);
      });
    });
  }

  has(conceptId: string): boolean {
    return this.nodes.has(conceptId);
  }

  get(conceptId: string): ConceptNode {
    const concept = this.nodes.get(conceptId);
    if (!concept) throw new Error(`Unknown concept: ${conceptId}`);
    return concept;
  }

  find(conceptId: string): ConceptNode | undefined {
    return this.nodes.get(conceptId);
  }

  all(): ConceptNode[] {
    return [...this.nodes.values()];
  }

  bySubject(subjectId: string): ConceptNode[] {
    return this.all().filter((concept) => concept.subject === subjectId);
  }

  successors(conceptId: string): ConceptNode[] {
    return (this.dependents.get(conceptId) ?? []).map((id) => this.get(id));
  }

  /** Every concept that directly or indirectly depends on the given one. */
  transitiveDependents(conceptId: string): string[] {
    const seen = new Set<string>();
    const stack = [...(this.dependents.get(conceptId) ?? [])];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...(this.dependents.get(id) ?? []));
    }
    return [...seen];
  }

  /** Prerequisite-first ordering. Cycles in user-defined data are broken rather than looping. */
  topologicalOrder(subjectId?: string): string[] {
    const concepts = subjectId ? this.bySubject(subjectId) : this.all();
    const inScope = new Set(concepts.map((concept) => concept.id));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const ordered: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id) || visiting.has(id) || !inScope.has(id)) return;
      visiting.add(id);
      this.get(id).prerequisites.forEach(visit);
      visiting.delete(id);
      visited.add(id);
      ordered.push(id);
    };

    concepts.forEach((concept) => visit(concept.id));
    return ordered;
  }

  /** Longest prerequisite chain below each concept; used to lay the graph out in layers. */
  depths(subjectId: string): Map<string, number> {
    const depth = new Map<string, number>();
    this.topologicalOrder(subjectId).forEach((id) => {
      const prerequisiteDepths = this.get(id).prerequisites
        .map((prerequisite) => depth.get(prerequisite))
        .filter((value): value is number => value !== undefined);
      depth.set(id, prerequisiteDepths.length > 0 ? Math.max(...prerequisiteDepths) + 1 : 0);
    });
    return depth;
  }

  /** Concepts with no prerequisites inside the subject: natural starting points. */
  roots(subjectId: string): ConceptNode[] {
    return this.bySubject(subjectId).filter((concept) => concept.prerequisites.length === 0);
  }

  /** Whether adding `prerequisiteId` as a prerequisite of `conceptId` would create a cycle. */
  wouldCreateCycle(conceptId: string, prerequisiteId: string): boolean {
    return conceptId === prerequisiteId || this.transitiveDependents(conceptId).includes(prerequisiteId);
  }
}
