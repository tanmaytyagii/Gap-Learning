import { cn } from '../../utils/cn';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  primary: 'bg-primary/15 text-primary-light border-primary/25',
  success: 'bg-success/15 text-emerald-400 border-success/25',
  warning: 'bg-warning/15 text-amber-400 border-warning/25',
  danger: 'bg-danger/15 text-red-400 border-danger/25',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  neutral: 'bg-white/5 text-text-secondary border-white/10',
};

export function Badge({ children, variant = 'primary', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
