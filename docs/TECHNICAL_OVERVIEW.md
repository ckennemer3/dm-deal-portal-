# Technical Overview — D&M Deal Portal

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 14.2.15 |
| UI Library | React | 18.3.1 |
| Language | TypeScript (strict mode) | 5.x |
| Styling | Tailwind CSS | 3.4.1 |
| Database | Supabase (PostgreSQL + RLS) | 2.45.0 |
| SSR Auth | @supabase/ssr | 0.5.0 |
| Validation | Zod | 4.3.6 |
| Testing | Vitest | 4.0.18 |
| Charting | Recharts | 3.7.0 |
| Utilities | clsx, tailwind-merge, date-fns 3.6.0, uuid 10.0.0 | — |
| Deployment | Vercel (via GitHub) | — |
| Code Quality | SonarCloud | — |

**Node.js version used in development**: v24.13.0 (npm 11.6.2)

---

## High-Level Architecture

```
                           ┌────────────────────────────┐
                           │     Vercel (Hosting)        │
                           │  Next.js App Router SSR     │
                           └─────────┬──────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
   ┌──────────▼──────────┐  ┌───────▼─────────┐  ┌────────▼────────┐
   │  Server Components   │  │  Server Actions  │  │ Client Components│
   │  (pages, layouts)    │  │  (mutations)     │  │ ('use client')   │
   │  - Data fetching     │  │  - Insert/update │  │ - useState/forms │
   │  - Props to client   │  │  - revalidatePath│  │ - Realtime subs  │
   └──────────┬───────────┘  └───────┬──────────┘  └────────┬────────┘
              │                      │                      │
              └──────────────────────┼──────────────────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │        Supabase Platform         │
                    │                                  │
                    │  ┌──────────┐  ┌──────────────┐ │
                    │  │ Auth     │  │ PostgreSQL   │ │
                    │  │ (email/  │  │ + RLS        │ │
                    │  │  pw)     │  │ (19 tables)  │ │
                    │  └──────────┘  └──────────────┘ │
                    │                                  │
                    │  ┌──────────┐  ┌──────────────┐ │
                    │  │ Storage  │  │ Realtime     │ │
                    │  │ (files)  │  │ (WebSocket)  │ │
                    │  └──────────┘  └──────────────┘ │
                    └──────────────────────────────────┘

   ┌─────────────────────────────────────────────────────┐
   │              GitHub → Vercel CI/CD                   │
   │  Push to main → auto-deploy                         │
   │  SonarCloud scan on push/PR                         │
   └─────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
dm-deal-portal/
├── .github/workflows/
│   └── sonarcloud.yml              # SonarCloud CI scan on push/PR
├── docs/                           # Handoff documentation (this folder)
├── public/                         # Static assets (logo)
├── supabase/
│   └── migrations/                 # 11 SQL migration files (applied manually)
│       ├── 001_initial_schema.sql  # Full schema, RLS, triggers, seed data
│       ├── 002_update_statuses.sql # Status enum overhaul
│       ├── ...                     # Incremental changes
│       └── 011_add_general_manager_role.sql
│
├── src/
│   ├── middleware.ts               # Session refresh on all requests
│   │
│   ├── app/                        # Next.js App Router pages
│   │   ├── layout.tsx              # Root layout (Roboto font, metadata)
│   │   ├── page.tsx                # Landing redirect
│   │   ├── globals.css             # Tailwind globals + custom component classes
│   │   ├── error.tsx / loading.tsx / not-found.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── login/page.tsx      # Email/password login form
│   │   │   └── callback/route.ts   # OAuth callback handler
│   │   │
│   │   └── dashboard/
│   │       ├── layout.tsx          # Auth gate + user profile fetch + nav shell
│   │       ├── page.tsx            # Home dashboard (role-aware)
│   │       ├── deals/
│   │       │   ├── page.tsx        # Deal list (filtered by role)
│   │       │   ├── actions-documents.ts  # File upload/delete/replace
│   │       │   ├── [id]/
│   │       │   │   ├── page.tsx    # Deal detail (full relations)
│   │       │   │   └── actions.ts  # Status, messages, field edits
│   │       │   └── new/
│   │       │       ├── page.tsx    # 7-step deal wizard
│   │       │       └── actions.ts  # Deal creation
│   │       ├── admin/
│   │       │   ├── page.tsx        # User/team management
│   │       │   └── actions.ts      # Admin CRUD
│   │       └── reporting/
│   │           └── page.tsx        # Analytics dashboard (6 tabs)
│   │
│   ├── components/
│   │   ├── ui/                     # 17 reusable primitives (Button, Input, Modal, etc.)
│   │   ├── admin/                  # Admin panel, user/team management
│   │   ├── dashboard/              # Shell, home, UW dashboard, notifications
│   │   ├── deals/                  # Deal list, detail, communication thread
│   │   ├── forms/                  # Wizard + 7 step components
│   │   └── reporting/              # Dashboard, 6 tab components, charts, filters
│   │
│   ├── contexts/
│   │   └── role-switcher-context.tsx  # Admin "View As" role switching
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              # Client-side auth state
│   │   ├── useRealtimeDeals.ts     # Supabase realtime subscriptions
│   │   ├── useNotifications.ts     # Notification tracking
│   │   └── useTimer.ts             # SLA timer calculations
│   │
│   ├── lib/
│   │   ├── supabase/               # 3 client files (browser, server, middleware)
│   │   ├── constants.ts            # All labels, configs, transitions (~270 lines)
│   │   ├── env.ts                  # Zod-validated env vars
│   │   ├── errors.ts               # Error class hierarchy (8 classes)
│   │   ├── logger.ts               # Structured logging (Azure-ready)
│   │   ├── permissions.ts          # RBAC checks (~210 lines)
│   │   ├── reporting-queries.ts    # Reporting data queries + KPI computations
│   │   ├── timer-utils.ts          # Status → timer threshold mapping
│   │   ├── types.ts                # All TypeScript types (~450 lines)
│   │   ├── utils.ts                # Pure utilities (~250 lines)
│   │   ├── validation.ts           # Zod schemas (~260 lines)
│   │   └── __tests__/              # 3 test files (utils, permissions, validation)
│   │
│   ├── services/
│   │   ├── auth.ts                 # AuthService (wraps Supabase Auth)
│   │   ├── audit.ts                # Audit logging + notifications
│   │   ├── database.ts             # Generic DB helper (underused)
│   │   ├── notifications.ts        # Email templates (console transport)
│   │   └── storage.ts              # File storage (wraps Supabase Storage)
│   │
│   └── __tests__/
│       └── setup.ts                # Vitest setup
│
├── .env.local.example              # Environment variable template
├── next.config.ts                  # Server actions body size limit (10MB)
├── tailwind.config.ts              # Brand colors, custom theme
├── tsconfig.json                   # Strict mode, path aliases
├── vitest.config.ts                # Test configuration
├── sonar-project.properties        # SonarCloud config
└── package.json                    # Dependencies, scripts
```

---

## Current Deployment

1. Developer pushes code to `main` branch on GitHub
2. Vercel auto-deploys from GitHub (no manual steps)
3. SonarCloud runs code quality analysis on push and PRs
4. Database migrations are applied **manually** via Supabase SQL Editor — they are NOT auto-applied
5. No staging environment exists — there is only one deployment target

---

## Data Flow: Key User Actions

### Agent Submits a New Deal
1. Agent navigates to `/dashboard/deals/new`
2. Fills out 7-step wizard (deal type, applicants, vehicle, trade-in, open autos, credit, documents)
3. Clicks "Submit" → calls `submitDeal()` server action
4. Server action validates via Zod schema, inserts deal + applicants + trade-in + open autos
5. Auto-assigns manager based on agent's team
6. Documents uploaded to Supabase Storage (`deal-documents` bucket)
7. Status set to `pending`, `revalidatePath()` called
8. Manager sees new deal appear in their queue (via realtime subscription or page refresh)

### Manager Reviews and Approves a Deal
1. Manager opens deal detail at `/dashboard/deals/[id]`
2. Reviews applicant info, vehicle details, documents
3. Clicks "Approve & Forward to Underwriting"
4. Server action transitions status to `submitted_to_underwriting`
5. Status history record created with audit trail
6. Notification sent to underwriter queue
7. Deal moves to underwriter's dashboard

### Underwriter Kicks Back a Deal
1. Underwriter claims unassigned deal (status: `submitted_to_underwriting`)
2. Reviews deal, finds issues
3. Selects kickback reason (e.g., "Missing Documents") + writes explanation
4. Server action transitions to `kicked_back_to_manager`
5. Kickback reason stored in `kickback_reasons` table
6. Manager receives notification, reviews kickback
7. Manager either fixes and resubmits to UW, or kicks further back to agent

---

## Authentication and Authorization

### Authentication
- **Method**: Supabase Auth with email/password
- **Session management**: Cookie-based via `@supabase/ssr`
- **Middleware**: Refreshes session on every request, redirects unauthenticated users to `/auth/login`
- **Auto-provisioning**: A database trigger (`handle_new_user`) creates a `users` profile when an `auth.users` record is created

### Authorization (Two Layers)

**Layer 1: Application-level (src/lib/permissions.ts)**
- Role hierarchy: agent < manager < general_manager < underwriter < executive < administrator
- ~20 permission functions check role + deal ownership + status before allowing actions
- Called in server actions and used by UI to show/hide controls

**Layer 2: Database-level (Supabase RLS)**
- 51+ Row Level Security policies on all tables
- RLS helper functions (`get_user_role()`, `get_user_team_id()`) reference `auth.uid()`
- Agents see only their own deals; managers see team/office deals; UW/exec/admin see all
- Sub-tables (applicants, documents, messages) inherit deal visibility

### Admin "View As" Feature
- Administrators can assume any role via a cookie (`viewAsRole`)
- Server components read this cookie to scope queries as if the admin were that role
- Useful for debugging and testing role-specific views

---

## Where Business Logic Lives vs. UI Logic

| Concern | Location | Pattern |
|---------|----------|---------|
| Status transitions | `src/lib/constants.ts` (rules) + `src/lib/permissions.ts` (enforcement) | Declarative config + pure functions |
| Deal validation | `src/lib/validation.ts` | Zod schemas |
| SLA timers | `src/lib/timer-utils.ts` + `src/lib/constants.ts` | Config-driven thresholds |
| Document requirements | `src/lib/constants.ts` | Lookup tables per deal type |
| Data mutations | `src/app/dashboard/**/actions.ts` | Server Actions |
| Query construction | `src/app/dashboard/**/page.tsx` | Inline Supabase queries in server components |
| Reporting computations | `src/lib/reporting-queries.ts` | Pure functions over fetched data |
| UI state & interactivity | `src/components/**/*.tsx` | Client components with useState |
| Role-based rendering | `src/components/` (consuming `userProfile.role`) | Conditional rendering in components |

---

## Known Architectural Shortcuts and Technical Debt

1. **No API routes** — All mutations go through Server Actions. This works well for Next.js but complicates Azure migration since Server Actions are Next.js-specific.

2. **Inline Supabase queries** — Most data fetching is done directly in server components with PostgREST syntax (`.from().select().eq()`). There is a `DatabaseService` in `src/services/database.ts` but it is rarely used. This will need a full rewrite for Azure SQL.

3. **Manual type definitions** — `src/lib/types.ts` is hand-maintained. There is no Supabase type generation (`supabase gen types`). Types may drift from the actual database schema.

4. **Large component files** — `deal-detail.tsx` is ~1,150 lines. It handles status display, field editing, document management, communication, kickbacks, and history in one file.

5. **No integration or E2E tests** — Only unit tests exist for `utils`, `permissions`, and `validation`. No tests for server actions, pages, or components.

6. **Notification service is a stub** — `src/services/notifications.ts` uses a `ConsoleEmailTransport` that logs to console. No real email delivery is configured.

7. **No staging environment** — Only one Vercel deployment exists. No way to test changes before they go to the demo environment.

8. **Middleware config warning** — The build produces a warning about unsupported `config.matcher` syntax in middleware. The middleware still functions but uses the default matcher instead.

9. **Missing `/dashboard/activity` page** — A link exists in the dashboard UI pointing to an activity page that does not exist.

10. **Reporting page is heavy** — The reporting page loads 119 kB of JavaScript (first load: 223 kB), significantly more than other pages.

---

*[AI-GENERATED] This document was generated by analyzing the full codebase of the D&M Deal Portal as of March 2026.*
