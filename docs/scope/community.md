# Epic: Community

Social and collaborative features: the leaderboard, community posts, and the upcoming study groups.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| H | Leaderboard | Existing | existing |
| I | Community (posts + comments) | Existing | existing |
| 4 | Study groups and collaborative rooms | Slice 3 | in-progress |

---

## Existing features

### H. Leaderboard · existing
Weekly XP leaderboard across all users, showing rank, league, and XP. League advancement is processed by the `process-leagues` scheduled edge function at the end of each week.
code in `src/pages/Leaderboard.tsx`, `src/hooks/useGamification.ts`, `supabase/functions/process-leagues/`

### I. Community (posts + comments) · existing
Student community: create posts, like and comment, view trending posts, group info. Realtime updates via Supabase.
code in `src/pages/Community.tsx`, `src/components/community/`, `src/hooks/useCommunity.ts`

---

## Planned features

### 4. Study groups and collaborative rooms · in-progress
Let students form small study groups (2 to 10 members) where they can share notes, run shared quiz sessions, and study together in a shared Focus Room. The goal is to turn solo study into a social and accountable experience, which increases retention for students who study better with peers.
**Done when:** a student can create a study group, invite peers by username or link, share a document or quiz result to the group feed, and join a shared Pomodoro session where all members see the same timer and earn XP together; group membership and activity persist across sessions.
- [x] Design it (spec): [0002](../specs/0002-study-groups-collaborative-rooms/index.md)
- [x] Build it: /develop study groups
  - [x] Database schema, RLS policies, and useStudyGroups hook (AC-1, AC-2, AC-3, AC-4, AC-9, AC-10)
  - [x] Community Groups tab, group detail drawer, and public join route (AC-1, AC-2, AC-4, AC-9, AC-10)
  - [x] Group feed with real time updates for documents and quizzes (AC-5)
  - [x] Shared Pomodoro timer with real time broadcast sync and XP awards (AC-6, AC-7, AC-8)
  - [x] Peer invitations by username search and notification delivery (AC-3, AC-6)
code in `src/pages/Community.tsx`, `src/components/community/groups/`, `src/pages/GroupJoin.tsx`, `src/hooks/useStudyGroups.ts`, `src/hooks/useGroupFeed.ts`, `src/hooks/useGroupSession.ts`, `src/hooks/useGroupNotifications.ts`, `supabase/migrations/20260923_study_groups_and_collaborative_rooms.sql`
- [ ] Verify it: /check verify study groups
- [ ] Test it: /test study groups
