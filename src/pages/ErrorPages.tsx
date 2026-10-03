import type { ReactNode } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { AlertTriangle, Compass, RotateCw } from 'lucide-react';
import { Button, ButtonLink } from '../components/ui/Button';
import { Logo } from '../components/layout/Logo';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function Frame({ fullPage, children }: { fullPage: boolean; children: ReactNode }) {
  if (!fullPage) return <div className="py-10">{children}</div>;
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4">
      <div className="mx-auto w-full max-w-6xl py-5"><Logo /></div>
      <div className="flex flex-1 items-center justify-center pb-24">{children}</div>
    </div>
  );
}

export function NotFoundPage({ inApp = false }: { inApp?: boolean }) {
  useDocumentTitle('Page not found');
  return (
    <Frame fullPage={!inApp}>
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-fg-3">
          <Compass className="size-5" aria-hidden />
        </div>
        <p className="text-sm font-medium text-accent-fg">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">This page doesn't exist</h1>
        <p className="mt-2 text-sm leading-6 text-fg-2">The link may be outdated, or the topic or session it pointed to was removed.</p>
        <div className="mt-6 flex justify-center gap-2">
          <ButtonLink to="/app" variant="primary">Go to dashboard</ButtonLink>
          {!inApp && <ButtonLink to="/">Home</ButtonLink>}
        </div>
      </div>
    </Frame>
  );
}

export function RouteError({ fullPage = false }: { fullPage?: boolean }) {
  const error = useRouteError();
  useDocumentTitle('Something went wrong');
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage inApp={!fullPage} />;

  // A failed dynamic import usually means a new version was deployed; a reload fixes it.
  const message = error instanceof Error ? error.message : '';
  const staleBundle = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(message);

  return (
    <Frame fullPage={fullPage}>
      <div className="mx-auto max-w-md text-center" role="alert">
        <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-danger">
          <AlertTriangle className="size-5" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{staleBundle ? 'A new version is available' : 'Something went wrong'}</h1>
        <p className="mt-2 text-sm leading-6 text-fg-2">
          {staleBundle
            ? 'Reload the page to get the latest version. Your data is saved in this browser.'
            : 'This page hit an unexpected error. Your data is saved in this browser, so reloading is safe.'}
        </p>
        {!staleBundle && message && <p className="mt-3 break-words rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs text-fg-3">{message}</p>}
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="primary" icon={<RotateCw className="size-4" />} onClick={() => window.location.reload()}>Reload</Button>
          <ButtonLink to="/app">Go to dashboard</ButtonLink>
        </div>
      </div>
    </Frame>
  );
}
