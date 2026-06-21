import { motion } from 'framer-motion';
import { Trophy, Zap, Target, TrendingUp, Flame } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import type { SubjectId } from '../../types';
import { CONCEPTS, SUBJECTS } from '../../services/ai';

interface AnalyticsCardsProps {
  xp: number;
  level: number;
  streak: number;
  activeSubject: SubjectId;
  conceptStatuses: Record<string, 'locked' | 'unlocked' | 'mastered' | 'gap'>;
}

export function AnalyticsCards({ xp, level, streak, activeSubject, conceptStatuses }: AnalyticsCardsProps) {
  const concepts = CONCEPTS[activeSubject] || {};
  const total = Object.keys(concepts).length;
  const mastered = Object.values(conceptStatuses).filter((s) => s === 'mastered').length;
  const gaps = Object.values(conceptStatuses).filter((s) => s === 'gap').length;
  const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total XP" value={xp} change={`Level ${level}`} changeType="positive" icon={Zap} iconColor="text-amber-400" delay={0} />
      <StatCard label="Day Streak" value={`${streak}d`} change="Keep it up!" changeType="positive" icon={Flame} iconColor="text-orange-400" delay={0.1} />
      <StatCard label="Mastery Rate" value={`${masteryPct}%`} change={`${mastered}/${total} concepts`} changeType="neutral" icon={Target} iconColor="text-emerald-400" delay={0.2} />
      <StatCard label="Active Gaps" value={gaps} change={gaps > 0 ? 'Needs review' : 'All clear'} changeType={gaps > 0 ? 'negative' : 'positive'} icon={TrendingUp} iconColor="text-primary-light" delay={0.3} />
    </div>
  );
}

export function LearningProgress({ activeSubject, conceptStatuses }: { activeSubject: SubjectId; conceptStatuses: Record<string, 'locked' | 'unlocked' | 'mastered' | 'gap'> }) {
  const concepts = CONCEPTS[activeSubject] || {};
  const subject = SUBJECTS[activeSubject];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wider">Subject Progress</p>
          <h3 className="font-semibold font-[family-name:var(--font-display)]">{subject.emoji} {subject.name}</h3>
        </div>
        <Trophy className="w-5 h-5 text-warning" />
      </div>

      <div className="space-y-4">
        {Object.entries(concepts).map(([id, concept]) => {
          const status = conceptStatuses[id] || 'locked';
          const progress = status === 'mastered' ? 100 : status === 'gap' ? 40 : status === 'unlocked' ? 60 : 0;
          const color = status === 'mastered' ? 'bg-success' : status === 'gap' ? 'bg-warning' : status === 'unlocked' ? 'bg-primary' : 'bg-white/10';

          return (
            <div key={id}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className={status === 'locked' ? 'text-text-muted' : 'font-medium'}>{concept.name}</span>
                <span className="text-xs text-text-secondary capitalize">{status}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full rounded-full ${color}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
