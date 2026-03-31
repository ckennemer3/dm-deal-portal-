# Known Issues — D&M Deal Portal

## Bugs

| # | Issue | Location | Severity | Description |
|---|-------|----------|----------|-------------|
| 1 | Middleware config warning | `src/middleware.ts` | Low | Build produces "Unsupported node type TaggedTemplateExpression" warning. The middleware uses a tagged template literal in the matcher config that Next.js 14 can't statically analyze. It falls back to the default matcher, which means middleware runs on ALL routes instead of the optimized subset. No functional impact, but slightly less efficient. |
| 2 | Missing activity page (404) | Dashboard navigation | Medium | The home dashboard UI contains a link to `/dashboard/activity` which does not exist as a page. Clicking it will produce a 404. |
| 3 | Notification failures silently swallowed | `src/services/audit.ts` | Medium | `logAuditEvent()`, `createInAppNotification()`, and `notifyDealParticipants()` are fire-and-forget. If they fail, the error is logged but the user gets no indication. In-app notifications may silently not appear. |
| 4 | Email notifications are console-only | `src/services/notifications.ts` | High | The `NotificationService` uses `ConsoleEmailTransport` which only logs to console. No actual emails are sent. Users will not receive any email notifications about deal status changes, kickbacks, or action items. |

## Incomplete Features

| # | Feature | What's Done | What's Missing |
|---|---------|-------------|----------------|
| 1 | **Finance Printing Module** | Listed in `PORTAL_MODULES` constant with `available: false` | No code, no UI, no database schema. Entirely unbuilt. |
| 2 | **Wire Request Module** | Listed in `PORTAL_MODULES` constant with `available: false` | No code, no UI, no database schema. Entirely unbuilt. |
| 3 | **Password Reset** | Login page exists | No "Forgot Password" link, no reset page, no reset email flow. Users cannot self-service reset passwords. |
| 4 | **User Profile Editing** | Users table has fields for name, email | No self-service profile editing UI. Users cannot change their own name, email, or password. Only administrators can edit user records. |
| 5 | **Notification Preferences** | Notifications table exists, bell component exists | No UI for users to configure which notifications they receive or how (email, in-app, etc.) |
| 6 | **Activity Feed** | `audit_log` table stores all actions | No `/dashboard/activity` page to display the feed. Link exists but page doesn't. |
| 7 | **Bulk Operations** | Deal list exists | No ability to select multiple deals and perform bulk actions (approve, assign, export) |
| 8 | **Deal Search (Advanced)** | Basic text search on deal list | No advanced search by credit score range, LTV, date range, amount, etc. |

## Hardcoded Values That Should Be Configurable

| Value | Location | Current Value | Recommendation |
|-------|----------|---------------|----------------|
| File size limit | `next.config.ts` | 10MB | Consider making configurable or increasing for large PDFs |
| Allowed file types | `src/components/ui/file-upload.tsx` | PDF, JPG, PNG, DOC, DOCX | Move to constants or env var |
| Signed URL expiry | `src/services/storage.ts` | 3600 seconds (1 hour) | Move to constants or env var |
| Credit score range | `src/lib/validation.ts` | 300-850 | Move to constants |
| Applicant limit | `src/lib/types.ts`, validation | 1-3 | Already in constants but also hardcoded in validation |
| Office list | `src/lib/constants.ts` | 9 static offices | Already in DB via seed data, but constants file also has a static list. These could drift. |
| LTV color thresholds | `src/lib/utils.ts` | Green ≤100%, Yellow ≤115%, Red >115% | Move to constants |
| Deal number format | `src/lib/utils.ts` + DB function | DM-YYYY-NNNNN | Hardcoded in both JS and SQL. Must change in both places if modified. |

## Missing Error Handling

| Location | Issue |
|----------|-------|
| Server actions (general) | Most server actions check for authentication but rely on try/catch at the page level. Some mutations could leave partial data if a multi-step insert fails partway (e.g., deal + applicants + documents). |
| Document upload | If Supabase Storage upload succeeds but the DB record insert fails, there's rollback logic — but if the rollback (storage delete) also fails, the orphaned file remains. |
| Realtime subscriptions | `useRealtimeDeals` logs subscription errors but doesn't display them to the user or attempt reconnection logic. |
| Auth callback | `src/app/auth/callback/route.ts` redirects on error but doesn't display what went wrong. |

## Missing Input Validation

| Location | Issue |
|----------|-------|
| Admin user creation | `createUser` server action validates with Zod but the password requirements are basic (8+ characters only). No complexity requirements. |
| Deal field editing | `updateDealField` validates the field name against an allowlist but doesn't validate the new value's format (e.g., a numeric field could receive non-numeric input). |
| File upload filenames | Original filenames are stored as-is. No sanitization of special characters that could cause issues in storage paths. |

## Performance Concerns

| # | Concern | Details |
|---|---------|---------|
| 1 | **Reporting page bundle size** | 119 kB JS (first load: 223 kB) — significantly larger than other pages. Heavy Recharts dependency. |
| 2 | **Reporting data fetching** | `fetchReportingData()` runs multiple parallel queries but fetches ALL deals and history for the date range, then computes metrics in JavaScript. For large datasets, this will be slow. Consider database-level aggregation. |
| 3 | **N+1 in deal detail** | The deal detail page fetches the deal with relations, then separately fetches all referenced users in a batch. Two queries minimum per page load. |
| 4 | **No pagination** | Deal list loads all visible deals at once. No server-side pagination. For offices with hundreds of deals, this will degrade. |
| 5 | **Realtime channel per view** | Each client component that uses `useRealtimeDeals` opens a WebSocket channel. Multiple tabs = multiple connections. |

## Things That Would Surprise a New Developer

1. **Two FK relationships between `users` and `teams`** — Every Supabase query joining these tables MUST use an FK hint (`!users_team_id_fkey` or `!fk_teams_manager`). Missing the hint causes a silent null result or an ambiguous join error.

2. **Fallback query pattern** — The dashboard layout tries a full query with office joins, then retries without if it fails. This was added to handle corrupted `primary_office_id` data. It means the app may work with partial data and the user won't know something is missing.

3. **No `npm test` script** — You must run `npx vitest` directly. There is no `test` script in `package.json`.

4. **Migrations must be applied manually** — There is no migration runner. You must copy-paste each SQL file into the Supabase SQL Editor, in order.

5. **The `general_manager` role was added late** — It was the last migration (011). Some older parts of the code may not handle it consistently.

6. **Cookie-based role switching** — Administrators can appear as any role by setting a cookie. This means server components and client components may see different "effective roles" if the cookie is stale.

7. **Deal number generation exists in both JS and SQL** — `generateDealNumber()` in `src/lib/utils.ts` and `generate_deal_number()` trigger in the database. The JS version is used for display in some places, but the DB trigger is the source of truth.

8. **No seed data for users** — Migrations seed offices, teams, and timer configs but not users. Test users must be created manually via Supabase Auth dashboard.

---

*[AI-GENERATED] This document was generated by analyzing the full codebase of the D&M Deal Portal as of March 2026.*
