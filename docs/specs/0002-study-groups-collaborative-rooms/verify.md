# Verify: Study groups and collaborative rooms · spec 0002 · updated 2026-09-23

_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Navigate to `/community` → click "Study Groups" tab → observe group list and "Create Group" button → AC-1
- [ ] For a user with no groups, observe the empty state with encouraging copy and action buttons → AC-1
- [ ] Click "Create Group" → fill in name and description → submit → group row appears immediately with generated 8-character invite code and user marked as Owner → AC-2
- [ ] In group drawer Members tab → search for a peer by username or display name → click "Add" → peer is added immediately subject to 10-member cap → AC-3
- [ ] Copy invite code link (`/groups/join/CODE`) → open in private browser window or while logged in → preview displays group name, member count, and "Join" button → AC-4, AC-10
- [ ] Non-member opening preview link does not see feed posts, session data, or full member list → AC-10
- [ ] Joining a full group (10 members) shows "group is full" message without adding member → AC-3, AC-4
- [ ] In group drawer Feed tab → click "Share Resource" → pick an uploaded document or completed quiz → post appears in feed in real time without reload → AC-5
- [ ] In group drawer Focus Room tab → click "Start Shared Pomodoro" → session starts counting down → online members receive live update → AC-6
- [ ] Second member joins in-progress session → timer displays current elapsed time synced with started_at timestamp → AC-6, AC-7
- [ ] Realtime timer ticks broadcast across all participants in session → AC-7
- [ ] Disconnected member reopens group → timer re-syncs to ground truth elapsed position → AC-7
- [ ] Work interval completes → participating member receives +25 XP in study_events and gamification stats → AC-8
- [ ] Member clicks "Leave" → removed from group → if owner leaves, ownership transfers to earliest-joined remaining member → AC-9
- [ ] Last member leaves group → group and all its data are deleted → AC-9
- [ ] Departed or removed member's feed posts remain visible showing their author display name → AC-9

## Commands

- [ ] `npx tsc --noEmit` → TypeScript checks clean with 0 errors
- [ ] `npm run build` → Production build bundles successfully
- [ ] `npm run lint` → Zero lint errors on all study groups code

## Acceptance criteria coverage

- AC-1 covered by step 1, 2
- AC-2 covered by step 3
- AC-3 covered by step 4, 7
- AC-4 covered by step 5, 7
- AC-5 covered by step 8
- AC-6 covered by step 9, 10
- AC-7 covered by step 10, 11, 12
- AC-8 covered by step 13
- AC-9 covered by step 14, 15, 16
- AC-10 covered by step 5, 6
