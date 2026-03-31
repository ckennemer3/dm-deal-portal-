# Setup Guide — D&M Deal Portal

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20.x or later (developed on 24.13.0) | Required for Next.js 14 |
| npm | 10.x or later (developed on 11.6.2) | Comes with Node.js |
| Git | Any recent version | For cloning the repository |
| Supabase account | — | Free tier works for development |
| Code editor | VS Code recommended | TypeScript + Tailwind IntelliSense extensions recommended |

---

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/ckennemer3/dm-deal-portal-.git
cd dm-deal-portal

# Install dependencies
npm install
```

**Expected output**: ~1,200 packages installed. You will see npm audit warnings — these are known (see SECURITY_REVIEW.md).

---

## Step 2: Set Up Supabase

### Option A: Use Existing Supabase Project (if credentials provided)
Skip to Step 3 — you'll receive the URL, anon key, and service role key.

### Option B: Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and keys from **Settings > API**:
   - Project URL (e.g., `https://xxxx.supabase.co`)
   - `anon` key (public)
   - `service_role` key (secret — never expose in client code)

3. Apply database migrations **in order** via the Supabase SQL Editor:
   - Go to **SQL Editor** in your Supabase dashboard
   - Run each migration file one at a time, in numeric order:
     ```
     001_initial_schema.sql
     002_update_statuses.sql
     003_add_term_column.sql
     004_fix_corrupted_office_ids.sql
     005_fix_offices_and_seed_teams.sql
     006_add_kicked_back_to_manager_status.sql
     007_add_kickback_tracking.sql
     008_enhancements.sql
     009_kickback_response_tracking.sql
     010_real_team_names.sql
     011_add_general_manager_role.sql
     ```
   - All files are in `supabase/migrations/`
   - **Do NOT use the Supabase CLI to auto-run these** — they must be applied manually

4. Create a Storage bucket:
   - Go to **Storage** in your Supabase dashboard
   - Create a bucket named `deal-documents`
   - Set it to **private** (authenticated access only)

5. Create test users:
   - Go to **Authentication > Users** in your Supabase dashboard
   - Create users with email/password (the `handle_new_user` trigger will auto-create profile records with role `agent`)
   - To change a user's role, update the `users` table directly in the SQL Editor or use the Admin panel once you have an administrator account:
     ```sql
     UPDATE users SET role = 'administrator' WHERE email = 'your-email@example.com';
     ```

---

## Step 3: Configure Environment Variables

Copy the example file:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

| Variable | Required | Description | Where to Find |
|----------|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL | Supabase Dashboard > Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key | Supabase Dashboard > Settings > API > `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only, bypasses RLS) | Supabase Dashboard > Settings > API > `service_role` key |
| `NEXT_PUBLIC_APP_URL` | No | Application URL (defaults to `http://localhost:3000`) | Set to your deployment URL in production |

**Example `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: The app validates environment variables at startup via Zod (`src/lib/env.ts`). If any required variable is missing, the app will fail immediately with a clear error message.

---

## Step 4: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see a login page.

---

## Step 5: Run Tests

```bash
npx vitest
```

Or with coverage:
```bash
npx vitest --coverage
```

**Note**: There is no `npm test` script defined in package.json. You must use `npx vitest` directly.

Test files are located in:
- `src/lib/__tests__/utils.test.ts` — Utility function tests
- `src/lib/__tests__/permissions.test.ts` — RBAC permission tests
- `src/lib/__tests__/validation.test.ts` — Zod schema validation tests

---

## Step 6: Build for Production

```bash
npm run build
```

**Expected output**: Build completes successfully with one warning about middleware config. All routes should compile. The reporting page will be the largest bundle (~119 kB).

To run the production build locally:
```bash
npm run start
```

---

## Step 7: Lint

```bash
npm run lint
```

---

## Current Deployment Process (GitHub → Vercel)

1. Push code to the `main` branch on GitHub
2. Vercel auto-detects the push and deploys
3. No manual steps required for the application
4. Database migrations must still be applied manually via Supabase SQL Editor
5. SonarCloud runs a code quality scan on every push and PR (configured in `.github/workflows/sonarcloud.yml`)

---

## Common Setup Problems

### "Missing environment variable" on startup
The app uses Zod to validate environment variables at module load time. If you see this error:
- Check that `.env.local` exists and contains all required variables
- Make sure variable names match exactly (they're case-sensitive)
- Restart the dev server after changing `.env.local`

### Build warning: "Unsupported node type TaggedTemplateExpression"
This is a known issue with the middleware config. The middleware still works — it falls back to the default matcher. No action needed.

### Supabase query returns null or errors
- Check that all migrations have been applied in order
- The `users` ↔ `teams` relationship has two foreign keys. Queries must use FK hints:
  ```typescript
  .select('*, team:teams!users_team_id_fkey(*, office:offices(*))')
  ```
- If you see "Could not find foreign key" errors, the FK constraint name may not match. Check the actual constraint name in migration 001.

### "Not authenticated" errors
- Ensure Supabase Auth is configured correctly
- Check that the user exists in both `auth.users` and `public.users` tables
- The `handle_new_user` trigger should auto-create the `public.users` record, but if it fails silently, you may need to insert manually

### File upload fails
- Ensure the `deal-documents` storage bucket exists in Supabase
- Check that RLS policies on the bucket allow authenticated uploads
- File size limit is 10MB (configured in `next.config.ts`)

### Tests fail with "Cannot find module @/..."
- The `@/` path alias must be configured in `vitest.config.ts` (it already is)
- Run `npx vitest` from the project root directory

---

*[AI-GENERATED] This document was generated by analyzing the full codebase of the D&M Deal Portal as of March 2026.*
