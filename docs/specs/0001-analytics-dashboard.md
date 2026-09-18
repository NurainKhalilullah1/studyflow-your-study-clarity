# 0001. Analytics dashboard for study habits and mastery

**Date**: 2026-09-18
**Status**: In Progress

## Summary

This decision introduces an analytics dashboard that turns study activity, quiz results, and flashcard reviews into actionable insights. Students gain a dedicated analytics screen and a dashboard summary widget showing study streaks, total focus hours, subject mastery, and detected weak topics. The implementation computes aggregations dynamically on the device using TanStack Query (an asynchronous data fetching library), reusing existing database tables with an optional course reference (a link between records) so that no new storage overhead is incurred.

## Context

StudyFlow helps university students in Nigeria stay disciplined and prepare for exams. Currently, the application records Pomodoro completions, quiz submissions, and flashcard reviews across separate database tables, but students have no single place to understand their overall study habits. Raw counters exist on the home dashboard, yet they do not tell a student which courses need urgent attention or what to study next.

The target audience frequently studies on mobile devices with constrained data connections. Any solution must load swiftly, avoid heavy server queries, and work smoothly offline using cached state. Adding heavy background worker infrastructure or paid external telemetry services would raise operating costs unnecessarily. Students need immediate feedback after every study session, clear guidance on weak topics before exams arrive, and local day boundaries that match West Africa Time.

## Requirements

**User stories**:
- As a student, I want to see my current study streak, focus time, and quiz accuracy in one view so that I know whether I am meeting my study targets.
- As a student, I want to see which subjects I struggle with most so that I can focus my revision where it matters.
- As a student, I want clear recommendations for what to study next with quick links into quizzes or flashcards so that I waste no time deciding what to do.
- As a student, I want to switch timeframes between 7 days, 30 days, and all time so that I can inspect both immediate habits and overall semester progress.

**Acceptance criteria**:
- **AC-1**: User can navigate to a dedicated `/analytics` page from the sidebar and mobile bottom navigation, and can see a high level study summary card on the `/dashboard` page.
- **AC-2**: User can view their current study streak in consecutive active days and total study minutes across focus sessions, with metrics recalculating immediately after a session completes.
- **AC-3**: User can filter analytics data by 7 days, 30 days, and all time presets, updating charts and metrics without page reload.
- **AC-4**: User can view a subject mastery breakdown showing quizzes taken, average score percentage, and study minutes, categorized by document name and linked course tags.
- **AC-5**: System identifies weak topics (subjects or documents with average quiz scores below 60 percent across at least 2 quizzes, or with more than 5 overdue flashcards) and displays actionable study recommendations with deep links to start a quiz or review flashcards.
- **AC-6**: Study time distribution displays daily focus minutes and quiz counts across the chosen timeframe using responsive charts that work cleanly on mobile viewports.

## Options considered

### Option 1: Dynamic client aggregation via custom hook and TanStack Query

Compute metrics in memory on the client inside a custom `useAnalytics` hook. The hook queries `study_events`, `quiz_sessions`, and `courses` for the authenticated user, caches the aggregated data in TanStack Query, and invalidates queries when study mutations succeed.

**Pros**:
- Zero additional database tables or background worker maintenance.
- Instant updates following study actions through query cache invalidation.
- Respects mobile data constraints by caching query results locally on the device.

**Cons**:
- Computes aggregations on device, which scales with the number of raw session records over long timeframes.

### Option 2: Pre aggregated daily metrics table via database triggers

Create a `daily_study_aggregates` table in PostgreSQL with triggers on `study_events` and `quiz_sessions` to update daily running totals automatically.

**Pros**:
- Fast database reads for high volume query history across multiple years.
- Offloads calculation from client devices.

**Cons**:
- Adds database schema complexity, migration risk, and trigger maintenance on Supabase.
- Rigid schema makes changing insight algorithms or metrics definitions difficult later.

### Option 3: External analytics service or data warehouse

Send event streams to an external analytics SaaS provider and embed customer facing charts via an SDK.

**Pros**:
- Built in reporting interfaces and pre baked chart components.

**Cons**:
- Introduces external recurring subscription fees and vendor lock in.
- Increases mobile bundle size and data consumption for Nigerian students.
- Fails when connectivity is intermittent.

## Decision

**Chosen option**: Option 1: Dynamic client aggregation via custom hook and TanStack Query

We will compute study analytics dynamically on the client using a unified `useAnalytics` hook, backed by TanStack Query and Supabase client queries, and display them through Recharts visualizations and actionable recommendation cards.

**Implementation skills**: neon-postgres (neondatabase/agent-skills, .agents/skills/neon-postgres/) · ui-ux-pro-max (local, .agent/skills/ui-ux-pro-max/)

## Rationale

Dynamic client aggregation is the cleanest and most cost effective path for Lumina. Student event volume per user is modest (typically several dozen events per month), meaning client side aggregation takes mere milliseconds. This avoids adding new database tables, edge functions, or triggers, keeping operational complexity low.

Reusing TanStack Query guarantees that analytics data is cached across screen transitions. When a student completes a Pomodoro timer or submits a quiz, existing mutation hooks invalidate the cache key, triggering an automatic background refresh. Day boundaries are computed using the student local device timezone (West Africa Time for most users), preventing midnight UTC shift anomalies.

## Feature design

**Data model sketch**:

Existing tables are preserved, with an optional course foreign key added to strengthen subject tagging:

1. `courses` (existing table):
   - `id`: uuid, primary key
   - `user_id`: uuid, foreign key
   - `code`: text (e.g. "CSC 301")
   - `title`: text (e.g. "Data Structures")
   - `color`: text, nullable

2. `quiz_sessions` (existing table, modified):
   - `course_id`: uuid, nullable, foreign key references `courses(id)` on delete set null
   - existing columns: `id`, `user_id`, `score`, `total_questions`, `document_name`, `completed_at`, `created_at`

3. `study_events` (existing table, modified):
   - `course_id`: uuid, nullable, foreign key references `courses(id)` on delete set null
   - existing columns: `id`, `user_id`, `event_type`, `metadata` (holds `duration`), `created_at`

4. Dynamic client analytics state (computed in memory by `useAnalytics`):
   - `streak`: `{ currentStreak: number, longestStreak: number }`
   - `totalStudyMinutes`: number
   - `totalQuizzes`: number
   - `averageScore`: number
   - `timeframe`: `'7d'` | `'30d'` | `'all'`
   - `dailyTrends`: array of `{ date: string, label: string, minutes: number, quizzes: number }`
   - `subjectMastery`: array of `{ subject: string, courseCode?: string, color?: string, avgScore: number, quizCount: number, studyMinutes: number }`
   - `weakTopics`: array of `{ subject: string, avgScore: number, quizCount: number, overdueCards: number, reason: string }`
   - `recommendations`: array of `{ id: string, title: string, description: string, actionLabel: string, actionPath: string }`

**State transitions**:
Query lifecycle: idle (unfetched) → loading (fetching study events and quiz sessions) → success (computed metrics, streak counts, and recommendations stored in cache memory) → stale (new study session or quiz submitted) → background refreshing (cache invalidation without UI flash).

**API surface**:

Client side custom hook interface in `src/hooks/useAnalytics.ts`:

| Interface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `useAnalytics(timeframe)` | React Hook (TanStack Query) | `timeframe: '7d' \| '30d' \| 'all'` | `stats, dailyTrends, subjectMastery, weakTopics, recommendations, isLoading, refetch` | Authenticated session with OTP verified | Network offline (returns cached data), session expired |
| `exportStudyData(format)` | Utility function | `format: 'json' \| 'csv'`, `data: AnalyticsExport` | Browser file download | Client side execution | Empty dataset |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Calculate streak days | `currentStreak` count | Computed from consecutive active dates in `study_events` and `quiz_sessions` stepping back from today in the local device timezone |
| Calculate longest streak | `longestStreak` count | Computed by scanning all historical unique activity days in ascending order and taking the maximum consecutive run |
| Display focus time | `totalStudyMinutes` | Sum of `metadata.duration` from `study_events` where `event_type = 'pomodoro_completed'` |
| Display quiz accuracy | `averageScore` percentage | Computed from `quiz_sessions.score / quiz_sessions.total_questions` |
| Filter by timeframe | Date range boundary | Derived from current device timestamp minus 7 days, 30 days, or epoch start |
| Group by subject | Subject label and color | Derived from matched `courses.code` and `courses.title`, falling back to `quiz_sessions.document_name` or "General" |
| Track overdue cards per subject | `overdueCards` count | Counted by matching `flashcards.deck_name` with subject or course names and evaluating `isCardDue` from spaced repetition utilities |
| Flag weak topics | List of weak subjects | Filtered from subjects where `quizCount >= 2` and `avgScore < 60`, or overdue flashcard count > 5 |
| Next study recommendation | Action card with deep link | Derived from weakest subject, routing to `/quiz?subject=<name>` or `/flashcards?deck=<name>` |
| Export study data | Downloadable CSV or JSON file | Formatted in memory from the cached `useAnalytics` datasets |

**Key invariants**:
- Streak counts must be evaluated using the user local calendar day, not UTC midnight.
- Longest streak evaluates all recorded historical study days in the user local calendar.
- Overdue cards evaluate the SM-2 algorithm schedule per flashcard matching the subject deck name.
- A subject must have at least 2 completed quizzes before it can be flagged as a weak topic, avoiding false alarms on an initial quiz.
- Division by zero must always evaluate to zero when no quizzes or study sessions exist.
- Data fetching must strictly filter queries by `user_id = user.id`.

**Security model**:
- All Supabase tables enforce Row Level Security ensuring `auth.uid() = user_id`.
- The `/analytics` route is protected by `ProtectedRoute`, requiring active authentication and valid OTP verification (`isSessionVerified`).
- Study data is strictly private to the authenticated student and cannot be queried by other users.

**Configuration required**:
None (reuses existing Supabase client credentials and installed front end packages).

**Critical test scenarios**:
- Happy path: A student completes a Pomodoro timer and a quiz; navigating to `/analytics` displays updated streak, focus time, subject score, and daily trend chart, verifies **AC-1**, **AC-2**, **AC-6**.
- Timeframe switching: Toggling between 7 days, 30 days, and all time recalculates trend bars and totals accurately, verifies **AC-3**.
- Subject breakdown and weak topic detection: A student with 2 quiz scores below 60 percent on a subject sees a warning card recommending review with a direct link to practice, verifies **AC-4**, **AC-5**.
- Empty state: A new user with no activity sees an encouraging empty state with guidance to begin their first focus session, verifies **AC-1**, **AC-2**.
- Offline resiliency: Navigating to `/analytics` while offline renders previously cached TanStack Query data without crashes, verifies **AC-1**, **AC-3**.
- Permission check: An unauthenticated or unverified session navigating to `/analytics` redirects to `/auth`, verifies **AC-1**.

## Build plan

Following the project Tracer Bullet build approach (building thin vertical slices end to end from database through hooks to user interface in each increment):

1. **Database schema linkage**: Add migration script adding optional `course_id` column to `quiz_sessions` and `study_events` with foreign key referencing `courses(id)` on delete set null, satisfies **AC-4**.
2. **Core analytics hook**: Implement `src/hooks/useAnalytics.ts` using TanStack Query, computing streak days, focus minutes, quiz accuracy, and local day boundaries, satisfies **AC-2**, **AC-3**.
3. **Dashboard overview widget**: Create `src/components/dashboard/AnalyticsOverviewCard.tsx` and place it on `/dashboard` with key numbers and a link to full analytics, satisfies **AC-1**, **AC-2**.
4. **Dedicated analytics route and navigation**: Create `src/pages/Analytics.tsx`, wire route `/analytics` in `src/App.tsx`, and add navigation entries in `DashboardSidebar` and `BottomNav`, satisfies **AC-1**.
5. **Interactive study trend chart**: Build `src/components/analytics/StudyTrendsChart.tsx` using Recharts responsive bar and line charts, supporting 7d, 30d, and all time timeframe toggles, satisfies **AC-3**, **AC-6**.
6. **Subject mastery breakdown**: Build `src/components/analytics/SubjectMasteryCard.tsx` displaying course badges, quiz count, average scores, and progress meters, satisfies **AC-4**.
7. **Weak topic detection and recommendation engine**: Build `src/components/analytics/WeakTopicsCard.tsx` and `StudyRecommendationsCard.tsx` with deep links to quiz and flashcard routes, satisfies **AC-5**.
8. **Client data export**: Add CSV and JSON download utility button on the analytics page for personal record keeping, satisfies **AC-1**.

## Consequences

**Positive**:
- Students receive clear visibility into study habits, strengths, and weaknesses without guesswork.
- Zero server side compute cost or database trigger maintenance.
- Leverages existing dependencies (`recharts`, `@tanstack/react-query`, `date-fns`) with zero new npm packages.
- Fast, responsive experience tailored for mobile use on Capacitor Android.

**Negative and tradeoffs**:
- Client performs aggregation calculations; students with thousands of study sessions may see a brief calculation latency, though mitigated by date range limits.
- If localStorage or browser cache is cleared, metrics are recomputed on next fetch.

**Neutral**:
- Requires adding an optional `course_id` column to `quiz_sessions` and `study_events` to facilitate cleaner subject grouping.

## Follow-up

- [ ] Execute migration to add optional `course_id` to `quiz_sessions` and `study_events`.
- [ ] Add deep link query parameter handling in Quiz and Flashcards pages so prefilled filters activate smoothly when clicking recommendation links.
