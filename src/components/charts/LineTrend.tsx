import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  /** Emphasized series are drawn heavier; others recede. */
  emphasis?: boolean;
}

interface LineTrendProps {
  data: Record<string, string | number | null>[];
  xKey: string;
  series: TrendSeries[];
  formatX: (value: string) => string;
  formatY?: (value: number) => string;
  yDomain?: [number, number];
  /** Fixed tick values, or 'auto' to let the chart choose whole-number ticks. */
  yTicks?: number[] | 'auto';
  height?: number;
  /** Adds a light wash under a single series. */
  area?: boolean;
  ariaLabel: string;
  step?: boolean;
}

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number | null;
}

function TrendTooltip({ active, payload, label, series, formatX, formatY }: {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  label?: string;
  series: TrendSeries[];
  formatX: (value: string) => string;
  formatY: (value: number) => string;
}) {
  if (!active || !payload?.length || label === undefined) return null;
  const rows = series
    .map((item) => ({ item, value: payload.find((entry) => entry.dataKey === item.key)?.value }))
    .filter((row) => row.value !== null && row.value !== undefined);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] shadow-pop">
      <p className="mb-1 text-xs text-fg-3">{formatX(String(label))}</p>
      <ul className="space-y-0.5">
        {rows.map(({ item, value }) => (
          <li key={item.key} className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
            <span className="tabular font-semibold text-fg">{formatY(value as number)}</span>
            <span className="text-fg-3">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Line (or step) chart with a crosshair tooltip that lists every series at the hovered date. */
export function LineTrend({
  data, xKey, series, formatX, formatY = (value) => `${value}%`, yDomain = [0, 100], yTicks = [0, 25, 50, 75, 100],
  height = 240, area = false, ariaLabel, step = false,
}: LineTrendProps) {
  const lastRow = [...data].reverse().find((row) => series.some((item) => row[item.key] !== null && row[item.key] !== undefined));
  const endValues = series
    .map((item) => ({ item, value: lastRow?.[item.key] as number | null | undefined }))
    .filter((entry): entry is { item: TrendSeries; value: number } => typeof entry.value === 'number');
  // End labels only when they cannot collide; otherwise the legend and tooltip carry identity.
  const span = yDomain[1] - yDomain[0];
  const sorted = [...endValues].sort((a, b) => a.value - b.value);
  const separated = series.length <= 4 && sorted.every((entry, index) => index === 0 || entry.value - sorted[index - 1].value >= span * 0.08);
  const lastIndex = lastRow ? data.indexOf(lastRow) : -1;
  const curve = step ? 'stepAfter' : 'monotone';

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: separated && series.length > 1 ? 72 : 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
          <XAxis
            dataKey={xKey}
            tickFormatter={formatX}
            tick={{ fill: 'var(--text-3)', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--axis)' }}
            minTickGap={28}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={yDomain}
            ticks={yTicks === 'auto' ? undefined : yTicks}
            tickFormatter={formatY}
            tick={{ fill: 'var(--text-3)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }}
            content={(props) => (
              <TrendTooltip
                active={props.active}
                payload={props.payload as readonly TooltipPayloadItem[] | undefined}
                label={props.label as string | undefined}
                series={series}
                formatX={formatX}
                formatY={formatY}
              />
            )}
          />
          {area && series.length === 1 && (
            <Area type={curve} dataKey={series[0].key} stroke="none" fill={series[0].color} fillOpacity={0.1} isAnimationActive={false} connectNulls={false} />
          )}
          {series.map((item) => (
            <Line
              key={item.key}
              type={curve}
              dataKey={item.key}
              name={item.label}
              stroke={item.color}
              strokeWidth={item.emphasis === false ? 1.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, fill: item.color, stroke: 'var(--surface)', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
              label={separated && series.length > 1 ? (props: { index?: number; x?: number | string; y?: number | string }) => {
                if (props.index !== lastIndex) return <g />;
                return (
                  <text x={Number(props.x) + 8} y={Number(props.y)} dy={4} fontSize={12} fill="var(--text-2)">
                    {item.label}
                  </text>
                );
              } : undefined}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      {series.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-2" aria-label="Legend">
          {series.map((item) => (
            <li key={item.key} className="flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
