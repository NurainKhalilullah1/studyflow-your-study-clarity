# Epic: Core

Authentication, dashboard, profile, settings, admin, and notification infrastructure. The foundation every other epic builds on.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Auth + OTP | Existing | existing |
| B | Dashboard + gamification | Existing | existing |
| K | Settings + profile | Existing | existing |
| L | Admin panel | Existing | existing |
| N | Email + push notifications (basic) | Existing | existing |
| 1 | Analytics dashboard | Slice 1 | in-progress |
| 2 | Smart notifications (reminders + streaks) | Slice 1 | planned |

---

## Existing features

### A. Auth + OTP · existing
Full auth flow: email sign up, email/password sign in, Google OAuth (web + Android), OTP email verification after every sign in, password reset, 7-day rolling inactivity timeout.
code in `src/contexts/AuthContext.tsx`, `src/pages/Auth.tsx`, `supabase/functions/auth-verification/`

### B. Dashboard + gamification · existing
Personal dashboard: XP progress card, weekly goals, study stats, quiz analytics, achievements, Pomodoro widget. Gamification: 25 leagues (Bronze I to Legend), XP awards for study actions, level titles.
code in `src/pages/Dashboard.tsx`, `src/components/dashboard/`, `src/lib/gamification.ts`, `src/hooks/useGamification.ts`

### K. Settings + profile · existing
Profile management: display name, university, course of study, level, avatar. Theme toggle (light/dark). Subscription status. Data export. Account deletion.
code in `src/pages/Settings.tsx`

### L. Admin panel · existing
Admin view: user management, content moderation, platform analytics.
code in `src/pages/Admin.tsx`

### N. Email + push notifications (basic) · existing
Transactional email via Gmail SMTP (OTP, welcome, study tips). Push notifications via Firebase (basic prompt + token storage).
code in `supabase/functions/send-email/`, `supabase/functions/send-study-tip/`, `src/hooks/useNotifications.ts`

---

## Planned features

### 1. Analytics dashboard · in-progress
Give students a clear picture of how they are studying: streaks, total study time, subject breakdown, weak topic detection from quiz and flashcard performance. The goal is to turn raw usage data into actionable insight.
**Done when:** a student can see their current streak, weekly study time, their strongest and weakest subjects (from quiz scores), and a suggestion for what to study next; data updates in real time after each session.
- [x] Design it (spec): [0001](../specs/0001-analytics-dashboard.md)
- [ ] Build it: /develop analytics dashboard
  - [ ] Schema linkage and core useAnalytics hook with local day boundaries (AC-2, AC-3, AC-4)
  - [ ] Analytics page route, navigation links, and dashboard overview widget (AC-1)
  - [ ] Interactive study trends and weekly charts (AC-3, AC-6)
  - [ ] Subject mastery breakdown and weak topic detection with deep links (AC-4, AC-5)
  - [ ] Client data export utility (AC-1)
- [ ] Verify it: /check verify analytics dashboard
- [ ] Test it: /test analytics dashboard

### 2. Smart notifications · needs a decision
Upgrade the existing basic notification system to send timely, personalized nudges: daily study reminders at the student's preferred time, streak-at-risk warnings when a student has not studied in 20+ hours, and flashcard due reminders when cards are ready for review.
**Done when:** a student can set a daily reminder time in settings; the system sends a push notification at that time; a streak-at-risk push fires when no study action is recorded for 20 hours; flashcard due notifications fire when the student has cards due for SM-2 review.
- [ ] Design it (spec): `/architect smart notifications`
