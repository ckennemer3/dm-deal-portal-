# Handoff Summary — D&M Deal Portal

## Project Summary

The D&M Deal Portal is an internal web application for D&M Auto Leasing that manages the full lifecycle of vehicle financing deals across 9 office locations. Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase (PostgreSQL + Auth + Storage + Realtime), the application provides role-based deal submission, multi-step review workflows, document management, SLA tracking, and analytics dashboards for 6 user roles. The application is currently in a demo/staging state on Vercel — it is not yet serving real users or real deal data. The vendor is being asked to evaluate the codebase, fix remaining issues, migrate the entire stack from Vercel/Supabase to Microsoft Azure, and take over ongoing development.

---

## Deliverable Documents

| # | Document | Description |
|---|----------|-------------|
| 1 | [EXECUTIVE_BRIEF.md](EXECUTIVE_BRIEF.md) | One-page overview for vendor leadership — what the app does, who uses it, current status, what's being asked |
| 2 | [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md) | Architecture, tech stack, directory structure, data flow, auth approach, known tech debt |
| 3 | [FEATURES_AND_STATUS.md](FEATURES_AND_STATUS.md) | Every feature with completion status — what works, what's partial, what's planned |
| 4 | [SETUP_GUIDE.md](SETUP_GUIDE.md) | Clone-to-running in 30 minutes — prerequisites, install, env vars, database setup, common problems |
| 5 | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | All 19 tables, columns, relationships, RLS policies, functions, triggers, views, and migration history |
| 6 | [INTEGRATIONS.md](INTEGRATIONS.md) | Every external service (Supabase, Google Fonts, Vercel, SonarCloud) — how auth works, what data flows, setup needs |
| 7 | [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Bugs, incomplete features, hardcoded values, missing validation, performance concerns, developer surprises |
| 8 | [SECURITY_REVIEW.md](SECURITY_REVIEW.md) | Auth weaknesses, RLS gaps, npm audit results (11 vulnerabilities), prioritized fix list |
| 9 | [AZURE_MIGRATION_NOTES.md](AZURE_MIGRATION_NOTES.md) | Component-by-component migration plan, what breaks, what doesn't, environment variable mapping, recommended sequence |
| 10 | [AGENT_USER_GUIDE.md](AGENT_USER_GUIDE.md) | Non-technical user guide — login, submit deals, track status, respond to kickbacks, daily workflow |
| 11 | [HANDOFF_CHECKLIST.md](HANDOFF_CHECKLIST.md) | Checklist for Chase and Dakota — repo access, credentials, test accounts, outstanding decisions |

---

## Top 5 Risks the Vendor Should Know About

1. **Next.js 14.2.15 has 13 known CVEs** (1 critical) including authorization bypass in middleware and DoS vulnerabilities. Upgrading is the first security action before any production deployment.

2. **The Azure migration requires rewriting the data layer, but it's mechanical work.** Every Supabase query (PostgREST syntax) must be replaced with an ORM or direct SQL. Every auth call must be replaced with Entra ID/MSAL. Every realtime subscription must be replaced with SignalR. The UI and business logic are fully portable. With AI-assisted development, the code changes can be done in days — the bottleneck is Azure provisioning, config, and QA.

3. **RLS policies enforce authorization at the database level and must be reimplemented.** There are 51+ policies. If the Azure migration moves authorization to the application layer (recommended), every data access point needs explicit permission checks — missing one creates a security gap.

4. **No integration or end-to-end tests exist.** The only tests cover pure utility functions, permissions logic, and validation schemas. There are no tests for server actions, pages, components, or the complete deal submission flow. Changes during migration cannot be verified automatically.

5. **The notification system is a stub.** The `NotificationService` has full email templates for deal events (submitted, approved, kicked back, etc.) but uses a `ConsoleEmailTransport` that only logs to console. No real emails are sent. This must be connected to an actual email service before production use.

---

## Top 5 Questions That Need Internal Answers Before Handoff

1. **Which Azure subscription and Entra ID tenant will be used?** The vendor needs these to set up infrastructure. Will D&M provide an Azure environment, or should the vendor create one?

2. **What is the priority order: bug fixes, security patches, new features, or Azure migration?** The vendor needs to know whether to fix existing issues first (recommended) or start the migration immediately.

3. **Should the app stay on Vercel during migration, or move directly to Azure?** Running both in parallel allows incremental migration but adds complexity. A direct cutover is simpler but riskier.

4. **What are the requirements for the planned Finance Printing and Wire Request modules?** These are listed as "planned" with no code or specifications. If the vendor will build these, they need requirements.

5. **Who will manage production data migration from Supabase to Azure?** Existing test data, user accounts, and documents need to be moved. Is D&M responsible for data export, or should the vendor handle it end-to-end?

---

## Recommended Reading Order for the Vendor

1. **EXECUTIVE_BRIEF.md** — Start here for context (2 minutes)
2. **TECHNICAL_OVERVIEW.md** — Understand the architecture (10 minutes)
3. **SETUP_GUIDE.md** — Get the app running locally (30 minutes)
4. **FEATURES_AND_STATUS.md** — Know what works and what doesn't (10 minutes)
5. **DATABASE_SCHEMA.md** — Understand the data model (15 minutes)
6. **KNOWN_ISSUES.md** — Know what to watch out for (10 minutes)
7. **SECURITY_REVIEW.md** — Understand the security posture (10 minutes)
8. **AZURE_MIGRATION_NOTES.md** — Plan the migration (15 minutes)
9. **INTEGRATIONS.md** — Reference as needed
10. **AGENT_USER_GUIDE.md** — Understand the user's perspective
11. **HANDOFF_CHECKLIST.md** — Internal team use

Also read the project's **CLAUDE.md** file at the repository root — it contains comprehensive development guidelines, patterns, and conventions that should be followed.

---

*[AI-GENERATED] This handoff documentation package was generated by Claude Code by analyzing the complete D&M Deal Portal codebase as of March 2026.*
