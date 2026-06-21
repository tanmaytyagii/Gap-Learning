import { motion } from 'framer-motion';
import { Clock, CheckCircle2, AlertTriangle, Sparkles, BookOpen } from 'lucide-react';
import { RECENT_ACTIVITY, AI_RECOMMENDATIONS } from '../../data/mockData';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

const activityIcons = {
  assessment: BookOpen,
  mastery: CheckCircle2,
  gap: AlertTriangle,
  recommendation: Sparkles,
};

const activityColors = {
  assessment: 'text-blue-400 bg-blue-500/10',
  mastery: 'text-success bg-success/10',
  gap: 'text-warning bg-warning/10',
  recommendation: 'text-primary-light bg-primary/10',
};

export function ActivityTimeline() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-primary-light" />
        <h3 className="font-semibold font-[family-name:var(--font-display)]">Recent Activity</h3>
      </div>

      <div className="space-y-4">
        {RECENT_ACTIVITY.map((item, i) => {
          const Icon = activityIcons[item.type];
          const colorClass = activityColors[item.type];

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className="flex gap-3 items-start"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-text-secondary mt-0.5">{item.description}</p>
                <p className="text-[10px] text-text-muted mt-1">{item.timestamp}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

interface AIRecommendationsProps {
  onSelectConcept?: (conceptId: string) => void;
}

export function AIRecommendations({ onSelectConcept }: AIRecommendationsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-2xl p-6 border-primary/20"
    >
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-primary-light" />
        <h3 className="font-semibold font-[family-name:var(--font-display)]">AI Recommendations</h3>
      </div>

      <div className="space-y-3">
        {AI_RECOMMENDATIONS.map((rec) => (
          <div
            key={rec.id}
            className="p-4 rounded-xl bg-white/3 border border-white/6 hover:border-primary/20 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-medium">{rec.title}</p>
              <Badge variant={rec.priority === 'high' ? 'warning' : rec.priority === 'medium' ? 'primary' : 'neutral'}>
                {rec.priority}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mb-3">{rec.description}</p>
            {onSelectConcept && (
              <Button variant="ghost" size="sm" onClick={() => onSelectConcept(rec.conceptId)}>
                {rec.action}
              </Button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function KnowledgeGapInsights({ activeGapId }: { activeGapId?: string }) {
  if (!activeGapId || activeGapId === 'none') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <h3 className="font-semibold font-[family-name:var(--font-display)]">Knowledge Gaps</h3>
        </div>
        <p className="text-sm text-text-secondary">No active gaps detected. Keep learning!</p>
      </motion.div>
    );
  }

  return null;
}
