import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../app/contexts';
import { MODE_LABEL } from '../components/learning/labels';
import { SessionResults } from '../components/practice/SessionResults';
import { ButtonLink } from '../components/ui/Button';
import { PageHeader } from '../components/ui/misc';
import { practiceHref } from '../domain/recommendations';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDate } from '../utils/date';
import { NotFoundPage } from './ErrorPages';

export default function SessionReportPage() {
  const { sessionId } = useParams();
  const workspace = useWorkspace();
  const { data, curriculum } = workspace;
  const record = data.sessions.find((session) => session.id === sessionId);
  const questionsById = useMemo(() => new Map(workspace.questions.map((question) => [question.id, question])), [workspace.questions]);
  const title = !record ? 'Page not found'
    : record.mode === 'diagnostic' ? `${curriculum.subject(record.subjectId)?.name ?? 'Subject'} diagnostic`
      : record.mode === 'review' ? 'Review session'
        : curriculum.concept(record.conceptIds[0])?.name ?? 'Practice session';
  useDocumentTitle(title);

  if (!record) return <NotFoundPage inApp />;

  const attempts = data.attempts.filter((attempt) => attempt.sessionId === record.id);
  const suggestion = record.report?.suggestedNextAssessment;

  return (
    <>
      <Link to="/app/practice" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Practice
      </Link>
      <PageHeader
        eyebrow={`${MODE_LABEL[record.mode]} · ${formatDate(record.startedAt, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}${record.completed ? '' : ' · ended early'}`}
        title={title}
        description={suggestion ? `${suggestion.reason} Suggested next: ${suggestion.concept}.` : undefined}
        actions={suggestion && curriculum.concept(suggestion.conceptId) && workspace.questionCount(suggestion.conceptId) > 0 ? (
          <ButtonLink to={practiceHref(suggestion.conceptId)} variant="primary" icon={<ArrowRight className="size-4" />}>Practice {suggestion.concept}</ButtonLink>
        ) : undefined}
      />
      {attempts.length === 0 ? (
        <p className="text-sm text-fg-3">The answers from this session are no longer stored (the topic may have been deleted).</p>
      ) : (
        <SessionResults record={record} attempts={attempts} curriculum={curriculum} questionsById={questionsById} statuses={workspace.statuses} reviews={workspace.reviews} now={workspace.now} />
      )}
    </>
  );
}
