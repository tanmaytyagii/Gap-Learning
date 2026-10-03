import type { ComponentType, ReactNode } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { useContent } from './app/contexts';
import { ContentProvider, StoreNotices, ThemeProvider, WorkspaceProvider } from './app/providers';
import { AppShell } from './components/layout/AppShell';
import { ConfirmProvider, ToastProvider } from './components/ui/feedback';
import { PageSkeleton } from './components/layout/PageSkeleton';
import { NotFoundPage, RouteError } from './pages/ErrorPages';

type PageModule = { default: ComponentType };

/** Route-level code splitting: each page (and heavy dependencies like charts) loads on demand. */
const page = (load: () => Promise<PageModule>) => async () => ({ Component: (await load()).default });

const router = createBrowserRouter([
  {
    path: '/',
    lazy: page(() => import('./pages/LandingPage')),
    errorElement: <RouteError fullPage />,
    hydrateFallbackElement: <div className="min-h-dvh bg-bg" />,
  },
  {
    path: '/app',
    element: <AppShell />,
    errorElement: <RouteError fullPage />,
    hydrateFallbackElement: <AppShell><PageSkeleton /></AppShell>,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, lazy: page(() => import('./pages/DashboardPage')) },
          { path: 'gaps', lazy: page(() => import('./pages/GapsPage')) },
          { path: 'topics', lazy: page(() => import('./pages/TopicsPage')) },
          { path: 'topics/:conceptId', lazy: page(() => import('./pages/TopicDetailPage')) },
          { path: 'roadmap', lazy: page(() => import('./pages/RoadmapPage')) },
          { path: 'goals', lazy: page(() => import('./pages/GoalsPage')) },
          { path: 'practice', lazy: page(() => import('./pages/PracticePage')) },
          { path: 'practice/session', lazy: page(() => import('./pages/PracticeSessionPage')) },
          { path: 'practice/sessions/:sessionId', lazy: page(() => import('./pages/SessionReportPage')) },
          { path: 'analytics', lazy: page(() => import('./pages/AnalyticsPage')) },
          { path: 'questions', lazy: page(() => import('./pages/QuestionBankPage')) },
          { path: 'settings', lazy: page(() => import('./pages/SettingsPage')) },
          { path: '*', element: <NotFoundPage inApp /> },
        ],
      },
    ],
  },
  // Links from the previous version of the app keep working.
  { path: '/student', element: <Navigate to="/app" replace /> },
  { path: '/teacher', element: <Navigate to="/app/questions" replace /> },
  { path: '*', element: <NotFoundPage /> },
]);

function Workspace({ children }: { children: ReactNode }) {
  const { serverQuestions } = useContent();
  return <WorkspaceProvider serverQuestions={serverQuestions}>{children}</WorkspaceProvider>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <ContentProvider>
            <Workspace>
              <StoreNotices />
              <RouterProvider router={router} />
            </Workspace>
          </ContentProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
