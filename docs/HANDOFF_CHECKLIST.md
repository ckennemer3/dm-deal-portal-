# Handoff Checklist — D&M Deal Portal

## Repository & Code Access

- [ ] GitHub repository access granted to vendor (repo: `ckennemer3/dm-deal-portal-`)
- [ ] Vendor has confirmed they can clone and access the repository
- [ ] Branch protection rules reviewed (currently: none configured)
- [ ] Vendor team members added as collaborators with appropriate permissions

## Environment & Credentials

- [ ] All environment variables documented (see SETUP_GUIDE.md)
- [ ] Supabase project URL shared securely
- [ ] Supabase anon key shared securely
- [ ] Supabase service role key shared securely (this is highly sensitive)
- [ ] Supabase dashboard access granted OR full database export provided
- [ ] SonarCloud project access granted (token: `SONAR_TOKEN`)
- [ ] Vercel project access granted (for understanding current deployment)

## Database

- [ ] All 11 migration files reviewed and confirmed complete
- [ ] Vendor has successfully applied migrations to their own Supabase instance
- [ ] Supabase Storage bucket `deal-documents` configuration documented
- [ ] Storage bucket RLS policies verified and documented
- [ ] Any test data in the current Supabase project has been identified (real vs. test)
- [ ] Decision made: will vendor use existing Supabase project or create their own?

## Test Accounts

- [ ] Test user accounts for each role created and credentials shared securely:
  - [ ] Agent account
  - [ ] Manager account
  - [ ] General Manager account
  - [ ] Underwriter account
  - [ ] Executive account
  - [ ] Administrator account
- [ ] Test accounts assigned to appropriate teams and offices
- [ ] Sample deal data created for vendor to explore all deal statuses

## Deployment

- [ ] Current Vercel deployment URL shared
- [ ] Vercel project settings documented (environment variables, build settings)
- [ ] Domain/DNS information documented (if custom domain exists)
- [ ] GitHub → Vercel integration explained
- [ ] Decision made: will vendor continue using Vercel during migration, or move to Azure immediately?

## Documentation

- [ ] All handoff documents reviewed for accuracy by Chase and Dakota
- [ ] CLAUDE.md (project guidelines) reviewed — vendor should read this first
- [ ] Any internal knowledge not captured in docs has been communicated
- [ ] Brand guidelines PDF (`DMLeasing_BrandGuidelines_R2.pdf`) shared

## Business Context

- [ ] D&M office structure and team names explained
- [ ] Deal workflow walkthrough completed with vendor
- [ ] Kickback reason categories explained with real-world examples
- [ ] SLA timer thresholds explained (why these specific hours?)
- [ ] Planned features (Finance Printing, Wire Request) requirements documented
- [ ] Priority order for bug fixes vs. new features vs. migration communicated

## Outstanding Decisions

- [ ] Azure subscription and resource group identified for migration
- [ ] Azure AD/Entra ID tenant identified for authentication
- [ ] Decision on ORM for Azure migration (Prisma vs. Drizzle vs. direct SQL)
- [ ] Decision on Next.js version (stay on 14.x or upgrade to 15.x during migration)
- [ ] Decision on staging environment (how many environments: dev/staging/prod?)
- [ ] Decision on email service for notifications (Azure Communication Services, SendGrid, etc.)
- [ ] Decision on monitoring/observability (Azure Application Insights, Datadog, etc.)
- [ ] Decision on who manages Azure infrastructure (vendor or D&M)
- [ ] Timeline and milestones agreed upon

## Vendor Verification

- [ ] Vendor has successfully cloned the repository
- [ ] Vendor has successfully run `npm install`
- [ ] Vendor has successfully configured `.env.local`
- [ ] Vendor has successfully run `npm run dev` and can access the app locally
- [ ] Vendor has successfully run `npx vitest` and all tests pass
- [ ] Vendor has successfully run `npm run build` with clean output
- [ ] Vendor has logged in with each test role and confirmed access
- [ ] Vendor has submitted a test deal through the full wizard
- [ ] Vendor has reviewed the reporting dashboard with sample data

## Communication

- [ ] Point of contact identified for technical questions (Chase/Dakota)
- [ ] Communication channel established (Slack, Teams, email)
- [ ] Meeting cadence agreed upon (weekly check-ins, sprint reviews, etc.)
- [ ] Escalation path defined for blockers
- [ ] Code review process agreed upon (PRs, branch strategy)

## Post-Handoff

- [ ] Vendor has submitted their first PR and received feedback
- [ ] Knowledge transfer session completed (architecture walkthrough)
- [ ] Access to any monitoring/logging dashboards provided
- [ ] Vendor has documented any questions or gaps found during setup

---

*[AI-GENERATED] This checklist was generated from the codebase analysis. Add items as needed based on your specific handoff process.*
