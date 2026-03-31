# Azure Migration Notes — D&M Deal Portal

## Current Architecture → Azure Mapping

| Current (Vercel/Supabase) | Azure Equivalent | Migration Complexity |
|---------------------------|------------------|---------------------|
| **Vercel** (hosting + edge) | Azure App Service or Azure Static Web Apps | Medium |
| **Supabase PostgreSQL** (PostgREST + RLS) | Azure Database for PostgreSQL Flexible Server | High |
| **Supabase Auth** (email/password + JWT) | Microsoft Entra ID (Azure AD) | High |
| **Supabase Storage** (file bucket) | Azure Blob Storage | Medium |
| **Supabase Realtime** (WebSocket) | Azure SignalR Service or Azure Web PubSub | High |
| **Vercel Edge** (middleware) | Azure Front Door or App Service middleware | Medium |
| **GitHub → Vercel CI/CD** | GitHub Actions → Azure App Service | Low |
| **SonarCloud** (code quality) | Keep as-is or move to Azure DevOps | Low |

---

## Detailed Migration Plan by Component

### 1. Hosting: Vercel → Azure App Service

**Current state**: Next.js app deployed on Vercel with automatic GitHub integration.

**Recommended target**: Azure App Service (Linux, Node.js runtime)

**What changes**:
- Create Azure App Service with Node.js 20 LTS runtime
- Configure GitHub Actions workflow for deployment (replace Vercel auto-deploy)
- Set up environment variables in App Service Configuration
- Next.js Server Actions will continue to work on App Service (they're standard POST handlers)
- Middleware will run on the Node.js server instead of Vercel Edge Runtime

**Alternative**: Azure Static Web Apps — supports Next.js but with limitations on server-side features. App Service is more flexible for this application's needs.

**What breaks**: Nothing inherently. The app is standard Next.js with no Vercel-specific APIs.

---

### 2. Database: Supabase PostgreSQL → Azure Database for PostgreSQL

**Current state**: PostgreSQL via Supabase with PostgREST API, 19 tables, 51+ RLS policies, 3 views, 8 functions, 13 triggers.

**Recommended target**: Azure Database for PostgreSQL Flexible Server

**What changes**:

1. **Schema migration**: The SQL migration files can be applied directly to Azure PostgreSQL. Tables, indexes, functions, and triggers are standard PostgreSQL and will work as-is.

2. **PostgREST query syntax must be replaced**: Every Supabase query in the codebase uses PostgREST syntax (`.from().select().eq()`). These must be rewritten. Options:
   - **Prisma ORM** (recommended): Type-safe queries, auto-generated types, migration support
   - **Drizzle ORM**: Lighter weight, SQL-like syntax
   - **Direct SQL** with `pg` driver: Most control, most work

3. **RLS policies need reimplementation**: Supabase RLS uses `auth.uid()` and custom helper functions (`get_user_role()`, etc.) that depend on Supabase's JWT context. In Azure:
   - **Option A**: Implement authorization at the application layer (middleware/service layer checks)
   - **Option B**: Use Azure PostgreSQL Row Level Security with `SET session.user_id` on each connection
   - **Option A is recommended** — it's more maintainable and doesn't depend on PostgreSQL-specific features

4. **Database functions**: `generate_deal_number()`, `update_updated_at()`, `set_deal_completed_at()`, etc. are standard PostgreSQL and will work as-is. Only `handle_new_user()` (which references `auth.users`) needs modification.

5. **Reporting views**: `v_deal_metrics`, `v_response_times`, `v_kickback_analytics` are standard SQL views and will work as-is.

**Estimated effort**: High — the PostgREST query rewrite touches nearly every server component and server action in the codebase.

**Files affected**:
- Every `page.tsx` and `actions.ts` file that queries Supabase (~15 files)
- `src/lib/supabase/server.ts` and `client.ts` (replaced entirely)
- `src/services/database.ts` (becomes the primary data access layer)
- `src/services/storage.ts` (Supabase Storage calls)
- `src/hooks/useRealtimeDeals.ts` (Realtime)

---

### 3. Authentication: Supabase Auth → Microsoft Entra ID

**Current state**: Email/password auth via Supabase Auth with cookie-based sessions (`@supabase/ssr`).

**Recommended target**: Microsoft Entra ID (Azure AD) with MSAL.js

**What changes**:

1. **Login flow**: Replace email/password form with Entra ID sign-in (redirect or popup)
2. **Session management**: Replace `@supabase/ssr` cookie handling with MSAL token cache
3. **Middleware**: Replace Supabase session refresh with Entra ID token validation
4. **User provisioning**: Replace `handle_new_user()` database trigger with:
   - Microsoft Graph API webhook for user creation events, OR
   - Just-in-time provisioning on first login (create `users` record from Entra ID profile)
5. **Role management**: Entra ID App Roles can map to the existing role system (agent, manager, etc.)

**Files affected**:
- `src/app/auth/login/page.tsx` (rewrite)
- `src/app/auth/callback/route.ts` (rewrite)
- `src/middleware.ts` (rewrite)
- `src/lib/supabase/middleware.ts` (remove)
- `src/lib/supabase/server.ts` (remove Supabase auth, add MSAL)
- `src/lib/supabase/client.ts` (remove)
- `src/hooks/useAuth.ts` (rewrite)
- `src/services/auth.ts` (rewrite)
- Every server component that calls `supabase.auth.getUser()`

**Estimated effort**: High

---

### 4. File Storage: Supabase Storage → Azure Blob Storage

**Current state**: Files stored in Supabase Storage bucket `deal-documents`.

**Recommended target**: Azure Blob Storage

**What changes**:

1. Replace `@supabase/supabase-js` storage methods with Azure Blob Storage SDK (`@azure/storage-blob`)
2. Create a container named `deal-documents`
3. Update `src/services/storage.ts` to use Blob Storage API
4. Signed URLs → Azure SAS tokens (similar concept)
5. File upload path pattern (`deals/{dealId}/{documentType}/{timestamp}.{ext}`) can remain the same

**Data migration**: Export all files from Supabase Storage bucket and upload to Azure Blob Storage. A migration script will be needed.

**Files affected**:
- `src/services/storage.ts` (rewrite internals, keep interface)
- `src/app/dashboard/deals/actions-documents.ts` (may need minor updates)

**Estimated effort**: Medium

---

### 5. Realtime: Supabase Realtime → Azure SignalR Service

**Current state**: Supabase Realtime WebSocket subscriptions for deal updates and notifications.

**Recommended target**: Azure SignalR Service

**What changes**:

1. Replace Supabase channel subscriptions with SignalR client connections
2. Create a SignalR hub (or Azure Function with SignalR bindings) that broadcasts changes
3. Database change notifications: Use PostgreSQL LISTEN/NOTIFY + an Azure Function to bridge DB changes to SignalR, OR trigger SignalR messages from the application layer (server actions) after mutations

**Files affected**:
- `src/hooks/useRealtimeDeals.ts` (rewrite)
- `src/hooks/useNotifications.ts` (rewrite)
- `src/lib/supabase/client.ts` (remove Supabase browser client)
- New: SignalR hub/function, client configuration

**Estimated effort**: High

---

### 6. CI/CD: Vercel → GitHub Actions + Azure

**Current state**: Push to `main` → Vercel auto-deploys. SonarCloud runs on push/PR.

**Recommended target**: GitHub Actions → Azure App Service deployment

**What changes**:

1. Add GitHub Actions workflow for Azure deployment:
   ```yaml
   - Build Next.js app
   - Run tests
   - Deploy to Azure App Service (using azure/webapps-deploy action)
   ```
2. Keep SonarCloud workflow as-is (GitHub Actions based)
3. Configure deployment slots for staging/production if desired

**Estimated effort**: Low

---

## Environment Variable Migration

| Current Variable | Azure Equivalent | Notes |
|------------------|-----------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `AZURE_POSTGRESQL_CONNECTION_STRING` or similar | Will be a direct PostgreSQL connection string instead of a REST API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Remove | No longer needed — auth handled by Entra ID |
| `SUPABASE_SERVICE_ROLE_KEY` | Remove | No longer needed — direct DB access with connection string |
| `NEXT_PUBLIC_APP_URL` | Keep as-is | Point to Azure App Service URL |
| (new) | `AZURE_AD_CLIENT_ID` | Entra ID application client ID |
| (new) | `AZURE_AD_CLIENT_SECRET` | Entra ID application client secret |
| (new) | `AZURE_AD_TENANT_ID` | Entra ID tenant ID |
| (new) | `AZURE_STORAGE_CONNECTION_STRING` | Blob Storage connection |
| (new) | `AZURE_SIGNALR_CONNECTION_STRING` | SignalR connection |
| (new) | `DATABASE_URL` | PostgreSQL connection string |

---

## What Will Break During Migration

1. **Every Supabase query**: PostgREST syntax (`.from().select().eq()`) does not exist in Azure. Every data access must be rewritten.
2. **FK hint syntax**: `.select('*, team:teams!users_team_id_fkey(*)')` is Supabase-specific. ORM joins work differently.
3. **RLS enforcement**: Must be reimplemented at the application layer or via PostgreSQL session variables.
4. **Auth session flow**: Cookie-based Supabase sessions → Entra ID tokens. Different middleware approach.
5. **Realtime subscriptions**: Supabase channels → SignalR. Different API, different connection model.
6. **`handle_new_user()` trigger**: References `auth.users` table which won't exist in Azure PostgreSQL.
7. **Storage paths and signed URLs**: Different SDK, different URL format.
8. **Browser client**: `createBrowserClient()` from `@supabase/ssr` must be replaced entirely.

---

## What Will NOT Break

1. **React components**: All UI components are framework-agnostic. They receive props and render JSX.
2. **Tailwind CSS styles**: Fully portable.
3. **TypeScript types**: `src/lib/types.ts` has no Supabase dependencies.
4. **Business logic**: `src/lib/permissions.ts`, `src/lib/constants.ts`, `src/lib/utils.ts`, `src/lib/validation.ts` are pure functions with no external dependencies.
5. **Error classes**: `src/lib/errors.ts` is framework-agnostic.
6. **Logger**: `src/lib/logger.ts` is ready for Azure Application Insights (structured JSON output).
7. **Tests**: Unit tests for utilities, permissions, and validation will continue to pass.

---

## Recommended Migration Sequence

### AI-Assisted Timeline (Recommended)

With AI-assisted development (Claude Code or similar), the code transformation work compresses dramatically. The bulk of this migration is mechanical — rewriting Supabase PostgREST queries to Prisma/Drizzle, swapping auth providers, replacing storage SDK calls. AI can generate these rewrites in minutes per file, not days.

| Phase | Description | Dependencies | Estimated Effort |
|-------|-------------|-------------|-----------------|
| **Phase 1** | Set up Azure infrastructure (App Service, PostgreSQL, Blob Storage, Entra ID, SignalR) | None | 1-2 days (portal/CLI provisioning) |
| **Phase 2** | Migrate database schema (run migrations against Azure PostgreSQL) | Phase 1 | 1 hour (copy-paste SQL) |
| **Phase 3** | Replace Supabase Auth with Entra ID (login, middleware, session) | Phase 1 | 1-2 days |
| **Phase 4** | Replace PostgREST queries with ORM (all data access — ~15 files) | Phase 2 | 1-2 days |
| **Phase 5** | Replace Supabase Storage with Azure Blob Storage | Phase 1 | 2-4 hours |
| **Phase 6** | Replace Supabase Realtime with Azure SignalR | Phase 1 | 1 day |
| **Phase 7** | Implement application-layer authorization (replace RLS) | Phase 3, 4 | 1 day (permissions.ts already exists, wire it into data layer) |
| **Phase 8** | Set up CI/CD (GitHub Actions → Azure App Service) | Phase 1 | 1-2 hours |
| **Phase 9** | Migrate data (deals, documents, users) from Supabase to Azure | Phase 2, 5 | 2-4 hours (script + run) |
| **Phase 10** | Testing, QA, performance tuning, go-live | All phases | 2-3 days |

**Total estimated effort**: 1-2 weeks with AI-assisted development

The bottleneck is NOT code — it's Azure resource provisioning (waiting for services to spin up), Entra ID app registration configuration, DNS propagation, and manual QA testing. The actual code changes can largely be done in a few focused sessions.

### Without AI (Traditional Estimate)

For a team working without AI tooling, the same work would take 12-16 weeks due to the volume of mechanical rewrites across ~15 files of Supabase queries, auth integration research, and SignalR learning curve.

---

## DNS and Domain Considerations

- **Current domain**: Hosted on Vercel (likely a `.vercel.app` subdomain or custom domain)
- **Azure migration**: Point DNS to Azure App Service custom domain
- **SSL**: Azure App Service provides free managed certificates, or use Azure Key Vault for custom certs
- **Transition**: Can run both environments in parallel during migration, using DNS to switch traffic

---

## Migration-Ready Patterns Already in Place

The codebase was designed with Azure migration in mind:

1. **Services layer** (`src/services/`): `AuthService`, `StorageService`, `DatabaseService` abstract Supabase behind interfaces. Replace implementations, not consumers.
2. **Structured logging** (`src/lib/logger.ts`): JSON output in production, ready for Application Insights SDK.
3. **Environment validation** (`src/lib/env.ts`): Zod-based — add new Azure env vars to the schema.
4. **Pure business logic**: Permissions, validation, constants, utilities have zero Supabase coupling.
5. **Error class hierarchy**: Framework-agnostic, ready for any middleware.

---

*[AI-GENERATED] This document was generated by analyzing the full codebase of the D&M Deal Portal as of March 2026.*
