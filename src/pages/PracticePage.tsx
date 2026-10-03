import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, ChevronRight, Compass, History, RotateCcw, Target } from 'lucide-react';
import { useWorkspace } from '../app/contexts';
import { DIFFICULTIES } from '../adaptive';
import { DIFFICULTY_LABEL, MODE_LABEL } from '../components/learning/labels';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Field, Select } from '../components/ui/Field';
import { EmptyState, PageHeader } from '../components/ui/misc';
import { SegmentedControl } from '../components/ui/Tabs';
import { diagnosticHref, reviewHref } from '../domain/recommendations';
import { intervalDays } from '../domain/review';
import type { SessionRecord } from '../domain/types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDate, formatDuration, formatRelative } from '../utils/date';

const PAGE_SIZE = 15;

export default function PracticePage() {
  const workspace = useWorkspace();
  const { curriculum, due, reviews, questionCount, gaps, data, now } = workspace;
  const navigate = useNavigate();
  useDocumentTitle('Practice');

  const practicable = curriculum.concepts.filter((concept) => questionCount(concept.id) > 0);
  const subjects = curriculum.subjects.filter((subject) => practicable.some((concept) => concept.subject === subject.id));
  const defaultConcept = gaps.find((gap) => questionCount(gap.conceptId) > 0)?.conceptId ?? practicable[0]?.id ?? '';

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [conceptId, setConceptId] = useState(defaultConcept);
  const [difficulty, setDifficulty] = useState<'auto' | 'easy' | 'medium' | 'hard'>('auto');
  const [count, setCount] = useState('6');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const nextReview = [...reviews.values()].filter((review) => !review.isDue).sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  const history = useMemo(() => [...data.sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt)), [data.sessions]);

  const sessionTitle = (session: SessionRecord) => {
    if (session.mode === 'diagnostic') return `${curriculum.subject(session.subjectId)?.name ?? 'Subject'} diagnostic`;
    if (session.mode === 'review') return `Review · ${session.conceptIds.length} ${session.conceptIds.length === 1 ? 'topic' : 'topics'}`;
    return curriculum.concept(session.conceptIds[0])?.name ?? 'Removed topic';
  };

  const startPractice = () => {
    const params = new URLSearchParams({ mode: 'practice', concept: conceptId, count });
    if (difficulty !== 'auto') params.set('difficulty', difficulty);
    navigate(`/app/practice/session?${params}`);
  };

  return (
    <>
      <PageHeader title="Practice" description="Every answer updates your mastery, gaps, and review schedule the moment you submit it." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader icon={<RotateCcw className="size-4" />} title="Spaced review" description="Short mixed sets, timed so you revisit topics just before you'd forget them." />
          <CardBody className="flex flex-1 flex-col pt-4">
            {due.length > 0 ? (
              <>
                <p className="text-2xl font-semibold tracking-tight">{due.length} <span className="text-base font-normal text-fg-3">{due.length === 1 ? 'topic due' : 'topics due'}</span></p>
                <ul className="mt-2 flex-1 space-y-1.5" aria-label="Topics due">
                  {due.slice(0, 4).map((review) => (
                    <li key={review.conceptId} className="text-[13px] leading-5">
                      <span className="font-medium text-fg">{curriculum.concept(review.conceptId)?.name}</span>
                      <span className="text-fg-3"> · {review.lastPassed ? 'passed' : 'missed'} {formatRelative(review.lastReviewedAt, now)}, interval {intervalDays(review.box)}d</span>
                    </li>
                  ))}
                  {due.length > 4 && <li className="text-xs text-fg-3">and {due.length - 4} more</li>}
                </ul>
                <ButtonLink to={reviewHref} variant="primary" className="mt-4 self-start">Start review</ButtonLink>
              </>
            ) : (
              <div className="flex flex-1 flex-col">
                <p className="flex items-center gap-2 text-sm font-medium text-fg"><CalendarClock className="size-4 text-fg-3" aria-hidden />Nothing due</p>
                <p className="mt-1 flex-1 text-[13px] leading-5 text-fg-3">
                  {nextReview ? `Next review: ${curriculum.concept(nextReview.conceptId)?.name}, ${formatRelative(nextReview.dueAt, now)}.` : 'Topics join the schedule once you practice them.'}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader icon={<Compass className="size-4" />} title="Adaptive diagnostic" description="Eight questions that follow the prerequisite graph to locate where understanding breaks down." />
          <CardBody className="flex flex-1 flex-col pt-4">
            {subjects.length === 0 ? (
              <p className="text-[13px] text-fg-3">Add questions to a subject to enable diagnostics.</p>
            ) : (
              <>
                <Field label="Subject" className="flex-1">
                  {(control) => (
                    <Select {...control} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                      {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                    </Select>
                  )}
                </Field>
                <ButtonLink to={diagnosticHref(subjectId)} className="mt-4 self-start">Start diagnostic</ButtonLink>
              </>
            )}
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader icon={<Target className="size-4" />} title="Targeted practice" description="Focus on one topic. Difficulty adapts after every answer." />
          <CardBody className="flex flex-1 flex-col gap-3 pt-4">
            {practicable.length === 0 ? (
              <p className="text-[13px] text-fg-3">No topics have questions yet.</p>
            ) : (
              <>
                <Field label="Topic">
                  {(control) => (
                    <Select {...control} value={conceptId} onChange={(event) => setConceptId(event.target.value)}>
                      {subjects.map((subject) => (
                        <optgroup key={subject.id} label={subject.name}>
                          {practicable.filter((concept) => concept.subject === subject.id).map((concept) => (
                            <option key={concept.id} value={concept.id}>{concept.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </Select>
                  )}
                </Field>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[13px] font-medium">Starting difficulty</p>
                    <SegmentedControl
                      size="sm"
                      label="Starting difficulty"
                      value={difficulty}
                      onChange={setDifficulty}
                      options={[{ value: 'auto', label: 'Auto' }, ...DIFFICULTIES.map((item) => ({ value: item, label: DIFFICULTY_LABEL[item] }))]}
                    />
                  </div>
                  <Field label="Questions" className="w-24">
                    {(control) => (
                      <Select {...control} value={count} onChange={(event) => setCount(event.target.value)}>
                        {['4', '6', '8', '10'].map((value) => <option key={value} value={value}>{value}</option>)}
                      </Select>
                    )}
                  </Field>
                </div>
                <Button onClick={startPractice} disabled={!conceptId} className="mt-auto self-start">Start practice</Button>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader icon={<History className="size-4" />} title="Session history" description={history.length > 0 ? `${history.length} ${history.length === 1 ? 'session' : 'sessions'}` : undefined} />
        <CardBody className="pt-3">
          {history.length === 0 ? (
            <EmptyState compact icon={<History />} title="No sessions yet" description="Completed and partial sessions show up here with their results." />
          ) : (
            <>
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[13px] text-fg-3">
                      <th scope="col" className="py-2 pr-4 font-medium">Session</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Date</th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">Score</th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">Time</th>
                      <th scope="col" className="py-2"><span className="sr-only">Open</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, visible).map((session) => {
                      const duration = new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime();
                      return (
                        <tr key={session.id} className="group border-b border-border last:border-0">
                          <td className="py-2.5 pr-4">
                            <Link to={`/app/practice/sessions/${session.id}`} className="font-medium text-fg hover:underline">{sessionTitle(session)}</Link>
                            <span className="block text-xs text-fg-3">{MODE_LABEL[session.mode]}{session.completed ? '' : ' · ended early'}</span>
                          </td>
                          <td className="py-2.5 pr-4 text-fg-2">{formatDate(session.endedAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                          <td className="tabular py-2.5 pr-4 text-right">{session.correctCount}/{session.questionCount}</td>
                          <td className="tabular py-2.5 pr-4 text-right text-fg-2">{formatDuration(duration)}</td>
                          <td className="py-2.5 text-right">
                            <Link to={`/app/practice/sessions/${session.id}`} className="inline-flex rounded p-1 text-fg-3 hover:text-fg" aria-label={`Open ${sessionTitle(session)} report`}>
                              <ChevronRight className="size-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {visible < history.length && (
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
                  Show {Math.min(PAGE_SIZE, history.length - visible)} more
                </Button>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </>
  );
}
