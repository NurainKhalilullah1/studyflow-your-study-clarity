# 0002. Study groups and collaborative rooms

**Date**: 2026-09-23
**Status**: In Progress

## Summary

This decision introduces study groups into Lumina, letting students form small peer groups (up to 10 members) where they can share documents and quiz results through a group feed, and study together in a shared Pomodoro (timed focus session) that syncs the timer across all participants in real time. Groups live inside the existing Community page as a new tab alongside Posts. Real-time sync uses Supabase Realtime (the built-in live data layer), so no new infrastructure is needed beyond five new database tables and two new client hooks.

## Requirements

**User stories**:
- As a student, I want to create a study group and invite my course mates so that we can coordinate our study sessions in one place.
- As a student, I want to share a document or quiz result to my group so that my peers can benefit from my work.
- As a student, I want to start a shared Pomodoro session so that my group members can study together in sync, with a timer we all see.
- As a student, I want to join an in-progress group Pomodoro session and sync to wherever the timer currently is, so I do not miss out if I join late.
- As a student, I want to earn my own XP when I complete a shared Pomodoro, the same as a solo session, so my progress is not affected by group activity.

**Acceptance criteria**:
- **AC-1**: A student can open the Community page, switch to a Groups tab, and see all groups they belong to plus a Create group button; a student who belongs to no groups sees an encouraging empty state with the Create button.
- **AC-2**: A student can create a group with a name and optional description; the system generates a unique 8-character invite code; the creator becomes the owner and the only initial member; the group row appears immediately in their Groups tab.
- **AC-3**: A student can invite peers by username search (typing searches `profiles.display_name` and `profiles.username`, showing up to 5 results); the invited student is added to the group immediately (auto-accept, no pending state) and receives an in-app notification via Supabase Realtime Broadcast on the `group-notifications:{invitee_id}` channel plus a Firebase push notification; the member count is enforced at a maximum of 10 and the invite returns a "group is full" error when the cap is reached.
- **AC-4**: A student can share the group invite link (built from the invite code, e.g. `app/groups/join/CODE`); any logged in student who opens the link sees the group name and a Join button; joining via link adds them as a member subject to the same 10-member cap; the link shows a "group is full" message once the cap is reached.
- **AC-5**: Inside a group, a student can see a Feed tab showing posts from all members in chronological order; a student can share one of their own documents (from their Documents page) or quiz results (from their quiz history) to the group feed with an optional caption; the post appears in the feed in real time for all members (Supabase Realtime subscription updates the feed without a page reload).
- **AC-6**: Any group member can start a shared Pomodoro session from the group detail view; when a session starts, all other group members who are currently online receive an in-app banner notification and group members who are offline receive a Firebase push notification; any member can join the session; members joining after the session starts see the timer synced to the current elapsed time (derived from `started_at`).
- **AC-7**: While a shared Pomodoro session is active, all participating members see the same timer state (work/break, time remaining) updated via a Supabase Realtime broadcast channel; if a member disconnects and rejoins before the session ends, they re-sync to the current elapsed state.
- **AC-8**: When the Pomodoro work interval completes, each participating member who was in the session earns their own XP via the existing `useGamification` hook, identically to a solo Pomodoro completion; the session state transitions to `completed` in the database.
- **AC-9**: The group owner can remove a member; any member can leave; if the owner leaves, ownership transfers to the earliest-joined remaining member; if the last member leaves, the group and all its data are deleted; a removed or departed member's feed posts remain visible with their display name.
- **AC-10**: A non-member who opens an invite link sees only the group name; they cannot read the group feed, session data, or member list until they join.

## Decision

**Chosen option**: Option 1: Supabase Realtime broadcast for timer sync, five new DB tables.

We will sync the shared Pomodoro timer via Supabase Realtime Broadcast channels and use Postgres Changes subscriptions for the group feed and membership updates, backed by five new tables.

**Implementation skills**: `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `ui-ux-pro-max` (local, `.agent/skills/ui-ux-pro-max/`)

See [rationale.md](rationale.md) for full context, options considered, and trade-off analysis.

## Feature design

**Data model sketch**:

1. `study_groups`
   - `id`: uuid, pk
   - `name`: text, required
   - `description`: text, nullable
   - `owner_id`: uuid, fk to `auth.users(id)` on delete cascade
   - `invite_code`: text, unique, 8-character alphanumeric, generated on insert
   - `max_members`: int, default 10
   - `created_at`: timestamptz, default now()

2. `group_members`
   - `id`: uuid, pk
   - `group_id`: uuid, fk to `study_groups(id)` on delete cascade
   - `user_id`: uuid, fk to `auth.users(id)` on delete cascade
   - `role`: text, check `role in ('owner', 'member')`, default `'member'`
   - `joined_at`: timestamptz, default now()
   - unique on `(group_id, user_id)`

3. `group_feed_posts`
   - `id`: uuid, pk
   - `group_id`: uuid, fk to `study_groups(id)` on delete cascade
   - `author_id`: uuid, fk to `auth.users(id)` on delete set null
   - `post_type`: text, check `post_type in ('document', 'quiz_result')`
   - `reference_id`: uuid, nullable (points to `documents.id` or `quiz_sessions.id`)
   - `caption`: text, nullable
   - `created_at`: timestamptz, default now()

4. `group_sessions`
   - `id`: uuid, pk
   - `group_id`: uuid, fk to `study_groups(id)` on delete cascade
   - `started_by`: uuid, fk to `auth.users(id)` on delete set null
   - `work_duration`: int, seconds (e.g. 1500 for 25 minutes)
   - `break_duration`: int, seconds
   - `started_at`: timestamptz, default now()
   - `state`: text, check `state in ('work', 'break', 'completed')`, default `'work'`
   - `completed_at`: timestamptz, nullable

5. `group_session_participants`
   - `id`: uuid, pk
   - `session_id`: uuid, fk to `group_sessions(id)` on delete cascade
   - `user_id`: uuid, fk to `auth.users(id)` on delete cascade
   - `joined_at`: timestamptz, default now()
   - `completed`: bool, default false
   - unique on `(session_id, user_id)`

**State transitions**:

Group session: `work` (timer counting down) to `break` (break interval counting down) to `completed` (both intervals done, XP awarded). Transitions are triggered by the client that detects elapsed time exceeding the interval threshold and writes the updated `state` to the database. A session never goes backwards.

Group membership: invited (implicit) to member (row in `group_members`) to left or removed (row deleted). The group itself is deleted when the last member row is removed.

**API surface**:

| Endpoint (client hook action) | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| Create group | `useStudyGroups.createGroup` | `name` (req), `description` (opt) | `study_groups` row with `invite_code` | Authenticated + OTP | 422 name missing |
| Join by invite code | `useStudyGroups.joinByCode` | `invite_code` (req) | group row, member row | Authenticated + OTP | 409 already member, 403 group full |
| Invite by username | `useStudyGroups.inviteByUsername` | `group_id`, `username` (req) | success | Authenticated, member | 404 user not found, 403 group full |
| Remove member or leave | `useStudyGroups.removeMember` | `group_id`, `user_id` | success, ownership transfer or group deletion | Authenticated; owner for others, self for leave | 403 not owner |
| Post to feed | `useGroupFeed.createPost` | `group_id`, `post_type`, `reference_id` (opt), `caption` (opt) | `group_feed_posts` row | Authenticated, member | 403 not member, 404 reference not owned |
| Start session | `useGroupSession.startSession` | `group_id`, `work_duration`, `break_duration` | `group_sessions` row | Authenticated, member | 409 session already active |
| Join session | `useGroupSession.joinSession` | `session_id` | participant row, `elapsed_seconds` | Authenticated, member | 404 session not found |
| Complete session | `useGroupSession.completeSession` | `session_id` | `state = 'completed'`, `completed_at` | Authenticated, participant | 409 already completed |
| Fetch my groups | `useStudyGroups.myGroups` | none | list of groups with member counts | Authenticated + OTP | |
| Fetch group feed | `useGroupFeed.feed` | `group_id` | paginated posts with author name | Authenticated, member | 403 not member |
| Realtime feed subscription | Supabase Postgres Changes | `group_id` filter on `group_feed_posts` | streamed new post rows | Authenticated, member | |
| Realtime timer broadcast | Supabase Realtime Broadcast | channel `group-session:{session_id}` | `{ state, elapsed_seconds }` | Authenticated, participant | |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Generate invite code | 8-character alphanumeric string | DB function using `gen_random_bytes` or equivalent; stored in `study_groups.invite_code` on insert |
| Build invite link | Full URL, e.g. `https://app.lumina.study/groups/join/CODE` | `invite_code` column + `VITE_APP_URL` env var |
| Check group full | Whether a join insert is permitted | Count of `group_members` rows for `group_id` compared to `study_groups.max_members` |
| Ownership transfer on owner leave | Next owner user_id | `MIN(joined_at)` among remaining `group_members` where `user_id != leaving_owner_id` |
| Sync timer for late joiner | `elapsed_seconds` at join time | `EXTRACT(EPOCH FROM (now() - group_sessions.started_at))::int` computed at join; break elapsed accounts for `work_duration` already elapsed |
| Session state transition | Next `state` value | Client compares `elapsed_seconds` to `work_duration` (work to break) and `work_duration + break_duration` (break to completed); writes updated `state` to `group_sessions` |
| XP award on session complete | XP amount | `useGamification.awardXP('pomodoro_completed')` called client side, same value as solo Pomodoro |
| Feed post author name | Display name shown on post card | `profiles.display_name` joined on `group_feed_posts.author_id`; falls back to "Former member" when `author_id` is null |
| Feed post reference display | Document name or quiz score shown on post | `documents.name` for `post_type = 'document'`; `quiz_sessions.score` and `total_questions` for `post_type = 'quiz_result'` fetched by `reference_id` |
| Push notification on session start | Firebase device tokens | `push_tokens` table (existing), filtered by `group_members.user_id` excluding the session starter |
| Send username invite notification | Notification body ("@sender invited you to [group name]") | sender `profiles.display_name`, group `study_groups.name`; delivered via Broadcast on `group-notifications:{invitee_id}` and Firebase push token |

**Key invariants**:
- `group_members` count for a `group_id` must never exceed `study_groups.max_members`; enforced at application layer and via a DB-level check before insert.
- At most one `group_sessions` row in state `work` or `break` may exist for a given `group_id`; a new session start is rejected with 409 if one is active.
- A member can only post a `reference_id` they own: `documents.user_id = auth.uid()` or `quiz_sessions.user_id = auth.uid()` is verified before insert.
- `group_feed_posts.author_id` uses on-delete set-null so posts survive member removal.
- `study_groups.owner_id` is kept in sync with a current `group_members` row; ownership transfer happens in the same transaction as the owner's row deletion.
- `work_duration` minimum is 60 seconds; enforced at application layer to prevent division edge cases.
- `study_groups.owner_id` references `auth.users(id)` on delete cascade: if a user deletes their Lumina account, any group they own is also deleted and all members are removed via cascade.

**Security model**:
- All five tables enforce Supabase Row Level Security:
  - `study_groups`: `SELECT` for members only; a separate policy allows reading only `name` and `id` by `invite_code` for the join preview (non-member public read of those two columns).
  - `group_members`: `SELECT` for members of that group; `INSERT` for authenticated users (joining); `DELETE` where the deleting user is the group owner or is deleting their own row.
  - `group_feed_posts`: `SELECT` for members; `INSERT` where `author_id = auth.uid()` and user is a member; `DELETE` where `author_id = auth.uid()`.
  - `group_sessions`: `SELECT` for users who are members of the session's `group_id` (membership confirmed via a join check on `group_members`); `INSERT` / `UPDATE` for members.
  - `group_session_participants`: `SELECT` for group members; `INSERT` / `UPDATE` where `user_id = auth.uid()`.
- The `/groups/join/:code` route is placed before `ProtectedRoute` in `App.tsx` so unauthenticated users can see the group name; all write operations require authentication and OTP verification.
- No sensitive PII beyond display name and avatar is shared with group members; no compliance scope is triggered.
- The username search in `inviteByUsername` must be rate-limited at the application layer (e.g. max 10 searches per minute per authenticated user) to prevent username enumeration.

**Configuration required**:
- `VITE_APP_URL`: base URL used to build shareable invite links (e.g. `https://app.lumina.study`). Confirm it is set in all environments before testing invite link generation.

**Critical test scenarios**:
- Happy path: a student creates a group, shares the invite link, a second student joins via the link, the first student starts a Pomodoro, the second student joins and sees the timer elapsed, both complete the session, each earns their own XP independently. Verifies **AC-2**, **AC-4**, **AC-6**, **AC-7**, **AC-8**.
- Full group rejection: a student opens an invite link for a group already at 10 members and sees a "group is full" message without being added. Verifies **AC-3**, **AC-4**.
- Owner leaves: the owner leaves the group; ownership transfers automatically to the next earliest-joined member; the former owner no longer sees the group. Verifies **AC-9**.
- Feed real-time update: a member shares a quiz result; another member with the group open sees the new post appear without reloading. Verifies **AC-5**.
- Non-member link preview: a student opens an invite link without being a member and sees only the group name and Join button; the feed and member list are not rendered. Verifies **AC-10**.
- Concurrent join race: two students open the invite link simultaneously when 9 members are present; only one succeeds; the other receives the "group is full" error. Verifies **AC-3**, **AC-4** (requires atomic count-check-then-insert).

## Build plan

Following the Tracer Bullet approach (thin vertical slice end to end through every layer, then thicken):

1. [x] **Database migration**: create all five tables with constraints, indexes (on `group_members.group_id`, `group_feed_posts.group_id`, `group_sessions.group_id`), and RLS policies as designed; add a DB function to generate `invite_code` on `study_groups` insert. Satisfies schema prerequisite for **AC-1** through **AC-10**.
2. [x] **`useStudyGroups` hook**: implement `createGroup`, `joinByCode`, `inviteByUsername`, `removeMember` (with ownership transfer and last-member group deletion), and `myGroups`. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-9**.
3. [x] **Groups tab in Community page**: add a Groups tab alongside the existing Posts tab; render the student's group list with empty state and Create group dialog. Satisfies **AC-1**, **AC-2**.
4. [x] **Group detail side drawer**: build the drawer opened by clicking a group card, containing a Feed tab, an active session banner placeholder, and a Members tab with remove and leave controls. Satisfies **AC-1**, **AC-9**.
5. [x] **`/groups/join/:code` route and join page**: add the route in `App.tsx` before `ProtectedRoute`; render group name and Join button for non-members; redirect to Community on success; show full and already-member states. Satisfies **AC-4**, **AC-10**.
6. [x] **`useGroupFeed` hook with Realtime subscription**: implement `createPost` and `feed` (paginated); subscribe to Supabase Postgres Changes on `group_feed_posts` for the group; render document and quiz result post cards in the drawer Feed tab. Satisfies **AC-5**.
7. [x] **`useGroupSession` hook with Realtime Broadcast**: implement `startSession`, `joinSession`, `completeSession`; subscribe to a Broadcast channel `group-session:{session_id}`; derive elapsed seconds from `started_at` on join; emit ticks from the session starter. Satisfies **AC-6**, **AC-7**.
8. [x] **Shared Pomodoro UI in group detail drawer**: render the active session banner with synced countdown; Start session and Join session buttons; call `useGamification.awardXP` on completion. Satisfies **AC-6**, **AC-7**, **AC-8**.
9. [x] **Push and in-app notifications for session start**: send a Firebase push notification to group members with tokens when a session starts; broadcast an in-app notification on a `group-notifications:{group_id}` channel for online members. Satisfies **AC-6**.
10. [x] **Invite by username flow**: build the username search input in the Members tab; call `inviteByUsername`; trigger in-app and push notification to the invited user. Satisfies **AC-3**.

## Consequences

**Positive**:
- Students who study better with peers gain a lightweight in-app coordination layer without needing external messaging apps for coordination.
- No new infrastructure: Supabase Realtime and Firebase (both existing) carry the real-time and notification layers.
- XP system requires no changes; each member earns their own XP via the existing hook.

**Negative and tradeoffs**:
- Supabase Realtime Broadcast is ephemeral; a member who loses connectivity briefly will have a short desync until they reconnect and re-derive elapsed time from `started_at`. Acceptable for a study timer.
- The "session starter emits timer ticks" pattern stops broadcasting if the starter disconnects; all remaining members fall back to deriving elapsed time from `started_at` independently, so the timer stays accurate but push-based ticks pause until a follow-up promotes another emitter.
- Five new tables increase migration and schema maintenance surface.

**Neutral**:
- The Groups tab splits the Community page into two tabs; Posts remains the default selected tab to avoid disrupting existing users.
- `/groups/join/:code` is the first non-auth public route in the app; it must be placed before `ProtectedRoute` in `App.tsx`.

## Follow-up

- [ ] Decide the default selected tab in Community (Posts vs Groups) before implementation to avoid disrupting existing users.
- [ ] Confirm `VITE_APP_URL` is set in all environments (dev, staging, production) before invite link testing.
- [ ] Implement the member count check and insert atomically (a Supabase Edge Function or PL/pgSQL function with `FOR UPDATE`) to close the concurrent-join race condition at the 10-member cap.
- [ ] After launch, monitor disconnection rates in group sessions; if the single-emitter broadcast pattern causes frequent timer desync, promote to a server-side tick model.
- [ ] Update `community.md` scope row for feature 4 to `in-progress` and add the spec pointer (`spec 0002`) when implementation begins.
