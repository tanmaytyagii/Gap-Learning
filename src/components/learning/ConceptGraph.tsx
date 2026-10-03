import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useWorkspace } from '../../app/contexts';
import { topicHref } from '../../domain/recommendations';
import { STATUS_LABEL } from '../../domain/status';
import type { TopicStatus } from '../../domain/types';
import { cn } from '../../utils/cn';

const NODE_WIDTH = 184;
const NODE_HEIGHT = 68;
const GAP_X = 28;
const GAP_Y = 52;
const PAD = 8;

const STATUS_BORDER: Record<TopicStatus, string> = {
  not_started: 'border-l-border-strong',
  learning: 'border-l-warning',
  practicing: 'border-l-info',
  mastered: 'border-l-success',
};

/**
 * Prerequisite graph laid out in layers (a topic sits one layer below its deepest prerequisite).
 * Nodes are links; edges turn green once the prerequisite is mastered.
 */
export function ConceptGraph({ subjectId, highlight }: { subjectId: string; highlight?: string }) {
  const { curriculum, statuses, stats, gapById } = useWorkspace();

  const layout = useMemo(() => {
    const depths = curriculum.graph.depths(subjectId);
    const layers: string[][] = [];
    curriculum.graph.topologicalOrder(subjectId).forEach((id) => {
      const depth = depths.get(id) ?? 0;
      (layers[depth] ??= []).push(id);
    });
    const widest = Math.max(1, ...layers.map((layer) => layer.length));
    const width = widest * NODE_WIDTH + (widest - 1) * GAP_X + PAD * 2;
    const height = layers.length * NODE_HEIGHT + Math.max(0, layers.length - 1) * GAP_Y + PAD * 2;
    const positions = new Map<string, { x: number; y: number }>();
    layers.forEach((layer, depth) => {
      const rowWidth = layer.length * NODE_WIDTH + (layer.length - 1) * GAP_X;
      const offset = (width - rowWidth) / 2;
      layer.forEach((id, index) => positions.set(id, { x: offset + index * (NODE_WIDTH + GAP_X), y: PAD + depth * (NODE_HEIGHT + GAP_Y) }));
    });
    return { width, height, positions };
  }, [curriculum, subjectId]);

  const edges = [...layout.positions.keys()].flatMap((id) =>
    curriculum.graph.get(id).prerequisites
      .filter((prerequisite) => layout.positions.has(prerequisite))
      .map((prerequisite) => ({ from: prerequisite, to: id })));

  return (
    <div className="relative overflow-x-auto">
      <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
        <svg className="absolute inset-0" width={layout.width} height={layout.height} aria-hidden>
          <defs>
            <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="var(--border-strong)" />
            </marker>
            <marker id="arrow-done" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="var(--success)" />
            </marker>
          </defs>
          {edges.map(({ from, to }) => {
            const a = layout.positions.get(from)!;
            const b = layout.positions.get(to)!;
            const x1 = a.x + NODE_WIDTH / 2;
            const y1 = a.y + NODE_HEIGHT;
            const x2 = b.x + NODE_WIDTH / 2;
            const y2 = b.y - 2;
            const done = statuses.get(from)?.status === 'mastered';
            const mid = (y1 + y2) / 2;
            return (
              <path
                key={`${from}-${to}`}
                d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`}
                fill="none"
                stroke={done ? 'var(--success)' : 'var(--border-strong)'}
                strokeWidth={1.5}
                markerEnd={`url(#${done ? 'arrow-done' : 'arrow'})`}
              />
            );
          })}
        </svg>
        {[...layout.positions.entries()].map(([id, position]) => {
          const concept = curriculum.concept(id)!;
          const status = statuses.get(id)!.status;
          const mastery = stats.get(id)?.mastery;
          const gap = gapById.get(id);
          return (
            <Link
              key={id}
              to={topicHref(id)}
              className={cn(
                'absolute flex flex-col justify-between rounded-lg border border-l-[3px] border-border bg-surface px-3 py-2 shadow-card transition-colors hover:bg-surface-2',
                STATUS_BORDER[status],
                highlight === id && 'ring-2 ring-[var(--ring)] ring-offset-2 ring-offset-[var(--surface)]',
              )}
              style={{ left: position.x, top: position.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
              aria-label={`${concept.name}: ${STATUS_LABEL[status]}${mastery !== undefined ? `, ${mastery}% mastery` : ''}${gap ? `, ${gap.severity} gap` : ''}`}
            >
              <span className="line-clamp-2 text-[13px] font-medium leading-4 text-fg">{concept.name}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-fg-3">
                {gap && <AlertTriangle className="size-3 text-orange" aria-hidden />}
                {STATUS_LABEL[status]}{mastery !== undefined && ` · ${mastery}%`}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
