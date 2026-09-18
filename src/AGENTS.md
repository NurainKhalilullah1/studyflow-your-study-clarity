# src — Source Tree

## Overview

The entire client-side application lives here. It is a single-page React app with React Router v6 for navigation. Pages live flat in `pages/`; shared UI is split between top-level `components/` (global, layout, and marketing) and feature sub-folders under `components/`. Logic lives in `hooks/`, pure utilities in `utils/` and `lib/`.

## Key files

| File | Owns |
|---|---|
| `App.tsx` | Router tree, provider stack, splash/maintenance gate, Capacitor deep-link listener |
| `contexts/AuthContext.tsx` | Auth state, OTP verification flow, 7-day inactivity timeout, `recordActivity` throttle |
| `contexts/PomodoroContext.tsx` | Global Pomodoro timer state shared across Tutor and Dashboard |
| `components/ProtectedRoute.tsx` | Auth + OTP guard → redirects to `/auth`; profile completeness check → redirects to `/settings` |
| `integrations/supabase/client.ts` | Singleton Supabase client (do not create a second one) |
| `integrations/supabase/types.ts` | Auto-generated DB schema types — never hand-edit |
| `hooks/useGoogleAI.ts` | AI tutor calls via `gemini-chat` edge function; parallel chunking for large documents |
| `hooks/useQuiz.ts` | Quiz generation, scoring, history, and share-link logic |
| `hooks/useGamification.ts` | XP award, league advancement, level-up toasts — calls Supabase, reads `lib/gamification.ts` |
| `lib/gamification.ts` | Pure XP/league/level functions; no side effects — single source for all constants |
| `utils/spacedRepetition.ts` | SM-2 spaced repetition algorithm for flashcard scheduling |
| `utils/documentParser.ts` | PDF and text extraction for document uploads |
| `lib/universities.json` | University name list used in onboarding and profile validation |

## Area map

| Folder | Feature |
|---|---|
| `pages/` | One file per route; fat pages are acceptable, complex logic is extracted to hooks |
| `components/` (root) | Layout (`DashboardLayout`, `DashboardSidebar`, `BottomNav`), guards, marketing sections, shared dialogs |
| `components/quiz/` | Quiz setup, interface, results, review modal, share modal |
| `components/tutor/` | Chat (messages, input, sidebar), Pomodoro widget, flashcard generator/viewer |
| `components/documents/` | Upload zone, document card, preview modal, selector |
| `components/dashboard/` | Stat cards, weekly goals, XP progress, quiz analytics |
| `components/community/` | Post card, comment section, create-post dialog |
| `hooks/` | All data-fetching and feature logic as custom hooks |
| `utils/` | Pure functions with no React dependencies |
| `lib/` | Singleton clients, pure domain functions, static JSON data |

## Conventions

- Pages import data via hooks only; they do not call `supabase` directly
- Component sub-folders (`quiz/`, `tutor/`, etc.) export named components; no barrel `index.ts` unless one already exists
- Tailwind classes are composed with `cn()` from `lib/utils.ts` (re-exports `clsx` + `tailwind-merge`)
- Toast notifications use `sonner` (imported as `<Sonner />`) for transient alerts and `useToast` (shadcn) for persistent ones; prefer `sonner` for quick feedback
- Mobile-only code is gated on `Capacitor.isNativePlatform()`; never conditionally import Capacitor plugins at the top level because the import itself throws on web
- `useProfile` returns a TanStack Query result; always check `isLoading` before reading `data`
- Auth flow order: sign-in → OTP verification (`sendVerificationCode` / `verifyCode`) → `markSessionVerified` → ProtectedRoute passes

## Gotchas

- `isSessionVerified` is stored in `localStorage` (key `studyflow_session_verified_<userId>`), not in Supabase session. Clearing localStorage will force re-verification even with a valid Supabase session.
- The `MAINTENANCE_MODE` flag in `MaintenanceBanner.tsx` bypasses the entire router; set it back to `false` after maintenance or no users can log in.
- `AppUpdateGuard` in `App.tsx` wraps the router and prompts mobile users to update; it checks a version field from Supabase.
- `useGoogleAI` sends requests via the `gemini-chat` edge function (not directly to the Gemini API); the API key is server-side only in the edge function environment.
- Framer Motion and Tone.js are both large; avoid importing them at module level in components that are not on the page that actually uses them.
- The generated `integrations/supabase/types.ts` is overwritten on every Supabase schema pull — any manual edits will be lost.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
