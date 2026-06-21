import { motion } from 'framer-motion';
import { Award, AlertTriangle, Play, Lock, BookOpen, GitBranch } from 'lucide-react';
import { CONCEPTS, MISCONCEPTIONS } from '../../services/ai';
import { Badge } from '../ui/Badge';
import { Card, CardHeader, CardBody } from '../ui/Card';
import type { ConceptStatus } from '../../types';

interface ConceptMapProps {
  subjectId: string;
  conceptStatuses: Record<string, ConceptStatus>;
  activeGapId?: string;
  onSelectConcept: (conceptId: string) => void;
}

const layouts: Record<string, Record<string, { x: number; y: number }>> = {
  math: {
    frac_visual: { x: 50, y: 12 },
    frac_equiv: { x: 22, y: 45 },
    frac_add_like: { x: 78, y: 45 },
    frac_add_unlike: { x: 50, y: 78 },
    frac_multiply: { x: 15, y: 78 },
  },
  science: {
    sci_force: { x: 50, y: 12 },
    sci_gravity: { x: 22, y: 45 },
    sci_net_force: { x: 78, y: 45 },
    sci_action_reaction: { x: 50, y: 78 },
  },
  english: {
    eng_present: { x: 50, y: 15 },
    eng_past: { x: 50, y: 48 },
    eng_perfect: { x: 50, y: 82 },
  },
};

const connections: Record<string, [string, string][]> = {
  math: [
    ['frac_visual', 'frac_equiv'],
    ['frac_visual', 'frac_add_like'],
    ['frac_equiv', 'frac_add_unlike'],
    ['frac_add_like', 'frac_add_unlike'],
    ['frac_equiv', 'frac_multiply'],
  ],
  science: [
    ['sci_force', 'sci_gravity'],
    ['sci_force', 'sci_net_force'],
    ['sci_gravity', 'sci_action_reaction'],
    ['sci_net_force', 'sci_action_reaction'],
  ],
  english: [
    ['eng_present', 'eng_past'],
    ['eng_past', 'eng_perfect'],
  ],
};

const statusConfig: Record<ConceptStatus, { icon: typeof Award; color: string; glow: string }> = {
  mastered: { icon: Award, color: 'border-success/40 bg-success/10 text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]' },
  gap: { icon: AlertTriangle, color: 'border-warning/40 bg-warning/10 text-amber-400', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]' },
  unlocked: { icon: Play, color: 'border-primary/40 bg-primary/10 text-primary-light', glow: 'shadow-[0_0_20px_rgba(79,70,229,0.25)]' },
  locked: { icon: Lock, color: 'border-white/10 bg-white/3 text-text-muted opacity-50', glow: '' },
};

export function ConceptMap({ subjectId, conceptStatuses, activeGapId, onSelectConcept }: ConceptMapProps) {
  const subjectLayout = layouts[subjectId] || layouts.math;
  const subjectConcepts = CONCEPTS[subjectId] || CONCEPTS.math;
  const subjectConnections = connections[subjectId] || connections.math;

  return (
    <div className="space-y-6">
      <Card glow="primary">
        <CardHeader>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-5 h-5 text-primary-light" />
              <h2 className="text-lg font-semibold font-[family-name:var(--font-display)]">Concept Mastery Map</h2>
            </div>
            <p className="text-sm text-text-secondary">Interactive knowledge graph — click unlocked nodes to begin assessment</p>
          </div>
          <Badge variant="primary">{subjectId.toUpperCase()}</Badge>
        </CardHeader>

        <CardBody>
          <div className="relative w-full h-[320px] sm:h-[360px] bg-black/20 rounded-2xl border border-white/8 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {subjectConnections.map(([from, to]) => {
                const fromPos = subjectLayout[from];
                const toPos = subjectLayout[to];
                if (!fromPos || !toPos) return null;
                const fromStatus = conceptStatuses[from];
                const strokeColor = fromStatus === 'mastered' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)';
                return (
                  <motion.line
                    key={`${from}-${to}`}
                    x1={`${fromPos.x}%`}
                    y1={`${fromPos.y}%`}
                    x2={`${toPos.x}%`}
                    y2={`${toPos.y}%`}
                    stroke={strokeColor}
                    strokeWidth="2"
                    strokeDasharray={fromStatus === 'mastered' ? '0' : '6 4'}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1 }}
                  />
                );
              })}
            </svg>

            {Object.entries(subjectConcepts).map(([id, details]) => {
              const layout = subjectLayout[id];
              if (!layout) return null;

              const status = conceptStatuses[id] || 'locked';
              const config = statusConfig[status];
              const Icon = config.icon;
              const isSelectable = status !== 'locked';

              return (
                <motion.button
                  key={id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={isSelectable ? { scale: 1.08 } : undefined}
                  whileTap={isSelectable ? { scale: 0.95 } : undefined}
                  onClick={() => isSelectable && onSelectConcept(id)}
                  disabled={!isSelectable}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed whitespace-nowrap z-10 ${config.color} ${config.glow}`}
                  style={{ left: `${layout.x}%`, top: `${layout.y}%` }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{details.name}</span>
                  <span className="sm:hidden">{details.name.split(' ')[0]}</span>
                </motion.button>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-text-secondary">
            {Object.entries(statusConfig).map(([status, cfg]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.color.split(' ')[0]} border`} />
                <span className="capitalize">{status}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(subjectConcepts).map(([id, details]) => {
          const status = conceptStatuses[id] || 'locked';
          if (status === 'locked') return null;

          return (
            <ConceptRelationshipCard
              key={id}
              name={details.name}
              description={details.description}
              difficulty={details.difficulty}
              status={status}
              prerequisites={details.prerequisites}
              onSelect={() => onSelectConcept(id)}
            />
          );
        })}
      </div>

      {activeGapId && activeGapId !== 'none' && MISCONCEPTIONS[activeGapId] && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 border-l-4 border-warning border-warning/30 bg-warning/5"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="font-semibold">Active Gap: {MISCONCEPTIONS[activeGapId].title}</h3>
          </div>
          <p className="text-sm text-text-secondary mb-4">{MISCONCEPTIONS[activeGapId].desc}</p>
          <div className="pt-4 border-t border-warning/10">
            <p className="text-xs uppercase tracking-wider text-warning font-semibold mb-1">Recommended Remediation</p>
            <p className="text-sm">{MISCONCEPTIONS[activeGapId].remedy}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ConceptRelationshipCard({
  name,
  description,
  difficulty,
  status,
  prerequisites,
  onSelect,
}: {
  name: string;
  description: string;
  difficulty: string;
  status: ConceptStatus;
  prerequisites: string[];
  onSelect: () => void;
}) {
  const diffColors = { easy: 'success', medium: 'warning', hard: 'danger' } as const;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="glass-card rounded-xl p-4 hover:border-white/15 transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold">{name}</h4>
        <Badge variant={diffColors[difficulty as keyof typeof diffColors] || 'neutral'}>{difficulty}</Badge>
      </div>
      <p className="text-xs text-text-secondary mb-3 line-clamp-2">{description}</p>
      {prerequisites.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <GitBranch className="w-3 h-3" />
          Requires: {prerequisites.join(', ')}
        </div>
      )}
      <div className="mt-2">
        <Badge variant={status === 'mastered' ? 'success' : status === 'gap' ? 'warning' : 'primary'}>
          {status}
        </Badge>
      </div>
    </motion.div>
  );
}
