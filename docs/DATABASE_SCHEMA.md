# Database Schema — D&M Deal Portal

## Overview

- **Database**: PostgreSQL (hosted on Supabase)
- **Tables**: 19
- **Views**: 3 (reporting)
- **Functions**: 8
- **Triggers**: 13
- **RLS Policies**: 51+
- **Migrations**: 11 files in `supabase/migrations/`

Migrations are applied **manually** via the Supabase SQL Editor, in numeric order. They are NOT auto-run from Git.

---

## Tables

### offices
Office locations for D&M Auto Leasing.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| name | TEXT | UNIQUE, NOT NULL | Office display name |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Seed data** (9 offices): D&M Leasing Fort Worth, D&M Leasing Dallas, D&M Leasing Houston, Apple Leasing, Dallas Lease Returns, Four Stars Ford, Four Stars Auto Ranch, Four Stars Toyota, Four Stars Nissan

---

### teams
Teams within offices, each with an assigned manager.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| name | TEXT | NOT NULL | Team name (e.g., "EA", "SA") |
| office_id | UUID | FK → offices(id), NOT NULL | Parent office |
| manager_id | UUID | FK → users(id), NULLABLE | Team manager (named constraint: `fk_teams_manager`) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Unique**: (name, office_id)

**Seed data**: Real team names per office (EA, SA, JA, RA for Fort Worth; ED, RD, SD, SR for Dallas; JH, RH, EH for Houston; RL, CL for Apple Leasing)

---

### users
User profiles linked to Supabase Auth.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, FK → auth.users(id) | Same as auth user ID |
| email | TEXT | UNIQUE, NOT NULL | |
| first_name | TEXT | | |
| last_name | TEXT | | |
| role | TEXT | CHECK (agent\|manager\|general_manager\|underwriter\|executive\|administrator) | Default: 'agent' |
| team_id | UUID | FK → teams(id), NULLABLE | |
| primary_office_id | UUID | FK → offices(id), NULLABLE | |
| is_active | BOOLEAN | DEFAULT true | Soft delete flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Auto-updated via trigger |

**Indexes**: role, team_id, primary_office_id

**Important**: The `users` ↔ `teams` relationship has **two foreign keys** (users.team_id → teams.id AND teams.manager_id → users.id). Supabase queries MUST use FK hints to disambiguate:
- Users → Teams: `teams!users_team_id_fkey`
- Teams → Users (manager): `teams!fk_teams_manager`

---

### deals
Main deal records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| deal_number | TEXT | UNIQUE | Auto-generated: DM-YYYY-NNNNN |
| deal_type | TEXT | CHECK (lease\|retail_purchase\|re_lease\|lease_buyout) | |
| status | TEXT | CHECK (9 statuses — see below) | Default: 'pending' |
| submitted_by | UUID | FK → users(id), NOT NULL | Agent who submitted |
| assigned_manager | UUID | FK → users(id), NULLABLE | Auto-assigned from agent's team |
| assigned_underwriter | UUID | FK → users(id), NULLABLE | Set when UW claims deal |
| num_applicants | INTEGER | CHECK (1-3) | |
| vehicle_year | TEXT | | |
| vehicle_make | TEXT | | |
| vehicle_model | TEXT | | |
| vehicle_trim | TEXT | | |
| vehicle_mileage | INTEGER | | |
| vehicle_condition | TEXT | CHECK (new\|used\|untitled_demo) | |
| msrp | NUMERIC | | Manufacturer's Suggested Retail Price |
| invoice | NUMERIC | | Dealer invoice price |
| jd_power_retail | NUMERIC | | JD Power retail value (used vehicles) |
| jd_power_wholesale | NUMERIC | | JD Power wholesale value (used vehicles) |
| net_cap_cost | NUMERIC | | Net capitalized cost (lease deals) |
| total_amount_financed | NUMERIC | | Total financed (retail/buyout deals) |
| monthly_payment | NUMERIC | | |
| term | INTEGER | | Lease/finance term in months |
| has_trade_in | BOOLEAN | DEFAULT false | |
| has_open_autos | BOOLEAN | DEFAULT false | |
| has_business | BOOLEAN | DEFAULT false | |
| has_derogatory_credit | BOOLEAN | DEFAULT false | |
| derogatory_credit_explanation | TEXT | | |
| business_legal_name | TEXT | | |
| deal_strengths | TEXT | | Agent's notes on deal strengths |
| claimed_at | TIMESTAMPTZ | | When UW first claimed (auto-set via trigger) |
| completed_at | TIMESTAMPTZ | | When deal reached terminal status (auto-set) |
| last_activity_at | TIMESTAMPTZ | DEFAULT NOW() | Updated when sub-tables change (trigger) |
| kickback_count | INTEGER | DEFAULT 0 | Auto-incremented on kickback transitions |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Auto-updated via trigger |

**Status values**: pending, pending_manager_review, submitted_to_underwriting, kicked_back_to_manager, kicked_back_to_sales, submitted_to_lender, approved, signed_and_delivered, cancelled

**Indexes**: status, submitted_by, assigned_manager, assigned_underwriter, created_at, deal_number

---

### deal_applicants
1-3 applicants per deal.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| deal_id | UUID | FK → deals(id) ON DELETE CASCADE | |
| applicant_number | INTEGER | CHECK (1-3) | 1 = primary |
| first_name | TEXT | | |
| last_name | TEXT | | |
| experian_score | INTEGER | | Experian credit score |
| has_alternate_bureau | BOOLEAN | DEFAULT false | |
| alternate_bureau | TEXT | | Bureau name |
| alternate_score | INTEGER | | Alternate bureau score |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Index**: deal_id

---

### deal_trade_ins
0 or 1 trade-in vehicle per deal.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| deal_id | UUID | FK → deals(id) ON DELETE CASCADE, UNIQUE | One per deal |
| year | TEXT | | |
| make | TEXT | | |
| model | TEXT | | |
| monthly_payment | NUMERIC | | Current payment on trade-in |
| lienholder | TEXT | | Who holds the lien |
| who_drives | TEXT | | Which applicant drives this vehicle |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

### deal_open_autos
0-10 other financed vehicles per deal.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| deal_id | UUID | FK → deals(id) ON DELETE CASCADE | |
| auto_number | INTEGER | CHECK (1-10) | |
| lienholder | TEXT | | |
| monthly_payment | NUMERIC | | |
| who_drives | TEXT | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Index**: deal_id

---

### deal_documents
Uploaded documents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| deal_id | UUID | FK → deals(id) ON DELETE CASCADE | |
| document_type | TEXT | CHECK (10 types) | cybercalc, cyberretail, credit_application, credit_bureau, jd_power_book_outs, business_credit_app, alternate_credit_bureau, proof_of_income, ipacket, other |
| applicant_id | UUID | FK → deal_applicants(id), NULLABLE | Which applicant this doc is for |
| storage_path | TEXT | NOT NULL | Path in Supabase Storage |
| display_name | TEXT | | Auto-generated: "LastName - Year Make Model - DocType" |
| original_filename | TEXT | | Original uploaded filename |
| file_size | INTEGER | | Bytes |
| mime_type | TEXT | | |
| uploaded_by | UUID | FK → users(id) | |
| replaced_by | UUID | FK → users(id), NULLABLE | If this doc was replaced |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes**: deal_id, document_type

---

### deal_messages
Notes and action-required messages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| deal_id | UUID | FK → deals(id) ON DELETE CASCADE | |
| sender_id | UUID | FK → users(id) | |
| message_type | TEXT | CHECK (note\|action_required) | |
| content | TEXT | NOT NULL | |
| is_resolved | BOOLEAN | DEFAULT false | For action_required messages |
| resolved_by | UUID | FK → users(id), NULLABLE | |
| resolved_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes**: deal_id, (message_type, is_resolved)

---

### deal_message_views
Read receipts for messages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| message_id | UUID | FK → deal_messages(id) ON DELETE CASCADE | |
| viewed_by | UUID | FK → users(id) | |
| viewed_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Unique**: (message_id, viewed_by)

---

### deal_status_history
Audit trail for every status change.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| deal_id | UUID | FK → deals(id) ON DELETE CASCADE | |
| from_status | TEXT | | Previous status |
| to_status | TEXT | NOT NULL | New status |
| changed_by | UUID | FK → users(id) | |
| notes | TEXT | | Optional notes |
| kickback_reason | TEXT | | Reason category (if kickback) |
| kickback_explanation | TEXT | | Detailed explanation (if kickback) |
| changed_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes**: deal_id, changed_at, kickback_reason (partial, non-null only)

---

### deal_field_changes
Audit trail for inline field edits.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| deal_id | UUID | FK → deals(id) ON DELETE CASCADE | |
| field_name | TEXT | NOT NULL | |
| old_value | TEXT | | |
| new_value | TEXT | | |
| changed_by | UUID | FK → users(id) | |
| changed_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Index**: deal_id

---

### deal_assignments
Underwriter assignment/reassignment history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| deal_id | UUID | FK → deals(id) ON DELETE CASCADE | |
| assigned_to | UUID | FK → users(id) | |
| assigned_by | UUID | FK → users(id) | |
| assignment_type | TEXT | CHECK (underwriter_claim\|reassignment) | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Index**: deal_id

---

### deal_views
Tracks when each user last viewed each deal (for unread detection).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK → users(id) | |
| deal_id | UUID | FK → deals(id) ON DELETE CASCADE | |
| last_viewed_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Unique index**: (user_id, deal_id)

---

### audit_log
Immutable action log for all deal-related activities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| deal_id | UUID | FK → deals(id) ON DELETE CASCADE | |
| user_id | UUID | FK → users(id) | |
| action_type | TEXT | CHECK (12 types) | document_uploaded, document_replaced, document_deleted, deal_kicked_back, deal_resubmitted, status_changed, field_changed, message_sent, action_required_resolved, deal_claimed, deal_reassigned, kickback_responded |
| description | TEXT | | Human-readable description |
| metadata | JSONB | | Structured additional data |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes**: (deal_id, created_at DESC), action_type

---

### notifications
In-app toast notifications (Realtime-enabled).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK → users(id) | Recipient |
| deal_id | UUID | FK → deals(id), NULLABLE | Related deal |
| type | TEXT | | Notification type |
| title | TEXT | | |
| message | TEXT | | |
| deal_number | TEXT | | For display without join |
| is_read | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Index**: (user_id, is_read, created_at DESC)

**Realtime**: Enabled for this table

---

### kickback_reasons
Normalized kickback tracking for reporting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| deal_id | UUID | FK → deals(id) ON DELETE CASCADE | |
| kicked_by_user_id | UUID | FK → users(id) | Who kicked back |
| kicked_to_user_id | UUID | FK → users(id), NULLABLE | Who received the kickback |
| reason_category | TEXT | CHECK (7 categories) | poor_deal_information, incomplete_application, ltv_too_high, missing_documents, incorrect_numbers, missing_stipulations, other |
| reason_detail | TEXT | | Detailed explanation |
| response_text | TEXT | | Recipient's response |
| responded_by | UUID | FK → users(id), NULLABLE | |
| responded_at | TIMESTAMPTZ | | |
| is_resolved | BOOLEAN | DEFAULT false | |
| resolved_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes**: deal_id, reason_category, (deal_id WHERE NOT is_resolved)

---

### timer_config
Admin-configurable SLA thresholds.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| config_key | TEXT | UNIQUE, NOT NULL | manager_review, agent_response, underwriter_pickup, underwriter_review |
| green_max_hours | INTEGER | NOT NULL | Hours before turning yellow |
| yellow_max_hours | INTEGER | NOT NULL | Hours before turning red |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Seed data**:
| Key | Green Max | Yellow Max |
|-----|-----------|------------|
| manager_review | 2 | 4 |
| agent_response | 4 | 8 |
| underwriter_pickup | 1 | 2 |
| underwriter_review | 4 | 8 |

---

## Relationships Diagram

```
offices ──1:N──► teams
                   │
                   ├──1:N──► users (via team_id)
                   └──N:1──► users (via manager_id)  ⚠ AMBIGUOUS FK

users (auth) ──1:1──► users (public)

deals
  ├── submitted_by ──► users
  ├── assigned_manager ──► users
  ├── assigned_underwriter ──► users
  │
  ├──1:N──► deal_applicants
  ├──1:0..1──► deal_trade_ins
  ├──1:N──► deal_open_autos
  ├──1:N──► deal_documents
  ├──1:N──► deal_messages ──1:N──► deal_message_views
  ├──1:N──► deal_status_history
  ├──1:N──► deal_field_changes
  ├──1:N──► deal_assignments
  ├──1:N──► deal_views
  ├──1:N──► audit_log
  ├──1:N──► kickback_reasons
  └──1:N──► notifications
```

---

## Database Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `generate_deal_number()` | BEFORE INSERT on deals | Auto-generates DM-YYYY-NNNNN |
| `update_updated_at()` | BEFORE UPDATE on deals, users | Sets `updated_at = NOW()` |
| `handle_new_user()` | AFTER INSERT on auth.users | Creates public.users record with role 'agent' |
| `get_user_role()` | — (used by RLS) | Returns current user's role |
| `get_user_team_id()` | — (used by RLS) | Returns current user's team_id |
| `get_user_office_id()` | — (used by RLS) | Returns current user's primary_office_id |
| `get_team_office_id(tid)` | — (used by RLS) | Returns office_id for a given team |
| `update_deal_last_activity()` | AFTER INSERT/UPDATE/DELETE on sub-tables | Updates deals.last_activity_at |
| `set_deal_completed_at()` | AFTER UPDATE on deals | Sets completed_at on terminal status |
| `set_deal_claimed_at()` | AFTER UPDATE on deals | Sets claimed_at when UW assigned |
| `increment_deal_kickback_count()` | AFTER INSERT on deal_status_history | Increments kickback_count on kickback transitions |

---

## Reporting Views

### v_deal_metrics
Joins deals with primary applicant and user info. Computes:
- `retail_ltv`, `wholesale_ltv` (LTV percentages)
- `lifecycle_hours` (created to completed)
- `age_hours` (created to now)
- Submitter, manager, underwriter names and offices

### v_response_times
Tracks duration spent in each status from `deal_status_history`. Computes:
- `hours_in_status` for each transition
- Date dimensions (transition_date, week, month)

### v_kickback_analytics
Aggregates kickback data per deal with agent/manager/office info.

---

## RLS Policy Summary

All tables have Row Level Security enabled. The general pattern:

- **Agents**: See only their own deals and related sub-table records
- **Managers**: See team and office deals
- **General Managers**: See all deals (cross-office)
- **Underwriters**: See all deals
- **Executives**: See all deals (read-only)
- **Administrators**: Full access to all tables

Sub-tables use `deal_id IN (SELECT id FROM deals)` to inherit deal visibility.

See the full policy list in the migration files, particularly `001_initial_schema.sql`, `008_enhancements.sql`, and `011_add_general_manager_role.sql`.

---

## Migration Files

| File | Purpose |
|------|---------|
| 001_initial_schema.sql | Full schema: 14 tables, 20 indexes, 4 functions, 4 triggers, 32 RLS policies, seed data |
| 002_update_statuses.sql | Status overhaul: 11 old statuses → 8 new statuses |
| 003_add_term_column.sql | Added `deals.term` column |
| 004_fix_corrupted_office_ids.sql | Nulled corrupted UUID values in primary_office_id |
| 005_fix_offices_and_seed_teams.sql | Renamed offices to D&M branding, seeded default teams |
| 006_add_kicked_back_to_manager_status.sql | Added 9th status: kicked_back_to_manager |
| 007_add_kickback_tracking.sql | Added kickback_reason/explanation to deal_status_history |
| 008_enhancements.sql | Added 5 tables (deal_views, audit_log, notifications, kickback_reasons), 3 views, new columns, backfill |
| 009_kickback_response_tracking.sql | Added response/resolution columns to kickback_reasons |
| 010_real_team_names.sql | Seeded real team names per office |
| 011_add_general_manager_role.sql | Added general_manager role + 4 RLS policies |

---

*[AI-GENERATED] This document was generated by analyzing the full codebase of the D&M Deal Portal as of March 2026.*
