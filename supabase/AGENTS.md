# supabase — Backend: DB, Edge Functions, Migrations

## Overview

All backend infrastructure lives here. Supabase provides Postgres (with RLS), auth, storage, realtime, and Deno-based Edge Functions. Migrations are append-only SQL files that define the schema; Edge Functions are TypeScript running on Deno Deploy.

## Key files

| File | Owns |
|---|---|
| `config.toml` | Local Supabase project config (project ref, auth settings) |
| `functions/deno.json` | Shared Deno import map for all edge functions |
| `functions/gemini-chat/index.ts` | AI tutor: proxies chat + document-chunk parallel calls to Gemini API; holds the API key server-side |
| `functions/send-email/index.ts` | Transactional email via Google SMTP (Gmail); used for OTP, welcome, and study tip emails |
| `functions/auth-verification/index.ts` | Generates and validates OTP codes; writes to `auth_verification_codes` table |
| `functions/generate-image/index.ts` | Image generation (Gemini-backed) |
| `functions/process-leagues/index.ts` | Scheduled function: advances league rankings based on weekly XP |
| `functions/send-study-tip/index.ts` | Scheduled function: sends periodic study tips via email |
| `migrations/` | 27 append-only `.sql` files defining the full schema history |

## Commands

```bash
# Start local Supabase stack
npx supabase start

# Apply pending migrations to local DB
npx supabase db push

# Pull remote schema changes as a new migration
npx supabase db pull

# Serve edge functions locally
npx supabase functions serve

# Deploy a single edge function
npx supabase functions deploy <function-name>
```

## Conventions

- Migrations are append-only: never edit an existing file; always create a new migration for schema changes
- Migration filename format follows the auto-generated Supabase pattern (`YYYYMMDDHHMMSS_<uuid>.sql`) except for a few descriptive names added manually; prefer the descriptive name style for new migrations (`YYYYMMDD_short_description.sql`)
- Every table with user data has Row Level Security (RLS) enabled; policies are in the migration that creates the table
- Edge functions authenticate callers via the Supabase JWT in `Authorization: Bearer <token>`; call `supabase.auth.getUser()` to verify
- Edge function secrets (Gemini API key, Gmail SMTP credentials) live in Supabase project secrets, not in code or `.env`; reference them via `Deno.env.get('SECRET_NAME')`
- The `gemini-chat` function handles both single-turn and multi-turn chat; it also receives pre-chunked document slices from the client-side `useGoogleAI` hook for parallel analysis
- Email uses Gmail SMTP (Google Workspace account), not Supabase's built-in email provider; the `send-email` function wraps it with plain-text fallback and anti-spam headers

## Gotchas

- The `auth_verification_codes` table (migration `20260904_auth_verification_codes.sql`) holds short-lived OTP codes; codes expire after a short window enforced in the `auth-verification` function
- `enable_realtime.sql` turns on Postgres replication for specific tables; if realtime stops working, check that migration ran and the table is in the publication
- Edge functions share a `deno.json` import map at `functions/deno.json`; add new shared Deno packages there, not per-function
- `process-leagues` is a scheduled cron function; it must be re-deployed after any changes to league logic in `src/lib/gamification.ts` since it duplicates some of that logic server-side

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
