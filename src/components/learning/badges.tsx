import {
  AlertCircle, AlertOctagon, AlertTriangle, BookOpen, CheckCircle2, Circle, Info, Repeat,
} from 'lucide-react';
import type { Difficulty } from '../../adaptive';
import type { GapSeverity } from '../../domain/gaps';
import { STATUS_LABEL } from '../../domain/status';
import type { TopicStatus } from '../../domain/types';
import { cn } from '../../utils/cn';
import { Badge, type Tone } from '../ui/Badge';
import { ProgressBar } from '../ui/Progress';
import { DIFFICULTY_LABEL, SEVERITY_LABEL, masteryTone } from './labels';

const STATUS_STYLE: Record<TopicStatus, { tone: Tone; icon: typeof Circle }> = {
  not_started: { tone: 'neutral', icon: Circle },
  learning: { tone: 'warning', icon: BookOpen },
  practicing: { tone: 'info', icon: Repeat },
  mastered: { tone: 'success', icon: CheckCircle2 },
};

export function StatusBadge({ status, manual = false }: { status: TopicStatus; manual?: boolean }) {
  const { tone, icon: Icon } = STATUS_STYLE[status];
  return (
    <Badge tone={tone} icon={<Icon aria-hidden />} title={manual ? 'Set manually' : 'Based on your answers'}>
      {STATUS_LABEL[status]}
      {manual && <span className="sr-only"> (set manually)</span>}
    </Badge>
  );
}

const SEVERITY_STYLE: Record<GapSeverity, { tone: Tone; icon: typeof Circle }> = {
  critical: { tone: 'danger', icon: AlertOctagon },
  high: { tone: 'orange', icon: AlertTriangle },
  medium: { tone: 'warning', icon: AlertCircle },
  low: { tone: 'neutral', icon: Info },
};

export function SeverityBadge({ severity }: { severity: GapSeverity }) {
  const { tone, icon: Icon } = SEVERITY_STYLE[severity];
  return <Badge tone={tone} icon={<Icon aria-hidden />}>{SEVERITY_LABEL[severity]}</Badge>;
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const bars = { easy: 1, medium: 2, hard: 3 }[difficulty];
  return (
    <Badge tone="neutral">
      <span className="flex items-end gap-px" aria-hidden>
        {[1, 2, 3].map((bar) => (
          <span key={bar} className={cn('w-[3px] rounded-sm', bar <= bars ? 'bg-fg-2' : 'bg-border-strong')} style={{ height: 4 + bar * 2 }} />
        ))}
      </span>
      {DIFFICULTY_LABEL[difficulty]}
    </Badge>
  );
}

interface MasteryMeterProps {
  mastery: number | null;
  status: TopicStatus;
  label: string;
  className?: string;
}

/** Mastery percentage with a bar colored by topic status; shows a dash before any evidence. */
export function MasteryMeter({ mastery, status, label, className }: MasteryMeterProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <ProgressBar value={mastery ?? 0} label={`${label} mastery`} tone={masteryTone(status)} className="min-w-12 flex-1" />
      <span className="tabular w-9 shrink-0 text-right text-[13px] text-fg-2">{mastery === null ? '—' : `${mastery}%`}</span>
    </div>
  );
}

export function SubjectDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} aria-hidden />;
}
