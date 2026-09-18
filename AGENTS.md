# Lumina (StudyFlow)

## Stack

- **Language / Runtime**: TypeScript, browser (ES2022 target)
- **Framework**: React 18 with Vite 5, react-router-dom v6
- **Key dependencies**: Supabase (auth + DB + edge functions), @google/generative-ai (Gemini), Capacitor 8 (Android/iOS), Tailwind CSS v3, shadcn/ui (Radix UI), TanStack Query v5, Tone.js, Framer Motion
- **Package manager**: npm
- **Styling**: Tailwind CSS v3, tailwind-merge + class-variance-authority; theme tokens in `tailwind.config.ts`; dark mode via `next-themes` with `class` attribute

## Build approach

Tracer Bullet (each feature is built end to end through every layer in one pass before moving to the next)

## Commands

```bash
# Install
npm install

# Dev server
npm run dev

# Build
npm run build

# Lint
npm run lint

# Android (after build)
npx cap sync android && npx cap open android
```

## Rules

- Use the `@/` alias for all internal imports (resolves to `src/`); never use relative paths that go up more than one level
- All Supabase queries go through `src/integrations/supabase/client.ts`; the generated `types.ts` next to it is the schema source of truth — do not hand-edit it
- Data fetching lives in `src/hooks/` as custom hooks; pages and components call hooks, not supabase directly
- Auth state comes only from `useAuth()` (from `AuthContext`); all protected pages are wrapped in `<ProtectedRoute>` which checks both `user` and `isSessionVerified`
- OTP verification is mandatory after every sign-in; `isSessionVerified` in `AuthContext` tracks this; `localStorage` key prefix `studyflow_session_verified_` holds the stamp
- XP, leagues, and level titles are pure functions in `src/lib/gamification.ts`; never duplicate these constants in components
- Flashcard spaced repetition uses the SM-2 algorithm in `src/utils/spacedRepetition.ts`; the four ratings are 1/3/4/5 (Again/Hard/Good/Easy)
- AI calls go through the `gemini-chat` Supabase edge function via `useGoogleAI`; large documents are chunked (8 000 chars/chunk, up to 10 parallel chunks, 500 char overlap)
- Mobile platform detection: `Capacitor.isNativePlatform()` — never use `navigator.userAgent` for this; OAuth deep-link handling is in `App.tsx`
- Maintenance mode: flip `MAINTENANCE_MODE` in `MaintenanceBanner.tsx` to gate the whole app

## Agent skills

**Workflow skills (local, .agent/skills/):**
- [architect](.agent/skills/architect/): Architecture decision records and spec authoring
- [develop](.agent/skills/develop/): Feature build workflow
- [scope](.agent/skills/scope/): Product scope management
- [debug](.agent/skills/debug/): Root-cause debugging loop
- [check](.agent/skills/check/): Pre-merge verification
- [test](.agent/skills/test/): Test suite authoring
- [sync](.agent/skills/sync/): Post-change doc sync
- [document](.agent/skills/document/): PR / changelog writing
- [audit](.agent/skills/audit/): Context bootstrapping (this skill)
- [ui-ux-pro-max](.agent/skills/ui-ux-pro-max/): UI/UX design intelligence

**Registry skills (installed via `npx skills add`):**
- [neon-postgres](.agents/skills/neon-postgres/): `neondatabase/agent-skills`, Postgres patterns and SQL migration conventions

Recommended (run `npx skills add <id> -y` when GitHub is reachable):
- `supabase/agent-skills@supabase` — Supabase auth, DB, RLS, edge function conventions
- `supabase/agent-skills@supabase-postgres-best-practices` — Postgres patterns for Supabase projects
- `antfu/skills@vite` — Vite config, plugin patterns, build conventions
- `cap-go/capgo-skills@capacitor-best-practices` — Capacitor project structure and native bridge conventions

## Context files

- [src/AGENTS.md](src/AGENTS.md): Source tree conventions, area map, and key file index
- [supabase/AGENTS.md](supabase/AGENTS.md): Edge functions, migrations, and DB schema conventions

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
