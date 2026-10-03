import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useNavigation } from 'react-router-dom';
import {
  BarChart3, Flag, LayoutDashboard, Library, ListChecks, Menu, Monitor, Moon, PlayCircle, Route, Settings, Sun, Target, X,
} from 'lucide-react';
import { useContent, useTheme, useWorkspace, type ThemePreference } from '../../app/contexts';
import { useConfirm, useToast } from '../ui/feedback-context';
import { Sheet } from '../ui/Sheet';
import { resetData } from '../../store';
import { cn } from '../../utils/cn';
import { Logo } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  count?: (workspace: ReturnType<typeof useWorkspace>) => number;
}

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Learn',
    items: [
      { to: '/app/gaps', label: 'Gaps', icon: Target, count: (workspace) => workspace.gaps.filter((gap) => gap.severity === 'critical' || gap.severity === 'high').length },
      { to: '/app/topics', label: 'Topics', icon: Library },
      { to: '/app/roadmap', label: 'Roadmap', icon: Route },
      { to: '/app/goals', label: 'Goals', icon: Flag },
    ],
  },
  {
    label: 'Practice',
    items: [
      { to: '/app/practice', label: 'Practice', icon: PlayCircle, count: (workspace) => workspace.due.length },
      { to: '/app/questions', label: 'Question bank', icon: ListChecks },
    ],
  },
];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  return (
    <div role="radiogroup" aria-label="Color theme" className="flex rounded-lg border border-border bg-surface-2 p-0.5">
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          aria-label={label}
          title={label}
          onClick={() => setPreference(value)}
          className={cn(
            'flex h-7 flex-1 items-center justify-center rounded-md transition-colors',
            preference === value ? 'bg-surface text-fg shadow-card' : 'text-fg-3 hover:text-fg',
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}

function StatusLine() {
  const content = useContent();
  const label = content.status === 'loading' ? 'Connecting…' : content.status === 'online' ? 'Synced with server' : 'Offline content';
  const dot = content.status === 'online' ? 'bg-success' : content.status === 'loading' ? 'bg-fg-3' : 'bg-warning';
  return (
    <div className="space-y-1 px-1 text-xs text-fg-3">
      <p className="flex items-center gap-2" title={content.status === 'offline' ? 'Using the question bank bundled with the app.' : undefined}>
        <span className={cn('size-1.5 rounded-full', dot)} aria-hidden />
        {label}
      </p>
      <p className="flex items-center gap-2">
        <span className={cn('size-1.5 rounded-full', content.ai.enabled ? 'bg-success' : 'bg-fg-3')} aria-hidden />
        {content.ai.enabled ? 'AI assistant on' : 'AI assistant off'}
      </p>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const workspace = useWorkspace();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Link to="/" onClick={onNavigate} className="rounded-md" aria-label="GapLearning home">
          <Logo />
        </Link>
      </div>
      <nav aria-label="Main" className="relative flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {NAV.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-fg-3">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end, count }) => {
                const value = count?.(workspace) ?? 0;
                return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={onNavigate}
                      className={({ isActive }) => cn(
                        'flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors',
                        isActive ? 'bg-surface-3 font-medium text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="flex-1 truncate">{label}</span>
                      {value > 0 && (
                        <span className="tabular rounded bg-accent-soft px-1.5 text-xs font-medium text-accent-fg">
                          {value}
                          <span className="sr-only">{to.endsWith('gaps') ? ' high-priority gaps' : ' reviews due'}</span>
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="space-y-3 border-t border-border p-3">
        <NavLink
          to="/app/settings"
          onClick={onNavigate}
          className={({ isActive }) => cn(
            'flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors',
            isActive ? 'bg-surface-3 font-medium text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
          )}
        >
          <Settings className="size-4" aria-hidden />
          Settings
        </NavLink>
        <ThemeSwitcher />
        <StatusLine />
      </div>
    </div>
  );
}

function SampleBanner() {
  const { data } = useWorkspace();
  const confirm = useConfirm();
  const toast = useToast();
  if (!data.meta.sample) return null;

  const clear = async () => {
    const ok = await confirm({
      title: 'Clear sample data?',
      description: 'This removes the sample learner and gives you an empty workspace to start your own.',
      confirmLabel: 'Clear sample data',
      destructive: true,
    });
    if (!ok) return;
    resetData();
    toast({ title: 'Sample data cleared', description: 'Your workspace is empty and ready.' });
  };

  return (
    <div className="no-print border-b border-border bg-accent-soft px-4 py-2 text-[13px] text-accent-fg sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p>You are exploring a <strong className="font-semibold">sample workspace</strong>. Its history was generated by simulating a learner on the real question bank.</p>
        <button type="button" onClick={clear} className="font-medium underline underline-offset-2 hover:no-underline">
          Clear sample data
        </button>
      </div>
    </div>
  );
}

function RouteProgress() {
  const navigation = useNavigation();
  if (navigation.state === 'idle') return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden" role="progressbar" aria-label="Loading page">
      <div className="h-full w-1/3 bg-accent" style={{ animation: 'progress-indeterminate 1s ease-in-out infinite' }} />
    </div>
  );
}

export function AppShell({ children }: { children?: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="sr-only z-50 rounded-md bg-surface px-3 py-2 text-sm font-medium shadow-pop focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <RouteProgress />
      <ScrollRestoration />

      <aside className="no-print fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-surface lg:block">
        <SidebarContent />
      </aside>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} side="left" label="Navigation" className="lg:hidden">
        <div className="relative h-full">
          <button type="button" onClick={() => setMenuOpen(false)} className="absolute right-3 top-3.5 z-10 rounded-md p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg" aria-label="Close navigation">
            <X className="size-4" />
          </button>
          <SidebarContent onNavigate={() => setMenuOpen(false)} />
        </div>
      </Sheet>

      <div className="lg:pl-60">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setMenuOpen(true)} className="-ml-1.5 rounded-md p-1.5 text-fg-2 hover:bg-surface-2" aria-label="Open navigation" aria-expanded={menuOpen}>
            <Menu className="size-5" />
          </button>
          <Link to="/app" aria-label="Dashboard"><Logo /></Link>
        </header>
        <SampleBanner />
        <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
