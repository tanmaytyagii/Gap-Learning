import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface BarItem {
  key: string;
  label: ReactNode;
  value: number | null;
  color: string;
  detail?: string;
}

/**
 * Horizontal bars for a handful of categories: thin marks with a rounded data end, value at the
 * tip, label in text ink beside the bar. Plain HTML keeps it crisp, accessible, and themeable.
 */
export function BarList({ items, max = 100, format = (value) => `${value}%`, emptyLabel = 'No data yet' }: {
  items: BarItem[];
  max?: number;
  format?: (value: number) => string;
  emptyLabel?: string;
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const width = item.value === null ? 0 : Math.max(0, Math.min(100, (item.value / max) * 100));
        return (
          <li key={item.key} title={item.detail}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-fg-2">{item.label}</span>
              <span className={cn('tabular shrink-0', item.value === null ? 'text-fg-3' : 'font-medium text-fg')}>
                {item.value === null ? emptyLabel : format(item.value)}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-r bg-surface-2" aria-hidden>
              <div className="h-full rounded-r transition-[width] duration-500" style={{ width: `${width}%`, backgroundColor: item.color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
