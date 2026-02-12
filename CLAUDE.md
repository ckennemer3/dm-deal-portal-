# D&M Deal Portal — Project Guidelines

## End Goal
This application will migrate into the Microsoft ecosystem (Azure AD for auth, Azure infrastructure). Every decision should keep that migration path clean.

## Core Principles
- **Reliable** — No silent failures. Use fallback queries, proper error handling, and log errors clearly.
- **Secure** — Follow least-privilege, never expose secrets, use RLS policies, validate on server side.
- **Maintainable** — No redundant or duplicate code. Consolidate shared patterns into utilities (e.g. user profile queries, Supabase helpers). Keep files focused and small.
- **No redundant/duplicate code** — Before writing new code, check if a utility, helper, or pattern already exists. Reuse it. If a pattern is repeated in 3+ places, extract it.

## Development Process
Before making any change:
1. **Plan** — Explore the codebase, understand the impact, and write a clear plan.
2. **Pressure test** — Challenge the plan. Look for edge cases, ambiguous FK joins, RLS issues, invalid HTML patterns, race conditions. Ask: "What could go wrong?"
3. **Iterate** — Refine until confident this is the best approach, not just the first approach.
4. **Implement** — Make the change.
5. **Verify** — Run `npx next build`, check for errors, confirm the fix works end-to-end.

## Tech Stack
- Next.js 14 (App Router, server components + client components)
- Supabase (PostgreSQL + PostgREST + Auth + Storage + RLS)
- Tailwind CSS
- TypeScript
- Deployed on Vercel via GitHub

## Known Patterns & Gotchas
- **Ambiguous FK joins**: `users` ↔ `teams` has two FK relationships (`users.team_id` and `teams.manager_id`). Always use `!users_team_id_fkey` hint: `team:teams!users_team_id_fkey(*, office:offices(*))`.
- **Next.js 14+ params**: Route params are a `Promise` — must `await params` before accessing properties.
- **No `<Link>` wrapping `<tr>`**: Invalid HTML. Use `onClick` + `router.push()` on the `<tr>` instead.
- **Supabase migrations**: Do NOT auto-run from Git. Must be applied manually via SQL Editor.
- **Cookie-based role switching**: Admin "View As" uses a `viewAsRole` cookie read by server components via `cookies()`.
