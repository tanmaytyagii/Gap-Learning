import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Database, Download, ExternalLink, Palette, RefreshCw, Sparkles, Trash2, Upload, User } from 'lucide-react';
import { useContent, useTheme, useWorkspace, type ThemePreference } from '../app/contexts';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Field, Input } from '../components/ui/Field';
import { useConfirm, useToast } from '../components/ui/feedback-context';
import { PageHeader } from '../components/ui/misc';
import { SegmentedControl } from '../components/ui/Tabs';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { actions, loadSampleData, replaceData, resetData } from '../store';
import { parseLearnerData } from '../store/schema';
import { dayKey } from '../utils/date';

const REPOSITORY_URL = 'https://github.com/tanmaytyagii/Gap-Learning';

function Row({ title, description, action }: { title: string; description: ReactNode; action: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="mt-0.5 text-[13px] leading-5 text-fg-3">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { data } = useWorkspace();
  const content = useContent();
  const theme = useTheme();
  const confirm = useConfirm();
  const toast = useToast();
  const [name, setName] = useState(data.profile.name);
  const fileInput = useRef<HTMLInputElement>(null);
  useDocumentTitle('Settings');

  const size = new Blob([JSON.stringify(data)]).size;
  const hasData = data.attempts.length > 0 || data.notes.length > 0 || data.customConcepts.length > 0 || data.goals.length > 0;

  const saveName = () => {
    if (name.trim() === data.profile.name) return;
    actions.setProfileName(name);
    toast({ title: 'Name saved' });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gaplearning-export-${dayKey(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export downloaded', description: `${data.attempts.length} answers, ${data.notes.length} notes, ${data.goals.length} goals.` });
  };

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ tone: 'error', title: 'File too large', description: 'Exports are normally well under 10 MB.' });
      return;
    }
    let parsed;
    try {
      parsed = parseLearnerData(JSON.parse(await file.text()));
    } catch (error) {
      toast({ tone: 'error', title: 'Could not import that file', description: error instanceof SyntaxError ? 'It is not valid JSON.' : (error as Error).message });
      return;
    }
    const ok = await confirm({
      title: 'Replace your workspace?',
      description: `The file has ${parsed.data.attempts.length} answers, ${parsed.data.notes.length} notes, and ${parsed.data.goals.length} goals. It will replace everything currently in this browser${hasData ? ` (${data.attempts.length} answers)` : ''}.`,
      confirmLabel: 'Import and replace',
      destructive: hasData,
    });
    if (!ok) return;
    replaceData(parsed.data);
    setName(parsed.data.profile.name);
    toast({
      title: 'Workspace imported',
      description: parsed.dropped > 0 ? `${parsed.dropped} invalid ${parsed.dropped === 1 ? 'record was' : 'records were'} skipped.` : undefined,
    });
  };

  const loadSample = async () => {
    if (hasData && !(await confirm({
      title: 'Replace your data with the sample?',
      description: 'The sample workspace replaces everything in this browser. Export first if you want to keep your data.',
      confirmLabel: 'Load sample data',
      destructive: true,
    }))) return;
    loadSampleData();
    setName('Sample learner');
    toast({ title: 'Sample workspace loaded' });
  };

  const reset = async () => {
    const ok = await confirm({
      title: 'Delete all data?',
      description: 'This permanently removes every answer, note, resource, goal, custom topic, and question stored in this browser. Export first if you might want it back.',
      confirmLabel: 'Delete everything',
      destructive: true,
    });
    if (!ok) return;
    resetData();
    setName('');
    toast({ title: 'All data deleted', description: 'You have a fresh workspace.' });
  };

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader icon={<User className="size-4" />} title="Profile" />
          <CardBody className="pt-4">
            <form onSubmit={(event) => { event.preventDefault(); saveName(); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Your name" optional hint="Used for the dashboard greeting." className="flex-1">
                {(control) => <Input {...control} value={name} onChange={(event) => setName(event.target.value)} onBlur={saveName} maxLength={60} placeholder="e.g. Alex" />}
              </Field>
              <Button type="submit" className="sm:mb-6">Save</Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<Palette className="size-4" />} title="Appearance" />
          <CardBody className="pt-4">
            <SegmentedControl<ThemePreference>
              label="Theme"
              value={theme.preference}
              onChange={theme.setPreference}
              options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'Match system' }]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<Sparkles className="size-4" />} title="Content & AI" />
          <CardBody className="pt-4">
            <div className="divide-y divide-border">
              <Row
                title="Question bank"
                description={content.status === 'online'
                  ? 'Connected to the GapLearning API. Curated questions come from the server.'
                  : content.status === 'loading' ? 'Connecting to the API…' : 'The API is not reachable, so the question bank bundled with the app is in use. Everything except AI still works.'}
                action={(
                  <div className="flex items-center gap-2">
                    <Badge tone={content.status === 'online' ? 'success' : content.status === 'loading' ? 'neutral' : 'warning'}>
                      {content.status === 'online' ? 'Online' : content.status === 'loading' ? 'Connecting' : 'Offline'}
                    </Badge>
                    {content.status === 'offline' && <Button size="sm" icon={<RefreshCw className="size-3.5" />} onClick={content.retry}>Retry</Button>}
                  </div>
                )}
              />
              <Row
                title="AI assistant"
                description={content.ai.enabled
                  ? `Tutor, explanations, and question generation run through the server using ${content.ai.model}. Your notes are sent only when you ask for AI help with them.`
                  : 'Tutor chat, personalized explanations, and question generation need the API server started with a GEMINI_API_KEY. Guided hints still work without it.'}
                action={<Badge tone={content.ai.enabled ? 'success' : 'neutral'}>{content.ai.enabled ? 'Enabled' : 'Not configured'}</Badge>}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={<Database className="size-4" />}
            title="Your data"
            description={`Stored only in this browser (${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB). Nothing is uploaded unless you use an AI feature.`}
          />
          <CardBody className="pt-4">
            <div className="divide-y divide-border">
              <Row
                title="Export"
                description="Download everything as a JSON file: a backup, or a way to move to another browser."
                action={<Button icon={<Download className="size-4" />} onClick={exportData}>Export JSON</Button>}
              />
              <Row
                title="Import"
                description="Restore from an export. The file is validated first, and invalid records are skipped."
                action={(
                  <>
                    <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" onChange={importData} aria-label="Choose an export file" tabIndex={-1} />
                    <Button icon={<Upload className="size-4" />} onClick={() => fileInput.current?.click()}>Import JSON</Button>
                  </>
                )}
              />
              <Row
                title="Sample data"
                description={data.meta.sample ? 'You are viewing the sample workspace.' : 'Load a simulated learner with four weeks of history to explore every feature.'}
                action={<Button onClick={loadSample} disabled={data.meta.sample}>Load sample</Button>}
              />
              <Row
                title="Delete all data"
                description="Start over with an empty workspace. This cannot be undone."
                action={<Button variant="danger" icon={<Trash2 className="size-4" />} onClick={reset}>Delete everything</Button>}
              />
            </div>
          </CardBody>
        </Card>

        <p className="text-[13px] text-fg-3">
          GapLearning is open source.{' '}
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-accent-fg hover:underline">
            View the code on GitHub <ExternalLink className="size-3.5" aria-hidden /><span className="sr-only">(opens in a new tab)</span>
          </a>
        </p>
      </div>
    </>
  );
}
