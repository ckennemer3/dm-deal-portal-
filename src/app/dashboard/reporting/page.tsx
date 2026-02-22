import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { UserRole } from '@/lib/types';
import { ReportingDashboard } from '@/components/reporting/reporting-dashboard';
import {
  resolveFiltersFromSearchParams,
  fetchReportingData,
  buildFilterOptions,
  computeOverviewKPIs,
  computeManagerScorecard,
  computeResponseTimeKPIs,
  computeManagerResponseTimes,
  computeUnderwriterResponseTimes,
  computeAgentResponseTimes,
  computeBottleneckData,
  computeApprovalByCredit,
  computeApprovalByLTV,
  computeApprovalByDealType,
  computeMonthlyVolume,
  computeVolumeByOffice,
  computeVolumeByPerson,
  computeMyMetrics,
  computeKickbackReasonBreakdown,
} from '@/lib/reporting-queries';

export default async function ReportingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/auth/login');

  const { data: userProfile } = await supabase
    .from('users').select('*, team:teams!users_team_id_fkey(*, office:offices(*))').eq('id', authUser.id).single();

  if (!userProfile) {
    redirect('/dashboard');
  }

  // Read effective role (admin "View As" cookie)
  const cookieStore = await cookies();
  const viewAsRole = cookieStore.get('viewAsRole')?.value as UserRole | undefined;
  const effectiveRole: UserRole = (userProfile.role === 'administrator' && viewAsRole)
    ? viewAsRole
    : userProfile.role;

  // Parse filters from URL search params
  const params = await searchParams;
  const filters = resolveFiltersFromSearchParams(params);
  const activeTab = params.tab || (effectiveRole === 'agent' || effectiveRole === 'underwriter' ? 'my-metrics' : 'overview');

  // Fetch data with filters applied
  const reportingData = await fetchReportingData(
    {
      id: userProfile.id,
      role: effectiveRole,
      team_id: userProfile.team_id,
      primary_office_id: userProfile.primary_office_id,
    },
    filters
  );

  const { deals, statusHistory, messages, kickbackReasons, users, offices, teams } = reportingData;

  // Build filter dropdown options
  const filterOptions = buildFilterOptions(users, offices, teams);

  // Compute metrics for the active tab (skip unused tabs for performance)
  const data: Record<string, any> = {};

  if (activeTab === 'overview') {
    data.overviewKPIs = computeOverviewKPIs(deals, statusHistory);
    data.deals = deals;
    data.statusHistory = statusHistory;
    data.users = users;
    data.offices = offices;
    data.teams = teams;
  }

  if (activeTab === 'manager-scorecard') {
    data.managerScorecard = computeManagerScorecard(deals, statusHistory, messages, users, offices);
    data.kickbackReasonBreakdown = computeKickbackReasonBreakdown(kickbackReasons);
    data.deals = deals;
    data.statusHistory = statusHistory;
    data.users = users;
  }

  if (activeTab === 'response') {
    data.responseTimeKPIs = computeResponseTimeKPIs(statusHistory, deals);
    data.managerResponseTimes = computeManagerResponseTimes(deals, statusHistory, messages, users, offices);
    data.underwriterResponseTimes = computeUnderwriterResponseTimes(deals, statusHistory, messages, users);
    data.agentResponseTimes = computeAgentResponseTimes(deals, statusHistory, messages, users, teams);
    data.bottleneck = computeBottleneckData(statusHistory, deals);
  }

  if (activeTab === 'approval') {
    data.approvalByCredit = computeApprovalByCredit(deals);
    data.approvalByLTV = computeApprovalByLTV(deals);
    data.approvalByDealType = computeApprovalByDealType(deals);
    data.deals = deals;
  }

  if (activeTab === 'volume') {
    data.monthlyVolume = computeMonthlyVolume(deals);
    data.volumeByOffice = computeVolumeByOffice(deals, users, offices);
    data.volumeByManager = computeVolumeByPerson(deals, 'assigned_manager', users);
    data.volumeByUnderwriter = computeVolumeByPerson(deals, 'assigned_underwriter', users);
    data.deals = deals;
    data.users = users;
  }

  if (activeTab === 'my-metrics') {
    data.myMetrics = computeMyMetrics(deals, statusHistory, messages, userProfile.id, effectiveRole, users);
  }

  return (
    <ReportingDashboard
      effectiveRole={effectiveRole}
      filterOptions={filterOptions}
      data={data}
      activeTab={activeTab}
      userId={userProfile.id}
      userRole={userProfile.role}
    />
  );
}
