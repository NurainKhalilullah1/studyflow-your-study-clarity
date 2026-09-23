# Scope: Lumina (StudyFlow)

An AI-powered study platform for Nigerian university students. It helps students study smarter with an AI tutor, adaptive quizzes, spaced-repetition flashcards, a focus room, and a gamified community, accessible on web and Android.

**Build approach:** Tracer Bullet (each new feature is built end to end through every layer: UI, logic, DB, and tests in one pass before moving to the next).
**Workflow:** Beta (after each `/develop`, run `/check verify` then `/test`). The project default. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Epic | Phase | Status |
|---|---------|------|-------|--------|
| A | Auth + OTP | [core](core.md) | Existing | existing |
| B | Dashboard + gamification | [core](core.md) | Existing | existing |
| C | AI Tutor | [ai](ai.md) | Existing | existing |
| D | Quiz system | [ai](ai.md) | Existing | existing |
| E | Flashcards + spaced repetition | [ai](ai.md) | Existing | existing |
| F | Documents (upload + parse) | [ai](ai.md) | Existing | existing |
| G | Focus Room (Pomodoro + ambient audio) | [focus](focus.md) | Existing | existing |
| H | Leaderboard | [community](community.md) | Existing | existing |
| I | Community (posts + comments) | [community](community.md) | Existing | existing |
| J | Assignments (basic) | [focus](focus.md) | Existing | in-progress |
| K | Settings + profile | [core](core.md) | Existing | existing |
| L | Admin panel | [core](core.md) | Existing | existing |
| M | Android app (Capacitor) | [platform](platform.md) | Existing | existing |
| N | Email + push notifications (basic) | [core](core.md) | Existing | existing |
| 1 | Analytics dashboard | [core](core.md) | Slice 1 | in-progress |
| 2 | Smart notifications (reminders + streaks) | [core](core.md) | Slice 1 | planned |
| 3 | Calendar and assignment tracking | [focus](focus.md) | Slice 2 | planned |
| 4 | Study groups and collaborative rooms | [community](community.md) | Slice 3 | in-progress |
| 5 | Offline mode | [platform](platform.md) | Slice 4 | planned |
| 6 | iOS app | [platform](platform.md) | Slice 4 | planned |

## Epics

| Epic | File | Status rollup |
|------|------|---------------|
| Core (auth, dashboard, settings, admin, notifications) | [core.md](core.md) | 5 existing, 1 in-progress, 1 planned |
| AI (tutor, quiz, flashcards, documents) | [ai.md](ai.md) | 4 existing |
| Focus (focus room, assignments, calendar) | [focus.md](focus.md) | 1 existing, 1 in-progress, 1 planned |
| Community (leaderboard, posts, study groups) | [community.md](community.md) | 2 existing, 1 in-progress |
| Platform (Android, iOS, offline) | [platform.md](platform.md) | 1 existing, 2 planned |

## Legend

**Feature lifecycle**: `planned` → `in-progress` → `done` (pipeline built). `existing` = pre-workflow, complete; `/develop` and `/sync` leave it alone. `in-progress` = partially built, can be resumed with `/develop`. `dropped` = de-scoped, kept for history.

**Next step** = the first unticked box in a feature (always a command or tracked milestone).

**needs a decision** = run `/architect` first; otherwise straight to `/develop`. The tag drops once the spec is captured.

**Workflow tier tag** beside a heading (e.g. `· GA`) overrides the project default for that feature; no tag inherits Beta.

**Pointer line** (`spec N · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
