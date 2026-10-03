import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const CONTROL = cn(
  'w-full rounded-lg border border-border bg-surface text-sm text-fg shadow-card transition-colors',
  'placeholder:text-fg-3 hover:border-border-strong',
  'focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus-visible:outline-none',
  'disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger',
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(CONTROL, 'h-9 px-3', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(CONTROL, 'min-h-20 resize-y px-3 py-2 leading-6', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <div className={cn('relative', className)}>
    <select ref={ref} className={cn(CONTROL, 'h-9 appearance-none pl-3 pr-8')} {...props}>
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" aria-hidden />
  </div>
));
Select.displayName = 'Select';

export interface ControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  className?: string;
  children: (props: ControlProps) => ReactNode;
}

/** Label, hint, and error wired to the control through ids so screen readers announce them. */
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-[13px] font-medium text-fg">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-fg-3">Optional</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && <p id={hintId} className="text-xs leading-5 text-fg-3">{hint}</p>}
      {error && <p id={errorId} className="text-xs leading-5 text-danger">{error}</p>}
    </div>
  );
}
