import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface Option<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

function useArrowKeys<T extends string>(options: Option<T>[], value: T, onChange: (value: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent) => {
    const index = options.findIndex((option) => option.value === value);
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    let next: number | undefined;
    if (delta !== undefined) next = (index + delta + options.length) % options.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = options.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return { refs, onKeyDown };
}

interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}

/** A compact radio group styled as a segmented control. */
export function SegmentedControl<T extends string>({ options, value, onChange, label, className, size = 'md' }: SegmentedProps<T>) {
  const { refs, onKeyDown } = useArrowKeys(options, value, onChange);
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={cn('inline-flex rounded-lg border border-border bg-surface-2 p-0.5', className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => { refs.current[index] = element; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              selected ? 'bg-surface text-fg shadow-card' : 'text-fg-3 hover:text-fg',
            )}
          >
            {option.label}
            {option.count !== undefined && <span className="tabular text-fg-3">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

interface TabsProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  panelId: string;
}

/** Underlined tabs following the WAI-ARIA tabs pattern (automatic activation). */
export function Tabs<T extends string>({ options, value, onChange, label, panelId }: TabsProps<T>) {
  const { refs, onKeyDown } = useArrowKeys(options, value, onChange);
  const baseId = useId();
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="relative -mx-1 flex gap-1 overflow-x-auto border-b border-border px-1">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            id={`${baseId}-${option.value}`}
            ref={(element) => { refs.current[index] = element; }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              '-mb-px inline-flex h-10 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 text-sm font-medium transition-colors',
              selected ? 'border-accent text-fg' : 'border-transparent text-fg-3 hover:text-fg',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="tabular rounded bg-surface-2 px-1.5 text-xs text-fg-3">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
