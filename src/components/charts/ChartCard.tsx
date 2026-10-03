import { useState, type ReactNode } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { SegmentedControl } from '../ui/Tabs';

interface ChartCardProps {
  title: string;
  description?: ReactNode;
  chart: ReactNode;
  /** The same data as an accessible table: every chart has one, so values never depend on hover. */
  table: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function ChartCard({ title, description, chart, table, action, className }: ChartCardProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  return (
    <Card className={className}>
      <CardHeader
        title={title}
        description={description}
        action={(
          <>
            {action}
            <SegmentedControl
              size="sm"
              label={`${title} view`}
              value={view}
              onChange={setView}
              options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]}
            />
          </>
        )}
      />
      <div className="px-5 pb-5 pt-4">{view === 'chart' ? chart : <div className="relative max-h-80 overflow-auto">{table}</div>}</div>
    </Card>
  );
}

interface DataTableProps {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}

export function DataTable({ caption, columns, rows }: DataTableProps) {
  return (
    <table className="w-full text-left text-[13px]">
      <caption className="sr-only">{caption}</caption>
      <thead className="sticky top-0 bg-surface">
        <tr className="border-b border-border text-fg-3">
          {columns.map((column, index) => (
            <th key={column} scope="col" className={index === 0 ? 'py-2 pr-4 font-medium' : 'py-2 pl-4 text-right font-medium'}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b border-border last:border-0">
            {row.map((cell, index) => (
              index === 0
                ? <th key={index} scope="row" className="py-2 pr-4 font-normal text-fg-2">{cell}</th>
                : <td key={index} className="tabular py-2 pl-4 text-right text-fg">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
