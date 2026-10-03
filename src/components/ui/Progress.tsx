import { cn } from '../../utils/cn';

const FILL = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-fg-3',
} as const;

export type ProgressTone = keyof typeof FILL;

interface ProgressBarProps {
  value: number;
  label: string;
  tone?: ProgressTone;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({ value, label, tone = 'accent', size = 'sm', className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('w-full overflow-hidden rounded-full bg-surface-3', size === 'sm' ? 'h-1.5' : 'h-2', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out', FILL[tone])} style={{ width: `${clamped}%` }} />
    </div>
  );
}
