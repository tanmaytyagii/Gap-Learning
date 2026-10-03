# Architecture

This document explains how GapLearning is put together and why. For setup and usage, see the [README](../README.md).

## Overview

```
┌──────────────────────────── Browser ────────────────────────────┐
│                                                                  │
│  Pages (lazy routes) ──► Workspace (derived, memoized) ◄── Store │
│        │                    │                               ▲    │
│        │                    ├─ Curriculum + KnowledgeGraph  │    │
│        │                    ├─ mastery · status · gaps      │    │
│        │                    ├─ reviews · streak · actions   │    │
│        ▼                    │                               │    │
│  Adaptive engine ── submit answer ──► pure mutation ────────┘    │
│  (one per session)                         │                     │
│                                   localStorage (versioned)       │
│                                                                  │
│  ContentProvider ── /api/health, /api/questions ─┐               │
│  AI features ────── /api/ai/* ───────────────────┤               │
└──────────────────────────────────────────────────┼───────────────┘
                                                   │
┌────────────────────── Express API ───────────────▼───────────────┐
│  security headers · JSON body limit · JSON errors                │
│  /api/questions ── QuestionStore (seed + overlay file)           │
│  /api/ai/*  ── input validation ── rate limit ── Gemini client   │
│  static dist/ + SPA fallback (optional)                          │
└──────────────────────────────────────────────────────────────────┘
          ▲
   shared/curriculum.json, shared/question-bank.json
```

## Key decisions

**Local-first learner data.** Answers, notes, goals, and custom content live in the browser. This keeps the app free of accounts, lets a static deployment work fully, and keeps personal learning data private. The trade-off is single-device storage, mitigated by JSON export and import. Moving to accounts would mean swapping the store's persistence layer, not the domain logic.

**Attempts are the single source of truth.** The store keeps raw events (attempts, sessions) and a few user overlays (manual status, priority, self-rating). Mastery, status, gaps, review schedules, streaks, timelines, and goal progress are all *derived* by pure functions in `src/domain`. There is no cached state to fall out of sync, and the derivations are easy to test.

**One curriculum, shared by client and server.** `shared/curriculum.json` (subjects, topics with lessons, the misconception catalog) and `shared/question-bank.json` are imported by the frontend (bundled as the offline fallback) and read by the API, which validates authored questions against the same concept and misconception ids.

**AI on the server only.** The browser never sees an API key. The API validates and size-limits every input, wraps learner text as data in the prompt, requests schema-constrained JSON for generated questions, and validates the model's output before returning it. AI is optional: the product is complete without it.

**Explainability over cleverness.** Mastery, severity, and scheduling use small, documented formulas, and each gap carries the labeled reasons behind its score.

## Frontend

### Layers

| Layer | Path | Responsibility |
|---|---|---|
| Adaptive engine | `src/adaptive` | Session-scoped: question selection, diagnosis, next-question decisions, reports |
| Domain | `src/domain` | Long-term model: curriculum merge, mastery, status, gaps, reviews, activity, goals, next actions |
| Store | `src/store` | Persistence, schema validation, pure mutations, sample data |
| App | `src/app` | Providers for theme, API content, and the derived workspace |
| UI | `src/components`, `src/pages` | Presentation only; reads the workspace and dispatches mutations |

### Adaptive engine (`src/adaptive`)

The engine is constructed per session with its dependencies (`KnowledgeGraph`, questions, misconception lookup, optional random source), so it has no global state and is fully testable.

- **QuestionEngine.** Picks the unseen question closest to a target difficulty (random among ties). When the target topic is exhausted it can widen to other topics in scope; as a last resort it re-asks the question asked longest ago. Sessions are also capped at the number of available questions, so they never repeat themselves. Questions whose topic is missing from the graph are ignored rather than crashing a session.
- **RecommendationEngine.** Three modes:
  - *Diagnostic:* after an error, step back to the weakest prerequisite at lower difficulty; after an easy success, raise difficulty; after a medium or hard success, advance to an untested dependent topic whose prerequisites look secure.
  - *Practice:* stay on one topic and move difficulty up or down.
  - *Review:* rotate through due topics, pitching each from its last result.
- **FeedbackEngine.** Maps the chosen distractor to its misconception and returns learner-facing feedback, a remedy, and prerequisite topics to revisit.
- **GapAnalysisEngine and ReportGenerator.** Session-level analysis (difficulty-weighted mastery with a neutral prior, inferred weak prerequisites) and a report with a graph-ordered learning path.

Sessions are plain serialisable objects, and every transition returns a new session, which fits React state without mutation.

### Domain model (`src/domain`)

- **Mastery.** `(Σ wᵢ·cᵢ + 0.5) / (Σ wᵢ + 1)` with `wᵢ = {easy 0.8, medium 1, hard 1.2} × 0.85^age`, where age is the number of later answers on the same topic. The recency decay makes improvement visible; the prior stops a single answer from claiming mastery. Confidence grows with evidence: `min(95, 40 + 15n)`.
- **Status.** Not started (no answers), Learning (< 50%), Practicing (≥ 50%), Mastered (≥ 85% with ≥ 3 answers). A manual status wins until a newer answer arrives, so the latest signal always decides.
- **Gaps.** Each concept collects labeled reasons. Each reason is either a *trigger*, which makes the topic a gap, or a *modifier*, which only changes how urgent an existing gap is:

  | Reason | Points |
  |---|---|
  | Mastery below 70% | `round((70 − m) / 70 × 45) + 10` |
  | Misconception repeated in the last 10 answers (while mastery < 85%) | +10 |
  | Self-rated 1 or 2 with fewer than 3 answers | +35 or +25 |
  | Untested prerequisite of a topic below 50% | +20 |
  | Blocks non-mastered dependents | +5 each, max +20 |
  | Rated 4–5 but mastery < 60% (over-confidence) | +10 |
  | Priority high or low | +15 / −10 |

  Severity: critical ≥ 65, high ≥ 45, medium ≥ 25, otherwise low. Gaps are ranked by score, then prerequisite order, and a gap is *foundational* when none of its prerequisites is also a gap.
- **Gap clearance (`gapInsight.ts`).** For every trigger, the app states what would clear it. For low mastery, the number of correct medium answers needed is found by appending hypothetical correct answers and re-running the mastery formula (`correctAnswersToReach`), so the number is exact rather than estimated.
- **Reviews.** A Leitner schedule derived from attempts. Each (session, topic) pair is a sitting; ≥ 80% accuracy passes. The first pass lands in box 2, and a pass on or after the due date moves up a box. A fail resets to box 1, and early passes keep the box. Intervals are 1, 3, 7, 14, and 30 days. Each state records whether the last sitting passed, and `describeReview` turns that into the sentence shown in review sessions ("You passed it 4 days ago… Pass now and the next review moves out to 7 days").
- **Next actions.** Due reviews first, then up to two foundational gaps (practice, or study the lesson first when mastery is very low), then the next unlocked topic per subject, or a diagnostic for a new learner.
- **Progress (`progress.ts`).** Averaging mastery across a changing set of topics would drop every time a new topic is started, so progress is reported per topic against its own past: topics improved or declined by at least 5 points, topics that rose above or fell below 70%, and topics started. The dashboard uses a 30-day window, or 7 days when there is no month-old baseline.
- **Question validation (`questionValidation.ts`).** One rule set for every question entering a learner's bank, whether hand-written or AI-generated: lengths, unique options, answer among the options, tags only on wrong options, and no duplicate wording on the same topic.
- **Activity and analytics.** Daily aggregates, current and longest streak (alive through the end of the day after the last active day), a Monday-first calendar, and a day-by-day replay of mastery and open gaps.

### Store (`src/store`)

- **`learnerStore`** is a tiny external store (subscribe/getState/update) consumed through `useSyncExternalStore`. Writes are coalesced into one `localStorage` write per tick. Other tabs stay in sync through the `storage` event.
- **`schema.ts`** validates any loaded or imported JSON record by record. Invalid records are dropped and counted rather than discarding everything; resource links must be `http(s)`; attempts are sorted and capped at 20,000.
- **Failure handling.** Unreadable saved data is backed up under a separate key before a fresh workspace starts, and quota or blocked-storage errors surface as toasts rather than exceptions.
- **`mutations.ts`** contains pure `(data, …args) → data` functions, auto-bound as `actions.*`. Deleting a custom topic cascades to its attempts, questions, notes, resources, goals, and other topics' prerequisites.
- **`sample.ts`** builds the sample workspace by running a simulated learner through the real engine, deterministically, with a low-discrepancy sequence per topic so hit rates track the planned abilities.

### UI

- **Routing.** React Router data routes with `lazy` page modules. The main bundle holds the shell and domain logic, each page is its own chunk, and Recharts loads only on Analytics and a topic's Progress tab.
- **Design system.** CSS custom properties for light and dark themes, exposed as semantic Tailwind colors (`bg-surface`, `text-fg-2`, `text-accent-fg`, …). A small external `theme-init.js` applies the theme before first paint, so no inline script is needed and the CSP stays strict.
- **Charts.** They follow a validated palette: subjects keep fixed categorical slots, single-series charts use the accent, and status colors always come with an icon and a label. Every chart has a table view.
- **Provenance.** AI output and engine output are always labeled apart, with `AiBadge` (violet, its own color token) and `SystemBadge`. Notes saved from an AI explanation keep a `source: 'ai'` marker.
- **Practice feedback.** Feedback follows a fixed order: verdict, misconception, a one-sentence key idea (wrong answers only), a collapsed worked solution, and the engine's next step. Options are shown in a seeded shuffle per session and question (`utils/shuffle.ts`), because the curated bank lists the correct answer first in most questions.
- **Accessibility.** Native `<dialog>` modals and side sheets share `useModalDialog`. It provides the focus trap, an inert page and Escape, returns focus to the trigger (even when the dialog unmounts while open), and supports `data-autofocus`, since React's `autoFocus` fires before a dialog is shown. Also: WAI-ARIA tabs and radio groups with arrow-key support, labeled form fields with described errors, a skip link, visible focus rings, `aria-live` feedback, keyboard shortcuts in practice, and reduced-motion support.

## Backend

| Module | Purpose |
|---|---|
| `src/config.js` | All configuration from environment variables |
| `src/app.js` | `createApp(config, { fetchImpl })`: an app factory with injectable dependencies for tests |
| `src/lib/questionStore.js` | Seed bank plus an overlay file of admin changes, with serialized atomic writes (temp file and rename) |
| `src/lib/validation.js` | Field-level validation of authored questions against the shared curriculum |
| `src/lib/input.js` | Declarative request validation with length limits |
| `src/lib/gemini.js` | Gemini REST client: key in the `x-goog-api-key` header, timeout, safe error mapping |
| `src/lib/prompts.js` | Prompt builders; learner text wrapped in `<data>` with an instruction to ignore embedded instructions |
| `src/lib/rateLimit.js` | Fixed-window, per-IP limiter for AI routes, with `RateLimit-*` and `Retry-After` headers |
| `src/routes/*` | Question and AI routes |

**Security measures:**
- `x-powered-by` is disabled, and every response sets `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `COOP`, and `Permissions-Policy`. HTML served by the API also gets a strict CSP.
- JSON bodies are capped at 64 KB. Malformed JSON returns a JSON 400, and no stack traces are ever returned.
- CORS is off unless `CORS_ORIGIN` lists allowed origins.
- Question writes require `ADMIN_TOKEN`, compared in constant time; without it, authoring is disabled.

## Testing strategy

- **Browser tests (`e2e/`).** Playwright runs against the production build served by the real Express app, with AI answered by a deterministic Gemini stub injected through `createApp`'s `fetchImpl`. Tests choose answers by looking each question up in the bank by stem and option set, so they stay deterministic despite random tie-breaking and shuffled options. A shared fixture fails any test that logs a browser console error. The suite covers desktop and a 390px mobile project, and checks horizontal overflow against the layout viewport (`clientWidth`); `innerWidth` grows to fit overflow in mobile emulation and would hide it.
- **CI (`.github/workflows/ci.yml`).** Lint, typecheck, unit and API tests, and the build run on Node 20.19, 22, and 24; Playwright runs on Node 22 and uploads its report when it fails.
- Pure domain functions and the engine are unit-tested with fixed clocks and seeded randomness.
- The store is tested with an in-memory `Storage`, including failure paths.
- The API is tested over real HTTP on an ephemeral port with an isolated data directory; Gemini is replaced with an injected `fetch`, so tests cover request shape (key placement, prompt wrapping, JSON schema) without network access.
- Content integrity is a test. Every question must reference a real topic and same-subject misconceptions, and have its answer among its options. No two questions may share a stem and option set, prerequisite graphs must be acyclic and within one subject, and every topic needs at least two questions per difficulty. See [CONTENT_AUDIT.md](CONTENT_AUDIT.md) for the manual review.
