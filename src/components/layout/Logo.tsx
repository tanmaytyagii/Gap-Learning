import { cn } from '../../utils/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7 shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#4f46e5" />
      <rect x="7" y="17" width="4.5" height="8" rx="1.5" fill="#fff" />
      <rect x="13.75" y="11.75" width="4.5" height="13.25" rx="1.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="2.2 1.8" />
      <rect x="20.5" y="7" width="4.5" height="18" rx="1.5" fill="#fff" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-fg">GapLearning</span>
    </span>
  );
}
