import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarCheck, CheckCircle2, Clock, ListChecks } from 'lucide-react';
import { useWorkspace } from '../app/contexts';
import { DIFFICULTIES } from '../adaptive';
import { ActivityHeatmap } from '../components/charts/ActivityHeatmap';
import { BarList } from '../components/charts/BarList';
import { ChartCard, DataTable } from '../components/charts/ChartCard';
import { LineTrend, type TrendSeries } from '../components/charts/LineTrend';
import { MasteryMeter, SubjectDot } from '../components/learning/badges';
import { DIFFICULTY_LABEL } from '../components/learning/labels';
import { ButtonLink } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { EmptyState, PageHeader, StatTile } from '../components/ui/misc';
import { SegmentedControl } from '../components/ui/Tabs';
import { heatmapWeeks, masteryTimeline } from '../domain/activity';
import { topicHref } from '../domain/recommendations';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { addDays, calendarDaysBetween, formatDuration, parseDayKey } from '../utils/date';

type Range = '30' | '90' | 'all';

const formatDay = (key: string) => parseDayKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function AnalyticsPage() {
  const { data, curriculum, stats, statuses, activity, now, streak, subjectColor } = useWorkspace();
  const [range, setRange] = useState<Range>('30');
  useDocumentTitle('Analytics');

  const attempts = useMemo(() => data.attempts.filter((attempt) => curriculum.graph.has(attempt.conceptId)), [data.attempts, curriculum]);
  const firstAttempt = attempts[0];
  const days = range === 'all'
    ? Math.min(365, Math.max(7, firstAttempt ? calendarDaysBetween(new Date(firstAttempt.answeredAt), now) + 1 : 7))
    : Number(range);
  const since = addDays(now, -(days - 1));
  since.setHours(0, 0, 0, 0);
  const inRange = attempts.filter((attempt) => new Date(attempt.answeredAt) >= since);

  const timeline = useMemo(
    () => masteryTimeline(attempts, (id) => curriculum.concept(id)?.subject, days, now),
    [attempts, curriculum, days, now],
  );

  const practisedSubjects = curriculum.subjects.filter((subject) => curriculum.conceptsBySubject(subject.id).some((concept) => stats.has(concept.id)));
  const series: TrendSeries[] = [
    ...practisedSubjects.map((subject) => ({ key: subject.id, label: subject.name, color: subjectColor(subject.id), emphasis: false })),
    { key: 'overall', label: 'Overall', color: 'var(--text)' },
  ];
  const chartData = timeline.map((point) => ({ date: point.date, overall: point.mastery, ...point.bySubject }));
  const hasSubjectLines = practisedSubjects.length > 1;
  const trendSeries = hasSubjectLines ? series : [{ key: 'overall', label: 'Overall', color: 'var(--accent-solid)' }];

  const correct = inRange.filter((attempt) => attempt.correct).length;
  const accuracy = inRange.length > 0 ? Math.round((correct / inRange.length) * 100) : null;
  const time = inRange.reduce((sum, attempt) => sum + attempt.durationMs, 0);
  const activeDays = new Set([...activity.keys()].filter((key) => parseDayKey(key) >= since)).size;
  const firstGaps = timeline.find((point) => point.practiced > 0)?.openGaps;
  const lastGaps = timeline[timeline.length - 1]?.openGaps ?? 0;

  const subjectBars = curriculum.subjects.map((subject) => {
    const concepts = curriculum.conceptsBySubject(subject.id);
    const practiced = concepts.filter((concept) => stats.has(concept.id));
    const mastered = concepts.filter((concept) => statuses.get(concept.id)?.status === 'mastered').length;
    return {
      key: subject.id,
      label: <span className="flex items-center gap-2"><SubjectDot color={subjectColor(subject.id)} />{subject.name}<span className="text-fg-3">· {mastered}/{concepts.length} mastered</span></span>,
      value: practiced.length > 0 ? Math.round(practiced.reduce((sum, concept) => sum + stats.get(concept.id)!.mastery, 0) / practiced.length) : null,
      color: subjectColor(subject.id),
    };
  }).filter((bar) => curriculum.conceptsBySubject(bar.key).length > 0);

  const difficultyBars = DIFFICULTIES.map((difficulty) => {
    const bucket = inRange.filter((attempt) => attempt.difficulty === difficulty);
    return {
      key: difficulty,
      label: `${DIFFICULTY_LABEL[difficulty]} · ${bucket.length} ${bucket.length === 1 ? 'answer' : 'answers'}`,
      value: bucket.length > 0 ? Math.round((bucket.filter((attempt) => attempt.correct).length / bucket.length) * 100) : null,
      color: 'var(--accent-solid)',
    };
  });

  const misconceptionCounts = new Map<string, number>();
  inRange.forEach((attempt) => {
    if (attempt.correct || !attempt.misconceptionId || attempt.misconceptionId === 'unknown') return;
    misconceptionCounts.set(attempt.misconceptionId, (misconceptionCounts.get(attempt.misconceptionId) ?? 0) + 1);
  });
  const topMisconceptions = [...misconceptionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxMisconception = topMisconceptions[0]?.[1] ?? 1;

  const ranked = [...stats.values()].filter((item) => curriculum.concept(item.conceptId)).sort((a, b) => b.mastery - a.mastery);
  const strongest = ranked.slice(0, 5);
  const weakest = [...ranked].reverse().slice(0, 5);
  const weeks = useMemo(() => heatmapWeeks(activity, now, 52), [activity, now]);

  if (attempts.length === 0) {
    return (
      <>
        <PageHeader title="Analytics" />
        <Card>
          <EmptyState
            icon={<BarChart3 />}
            title="Nothing to analyze yet"
            description="Charts of your mastery, gaps, accuracy, and activity build up from your answers. Take a diagnostic to get started."
            action={<ButtonLink to="/app/practice" variant="primary">Go to practice</ButtonLink>}
          />
        </Card>
      </>
    );
  }

  const topicRow = (item: (typeof ranked)[number]) => {
    const concept = curriculum.concept(item.conceptId)!;
    return (
      <li key={item.conceptId}>
        <Link to={topicHref(item.conceptId)} className="block rounded-md hover:bg-surface-2">
          <span className="mb-1 flex items-center gap-2 text-[13px]"><SubjectDot color={subjectColor(concept.subject)} /><span className="truncate text-fg">{concept.name}</span></span>
          <MasteryMeter mastery={item.mastery} status={statuses.get(item.conceptId)!.status} label={concept.name} />
        </Link>
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title="Analytics"
        description="How your knowledge is changing, measured from every answer you've given."
        actions={(
          <SegmentedControl
            label="Date range"
            value={range}
            onChange={setRange}
            options={[{ value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }, { value: 'all', label: 'All time' }]}
          />
        )}
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Questions answered" icon={<ListChecks />} value={inRange.length.toLocaleString()} detail={`${attempts.length.toLocaleString()} all time`} />
          <StatTile label="Accuracy" icon={<CheckCircle2 />} value={accuracy === null ? '—' : `${accuracy}%`} detail={`${correct} correct`} />
          <StatTile label="Time practicing" icon={<Clock />} value={formatDuration(time)} detail={inRange.length > 0 ? `${formatDuration(time / inRange.length)} per question` : '—'} />
          <StatTile label="Active days" icon={<CalendarCheck />} value={activeDays} detail={`Current streak ${streak.current} · best ${streak.longest}`} />
        </div>

        <ChartCard
          title="Mastery over time"
          description={hasSubjectLines ? 'Average mastery of the topics you have practiced, overall and per subject.' : 'Average mastery of the topics you have practiced.'}
          chart={(
            <LineTrend
              data={chartData}
              xKey="date"
              series={trendSeries}
              formatX={formatDay}
              area={!hasSubjectLines}
              height={280}
              ariaLabel={`Mastery over the last ${days} days`}
            />
          )}
          table={(
            <DataTable
              caption="Average mastery by day"
              columns={['Date', ...trendSeries.map((item) => item.label)]}
              rows={chartData.filter((row) => row.overall !== null).map((row) => [
                formatDay(row.date),
                ...trendSeries.map((item) => {
                  const value = (row as Record<string, unknown>)[item.key];
                  return typeof value === 'number' ? `${value}%` : '—';
                }),
              ])}
            />
          )}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Open gaps"
            description={firstGaps !== undefined && firstGaps !== lastGaps
              ? `Practiced topics below 70% mastery: ${firstGaps} → ${lastGaps} over this period.`
              : 'Practiced topics below 70% mastery at the end of each day.'}
            chart={(
              <LineTrend
                data={timeline.map((point) => ({ date: point.date, gaps: point.practiced > 0 ? point.openGaps : null }))}
                xKey="date"
                series={[{ key: 'gaps', label: 'Open gaps', color: 'var(--accent-solid)' }]}
                formatX={formatDay}
                formatY={(value) => String(value)}
                yDomain={[0, Math.max(4, ...timeline.map((point) => point.openGaps))]}
                yTicks="auto"
                step
                height={220}
                ariaLabel={`Open gaps went from ${firstGaps ?? 0} to ${lastGaps}`}
              />
            )}
            table={(
              <DataTable
                caption="Open gaps by day"
                columns={['Date', 'Open gaps', 'Topics practiced']}
                rows={timeline.filter((point) => point.practiced > 0).map((point) => [formatDay(point.date), point.openGaps, point.practiced])}
              />
            )}
          />
          <Card>
            <CardHeader title="Mastery by subject" description="Average across practiced topics." />
            <CardBody className="pt-4"><BarList items={subjectBars} emptyLabel="Not started" /></CardBody>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader title="Strongest topics" />
            <CardBody className="pt-3"><ul className="space-y-3">{strongest.map(topicRow)}</ul></CardBody>
          </Card>
          <Card>
            <CardHeader title="Weakest topics" />
            <CardBody className="pt-3"><ul className="space-y-3">{weakest.map(topicRow)}</ul></CardBody>
          </Card>
          <Card>
            <CardHeader title="Accuracy by difficulty" description="In the selected period." />
            <CardBody className="pt-4"><BarList items={difficultyBars} emptyLabel="No answers" /></CardBody>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader title="Most frequent misconceptions" description="In the selected period." />
            <CardBody className="pt-4">
              {topMisconceptions.length === 0 ? (
                <p className="text-[13px] text-fg-3">No misconceptions recorded in this period.</p>
              ) : (
                <BarList
                  max={maxMisconception}
                  format={(value) => `${value}×`}
                  items={topMisconceptions.map(([id, count]) => ({
                    key: id,
                    label: curriculum.misconception(id)?.title ?? id,
                    value: count,
                    color: 'var(--accent-solid)',
                    detail: curriculum.misconception(id)?.description,
                  }))}
                />
              )}
            </CardBody>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader title="Practice calendar" description="Answers per day." />
            <CardBody className="pt-4"><ActivityHeatmap weeks={weeks} /></CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
