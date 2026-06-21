import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
}

export function StatCard({ label, value, change, changeType = 'neutral', icon: Icon, iconColor = 'text-primary-light', delay = 0 }: StatCardProps) {
  const changeColors = {
    positive: 'text-success',
    negative: 'text-danger',
    neutral: 'text-text-secondary',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-card rounded-2xl p-5 hover:border-white/15 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform', iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <span className={cn('text-xs font-medium', changeColors[changeType])}>{change}</span>
        )}
      </div>
      <p className="text-2xl font-bold font-[family-name:var(--font-display)] tracking-tight">{value}</p>
      <p className="text-xs text-text-secondary mt-1 uppercase tracking-wider">{label}</p>
    </motion.div>
  );
}
