# Features and Status — D&M Deal Portal

## Core Features

| Feature | Description | Status | Notes |
|---------|-------------|--------|-------|
| **User Authentication** | Email/password login via Supabase Auth | Complete | Works as expected. OAuth callback handler exists but only email/password is implemented. No password reset flow. |
| **Role-Based Access Control** | 6 roles (agent, manager, general_manager, underwriter, executive, administrator) with granular permissions | Complete | Role hierarchy, page access, deal visibility, and action permissions all implemented and tested. RLS policies enforce at DB level. |
| **Deal Submission Wizard** | 7-step form: deal type, applicants (1-3), vehicle info, trade-in, open autos, credit scores, documents | Complete | Full validation via Zod. Conditional fields based on deal type (lease vs retail). Document type requirements per deal type. |
| **Deal List / Queue** | Filterable list of deals with search, status filter, type filter | Complete | Agents see their own deals. Managers/UW/exec/admin see all (scoped by role). Includes unread tracking via `deal_views` table. |
| **Deal Detail View** | Full deal information with all related data | Complete | Shows applicants, vehicle, trade-in, open autos, documents, messages, status history. Inline field editing for authorized roles. |
| **Status Workflow** | 9-status deal lifecycle with role-based transitions | Complete | pending → pending_manager_review → submitted_to_underwriting → submitted_to_lender → approved → signed_and_delivered. Kickback paths to manager and to sales. Cancellation from any non-terminal status. |
| **Document Upload/Management** | Upload, replace, delete documents on deals | Complete | Drag-and-drop upload. File type validation (PDF, JPG, PNG, DOC, DOCX). 10MB size limit. Documents stored in Supabase Storage with signed URLs. Display names auto-generated from deal data. |
| **Communication Thread** | Notes and action-required messages on deals | Complete | Two message types: notes (informational) and action_required (must be resolved). Resolution tracking. Read receipts via `deal_message_views`. |
| **Kickback System** | Structured kickback with reasons and explanations | Complete | 7 reason categories. UW can kick back to manager, manager can kick back to agent. Response text and resolution tracking (migration 009). |
| **SLA Timer Badges** | Color-coded timer indicators on deals | Complete | Green/yellow/red urgency based on configurable thresholds per status. Timer thresholds stored in DB (`timer_config` table) and configurable. |
| **Underwriter Dashboard** | Dedicated UW view with unassigned and claimed deals | Complete | Separate dashboard component for underwriters. Deal claiming (assigns UW). |
| **Manager Dashboard** | Manager-specific home with team deal stats | Complete | Quick action cards, deal queue, KPI summary. |
| **Admin Panel** | User and team management | Complete | Create/update/deactivate users. Create/update teams. Assign users to teams/offices. Uses admin client (bypasses RLS). |
| **Admin "View As"** | Administrators can view the app as any role | Complete | Cookie-based role override. Server components and UI both respect the override. Auto-expires after 24 hours. |
| **Reporting Dashboard** | Analytics with 6 tabs: overview, manager scorecard, response times, approvals, volume, my metrics | Complete | Built with Recharts. Filters by date range, office, manager, deal type. CSV export. Role-based tab visibility. |
| **Real-time Updates** | Live deal updates via Supabase Realtime | Complete | `useRealtimeDeals` hook subscribes to deal changes. Notifications table has Realtime enabled for toast notifications. |
| **Audit Trail** | Complete history of all deal changes | Complete | Status changes, field edits, document actions, messages, kickback responses all logged to `audit_log` and `deal_status_history` tables. |
| **Notification Bell** | In-app notification indicator | Partially Complete | Notification bell component exists. `notifications` table with Realtime enabled. **Missing**: actual notification creation is fire-and-forget with failures silently swallowed. No notification preferences or management UI. |
| **Deal Age Tracking** | Track how long deals have been in current status | Complete | `last_activity_at`, `claimed_at`, `completed_at` timestamps. `deal_views` table for unread detection. |
| **Structured Logging** | JSON-formatted logs ready for Azure App Insights | Complete | Logger with debug/info/warn/error levels. Includes context (userId, dealId, action). Environment-aware formatting. |

## Planned / Not Started Features

| Feature | Description | Status | Notes |
|---------|-------------|--------|-------|
| **Finance Printing Module** | Document generation for finance paperwork | Planned | Listed in `PORTAL_MODULES` constant as `available: false`. No code exists. |
| **Wire Request Module** | Wire transfer request workflow | Planned | Listed in `PORTAL_MODULES` constant as `available: false`. No code exists. |
| **Email Notifications** | Real email delivery (not console logging) | Planned | `NotificationService` has full email templates but uses `ConsoleEmailTransport` (logs to console). Pluggable interface ready for SendGrid/Azure Communication Services. |
| **Activity Feed Page** | `/dashboard/activity` page | Planned | Link exists in dashboard UI but no page component exists. Will 404. |
| **Password Reset** | Self-service password reset flow | Not Started | No reset page or forgot password link. Users would need admin intervention. |
| **OAuth / SSO** | Single sign-on via Microsoft Entra ID | Not Started | Required for Azure migration. Callback handler route exists but only handles Supabase auth codes. |
| **Integration Tests** | Tests for server actions, API flows | Not Started | Only unit tests for pure functions. No integration, component, or E2E tests. |

## Features That Need Work Before Production

| Area | Issue | Priority |
|------|-------|----------|
| **Security vulnerabilities** | npm audit shows 11 vulnerabilities (1 critical in Next.js 14.2.15, 8 high) | Critical |
| **No password reset** | Users cannot reset their own passwords | High |
| **No email delivery** | Notifications only log to console | High |
| **Middleware config warning** | Tagged template literal in matcher not recognized by Next.js | Medium |
| **Missing activity page** | Dashboard links to `/dashboard/activity` which doesn't exist | Medium |
| **Large deal-detail component** | 1,150 lines — hard to maintain | Medium |
| **No staging environment** | Changes go directly to demo deployment | Medium |
| **Type drift risk** | Types are manually maintained, may not match actual DB schema | Low |

---

*[AI-GENERATED] This document was generated by analyzing the full codebase of the D&M Deal Portal as of March 2026.*
