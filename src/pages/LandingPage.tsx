import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpenCheck, CalendarClock, CheckCircle2, Compass, GitBranch, Lock, MessageCircleQuestion,
  PenSquare, Route, Target, XCircle,
} from 'lucide-react';
import { ButtonLink } from '../components/ui/Button';
import { buttonStyles } from '../components/ui/button-styles';
import { GithubIcon } from '../components/layout/GithubIcon';
import { Logo } from '../components/layout/Logo';
import { BUILT_IN_MISCONCEPTIONS, SEED_QUESTIONS } from '../domain/curriculum';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const REPOSITORY_URL = 'https://github.com/tanmaytyagii/Gap-Learning';

// The hero shows a real question and diagnosis from the bundled curriculum.
const EXAMPLE = SEED_QUESTIONS.find((question) => question.id === 'frac-ops-m1')!;
const EXAMPLE_CHOICE = '2/5';
const EXAMPLE_MISCONCEPTION = BUILT_IN_MISCONCEPTIONS.find((item) => item.id === EXAMPLE.misconceptionMap[EXAMPLE_CHOICE])!;

const STEPS = [
  { icon: Compass, title: 'Diagnose', text: 'An adaptive diagnostic follows the prerequisite graph. Wrong answers step back to foundations; right answers move forward.' },
  { icon: Target, title: 'Prioritize', text: 'Every gap gets a severity score built from labeled reasons: low mastery, repeated misconceptions, what it blocks, and your priorities.' },
  { icon: BookOpenCheck, title: 'Practice', text: 'Targeted sets adapt difficulty after each answer. Each mistake is explained by the misconception behind it, with a fix.' },
  { icon: CalendarClock, title: 'Review and track', text: 'Spaced reviews bring topics back just before you forget them, and analytics show gaps closing over time.' },
];

const FEATURES = [
  { icon: XCircle, title: 'Misconception diagnosis', text: 'Every wrong option is mapped to the misconception it reveals, so feedback explains why, not just what.' },
  { icon: Target, title: 'Explainable gap scores', text: 'Recency- and difficulty-weighted mastery, with every point of a gap score shown and justified.' },
  { icon: Route, title: 'Prerequisite roadmap', text: 'See how topics build on each other and which one to learn next, with your status on every node.' },
  { icon: CalendarClock, title: 'Spaced review', text: 'A Leitner schedule derived from your answers. Passing on time moves a topic out; failing brings it back.' },
  { icon: PenSquare, title: 'Your own topics', text: 'Track any skill with prerequisites, notes, resources, goals, and questions you write yourself.' },
  { icon: MessageCircleQuestion, title: 'Optional AI tutor', text: 'With a server key configured: Socratic hints, personalized explanations, and questions generated from your notes.' },
];

export default function LandingPage() {
  useDocumentTitle(null);

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="GapLearning home"><Logo /></Link>
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
            <a href="#how-it-works" className="hidden rounded-md px-3 py-1.5 text-sm text-fg-2 hover:text-fg md:inline">How it works</a>
            <a href="#features" className="hidden rounded-md px-3 py-1.5 text-sm text-fg-2 hover:text-fg md:inline">Features</a>
            <a href="#privacy" className="hidden rounded-md px-3 py-1.5 text-sm text-fg-2 hover:text-fg md:inline">Privacy</a>
            <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: 'ghost', size: 'icon' })} aria-label="Source code on GitHub (opens in a new tab)">
              <GithubIcon className="size-4" />
            </a>
            <ButtonLink to="/app" variant="primary" size="sm">Open app</ButtonLink>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div>
            <p className="text-sm font-medium text-accent-fg">Adaptive diagnostics · explainable gap tracking</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-fg sm:text-5xl">
              Find the gaps in what you know. Close them on purpose.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-fg-2">
              GapLearning traces each wrong answer to the misconception behind it, ranks your gaps by how much they hold you back,
              and schedules the practice and reviews that close them.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/app" variant="primary" size="lg" icon={<ArrowRight className="size-4" />}>Open the app</ButtonLink>
              <a href="#how-it-works" className={buttonStyles({ size: 'lg' })}>See how it works</a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-fg-3">
              {['Free and open source', 'No account needed', 'Your data stays in your browser'].map((item) => (
                <li key={item} className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" aria-hidden />{item}</li>
              ))}
            </ul>
          </div>

          <figure className="rounded-2xl border border-border bg-surface p-5 shadow-pop sm:p-6" aria-label="Example of a diagnosed answer">
            <div className="flex items-center justify-between text-xs text-fg-3">
              <span className="font-medium text-fg-2">Fraction Operations</span>
              <span>Question 3 of 8</span>
            </div>
            <p className="mt-3 text-base font-medium text-fg">{EXAMPLE.question}</p>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {EXAMPLE.options.map((option) => (
                <li
                  key={option}
                  className={
                    option === EXAMPLE.correctAnswer ? 'flex items-center gap-2 rounded-lg border border-success bg-success-soft px-3 py-2'
                      : option === EXAMPLE_CHOICE ? 'flex items-center gap-2 rounded-lg border border-danger bg-danger-soft px-3 py-2'
                        : 'rounded-lg border border-border px-3 py-2 pl-9 text-fg-3'
                  }
                >
                  {option === EXAMPLE.correctAnswer && <CheckCircle2 className="size-4 text-success" aria-label="Correct" />}
                  {option === EXAMPLE_CHOICE && <XCircle className="size-4 text-danger" aria-label="Chosen" />}
                  {option}
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3">
              <p className="text-sm font-semibold text-danger">Not quite: {EXAMPLE_MISCONCEPTION.title}</p>
              <p className="mt-1 text-[13px] leading-5 text-fg">{EXAMPLE_MISCONCEPTION.explanation}</p>
            </div>
            <figcaption className="mt-4 flex items-start gap-2 text-[13px] leading-5 text-fg-2">
              <GitBranch className="mt-0.5 size-4 shrink-0 text-accent-fg" aria-hidden />
              <span><span className="font-medium text-fg">Next question:</span> steps back to Equivalent Fractions, the prerequisite this mistake points to.</span>
            </figcaption>
          </figure>
        </section>

        <section id="how-it-works" className="scroll-mt-16 border-t border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
            <p className="mt-3 max-w-2xl text-fg-2">A loop you can run in ten minutes a day, where every answer feeds back into what you study next.</p>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, text }, index) => (
                <li key={title}>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-fg"><Icon className="size-4" aria-hidden /></span>
                    <span className="text-xs font-medium text-fg-3">Step {index + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-fg-2">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="scroll-mt-16 mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Explainable by design</h2>
              <p className="mt-3 text-fg-2">
                No black-box score. Mastery weights recent and harder answers more; a gap's severity is the sum of reasons you can read.
                When the app says “start here”, it can tell you why.
              </p>
              <div className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Net Force &amp; Motion</p>
                  <span className="rounded-md bg-orange-soft px-2 py-0.5 text-xs font-medium text-orange">High · 57</span>
                </div>
                <ul className="mt-3 space-y-1.5 text-[13px]">
                  {[['Mastery is 36% after 8 answers', '+32'], ['Repeated misconception: Force–Motion Link', '+10'], ['Rated 4/5, but measured mastery is 36%', '+10'], ['Blocks 1 dependent topic', '+5']].map(([label, points]) => (
                    <li key={label} className="flex justify-between gap-3"><span className="text-fg-2">{label}</span><span className="tabular text-fg-3">{points}</span></li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-fg-3">Example of how a gap is scored. The full rules are in the app.</p>
              </div>
            </div>
            <ul className="grid gap-6 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-xl border border-border bg-surface p-5 shadow-card">
                  <Icon className="size-5 text-accent-fg" aria-hidden />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-fg-2">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="privacy" className="scroll-mt-16 border-t border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[auto_1fr] lg:items-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent-fg"><Lock className="size-5" aria-hidden /></span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Local-first and private</h2>
              <p className="mt-2 max-w-3xl text-fg-2">
                Your answers, notes, and goals are stored in your browser, not on a server. Export or delete them any time from Settings.
                AI features are optional and go through the app's own server, which holds the API key, and they only send what you ask for help with.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Start with a five-minute diagnostic</h2>
          <p className="mx-auto mt-3 max-w-xl text-fg-2">Fractions, forces and motion, or English verb tenses, or add your own topics. No sign-up.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink to="/app" variant="primary" size="lg" icon={<ArrowRight className="size-4" />}>Open the app</ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-[13px] text-fg-3 sm:flex-row sm:px-6">
          <Logo />
          <p>Built with React, TypeScript, and Express. Open source under the MIT license.</p>
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-fg">
            <GithubIcon className="size-4" />GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
