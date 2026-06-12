# D&M Deal Portal — Project Guidelines

## Project Overview
Internal deal submission and underwriting portal for D&M Auto Leasing. Agents submit vehicle deals through a multi-step wizard, managers review and approve, underwriters evaluate and forward to lenders. The app tracks deal lifecycle with SLA timers, document management, and an audit trail.

**Users**: Agents, Managers, Underwriters, Executives, Administrators
**Offices**: Fort Worth, Dallas, Houston, Austin, DLR, Four Stars (Ford, Auto Ranch, Toyota, Nissan)

---

## End Goal
This application will migrate into the Microsoft ecosystem (Azure AD for auth, Azure infrastructure). Every decision should keep that migration path clean.

## Core Principles
- **Reliable** — No silent failures. Use fallback queries, proper error handling, and log errors clearly.
- **Secure** — Follow least-privilege, never expose secrets, use RLS policies, validate on server side.
- **Maintainable** — No redundant or duplicate code. Consolidate shared patterns into utilities. Keep files focused and small.
- **No redundant/duplicate code** — Before writing new code, check if a utility, helper, or pattern already exists. Reuse it. If a pattern is repeated in 3+ places, extract it.

## Development Process
Before making any change:
1. **Plan** — Explore the codebase, understand the impact, and write a clear plan.
2. **Pressure test** — Challenge the plan. Look for edge cases, ambiguous FK joins, RLS issues, invalid HTML patterns, race conditions. Ask: "What could go wrong?"
3. **Iterate** — Refine until confident this is the best approach, not just the first approach.
4. **Implement** — Make the change.
5. **Verify** — Run `npx next build`, check for errors, confirm the fix works end-to-end.

---

## Tech Stack

| Layer        | Technology                  | Version   |
| ------------ | --------------------------- | --------- |
| Framework    | Next.js (App Router)        | 14.2.15   |
| UI           | React                       | 18.3.1    |
| Language     | TypeScript (strict mode)    | 5.x       |
| Styling      | Tailwind CSS                | 3.4.1     |
| Backend      | Supabase (Postgres + Auth + Storage + RLS) | 2.45.0 |
| SSR Auth     | @supabase/ssr               | 0.5.0     |
| Validation   | Zod                         | 4.3.6     |
| Testing      | Vitest                      | 4.0.18    |
| Utilities    | clsx, tailwind-merge, date-fns, uuid | — |
| Deployment   | Vercel (via GitHub)         | —         |

---

## Directory Structure

```
dm-deal-portal/
├── public/                              # Static assets (logo)
├── supabase/
│   └── migrations/                      # SQL migrations (applied manually via SQL Editor)
│       ├── 001_initial_schema.sql       # Full schema, RLS, triggers, seed data
│       ├── 002_update_statuses.sql      # D&M-specific workflow statuses
│       ├── 003_add_term_column.sql      # Term (months) on deals
│       ├── 004_fix_corrupted_office_ids.sql
│       ├── 005_fix_offices_and_seed_teams.sql
│       ├── 006_add_kicked_back_to_manager_status.sql
│       ├── 007_add_kickback_tracking.sql
│       ├── 008_enhancements.sql         # deal_views, audit_log, notifications, kickback_reasons, reporting views
│       ├── 009_kickback_response_tracking.sql
│       ├── 010_real_team_names.sql
│       ├── 011_add_general_manager_role.sql
│       ├── 012_fix_kickback_response_rls.sql   # UPDATE policy so kickback responses save
│       ├── 013_user_directory_visibility.sql   # All authed users can read the user directory (name resolution)
│       └── 014_reporting_views_security_invoker.sql  # Reporting views honor RLS (no cross-role data leak via API)
│
├── src/
│   ├── middleware.ts                    # Next.js middleware — session refresh on all routes
│   │
│   ├── app/                            # Next.js App Router pages
│   │   ├── layout.tsx                  # Root layout (HTML, fonts, metadata)
│   │   ├── page.tsx                    # Landing page (redirects to /dashboard)
│   │   ├── globals.css                 # Global Tailwind styles + custom classes
│   │   ├── error.tsx                   # Root error boundary
│   │   ├── loading.tsx                 # Root loading state
│   │   ├── not-found.tsx              # 404 page
│   │   │
│   │   ├── auth/
│   │   │   ├── login/page.tsx          # Login page
│   │   │   └── callback/route.ts       # OAuth callback handler
│   │   │
│   │   └── dashboard/
│   │       ├── layout.tsx              # Auth check + user profile fetch + nav wrapper
│   │       ├── page.tsx                # Dashboard home (action items, stats)
│   │       ├── error.tsx               # Dashboard error boundary
│   │       ├── loading.tsx             # Dashboard loading state
│   │       │
│   │       ├── deals/
│   │       │   ├── page.tsx            # Deal list page
│   │       │   ├── actions-documents.ts # Server actions for doc upload/delete/replace
│   │       │   ├── loading.tsx
│   │       │   │
│   │       │   ├── [id]/
│   │       │   │   ├── page.tsx        # Deal detail page
│   │       │   │   ├── actions.ts      # Server actions (status, messages, fields)
│   │       │   │   └── loading.tsx
│   │       │   │
│   │       │   └── new/
│   │       │       ├── page.tsx        # New deal submission
│   │       │       ├── actions.ts      # Server action to create deal
│   │       │       └── loading.tsx
│   │       │
│   │       ├── admin/
│   │       │   ├── page.tsx            # Admin panel (users, teams)
│   │       │   ├── actions.ts          # Server actions for admin CRUD
│   │       │   └── loading.tsx
│   │       │
│   │       └── reporting/
│   │           ├── page.tsx            # Reporting dashboard (executives/admins)
│   │           └── loading.tsx
│   │
│   ├── components/
│   │   ├── ui/                         # Reusable UI primitives
│   │   │   ├── index.ts               # Barrel export for all UI components
│   │   │   ├── badge.tsx              # Badge, StatusBadge
│   │   │   ├── button.tsx             # Button with variants
│   │   │   ├── card.tsx               # Card, CardHeader
│   │   │   ├── currency-input.tsx     # Currency input with formatting
│   │   │   ├── empty-state.tsx        # Empty state placeholder
│   │   │   ├── file-upload.tsx        # Drag-and-drop file upload
│   │   │   ├── input.tsx              # Text input
│   │   │   ├── modal.tsx              # Modal/dialog
│   │   │   ├── radio-group.tsx        # Radio button group
│   │   │   ├── select.tsx             # Select dropdown
│   │   │   ├── spinner.tsx            # Spinner, PageSpinner
│   │   │   ├── textarea.tsx           # Textarea
│   │   │   └── timer-badge.tsx        # Timer display with urgency colors
│   │   │
│   │   ├── admin/                     # Admin-specific components
│   │   │   ├── admin-panel.tsx
│   │   │   ├── team-management.tsx
│   │   │   └── user-management.tsx
│   │   │
│   │   ├── dashboard/                 # Dashboard components
│   │   │   ├── dashboard-shell.tsx    # Main nav/sidebar wrapper
│   │   │   ├── home-dashboard.tsx     # Home page content
│   │   │   └── submitted-deals-queue.tsx
│   │   │
│   │   ├── deals/                     # Deal-related components
│   │   │   ├── deals-list.tsx         # Deal list with table + card views
│   │   │   ├── deal-detail.tsx        # Full deal detail view
│   │   │   └── communication-thread.tsx # Messages/notes thread
│   │   │
│   │   ├── forms/                     # Multi-step deal form
│   │   │   ├── deal-form-wizard.tsx   # Wizard controller (state, navigation)
│   │   │   └── steps/
│   │   │       ├── step-deal-setup.tsx        # Step 1: Deal type, applicant count
│   │   │       ├── step-applicant-info.tsx    # Step 2: Applicant details
│   │   │       ├── step-vehicle-info.tsx      # Step 3: Vehicle info + pricing
│   │   │       ├── step-trade-in.tsx          # Step 4: Trade-in details
│   │   │       ├── step-open-autos.tsx        # Step 5: Open auto loans
│   │   │       ├── step-credit.tsx            # Step 6: Credit scores + strengths
│   │   │       └── step-documents.tsx         # Step 7: Document uploads
│   │   │
│   │   └── reporting/
│   │       └── reporting-dashboard.tsx
│   │
│   ├── contexts/
│   │   └── role-switcher-context.tsx   # Admin "View As" role switching (cookie-based)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                 # Auth state hook (client-side)
│   │   ├── useRealtimeDeals.ts        # Supabase realtime subscriptions
│   │   └── useTimer.ts               # Timer/countdown hook for SLA badges
│   │
│   ├── lib/                           # Core utilities and configuration
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client (anon key)
│   │   │   ├── server.ts             # Server client + admin client (service role key)
│   │   │   └── middleware.ts          # Session refresh middleware helper
│   │   │
│   │   ├── constants.ts              # All labels, configs, status transitions, form steps
│   │   ├── env.ts                    # Zod-validated environment variables
│   │   ├── errors.ts                 # Custom error classes (AppError, AuthenticationError, etc.)
│   │   ├── logger.ts                 # Structured logging utility
│   │   ├── permissions.ts            # Role-based permission checks
│   │   ├── timer-utils.ts            # Timer calculation helpers
│   │   ├── types.ts                  # ALL TypeScript interfaces and type unions
│   │   ├── utils.ts                  # Pure utility functions (formatting, calculations)
│   │   ├── validation.ts             # Zod validation schemas
│   │   │
│   │   └── __tests__/
│   │       ├── utils.test.ts
│   │       ├── permissions.test.ts
│   │       └── validation.test.ts
│   │
│   ├── services/                      # Business logic abstraction layer
│   │   ├── auth.ts                   # Authentication service (wraps Supabase Auth)
│   │   ├── database.ts              # Generic DB query helpers (rarely used directly)
│   │   ├── notifications.ts         # Notification service
│   │   └── storage.ts               # File storage service (wraps Supabase Storage)
│   │
│   └── __tests__/
│       └── setup.ts                  # Vitest setup file
```

---

## Architecture Overview

```
Browser ──► Next.js Middleware (session refresh)
               │
               ├── Server Components (page.tsx, layout.tsx)
               │       │
               │       ├── Direct Supabase queries (read)
               │       └── Pass data as props to client components
               │
               ├── Server Actions (actions.ts)
               │       │
               │       ├── Supabase mutations (insert/update/delete)
               │       └── revalidatePath() after mutations
               │
               └── Client Components ('use client')
                       │
                       ├── Call server actions for mutations
                       ├── useState for local UI state
                       ├── Supabase realtime subscriptions (hooks)
                       └── Cookie-based role switching (admin only)
```

**Key architectural decisions:**
- Server components are the default. Client components only when interactivity is needed.
- Server actions handle all mutations. No API routes exist.
- RLS policies enforce authorization at the database level. Server actions trust RLS.
- Data flows top-down: server components fetch, pass props to client components.

---

## File Naming Conventions

| Pattern | Convention | Examples |
| ------- | ---------- | -------- |
| All source files | `kebab-case` | `deal-detail.tsx`, `role-switcher-context.tsx` |
| Next.js pages | `page.tsx` | `src/app/dashboard/deals/page.tsx` |
| Next.js layouts | `layout.tsx` | `src/app/dashboard/layout.tsx` |
| Loading states | `loading.tsx` | `src/app/dashboard/loading.tsx` |
| Error boundaries | `error.tsx` | `src/app/dashboard/error.tsx` |
| Server actions | `actions.ts` (never `.tsx`) | `src/app/dashboard/deals/[id]/actions.ts` |
| Specialized actions | `actions-{domain}.ts` | `src/app/dashboard/deals/actions-documents.ts` |
| Test files | `{name}.test.ts` | `src/lib/__tests__/utils.test.ts` |
| Hooks | `use{Name}.ts` (camelCase) | `src/hooks/useRealtimeDeals.ts` |

---

## Component Patterns

### Server Components (default)
No directive needed. Used for pages and layouts.
```typescript
// src/app/dashboard/deals/[id]/page.tsx
export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;  // Must await params in Next.js 14+
  const supabase = await createClient();
  // fetch data, return JSX
}
```

### Client Components
Marked with `'use client'` as the first line. Used for interactivity.
```typescript
// src/components/deals/deal-detail.tsx
'use client';

import { useState } from 'react';

export function DealDetail({ deal, userProfile }: DealDetailProps) {
  // interactive UI with state
}
```

### Export Conventions
- **Named exports** for components: `export function DealDetail()`
- **Default exports** only for page.tsx files: `export default async function Page()`
- **Barrel exports** for UI primitives: `src/components/ui/index.ts`

---

## Data Fetching Patterns

### Direct Supabase in Server Components (primary pattern)
```typescript
const supabase = await createClient();
const { data, error } = await supabase
  .from('deals')
  .select('*, applicants:deal_applicants(*)')
  .eq('id', dealId)
  .single();
```

### FK Hint Pattern (critical for ambiguous joins)
The `users` <-> `teams` relationship has two FKs (`users.team_id` and `teams.manager_id`). Always disambiguate:
```typescript
// CORRECT — always use FK hint
.select('*, team:teams!users_team_id_fkey(*, office:offices(*))')

// WRONG — ambiguous join error
.select('*, team:teams(*)')
```

### Fallback Query Pattern
When a query might fail due to corrupted data, try the full query first, then fallback:
```typescript
let { data: userProfile, error } = await supabase
  .from('users')
  .select('*, team:teams!users_team_id_fkey(*, office:offices(*))')
  .eq('id', authUser.id)
  .single();

if (error && !userProfile) {
  console.warn('Full query failed, retrying:', error.message);
  ({ data: userProfile } = await supabase
    .from('users')
    .select('*, team:teams!users_team_id_fkey(*)')
    .eq('id', authUser.id)
    .single());
}
```

### Batch User Lookup (avoid N+1)
```typescript
const allUserIds = new Set<string>();
// ... collect IDs from deals
const { data: relatedUsers } = await supabase
  .from('users')
  .select('id, first_name, last_name, email, role')
  .in('id', Array.from(allUserIds));
const usersMap = Object.fromEntries(relatedUsers.map(u => [u.id, u]));
```

### Server Action Pattern (all mutations)
```typescript
'use server';
export async function updateDealStatus(dealId: string, newStatus: DealStatus) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  // ... mutation logic
  revalidatePath('/dashboard/deals');
  revalidatePath(`/dashboard/deals/${dealId}`);
}
```

---

## State Management

No global state library. Uses React built-ins only:

| Mechanism | Purpose | Location |
| --------- | ------- | -------- |
| `useState` | Local component state | Client components |
| React Context | Admin role switching | `src/contexts/role-switcher-context.tsx` |
| Cookies | Persist `viewAsRole` across server/client | Read via `cookies()` in server components |
| URL params | Deal list filtering | Query string parameters |
| Server component props | Top-down data flow | page.tsx -> component props |

---

## Import Conventions

Path alias `@/*` maps to `./src/*` (configured in `tsconfig.json`).

**Import ordering** (observed pattern):
```typescript
// 1. External dependencies
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal absolute imports
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { DEAL_STATUS_CONFIG } from '@/lib/constants';

// 3. Types (often with 'type' keyword)
import type { UserRole, DealStatus } from '@/lib/types';
```

All cross-directory imports use `@/` paths. Relative imports only within the same directory.

---

## Type System

All types live in `src/lib/types.ts`. No scattered type definitions.

**Conventions:**
- PascalCase for interfaces: `User`, `Deal`, `DealApplicant`
- String literal unions for enums: `type UserRole = 'agent' | 'manager' | ...`
- `*WithRelations` suffix for joined types: `UserWithRelations`, `DealWithRelations`
- `*FormData` suffix for form state types: `DealFormData`, `ApplicantFormData`
- No generated Supabase types file — types are manually maintained

**Key types:**
- `UserRole`: `'agent' | 'manager' | 'underwriter' | 'executive' | 'administrator'`
- `DealStatus`: 9 statuses (see Deal Workflow below)
- `DealType`: `'lease' | 'retail_purchase' | 're_lease' | 'lease_buyout'`
- `VehicleCondition`: `'new' | 'used' | 'untitled_demo'`
- `DocumentType`: 10 types (cybercalc, cyberretail, credit_application, etc.)

---

## Constants & Configuration

All labels, mappings, and configuration live in `src/lib/constants.ts`:

- `ROLE_LABELS` — Display names for roles
- `DEAL_TYPE_LABELS` — Display names for deal types
- `DEAL_STATUS_CONFIG` — Status labels + Tailwind color classes
- `VEHICLE_CONDITION_LABELS` — Display names for conditions
- `DOCUMENT_TYPE_LABELS` — Display names for document types
- `REQUIRED_DOCUMENTS` — Required docs per deal type
- `CONDITIONAL_DOCUMENTS` — Docs required based on conditions (used vehicle, business, etc.)
- `OPTIONAL_DOCUMENTS` — Always-visible optional doc types
- `STATUS_TRANSITIONS` — Valid next statuses + which roles can trigger them
- `KICKBACK_REASON_LABELS` — Kickback reason display names
- `DEFAULT_TIMER_CONFIG` — SLA thresholds in hours (green/yellow/red)
- `FORM_STEPS` — 7-step wizard metadata
- `OFFICES` — Office names and team counts
- `PORTAL_MODULES` — Feature modules (underwriting active, others planned)

---

## Permissions System

Defined in `src/lib/permissions.ts`. Role hierarchy: agent(1) < manager(2) < underwriter(3) < executive(4) < administrator(5).

**Page access:**
- Admin panel: administrator only
- Reporting: executive, administrator
- Submit deals: agent, administrator
- View deals: scoped by role (agent sees own, manager sees team, UW/exec/admin see all)

**Deal actions by role:**

| Action | Agent | Manager | Underwriter | Executive | Admin |
| ------ | ----- | ------- | ----------- | --------- | ----- |
| Edit fields | Own deals (kicked_back/pending) | Non-terminal deals | No | No | All |
| Upload docs | Own deals | All in scope | No | No | All |
| Delete docs | Own deals | All | No | No | All |
| Send messages | Own deals | All | All | No | All |
| Send action_required | No | Yes | Yes | No | Yes |
| Claim deal | No | No | Unassigned UW deals | No | No |
| Kick back to manager | No | No | UW/lender status | No | Yes |
| Kick back to sales | No | Review/kickback status | No | No | Yes |

**Status transitions** are defined in `STATUS_TRANSITIONS` constant. Each status maps to valid next statuses and which roles can trigger them.

---

## Database Schema

### Tables

**offices** — Office locations
- `id` UUID PK, `name` TEXT UNIQUE, `created_at` TIMESTAMPTZ

**teams** — Teams within offices
- `id` UUID PK, `name` TEXT, `office_id` FK->offices, `manager_id` FK->users
- UNIQUE(name, office_id)

**users** — User profiles (linked to auth.users)
- `id` UUID PK (FK->auth.users), `email` TEXT UNIQUE, `first_name`, `last_name`
- `role` TEXT CHECK(agent|manager|underwriter|executive|administrator)
- `team_id` FK->teams, `primary_office_id` FK->offices, `is_active` BOOLEAN

**deals** — Main deal records
- `id` UUID PK, `deal_number` TEXT UNIQUE (auto-generated: DM-YYYY-#####)
- `deal_type`, `status`, `submitted_by` FK->users, `assigned_manager` FK->users
- `assigned_underwriter` FK->users (nullable)
- Vehicle fields: year, make, model, trim, mileage, condition
- Financial fields: msrp, invoice, jd_power_retail/wholesale, net_cap_cost, total_amount_financed, monthly_payment, term
- Flags: has_trade_in, has_open_autos, has_business, has_derogatory_credit

**deal_applicants** — 1-3 per deal
- `applicant_number` INTEGER(1-3), `first_name`, `last_name`
- `experian_score` INTEGER, `has_alternate_bureau`, `alternate_bureau`, `alternate_score`

**deal_trade_ins** — 0 or 1 per deal (UNIQUE on deal_id)
- `year`, `make`, `model`, `monthly_payment`, `lienholder`, `who_drives`

**deal_open_autos** — 0-10 per deal
- `auto_number` INTEGER, `lienholder`, `monthly_payment`, `who_drives`

**deal_documents** — Uploaded files
- `document_type` (10 types), `storage_path`, `display_name`, `original_filename`
- `uploaded_by` FK->users, `replaced_by` FK->users (nullable)

**deal_messages** — Communication thread
- `message_type` (note|action_required), `content`, `is_resolved`, `sender_id` FK->users

**deal_message_views** — Read receipts
- `message_id` FK->deal_messages, `viewed_by` FK->users, UNIQUE(message_id, viewed_by)

**deal_status_history** — Audit trail for status changes
- `from_status`, `to_status`, `changed_by`, `notes`
- `kickback_reason`, `kickback_explanation` (added migration 007)

**deal_field_changes** — Audit trail for field edits
- `field_name`, `old_value`, `new_value`, `changed_by`

**deal_assignments** — UW assignment history
- `assigned_to`, `assigned_by`, `assignment_type` (underwriter_claim|reassignment)

**timer_config** — SLA timer thresholds
- `config_key` (manager_review|agent_response|underwriter_pickup|underwriter_review)
- `green_max_hours`, `yellow_max_hours`

### Key Relationships

```
offices 1──N teams
teams   1──N users (via team_id)
teams   N──1 users (via manager_id)  ← AMBIGUOUS FK — always use hint!

deals:
  submitted_by      → users (agent)
  assigned_manager   → users (manager)
  assigned_underwriter → users (nullable)

deals 1──N deal_applicants
deals 1──0..1 deal_trade_ins
deals 1──N deal_open_autos
deals 1──N deal_documents
deals 1──N deal_messages
deals 1──N deal_status_history
deals 1──N deal_field_changes
deals 1──N deal_assignments
```

### Database Functions & Triggers
- `generate_deal_number()` — BEFORE INSERT on deals, auto-generates `DM-YYYY-#####`
- `update_updated_at()` — BEFORE UPDATE on deals/users, auto-sets `updated_at`
- `handle_new_user()` — AFTER INSERT on auth.users, creates public.users record with default role 'agent'
- `get_user_role()`, `get_user_team_id()`, `get_user_office_id()` — RLS helper functions

---

## RLS Policies (Summary)

| Role | View Users | View Deals | Mutate Deals | View All Sub-tables |
| ---- | ---------- | ---------- | ------------ | ------------------- |
| Agent | Own profile | Own deals | Own (kicked back/pending) | Via deal visibility |
| Manager | Team members | Team/office deals | Team deals | Via deal visibility |
| Underwriter | All users | All deals | Assigned or unassigned UW deals | Via deal visibility |
| Executive | All users | All deals | None (read-only) | Via deal visibility |
| Administrator | All | All | All | All |

Sub-tables inherit deal visibility: `deal_id IN (SELECT id FROM deals)`.

---

## Storage

**Bucket**: `deal-documents` (Supabase Storage)

**Path pattern**: `deals/{dealId}/{documentType}/{timestamp}.{ext}`

**File constraints**: PDF, JPG, PNG, DOC, DOCX. Max 10MB (enforced via `next.config.ts` serverActions bodySizeLimit).

**Display name format**: `"LastName - Year Make Model Trim - DocType"`

**Operations** (via `src/services/storage.ts`):
- Upload: `storage.from('deal-documents').upload(path, file)`
- Download: `storage.from('deal-documents').download(path)`
- Signed URL: `storage.from('deal-documents').createSignedUrl(path, 3600)`
- Delete: `storage.from('deal-documents').remove([path])`

---

## Services Layer

Located in `src/services/`. These abstract Supabase operations behind interfaces (useful for Azure migration).

| Service | File | Purpose |
| ------- | ---- | ------- |
| AuthService | `auth.ts` | getCurrentUser, signIn, signUp, signOut, updateRole |
| DatabaseService | `database.ts` | Generic query/insert/update/delete helpers |
| StorageService | `storage.ts` | File upload/download/delete/replace |
| NotificationService | `notifications.ts` | Notification creation and delivery |

**Note**: `DatabaseService` is rarely used directly — most queries happen inline in server components. Consider consolidating.

---

## Authentication Flow

```
1. User visits /auth/login
2. Signs in via Supabase Auth (email/password or OAuth)
3. Callback: /auth/callback/route.ts exchanges code for session
4. Middleware (src/middleware.ts) refreshes session on every request
5. Dashboard layout (src/app/dashboard/layout.tsx):
   a. Gets auth user via supabase.auth.getUser()
   b. Fetches full profile from users table with team/office joins
   c. If no auth user → redirect to /auth/login
   d. If no profile → sign out and redirect
   e. Passes userProfile as prop to dashboard shell
6. Admin "View As": cookie 'viewAsRole' overrides effective role for server components
```

**Supabase clients:**
- `createClient()` in `lib/supabase/server.ts` — uses anon key + user cookies, RLS enforced
- `createAdminClient()` in `lib/supabase/server.ts` — uses service role key, bypasses RLS (admin ops only)
- `createBrowserClient()` in `lib/supabase/client.ts` — browser-side, anon key, RLS enforced

---

## Deal Workflow

### Status Flow
```
Agent submits  ──►  pending
                       │
Agent resubmits ──► pending_manager_review  ◄── Manager sends back from kicked_back_to_manager
                       │
                       ├──► kicked_back_to_sales (Manager rejects)  ──► Agent fixes ──► pending_manager_review
                       │
                       └──► submitted_to_underwriting (Manager approves)
                               │
                               ├──► kicked_back_to_manager (UW rejects) ──► Manager reviews
                               │
                               └──► submitted_to_lender (UW approves)
                                       │
                                       ├──► kicked_back_to_manager (Lender issues)
                                       │
                                       └──► approved
                                               │
                                               └──► signed_and_delivered (terminal)

Any non-terminal status ──► cancelled (terminal)
```

### SLA Timers
| Timer Key | Green Max | Yellow Max | Beyond = Red |
| --------- | --------- | ---------- | ------------ |
| manager_review | 2 hours | 4 hours | > 4 hours |
| agent_response | 4 hours | 8 hours | > 8 hours |
| underwriter_pickup | 1 hour | 2 hours | > 2 hours |
| underwriter_review | 4 hours | 8 hours | > 8 hours |

### Kickback Reasons
- Poor Deal Information
- Incomplete Application
- Loan to Value Too High
- Missing Documents for Submittal
- Other

---

## Environment Variables

Validated at module load via Zod in `src/lib/env.ts`. App fails fast if missing.

| Variable | Scope | Required | Description |
| -------- | ----- | -------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser + server) | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser + server) | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Yes | Supabase service role key (bypasses RLS) |
| `NEXT_PUBLIC_APP_URL` | Public | No | App URL (defaults to `http://localhost:3000`) |

Copy `.env.local.example` to `.env.local` and fill in values.

---

## Build, Test & Deployment

### Commands
```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build (Next.js)
npm run start    # Start production server
npm run lint     # Run ESLint
npx vitest       # Run tests (no npm test script defined)
npx vitest --coverage  # Run tests with coverage
```

### Test Configuration
- **Framework**: Vitest 4.0.18 with jsdom environment
- **Setup**: `src/__tests__/setup.ts`
- **Test location**: `src/lib/__tests__/*.test.ts`
- **Coverage**: V8 provider, covers `src/lib/**` and `src/services/**`
- **Path alias**: `@/` resolves to `./src/` in test config

### Deployment
- Deployed on **Vercel** via GitHub integration
- No CI/CD config files (GitHub Actions, etc.)
- Supabase migrations are applied **manually** via SQL Editor — never auto-run from Git

---

## Design System

### Brand Colors (Tailwind: `brand-*`)
- Primary blue: `#1A569B` (brand-500)
- Secondary navy: `#213E69` (brand-700)
- Full scale: brand-50 through brand-950

### Surface Colors (Tailwind: `surface-*`)
- White through dark: surface-0 (`#ffffff`) through surface-950 (`#1F1F1F`)

### Status Colors (Tailwind: `status-*`)
- Success: `#83E8AB` (green)
- Warning: `#FFBE0B` (yellow)
- Danger: `#DD0F15` (red)
- Info: `#1A569B` (brand blue)

### Typography
- Font: Roboto (via `var(--font-roboto)`)
- Weights: 300 (light), 400 (regular), 500 (medium), 700 (bold)

### Utilities
- `cn()` function in `src/lib/utils.ts` — merges clsx + tailwind-merge for conditional classes
- Custom shadows: `shadow-card`, `shadow-card-hover`, `shadow-modal`
- Custom animations: `animate-fade-in`, `animate-slide-up`, `animate-slide-down`

---

## Known Gotchas

1. **Ambiguous FK joins**: `users` <-> `teams` has two FK relationships. Always use `!users_team_id_fkey` hint:
   ```typescript
   .select('*, team:teams!users_team_id_fkey(*, office:offices(*))')
   ```

2. **Next.js 14+ params**: Route params are a `Promise`. Must `await params` before accessing:
   ```typescript
   const { id } = await params;
   ```

3. **No `<Link>` wrapping `<tr>`**: Invalid HTML. Use `onClick` + `router.push()` on the `<tr>` instead.

4. **Supabase migrations**: Do NOT auto-run from Git. Must be applied manually via SQL Editor.

5. **Cookie-based role switching**: Admin "View As" uses a `viewAsRole` cookie read by server components via `cookies()`.

6. **Fallback queries**: User profile queries try with full office FK join first, fallback without if corrupted data causes failure.

7. **Server action revalidation**: Always call `revalidatePath()` after mutations to refresh server component data.

8. **10MB upload limit**: Configured in `next.config.ts` under `experimental.serverActions.bodySizeLimit`.

---

## Inconsistencies & Technical Debt

1. **DatabaseService underused** — `src/services/database.ts` provides generic query helpers, but most code queries Supabase directly in server components. Consider either removing the service or migrating inline queries to use it (recommended for Azure migration).

2. **No `npm test` script** — Vitest is configured but `package.json` has no `test` script. Run tests with `npx vitest`.

3. **Manual types** — Types in `src/lib/types.ts` are maintained manually. No Supabase type generation (`supabase gen types`). Types may drift from actual schema.

4. **Timer badge not in barrel export** — `timer-badge.tsx` exists in `src/components/ui/` but is not exported from `src/components/ui/index.ts`.

5. **Portal modules placeholder** — Two of three portal modules (Finance Printing, Wire Request) are marked `available: false` in constants.

---

## Azure Migration Notes

### Infrastructure Mapping

| Current (Supabase/Vercel) | Target (Azure) | Migration Notes |
| ------------------------- | -------------- | --------------- |
| Supabase Auth | Microsoft Entra ID (Azure AD) | Replace `@supabase/ssr` auth with MSAL. Update middleware, login flow, callback handler. RLS policies will need equivalent Azure SQL security. |
| Supabase PostgreSQL | Azure SQL | Migrate schema via SQL scripts. Replace PostgREST queries with direct SQL or an ORM (Prisma/Drizzle). RLS policies → Azure SQL row-level security or application-level authorization. |
| Supabase Storage | Azure Blob Storage | Replace `storage.from('deal-documents')` calls with Azure Blob SDK. Update `src/services/storage.ts` interface. |
| Supabase Realtime | Azure SignalR or Azure Web PubSub | Replace `useRealtimeDeals.ts` hook with SignalR client. |
| Vercel (hosting) | Azure App Service or Azure Static Web Apps | Update deployment pipeline. May need Azure Functions for server actions. |
| Vercel Edge (middleware) | Azure Front Door or Application Gateway | Session refresh logic moves to Azure-compatible middleware. |
| PostgREST query syntax | SQL queries / ORM | `.from().select().eq()` syntax replaced with parameterized SQL or ORM queries. |
| Supabase RLS functions | Azure SQL security or app-level auth | `get_user_role()`, `get_user_team_id()` helpers need equivalent implementation. |

### Migration-Ready Patterns Already in Place
- **Services layer** (`src/services/`) abstracts Supabase behind interfaces — swap implementations for Azure
- **Environment validation** (`src/lib/env.ts`) — add new Azure env vars to Zod schema
- **Permissions module** (`src/lib/permissions.ts`) — pure logic, not Supabase-dependent
- **Constants/types** — fully portable, no Supabase dependency
- **Custom error classes** — framework-agnostic

### Migration Risks
- **RLS policies** are deeply integrated. Moving to Azure SQL requires reimplementing authorization at the application layer or using Azure SQL row-level security (less flexible than Supabase RLS).
- **Realtime subscriptions** in `useRealtimeDeals.ts` are tightly coupled to Supabase channels. Need full rewrite for SignalR.
- **FK hint syntax** (`!users_team_id_fkey`) is Supabase/PostgREST-specific. Will not exist in Azure SQL queries.
- **`handle_new_user()` trigger** auto-creates user profiles on auth signup. Azure equivalent would be a Microsoft Graph webhook or Entra ID event.
- **Cookie-based session management** via `@supabase/ssr` needs replacement with MSAL session handling.

### Microsoft Graph API Integration Points
- **User management** — Replace Supabase Auth admin operations with Graph API user provisioning
- **Office 365** — Deal notifications could integrate with Outlook email/Teams
- **SharePoint** — Document storage could use SharePoint document libraries instead of Blob Storage
- **Power Automate** — Deal workflow transitions could trigger Power Automate flows

---

## How to Work in This Codebase

### Before writing any code:
- Read the relevant sections of this CLAUDE.md
- State the filepath, purpose, dependencies, and what consumes it
- Identify what existing code will be affected by the change
- If anything conflicts with the architecture defined here, STOP and ask

### When writing code:
- Follow the patterns and conventions already documented above — do not invent new ones
- Every function gets explicit types, error handling, and a JSDoc comment
- Generate a matching test file for any new module
- Do not modify files outside the scope of the current request

### After writing code:
- Run `npx next build` and confirm zero errors
- Verify the change doesn't break existing imports or consumers
- Flag any technical debt or shortcuts taken
- Update this CLAUDE.md if the change affects project structure

### Never:
- Skip types or error handling to save time
- Create duplicate utilities when one already exists
- Assume what a function should do — ask if unclear
- Modify shared types without flagging the downstream impact

---

## Debugging Rules

When the app is down or throwing 504/timeout errors:

1. **Check infrastructure first** — BEFORE changing any code, hit the health check endpoint at `/api/health` to determine if Supabase is responding. If Supabase is unhealthy, STOP — the problem is infrastructure, not code. Tell me to check the Supabase dashboard.

2. **One fix at a time** — If code changes are needed, identify the LAST KNOWN WORKING COMMIT first. Make ONE targeted fix. Build, push, test. If it doesn't work after ONE attempt, revert to the last working commit immediately with `git revert HEAD` and push. Do not stack multiple fix attempts.

3. **Two-strike rule** — NEVER make more than 2 fix attempts without reverting to the last working state. If 2 fixes don't solve it, revert and tell me the problem might not be code.

4. **Hands off critical paths** — NEVER change auth methods (`getUser`/`getSession`), middleware, or `layout.tsx` as part of a fix unless that specific file is proven to be the cause.

5. **No event handlers in Server Components** — NEVER add `onClick` or event handlers in React Server Components (files without `'use client'` at the top).

6. **No heavy storage calls in layout** — `getMissingDocItemsCount()` must NEVER run in `layout.tsx`. It makes hundreds of storage API calls and will crash the app.
