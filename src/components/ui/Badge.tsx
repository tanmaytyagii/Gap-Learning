import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'orange' | 'danger' | 'info' | 'ai';

const TONE_STYLES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-fg-2 ring-border',
  accent: 'bg-accent-soft text-accent-fg ring-transparent',
  success: 'bg-success-soft text-success ring-transparent',
  warning: 'bg-warning-soft text-warning ring-transparent',
  orange: 'bg-orange-soft text-orange ring-transparent',
  danger: 'bg-danger-soft text-danger ring-transparent',
  info: 'bg-info-soft text-info ring-transparent',
  ai: 'bg-ai-soft text-ai ring-transparent',
};

interface BadgeProps {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Badge({ tone = 'neutral', icon, children, className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 text-xs font-medium ring-1 ring-inset',
        '[&_svg]:size-3.5',
        TONE_STYLES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
