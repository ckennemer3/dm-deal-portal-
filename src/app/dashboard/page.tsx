import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { UserRole } from '@/lib/types';
import { ROLE_LABELS, TERMINAL_STATUSES, AWAITING_ACTION_STATUSES } from '@/lib/constants';
import { formatDuration } from '@/lib/utils';
import { SubmittedDealsQueue } from '@/components/dashboard/submitted-deals-queue';
import { UnderwriterDashboard } from '@/components/dashboard/underwriter-dashboard';

// --- Helper: role-specific quick actions ---

interface QuickAction {
  label: string;
  href: string;
  icon: string;          // SVG path data
  description: string;
}

function getQuickActions(role: UserRole): QuickAction[] {
  switch (role) {
    case 'agent':
      return [
        {
          label: 'Submit New Deal',
          href: '/dashboard/deals/new',
          icon: 'M12 4.5v15m7.5-7.5h-15',
          description: 'Start a new deal submission',
        },
        {
          label: 'My Active Deals',
          href: '/dashboard/deals',
          icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
          description: 'View your deals in progress',
        },
      ];
    case 'manager':
      return [
        {
          label: 'Review Queue',
          href: '/dashboard/deals?status=pending_manager_review',
          icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
          description: 'Deals awaiting your review',
        },
        {
          label: 'Team Deals',
          href: '/dashboard/deals',
          icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197',
          description: 'All deals from your team',
        },
      ];
    case 'general_manager':
      return [
        {
          label: 'Review Queue',
          href: '/dashboard/deals?status=pending_manager_review',
          icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
          description: 'Deals awaiting your review',
        },
        {
          label: 'All Office Deals',
          href: '/dashboard/deals',
          icon: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21',
          description: 'Deals across all offices',
        },
        {
          label: 'Reports',
          href: '/dashboard/reporting',
          icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
          description: 'Performance and analytics',
        },
      ];
    case 'underwriter':
      return [
        {
          label: 'Claim Deals',
          href: '/dashboard/deals?status=submitted_to_underwriting',
          icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
          description: 'Unclaimed deals ready for pickup',
        },
        {
          label: 'My Queue',
          href: '/dashboard/deals?status=submitted_to_underwriting,submitted_to_lender',
          icon: 'M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
          description: 'Deals assigned to you',
        },
      ];
    case 'executive':
      return [
        {
          label: 'All Deals',
          href: '/dashboard/deals',
          icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z',
          description: 'View the full deal pipeline',
        },
        {
          label: 'Reports',
          href: '/dashboard/reporting',
          icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
          description: 'Performance and analytics',
        },
      ];
    case 'administrator':
      return [
        {
          label: 'Admin Panel',
          href: '/dashboard/admin',
          icon: 'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
          description: 'Manage users, teams, and settings',
        },
        {
          label: 'All Deals',
          href: '/dashboard/deals',
          icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z',
          description: 'View and manage all deals',
        },
      ];
    default:
      return [];
  }
}

// Terminal and awaiting-action statuses imported from @/lib/constants

function scopeQueryByRole<T extends { eq: (col: string, val: string) => T }>(query: T, effectiveRole: string, userId: string): T {
  if (effectiveRole === 'agent') {
    return query.eq('submitted_by', userId);
  }
  return query;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect('/auth/login');

  // Fetch user profile — try full query with office FK join first
  let { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*, team:teams!users_team_id_fkey(*, office:offices(*)), office:offices!users_primary_office_id_fkey(*)')
    .eq('id', authUser.id)
    .single();

  // Fallback: if query fails (e.g. corrupted primary_office_id), retry without office FK join
  if (profileError && !userProfile) {
    console.warn('Dashboard profile query failed, retrying without office join:', profileError.message);
    ({ data: userProfile } = await supabase
      .from('users')
      .select('*, team:teams!users_team_id_fkey(*, office:offices(*))')
      .eq('id', authUser.id)
      .single());
  }

  if (!userProfile) redirect('/auth/login');

  // Read effective role from cookie (admin "View As" feature)
  const cookieStore = await cookies();
  const viewAsRole = cookieStore.get('viewAsRole')?.value as UserRole | undefined;
  const effectiveRole: UserRole = (userProfile.role === 'administrator' && viewAsRole)
    ? viewAsRole
    : userProfile.role as UserRole;

  // --- Stat queries (run in parallel) ---

  // 1. Total active deals (not completed or cancelled)
  let activeDealsQuery = supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`);

  activeDealsQuery = scopeQueryByRole(activeDealsQuery, effectiveRole, authUser.id);

  // 2. Deals awaiting action
  let awaitingQuery = supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .in('status', AWAITING_ACTION_STATUSES);

  awaitingQuery = scopeQueryByRole(awaitingQuery, effectiveRole, authUser.id);

  // 3. Completed this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let completedQuery = supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'signed_and_delivered')
    .gte('updated_at', startOfMonth.toISOString());

  completedQuery = scopeQueryByRole(completedQuery, effectiveRole, authUser.id);

  // 4. Active deals with timestamps to compute avg time in current status
  let avgTimeQuery = supabase
    .from('deals')
    .select('updated_at')
    .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
    .limit(200);

  avgTimeQuery = scopeQueryByRole(avgTimeQuery, effectiveRole, authUser.id);

  // 5. Deals queue — all non-terminal deals (agents see only their own)
  let submittedDealsQueryBuilder = supabase
    .from('deals')
    .select(`
      *,
      applicants:deal_applicants(first_name, last_name, applicant_number, experian_score),
      manager_user:users!deals_assigned_manager_fkey(first_name, last_name),
      underwriter_user:users!deals_assigned_underwriter_fkey(first_name, last_name),
      submitter_user:users!deals_submitted_by_fkey(first_name, last_name)
    `)
    .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
    .order('created_at', { ascending: false });

  submittedDealsQueryBuilder = scopeQueryByRole(submittedDealsQueryBuilder, effectiveRole, authUser.id);

  const submittedDealsQuery = submittedDealsQueryBuilder;

  // Run all queries in parallel
  const [
    activeDealsResult,
    awaitingResult,
    completedResult,
    avgTimeResult,
    submittedDealsResult,
  ] = await Promise.all([
    activeDealsQuery,
    awaitingQuery,
    completedQuery,
    avgTimeQuery,
    submittedDealsQuery,
  ]);

  const totalActiveDeals = activeDealsResult.count ?? 0;
  const dealsAwaitingAction = awaitingResult.count ?? 0;
  const completedThisMonth = completedResult.count ?? 0;

  // Compute average time in current status from updated_at
  const activeDealsData = avgTimeResult.data ?? [];
  let avgTimeInStatus = 0;
  if (activeDealsData.length > 0) {
    const now = Date.now();
    const totalMs = activeDealsData.reduce((sum, deal) => {
      return sum + (now - new Date(deal.updated_at).getTime());
    }, 0);
    avgTimeInStatus = totalMs / activeDealsData.length;
  }

  const submittedDeals = submittedDealsResult.data ?? [];

  // Fetch deal_views for unread tracking (all roles)
  const { data: dealViewRows } = await supabase
    .from('deal_views')
    .select('deal_id, last_viewed_at')
    .eq('user_id', authUser.id);

  const dealViewsMap: Record<string, string> = {};
  (dealViewRows || []).forEach((v: any) => {
    dealViewsMap[v.deal_id] = v.last_viewed_at;
  });

  // Quick actions for this role
  const quickActions = getQuickActions(effectiveRole);

  // Greeting based on time of day
  const hour = new Date().getHours();
  let greeting: string;
  if (hour < 12) {
    greeting = 'Good morning';
  } else if (hour < 17) {
    greeting = 'Good afternoon';
  } else {
    greeting = 'Good evening';
  }

  // ---- Underwriter Dashboard ----
  if (effectiveRole === 'underwriter') {
    // Fetch unassigned deals (submitted_to_underwriting + no underwriter)
    const { data: unassignedDeals } = await supabase
      .from('deals')
      .select(`
        *,
        applicants:deal_applicants(first_name, last_name, applicant_number, experian_score),
        manager_user:users!deals_assigned_manager_fkey(first_name, last_name)
      `)
      .eq('status', 'submitted_to_underwriting')
      .is('assigned_underwriter', null)
      .order('created_at', { ascending: true });

    // Fetch my active deals
    const { data: myDeals } = await supabase
      .from('deals')
      .select(`
        *,
        applicants:deal_applicants(first_name, last_name, applicant_number, experian_score),
        manager_user:users!deals_assigned_manager_fkey(first_name, last_name)
      `)
      .eq('assigned_underwriter', authUser.id)
      .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
      .order('last_activity_at', { ascending: false });

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            {greeting}, {userProfile.first_name}
          </h1>
          <p className="text-surface-500 mt-1">
            Underwriting Dashboard
          </p>
        </div>
        <UnderwriterDashboard
          unassignedDeals={unassignedDeals || []}
          myDeals={myDeals || []}
          dealViews={dealViewsMap}
        />
        <div className="flex items-center justify-center py-4">
          <span className="text-xs text-surface-400">
            Signed in as {ROLE_LABELS[effectiveRole]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">
          {greeting}, {userProfile.first_name}
        </h1>
        <p className="text-surface-500 mt-1">
          Here is your D&M Deal Portal overview for today.
        </p>
      </div>

      {/* Active Deals Queue */}
      {submittedDeals.length > 0 && (
        <SubmittedDealsQueue deals={submittedDeals} viewerRole={effectiveRole} dealViews={dealViewsMap} />
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Deals */}
        <Link href="/dashboard/deals?filter=active" className="card p-6 hover:shadow-card-hover hover:border-brand-200 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-500">Active Deals</p>
              <p className="text-3xl font-bold text-surface-900 mt-1">{totalActiveDeals}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-surface-400 mt-3 group-hover:text-brand-500 transition-colors flex items-center gap-1">
            Excludes delivered and cancelled
            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </p>
        </Link>

        {/* Awaiting Action */}
        <Link href="/dashboard/deals?filter=awaiting" className="card p-6 hover:shadow-card-hover hover:border-brand-200 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-500">Awaiting Action</p>
              <p className="text-3xl font-bold text-surface-900 mt-1">{dealsAwaitingAction}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-status-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-surface-400 mt-3 group-hover:text-brand-500 transition-colors flex items-center gap-1">
            Pending review or kicked back
            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </p>
        </Link>

        {/* Avg Time in Current Status */}
        <Link href="/dashboard/deals?filter=active" className="card p-6 hover:shadow-card-hover hover:border-brand-200 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-500">Avg. Time in Status</p>
              <p className="text-3xl font-bold text-surface-900 mt-1">
                {activeDealsData.length > 0 ? formatDuration(avgTimeInStatus) : '--'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-surface-400 mt-3 group-hover:text-brand-500 transition-colors flex items-center gap-1">
            Across all active deals
            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </p>
        </Link>

        {/* Completed This Month */}
        <Link href="/dashboard/deals?status=signed_and_delivered&deliveredMonth=current" className="card p-6 hover:shadow-card-hover hover:border-brand-200 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-500">Delivered This Month</p>
              <p className="text-3xl font-bold text-surface-900 mt-1">{completedThisMonth}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-surface-400 mt-3 group-hover:text-brand-500 transition-colors flex items-center gap-1">
            {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-surface-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <div className="card p-6 hover:shadow-md hover:border-brand-200 transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
                  <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-surface-900 group-hover:text-brand-600 transition-colors">
                  {action.label}
                </h3>
                <p className="text-xs text-surface-500 mt-1">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Role badge footer */}
      <div className="flex items-center justify-center py-4">
        <span className="text-xs text-surface-400">
          Signed in as {ROLE_LABELS[effectiveRole]}
          {userProfile.team?.name && (
            <> &mdash; {userProfile.team.office?.name}, {userProfile.team.name}</>
          )}
        </span>
      </div>
    </div>
  );
}
