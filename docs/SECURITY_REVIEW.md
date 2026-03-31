# Security Review — D&M Deal Portal

## Authentication

### Current Method
- **Supabase Auth** with email/password
- Session stored in HTTP-only cookies via `@supabase/ssr`
- Middleware refreshes session on every request

### Weaknesses
- **No password complexity requirements**: Validation only enforces 8+ characters (`src/lib/validation.ts`). No uppercase, number, or special character requirements.
- **No password reset flow**: Users cannot self-service reset passwords. An admin must intervene.
- **No account lockout**: No brute-force protection at the application level (Supabase may have built-in rate limiting, but it's not explicitly configured here).
- **No MFA/2FA**: No multi-factor authentication is configured.
- **No session timeout configuration**: Sessions rely on Supabase defaults. No explicit idle timeout.

---

## Authorization / RLS

### Strengths
- **51+ RLS policies** enforce data access at the database level
- **Application-level permissions** (`src/lib/permissions.ts`) provide a second layer of access control
- **Role hierarchy** is well-defined: agent < manager < general_manager < underwriter < executive < administrator
- **Two Supabase clients**: Standard client (RLS-enforced) for normal operations, admin client (bypasses RLS) only for admin operations

### Gaps
- **Admin "View As" feature**: Administrators can set a `viewAsRole` cookie to impersonate any role. This cookie is **not** HTTP-only and could potentially be manipulated via client-side JavaScript. However, it only affects UI rendering — database queries still use the admin's actual RLS permissions.
- **RLS policy complexity**: With 51+ policies, verifying they cover all edge cases is difficult. No automated tests validate RLS policy behavior.
- **No RLS on storage bucket**: The `deal-documents` bucket RLS policies are not visible in the migration files. [NEEDS VERIFICATION] — storage bucket policies must be configured separately in Supabase dashboard.
- **Service role key exposure risk**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS. If leaked, an attacker has full database access. It is correctly restricted to server-side only, but the admin client is used in multiple places.

---

## Hardcoded Secrets or API Keys

**No hardcoded secrets found in source code.** All credentials are properly externalized to environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SONAR_TOKEN` (in GitHub secrets, not in code)

**Note**: The `NEXT_PUBLIC_` prefixed variables are intentionally exposed to the browser (they are public keys). The `SUPABASE_SERVICE_ROLE_KEY` is server-only and correctly not prefixed with `NEXT_PUBLIC_`.

---

## Input Validation

### Strengths
- Zod schemas validate all deal submission data (`src/lib/validation.ts`)
- Server actions check authentication before processing
- File upload validates file type and size (10MB limit)
- Deal field editing uses an allowlist of editable field names

### Gaps
- **No XSS sanitization**: User-provided content (deal notes, messages, kickback explanations) is stored and rendered without explicit sanitization. React's JSX escaping provides baseline protection, but there is no server-side HTML sanitization.
- **No rate limiting on server actions**: No application-level rate limiting on form submissions, file uploads, or status changes.
- **Filename not sanitized**: Original filenames are stored as-is in the database. While storage paths use timestamps, the `original_filename` field could contain special characters.
- **Deal field update values not type-validated**: The `updateDealField` server action checks that the field name is in an allowlist, but does not validate the new value against the field's expected type.

---

## Dependency Vulnerabilities

**npm audit results** (as of March 2026):

| Severity | Count | Notable Packages |
|----------|-------|-------------------|
| Critical | 1 | `next` 14.2.15 — multiple CVEs including DoS, SSRF, cache poisoning, authorization bypass |
| High | 8 | `glob`, `flatted`, `minimatch`, `picomatch` — ReDoS, command injection, prototype pollution |
| Moderate | 2 | `ajv`, `brace-expansion` — ReDoS |
| **Total** | **11** | |

### Critical: Next.js 14.2.15

The installed version of Next.js has **13 known advisories**, including:
- Authorization Bypass in Middleware (GHSA-f82v-jwr5-mffw)
- DoS via Server Components (GHSA-mwv6-3258-q52c)
- HTTP Request Smuggling in Rewrites (GHSA-ggv3-7p47-pfv8)
- SSRF via Middleware Redirect (GHSA-4342-x723-ch2f)
- Cache Poisoning (GHSA-qpjv-v59x-3qc4)

**Recommendation**: Upgrade Next.js to the latest 14.2.x patch (14.2.35+) or migrate to Next.js 15.x. This is the highest-priority security action.

### Other High-Severity Issues
Most are in dev/build dependencies (`eslint-config-next`, `glob`, `minimatch`) and do not affect the production runtime. However, `flatted` (prototype pollution) should be investigated if used at runtime.

---

## Sensitive Data Handling

### What's Stored
- **Credit scores** (Experian + alternate bureau): Stored in `deal_applicants` table. Visible to agents (own deals), managers (team deals), underwriters, executives, and administrators.
- **Applicant names**: Stored in deal_applicants. No SSN, address, or other PII beyond names.
- **Financial data**: MSRP, invoice, LTV, monthly payments, loan amounts — stored in deals table.
- **Documents**: PDF/image files in Supabase Storage (credit applications, income proofs, etc.) — potentially contain highly sensitive PII.

### What's Logged
- **Structured logger** (`src/lib/logger.ts`): Includes `userId`, `dealId`, `action`, `component` in log context. Does NOT log credit scores, financial amounts, or document contents.
- **Audit log** (`audit_log` table): Stores action metadata as JSONB. May include field names and old/new values for field changes.
- **Console logging**: Several `console.warn` and `console.error` calls in server components for debugging. May log Supabase error details including query parameters.

### Concerns
- **No data encryption at rest** beyond what Supabase provides by default
- **Signed URLs for documents**: Valid for 1 hour. Anyone with the URL can access the document during that window. URLs are generated server-side and passed to the client for download.
- **Credit scores visible in UI**: No masking or redaction of credit scores in the deal detail view
- **No data retention policy**: No mechanism to purge old deals or documents

---

## CORS and API Security

- **No custom API routes**: All mutations go through Next.js Server Actions, which use POST requests with CSRF protection built into Next.js
- **No custom CORS headers**: Default Next.js CORS behavior
- **Middleware**: Runs on all routes, refreshes auth session. No custom security headers (Content-Security-Policy, X-Frame-Options, etc.)
- **No Content Security Policy (CSP)**: The application does not set CSP headers. This increases XSS risk.

---

## Prioritized Action Items

### Must Fix Before Production

| Priority | Issue | Effort |
|----------|-------|--------|
| P0 | **Upgrade Next.js** to patch critical vulnerabilities (13 CVEs) | Low — npm update |
| P0 | **Add password complexity requirements** | Low |
| P0 | **Implement password reset flow** | Medium |
| P0 | **Add Content-Security-Policy headers** | Medium |
| P0 | **Verify storage bucket RLS policies** in Supabase dashboard | Low |
| P0 | **Review and test RLS policies** with each role to confirm data isolation | Medium |

### Should Fix Before Production

| Priority | Issue | Effort |
|----------|-------|--------|
| P1 | Add rate limiting on server actions (login, deal submission, file upload) | Medium |
| P1 | Sanitize user input (messages, notes) on the server side | Low |
| P1 | Add security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) | Low |
| P1 | Implement session idle timeout | Low |
| P1 | Add MFA/2FA support (especially for admin/executive roles) | High |
| P1 | Remove console.warn/error calls that may log sensitive query parameters | Low |

### Can Wait

| Priority | Issue | Effort |
|----------|-------|--------|
| P2 | Add account lockout after failed login attempts | Medium |
| P2 | Implement data retention/purge policy | Medium |
| P2 | Add audit logging for admin operations (user management, role changes) | Medium |
| P2 | Reduce signed URL expiry from 1 hour to shorter window | Low |
| P2 | Sanitize uploaded filenames | Low |

---

*[AI-GENERATED] This document was generated by analyzing the full codebase of the D&M Deal Portal as of March 2026.*
