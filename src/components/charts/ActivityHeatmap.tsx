import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { HeatmapCell } from '../../domain/activity';
import { parseDayKey } from '../../utils/date';

const CELL = 12;
const GAP = 3;
const LABEL_WIDTH = 28;

const LEVELS = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)'];
const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function level(count: number): number {
  if (count === 0) return 0;
  if (count <= 5) return 1;
  if (count <= 10) return 2;
  if (count <= 20) return 3;
  return 4;
}

const formatDay = (key: string) => parseDayKey(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

/**
 * Calendar of answered questions per day on a single-hue sequential ramp. Shows as many of the
 * most recent weeks as fit the container, so it fills wide cards and never scrolls on phones.
 */
export function ActivityHeatmap({ weeks: allWeeks }: { weeks: HeatmapCell[][] }) {
  const [hovered, setHovered] = useState<{ cell: HeatmapCell; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(Math.min(allWeeks.length, 18));

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const columns = Math.floor((entry.contentRect.width - LABEL_WIDTH) / (CELL + GAP));
      setFit(Math.max(4, Math.min(allWeeks.length, columns)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [allWeeks.length]);

  const weeks = useMemo(() => allWeeks.slice(-fit), [allWeeks, fit]);

  const months = useMemo(() => {
    const labels = weeks.map((week, index) => {
      const first = parseDayKey(week[0].date);
      const previous = index > 0 ? parseDayKey(weeks[index - 1][0].date) : null;
      return !previous || previous.getMonth() !== first.getMonth() ? first.toLocaleDateString(undefined, { month: 'short' }) : '';
    });
    // Drop a label that has less than three columns before the next one, so labels never collide.
    return labels.map((label, index) => (label && labels.slice(index + 1, index + 3).some(Boolean) ? '' : label));
  }, [weeks]);

  const cells = weeks.flat().filter((cell) => !cell.inFuture);
  const activeDays = cells.filter((cell) => cell.count > 0).length;
  const total = cells.reduce((sum, cell) => sum + cell.count, 0);

  return (
    <div className="relative" ref={containerRef}>
      <p className="sr-only">{`${total} questions answered on ${activeDays} of the last ${cells.length} days shown.`}</p>
      <div className="pb-1" aria-hidden>
        <div className="inline-grid" style={{ gap: GAP, gridTemplateColumns: `${LABEL_WIDTH - GAP}px repeat(${weeks.length}, ${CELL}px)` }}>
          <span />
          {months.map((month, index) => (
            <span key={index} className="h-4 overflow-visible whitespace-nowrap text-[11px] leading-4 text-fg-3">{month}</span>
          ))}
          {WEEKDAYS.map((weekday, row) => (
            <div key={row} className="contents">
              <span className="text-[11px] leading-3 text-fg-3">{weekday}</span>
              {weeks.map((week) => {
                const cell = week[row];
                return (
                  <span
                    key={cell.date}
                    className="size-3 rounded-[3px] transition-[outline-color]"
                    style={{
                      backgroundColor: cell.inFuture ? 'transparent' : LEVELS[level(cell.count)],
                      outline: hovered?.cell.date === cell.date ? '1px solid var(--text-2)' : '1px solid transparent',
                    }}
                    onMouseEnter={(event) => {
                      if (cell.inFuture) return;
                      const target = event.currentTarget.getBoundingClientRect();
                      const parent = event.currentTarget.closest('.relative')!.getBoundingClientRect();
                      setHovered({ cell, x: target.left - parent.left + 6, y: target.top - parent.top });
                    }}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-pop"
          style={{ left: hovered.x, top: hovered.y - 6 }}
        >
          <span className="font-semibold text-fg">{hovered.cell.count} {hovered.cell.count === 1 ? 'answer' : 'answers'}</span>
          <span className="text-fg-3"> · {formatDay(hovered.cell.date)}</span>
        </div>
      )}
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-3" aria-hidden>
        <span>Less</span>
        {LEVELS.map((color) => <span key={color} className="size-3 rounded-[3px]" style={{ backgroundColor: color }} />)}
        <span>More</span>
      </div>
    </div>
  );
}
