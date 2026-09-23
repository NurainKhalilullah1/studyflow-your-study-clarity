# 0002. Study groups and collaborative rooms · Rationale

## Context

Nigerian university students already use community features in StudyFlow (posts, leaderboard) for social accountability, but all study activity remains strictly solo. Research consistently shows that students who study in small peer groups retain material better and are more likely to show up. The missing link in Lumina is a lightweight social layer that turns the solo focus room into a shared experience: a place where a small cohort can coordinate what they study, see each other's quiz results, and run a Pomodoro together with shared accountability.

The existing app already has the building blocks: the Pomodoro timer (in `PomodoroContext`), quiz sessions, documents, push notifications via Firebase, and Supabase Realtime subscriptions (used in the community feed). The challenge is composing them into a cohesive group experience without adding new infrastructure or requiring students to leave the app.

The feature targets both web and Capacitor Android. The student group size cap (2 to 10) keeps the shared Pomodoro meaningful and the feed manageable. Without this, students who study better with peers have no in-app path to do so, and retention for that segment suffers.

## Options considered

### Option 1: Supabase Realtime broadcast for timer sync, five new DB tables

Use Supabase Realtime Broadcast channels (a low latency pub sub layer built into Supabase, no extra server needed) to sync the Pomodoro timer tick across members, and Postgres Changes subscriptions for feed and membership updates. Five new tables hold group state.

**Pros**:
- Zero new infrastructure; Supabase Realtime is already connected in the client.
- Timer sync via Broadcast does not write to the database on every tick, avoiding write amplification.
- Proven in the existing community feed (Supabase Postgres Changes already in use).

**Cons**:
- Broadcast is ephemeral; a member who reconnects must derive timer position from `started_at` in the database rather than the last broadcast tick.
- Supabase Realtime connection limits apply per project plan; a large number of concurrent group sessions could approach them.

### Option 2: Polling via TanStack Query refetch

Avoid Realtime entirely; instead refetch group session state on a short interval (e.g. 3 seconds).

**Pros**:
- Simplest implementation; no Realtime subscription management.

**Cons**:
- A 3 second refetch interval makes the shared timer visibly lag, breaking the "same timer" experience the feature promises.
- Higher Supabase read volume at scale.

### Option 3: Dedicated WebSocket server via a Supabase Edge Function

Run a Deno WebSocket server as a Supabase Edge Function to coordinate the timer across members.

**Pros**:
- Maximum control over message shape and delivery.

**Cons**:
- Supabase Edge Functions have a 150 second wall time limit; a 25 minute Pomodoro work interval would exceed it on a single invocation.
- Adds new infrastructure and operational complexity with no benefit over Broadcast for this use case.

## Rationale

Supabase Realtime Broadcast is the right tool because it is already wired into the client and requires no new servers. The timer does not need to be stored on every tick; only the `started_at` timestamp needs to persist, and any member who reconnects derives their sync position from it. This avoids write amplification while keeping the timer accurate to within the Realtime delivery latency (typically under 100ms). Polling (Option 2) produces a lagging timer, which breaks the core social promise of the feature. An Edge Function WebSocket (Option 3) hits the 150 second invocation limit, making it unsuitable for Pomodoro intervals that routinely run 25 minutes.

The runner up worth noting: if Supabase Realtime connection counts become a constraint (a project scales to many concurrent group sessions), the fallback is to move the timer authority entirely to the database (polling with a 1 second interval during an active session only), accepting the minor lag. That switch does not require a data model change.
