import { createClient, createAdminClient } from '@/lib/supabase/server';
import { DealType, DealStatus, UserRole } from './types';
import { CREDIT_SCORE_RANGES, LTV_RANGES, KICKBACK_REASON_CATEGORY_LABELS } from './constants';
import { calculateLTV, getFullName } from './utils';

// === Filter Types ===

export interface ReportingFilters {
  office?: string;
  team?: string;
  manager?: string;
  underwriter?: string;
  agent?: string;
  dealType?: DealType;
  creditScoreRange?: string;
  ltvRange?: string;
  dateFrom?: string;
  dateTo?: string;
  datePreset?: string;
  tab?: string;
}

// === Date Preset Resolution ===

export function resolveDatePreset(preset: string): { from: string; to: string } | null {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'this-week': {
      const day = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      return { from: start.toISOString().slice(0, 10), to: today };
    }
    case 'this-month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start.toISOString().slice(0, 10), to: today };
    }
    case 'last-30': {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return { from: start.toISOString().slice(0, 10), to: today };
    }
    case 'last-90': {
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      return { from: start.toISOString().slice(0, 10), to: today };
    }
    case 'ytd': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { from: start.toISOString().slice(0, 10), to: today };
    }
    default:
      return null;
  }
}

// === Parse Search Params ===

export function resolveFiltersFromSearchParams(
  params: Record<string, string | undefined>
): ReportingFilters {
  const filters: ReportingFilters = {};

  // Direct string param-to-filter mappings
  const directMappings: Array<[string, keyof ReportingFilters]> = [
    ['office', 'office'],
    ['team', 'team'],
    ['manager', 'manager'],
    ['underwriter', 'underwriter'],
    ['agent', 'agent'],
    ['tab', 'tab'],
    ['creditScoreRange', 'creditScoreRange'],
    ['ltvRange', 'ltvRange'],
    ['datePreset', 'datePreset'],
  ];

  for (const [paramKey, filterKey] of directMappings) {
    if (params[paramKey]) {
      (filters as Record<string, string>)[filterKey] = params[paramKey]!;
    }
  }

  if (params.dealType) filters.dealType = params.dealType as DealType;

  // Resolve date preset into from/to
  if (filters.datePreset && filters.datePreset !== 'custom') {
    const resolved = resolveDatePreset(filters.datePreset);
    if (resolved) {
      filters.dateFrom = resolved.from;
      filters.dateTo = resolved.to;
    }
  } else {
    if (params.dateFrom) filters.dateFrom = params.dateFrom;
    if (params.dateTo) filters.dateTo = params.dateTo;
  }

  return filters;
}

// === Fetch Reporting Data ===

export interface ReportingData {
  deals: any[];
  statusHistory: any[];
  messages: any[];
  kickbackReasons: any[];
  users: any[];
  offices: any[];
  teams: any[];
}

/**
 * Fetch all data needed for reporting, applying filters at the Supabase query level.
 * Role-based scoping ensures users only see data they're authorized for.
 */
export async function fetchReportingData(
  userProfile: { id: string; role: UserRole; team_id: string | null; primary_office_id: string | null },
  filters: ReportingFilters
): Promise<ReportingData> {
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  // Fetch users + offices + teams via admin client (bypass RLS for reference data)
  const [
    { data: users },
    { data: offices },
    { data: teams },
  ] = await Promise.all([
    adminClient.from('users').select('id, first_name, last_name, email, role, team_id, primary_office_id, is_active'),
    adminClient.from('offices').select('*').order('name'),
    adminClient.from('teams').select('*, office:offices(id, name)').order('name'),
  ]);

  // Build deals query with filters
  let dealsQuery = supabase.from('deals').select(`
    *,
    submitter:users!deals_submitted_by_fkey(id, first_name, last_name, role, team_id, primary_office_id),
    applicants:deal_applicants(applicant_number, first_name, last_name, experian_score)
  `);

  // Apply filters at query level
  if (filters.dealType) dealsQuery = dealsQuery.eq('deal_type', filters.dealType);
  if (filters.manager) dealsQuery = dealsQuery.eq('assigned_manager', filters.manager);
  if (filters.underwriter) dealsQuery = dealsQuery.eq('assigned_underwriter', filters.underwriter);
  if (filters.agent) dealsQuery = dealsQuery.eq('submitted_by', filters.agent);
  if (filters.dateFrom) dealsQuery = dealsQuery.gte('created_at', filters.dateFrom);
  if (filters.dateTo) dealsQuery = dealsQuery.lte('created_at', filters.dateTo + 'T23:59:59');

  dealsQuery = dealsQuery.order('created_at', { ascending: false });
  const { data: rawDeals } = await dealsQuery;
  let deals = rawDeals || [];

  // Post-query filtering: office (via submitter's primary_office_id)
  if (filters.office) {
    deals = deals.filter((d: any) => d.submitter?.primary_office_id === filters.office);
  }
  // Post-query filtering: team (via submitter's team_id)
  if (filters.team) {
    deals = deals.filter((d: any) => d.submitter?.team_id === filters.team);
  }

  // Post-query filtering: credit score range
  if (filters.creditScoreRange) {
    const range = CREDIT_SCORE_RANGES.find(r => r.label === filters.creditScoreRange);
    if (range) {
      deals = deals.filter((d: any) => {
        const primary = d.applicants?.find((a: any) => a.applicant_number === 1);
        const score = primary?.experian_score;
        return score && score >= range.min && score <= range.max;
      });
    }
  }

  // Post-query filtering: LTV range
  if (filters.ltvRange) {
    const range = LTV_RANGES.find(r => r.label === filters.ltvRange);
    if (range) {
      deals = deals.filter((d: any) => {
        const fin = d.deal_type === 'lease' || d.deal_type === 're_lease' ? d.net_cap_cost : d.total_amount_financed;
        const denom = d.vehicle_condition === 'used' ? d.jd_power_retail : d.msrp;
        const ltv = calculateLTV(fin, denom);
        return ltv !== null && ltv >= range.min && ltv < range.max;
      });
    }
  }

  // Fetch status history and messages for filtered deal IDs
  const dealIds = deals.map((d: any) => d.id);
  let statusHistory: any[] = [];
  let messages: any[] = [];
  let kickbackReasons: any[] = [];

  if (dealIds.length > 0) {
    const [historyRes, messagesRes, kickbackRes] = await Promise.all([
      supabase
        .from('deal_status_history')
        .select('deal_id, from_status, to_status, changed_at, changed_by, kickback_reason, kickback_explanation')
        .in('deal_id', dealIds)
        .order('changed_at', { ascending: true }),
      supabase
        .from('deal_messages')
        .select('id, deal_id, sender_id, message_type, content, is_resolved, resolved_by, resolved_at, created_at')
        .in('deal_id', dealIds)
        .order('created_at', { ascending: true }),
      supabase
        .from('kickback_reasons')
        .select('*')
        .in('deal_id', dealIds)
        .order('created_at', { ascending: false }),
    ]);
    statusHistory = computeStatusDurations(historyRes.data || [], deals);
    messages = messagesRes.data || [];
    kickbackReasons = kickbackRes.data || [];
  }

  return {
    deals,
    statusHistory,
    messages,
    kickbackReasons,
    users: users || [],
    offices: offices || [],
    teams: teams || [],
  };
}

// === Status Duration Computation ===

/**
 * Compute hours spent in each status by comparing consecutive status transitions per deal.
 */
export function computeStatusDurations(
  history: { deal_id: string; from_status: string | null; to_status: string; changed_at: string; changed_by: string }[],
  deals: { id: string; created_at: string }[]
): any[] {
  const dealCreatedMap = new Map(deals.map(d => [d.id, d.created_at]));

  const byDeal = new Map<string, typeof history>();
  history.forEach(h => {
    const arr = byDeal.get(h.deal_id) || [];
    arr.push(h);
    byDeal.set(h.deal_id, arr);
  });

  const enriched: any[] = [];
  byDeal.forEach((transitions, dealId) => {
    transitions.forEach((t, i) => {
      const prevTime = i > 0
        ? transitions[i - 1].changed_at
        : dealCreatedMap.get(dealId) || t.changed_at;
      const hours = (new Date(t.changed_at).getTime() - new Date(prevTime).getTime()) / 3600000;
      enriched.push({
        ...t,
        hours_in_status: Math.max(0, +hours.toFixed(2)),
      });
    });
  });

  return enriched;
}

// === KPI Computations ===

export interface OverviewKPIs {
  totalDeals: number;
  activePipeline: number;
  completed: number;
  cancelled: number;
  avgDaysToCompletion: number | null;
  firstTimeApprovalRate: number | null;
  kickbackRate: number;
}

export function computeOverviewKPIs(deals: any[], statusHistory: any[]): OverviewKPIs {
  const totalDeals = deals.length;
  const completed = deals.filter((d: any) => d.status === 'signed_and_delivered');
  const cancelled = deals.filter((d: any) => d.status === 'cancelled');
  const activePipeline = totalDeals - completed.length - cancelled.length;
  const dealsWithKB = deals.filter((d: any) => (d.kickback_count || 0) > 0);
  const kickbackRate = totalDeals > 0 ? (dealsWithKB.length / totalDeals) * 100 : 0;

  // Avg days to completion
  let avgDaysToCompletion: number | null = null;
  if (completed.length > 0) {
    const totalDays = completed.reduce((sum: number, d: any) => {
      const days = (new Date(d.completed_at || d.updated_at).getTime() - new Date(d.created_at).getTime()) / 86400000;
      return sum + days;
    }, 0);
    avgDaysToCompletion = +(totalDays / completed.length).toFixed(1);
  }

  // First-time approval rate: deals that went from submitted_to_underwriting -> submitted_to_lender
  // without a kickback_to_manager in between
  const dealKBMap = new Map<string, boolean>();
  statusHistory.forEach((h: any) => {
    if (h.to_status === 'kicked_back_to_manager') {
      dealKBMap.set(h.deal_id, true);
    }
  });
  const dealsSubmittedToUW = deals.filter((d: any) =>
    ['submitted_to_underwriting', 'submitted_to_lender', 'approved', 'signed_and_delivered'].includes(d.status)
  );
  const firstTimeApprovals = dealsSubmittedToUW.filter((d: any) => !dealKBMap.has(d.id));
  const firstTimeApprovalRate = dealsSubmittedToUW.length > 0
    ? (firstTimeApprovals.length / dealsSubmittedToUW.length) * 100
    : null;

  return {
    totalDeals,
    activePipeline,
    completed: completed.length,
    cancelled: cancelled.length,
    avgDaysToCompletion,
    firstTimeApprovalRate: firstTimeApprovalRate === null ? null : +firstTimeApprovalRate.toFixed(1),
    kickbackRate: +kickbackRate.toFixed(1),
  };
}

// === Manager Scorecard ===

export interface ManagerScorecardRow {
  id: string;
  name: string;
  office: string;
  totalDeals: number;
  dealsForwarded: number;
  kickbackCount: number;
  kickbackRate: number;
  firstTimePassRate: number;
  avgReviewHours: number;
  avgUWKickbackResponseHours: number;
  avgResponseRequestedHours: number;
}

export function computeManagerScorecard(
  deals: any[],
  statusHistory: any[],
  messages: any[],
  users: any[],
  offices: any[]
): ManagerScorecardRow[] {
  const managers = users.filter((u: any) => u.role === 'manager' || u.role === 'general_manager');
  const officeMap = new Map(offices.map((o: any) => [o.id, o.name]));

  return managers.map((mgr: any) => {
    const mgrDeals = deals.filter((d: any) => d.assigned_manager === mgr.id);
    const totalDeals = mgrDeals.length;

    // Deals forwarded to UW
    const forwarded = statusHistory.filter((h: any) =>
      h.changed_by === mgr.id && h.to_status === 'submitted_to_underwriting'
    );

    // Kickbacks from this manager's deals
    const dealIds = new Set(mgrDeals.map((d: any) => d.id));
    const mgrKickbacks = statusHistory.filter((h: any) =>
      dealIds.has(h.deal_id) && h.to_status === 'kicked_back_to_manager'
    );

    // First-time pass: deals that went to UW without being kicked back
    const kickedDealIds = new Set(mgrKickbacks.map((h: any) => h.deal_id));
    const dealsReachedUW = mgrDeals.filter((d: any) =>
      ['submitted_to_underwriting', 'submitted_to_lender', 'approved', 'signed_and_delivered'].includes(d.status)
    );
    const firstTimePass = dealsReachedUW.filter((d: any) => !kickedDealIds.has(d.id));

    // Avg review time: time from pending_manager_review → (submitted_to_underwriting | kicked_back_to_sales)
    const reviewTransitions = statusHistory.filter((h: any) =>
      h.changed_by === mgr.id &&
      h.from_status === 'pending_manager_review' &&
      (h.to_status === 'submitted_to_underwriting' || h.to_status === 'kicked_back_to_sales')
    );
    const avgReviewHours = reviewTransitions.length > 0
      ? reviewTransitions.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / reviewTransitions.length
      : 0;

    // Avg UW kickback response: time from kicked_back_to_manager → submitted_to_underwriting (by this manager)
    const uwKBResponses = statusHistory.filter((h: any) =>
      h.changed_by === mgr.id &&
      h.from_status === 'kicked_back_to_manager' &&
      h.to_status === 'submitted_to_underwriting'
    );
    const avgUWKBHours = uwKBResponses.length > 0
      ? uwKBResponses.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / uwKBResponses.length
      : 0;

    // Avg response to action_required messages
    const mgrActionRequired = messages.filter((m: any) =>
      dealIds.has(m.deal_id) && m.message_type === 'action_required' && m.is_resolved && m.resolved_by === mgr.id
    );
    const avgRRHours = computeAvgResponseToActionRequired(mgrActionRequired, messages);

    return {
      id: mgr.id,
      name: getFullName(mgr.first_name, mgr.last_name),
      office: officeMap.get(mgr.primary_office_id) || '—',
      totalDeals,
      dealsForwarded: forwarded.length,
      kickbackCount: mgrKickbacks.length,
      kickbackRate: totalDeals > 0 ? +((mgrKickbacks.length / totalDeals) * 100).toFixed(1) : 0,
      firstTimePassRate: dealsReachedUW.length > 0
        ? +((firstTimePass.length / dealsReachedUW.length) * 100).toFixed(1)
        : 0,
      avgReviewHours: +avgReviewHours.toFixed(1),
      avgUWKickbackResponseHours: +avgUWKBHours.toFixed(1),
      avgResponseRequestedHours: +avgRRHours.toFixed(1),
    };
  }).filter(m => m.totalDeals > 0).sort((a, b) => b.totalDeals - a.totalDeals);
}

// === Response Times ===

export interface ResponseTimeKPIs {
  avgPendingToUW: number | null;
  avgUWToLender: number | null;
  avgLenderToApproved: number | null;
  avgApprovedToDelivered: number | null;
  avgTotalLifecycle: number | null;
}

export function computeResponseTimeKPIs(statusHistory: any[], deals: any[]): ResponseTimeKPIs {
  const avgForTransition = (from: DealStatus, to: DealStatus) => {
    const transitions = statusHistory.filter((h: any) => h.from_status === from && h.to_status === to);
    if (transitions.length === 0) return null;
    return +(transitions.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / transitions.length).toFixed(1);
  };

  // Total lifecycle for completed deals
  const completedDeals = deals.filter((d: any) => d.status === 'signed_and_delivered');
  let avgTotalLifecycle: number | null = null;
  if (completedDeals.length > 0) {
    const totalHours = completedDeals.reduce((sum: number, d: any) => {
      return sum + (new Date(d.completed_at || d.updated_at).getTime() - new Date(d.created_at).getTime()) / 3600000;
    }, 0);
    avgTotalLifecycle = +(totalHours / completedDeals.length).toFixed(1);
  }

  return {
    avgPendingToUW: avgForTransition('pending_manager_review', 'submitted_to_underwriting'),
    avgUWToLender: avgForTransition('submitted_to_underwriting', 'submitted_to_lender'),
    avgLenderToApproved: avgForTransition('submitted_to_lender', 'approved'),
    avgApprovedToDelivered: avgForTransition('approved', 'signed_and_delivered'),
    avgTotalLifecycle,
  };
}

export interface PersonResponseRow {
  id: string;
  name: string;
  office?: string;
  team?: string;
  avgReviewHours: number;
  avgKBResponseHours: number;
  avgRRResponseHours: number;
  totalDeals: number;
  slowestDealHours: number;
  currentQueueDepth?: number;
}

export function computeManagerResponseTimes(
  deals: any[],
  statusHistory: any[],
  messages: any[],
  users: any[],
  offices: any[]
): PersonResponseRow[] {
  const managers = users.filter((u: any) => u.role === 'manager' || u.role === 'general_manager');
  const officeMap = new Map(offices.map((o: any) => [o.id, o.name]));

  return managers.map((mgr: any) => {
    const mgrDeals = deals.filter((d: any) => d.assigned_manager === mgr.id);
    const dealIds = new Set(mgrDeals.map((d: any) => d.id));

    const reviewTransitions = statusHistory.filter((h: any) =>
      h.changed_by === mgr.id &&
      h.from_status === 'pending_manager_review'
    );
    const avgReview = reviewTransitions.length > 0
      ? reviewTransitions.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / reviewTransitions.length
      : 0;

    const kbResponses = statusHistory.filter((h: any) =>
      h.changed_by === mgr.id &&
      h.from_status === 'kicked_back_to_manager'
    );
    const avgKB = kbResponses.length > 0
      ? kbResponses.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / kbResponses.length
      : 0;

    const resolvedAR = messages.filter((m: any) =>
      dealIds.has(m.deal_id) && m.message_type === 'action_required' && m.is_resolved && m.resolved_by === mgr.id
    );
    const avgRR = computeAvgResponseToActionRequired(resolvedAR, messages);

    const allTimes = [...reviewTransitions, ...kbResponses].map((h: any) => h.hours_in_status || 0);
    const slowest = allTimes.length > 0 ? Math.max(...allTimes) : 0;

    return {
      id: mgr.id,
      name: getFullName(mgr.first_name, mgr.last_name),
      office: officeMap.get(mgr.primary_office_id) || '—',
      avgReviewHours: +avgReview.toFixed(1),
      avgKBResponseHours: +avgKB.toFixed(1),
      avgRRResponseHours: +avgRR.toFixed(1),
      totalDeals: mgrDeals.length,
      slowestDealHours: +slowest.toFixed(1),
    };
  }).filter(m => m.totalDeals > 0).sort((a, b) => b.totalDeals - a.totalDeals);
}

export function computeUnderwriterResponseTimes(
  deals: any[],
  statusHistory: any[],
  messages: any[],
  users: any[]
): PersonResponseRow[] {
  const underwriters = users.filter((u: any) => u.role === 'underwriter');

  return underwriters.map((uw: any) => {
    const uwDeals = deals.filter((d: any) => d.assigned_underwriter === uw.id);
    const dealIds = new Set(uwDeals.map((d: any) => d.id));

    const uwTransitions = statusHistory.filter((h: any) =>
      h.changed_by === uw.id &&
      h.from_status === 'submitted_to_underwriting'
    );
    const avgReview = uwTransitions.length > 0
      ? uwTransitions.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / uwTransitions.length
      : 0;

    const toLender = statusHistory.filter((h: any) =>
      h.changed_by === uw.id && h.to_status === 'submitted_to_lender'
    );
    const avgToLender = toLender.length > 0
      ? toLender.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / toLender.length
      : 0;

    const resolvedAR = messages.filter((m: any) =>
      dealIds.has(m.deal_id) && m.message_type === 'action_required' && m.is_resolved && m.resolved_by === uw.id
    );
    const avgRR = computeAvgResponseToActionRequired(resolvedAR, messages);

    const currentQueue = uwDeals.filter((d: any) =>
      d.status === 'submitted_to_underwriting' || d.status === 'submitted_to_lender'
    ).length;

    const allTimes = uwTransitions.map((h: any) => h.hours_in_status || 0);
    const slowest = allTimes.length > 0 ? Math.max(...allTimes) : 0;

    return {
      id: uw.id,
      name: getFullName(uw.first_name, uw.last_name),
      avgReviewHours: +avgReview.toFixed(1),
      avgKBResponseHours: +avgToLender.toFixed(1),
      avgRRResponseHours: +avgRR.toFixed(1),
      totalDeals: uwDeals.length,
      slowestDealHours: +slowest.toFixed(1),
      currentQueueDepth: currentQueue,
    };
  }).filter(uw => uw.totalDeals > 0).sort((a, b) => b.totalDeals - a.totalDeals);
}

export function computeAgentResponseTimes(
  deals: any[],
  statusHistory: any[],
  messages: any[],
  users: any[],
  teams: any[]
): PersonResponseRow[] {
  const agents = users.filter((u: any) => u.role === 'agent');
  const teamMap = new Map(teams.map((t: any) => [t.id, t.name]));

  return agents.map((agent: any) => {
    const agentDeals = deals.filter((d: any) => d.submitted_by === agent.id);
    const dealIds = new Set(agentDeals.map((d: any) => d.id));

    // Agent response to kickback_to_sales
    const kbResponses = statusHistory.filter((h: any) =>
      h.changed_by === agent.id &&
      h.from_status === 'kicked_back_to_sales' &&
      h.to_status === 'pending_manager_review'
    );
    const avgKB = kbResponses.length > 0
      ? kbResponses.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / kbResponses.length
      : 0;

    const resolvedAR = messages.filter((m: any) =>
      dealIds.has(m.deal_id) && m.message_type === 'action_required' && m.is_resolved && m.resolved_by === agent.id
    );
    const avgRR = computeAvgResponseToActionRequired(resolvedAR, messages);

    return {
      id: agent.id,
      name: getFullName(agent.first_name, agent.last_name),
      team: teamMap.get(agent.team_id) || '—',
      avgReviewHours: 0,
      avgKBResponseHours: +avgKB.toFixed(1),
      avgRRResponseHours: +avgRR.toFixed(1),
      totalDeals: agentDeals.length,
      slowestDealHours: 0,
    };
  }).filter(a => a.totalDeals > 0).sort((a, b) => b.totalDeals - a.totalDeals);
}

// === Bottleneck Data ===

export interface BottleneckPhase {
  phase: string;
  avgHours: number;
  color: string;
}

export function computeBottleneckData(statusHistory: any[], deals: any[]): BottleneckPhase[] {
  const completedDealIds = new Set(
    deals.filter((d: any) => d.status === 'signed_and_delivered').map((d: any) => d.id)
  );

  const phases = [
    { phase: 'Manager Review', from: 'pending_manager_review', to: 'submitted_to_underwriting', color: '#1A569B' },
    { phase: 'Underwriting', from: 'submitted_to_underwriting', to: 'submitted_to_lender', color: '#3B82F6' },
    { phase: 'Lender Response', from: 'submitted_to_lender', to: 'approved', color: '#8B5CF6' },
    { phase: 'Closing', from: 'approved', to: 'signed_and_delivered', color: '#10B981' },
  ];

  return phases.map(p => {
    const transitions = statusHistory.filter((h: any) =>
      completedDealIds.has(h.deal_id) && h.from_status === p.from && h.to_status === p.to
    );
    const avg = transitions.length > 0
      ? transitions.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / transitions.length
      : 0;
    return { phase: p.phase, avgHours: +avg.toFixed(1), color: p.color };
  });
}

// === Approval Metrics ===

export interface ApprovalBucket {
  range: string;
  total: number;
  approved: number;
  rate: number;
  avgDays: number | null;
}

export function computeApprovalByCredit(deals: any[]): ApprovalBucket[] {
  return CREDIT_SCORE_RANGES.map(range => {
    const inRange = deals.filter((d: any) => {
      const primary = d.applicants?.find((a: any) => a.applicant_number === 1);
      const score = primary?.experian_score;
      return score && score >= range.min && score <= range.max;
    });
    const approved = inRange.filter((d: any) => ['approved', 'signed_and_delivered'].includes(d.status));
    const avgDays = approved.length > 0
      ? +(approved.reduce((s: number, d: any) =>
          s + (new Date(d.completed_at || d.updated_at).getTime() - new Date(d.created_at).getTime()) / 86400000
        , 0) / approved.length).toFixed(1)
      : null;
    return {
      range: range.label,
      total: inRange.length,
      approved: approved.length,
      rate: inRange.length > 0 ? +((approved.length / inRange.length) * 100).toFixed(1) : 0,
      avgDays,
    };
  });
}

export function computeApprovalByLTV(deals: any[]): ApprovalBucket[] {
  return LTV_RANGES.map(range => {
    const inRange = deals.filter((d: any) => {
      const fin = d.deal_type === 'lease' || d.deal_type === 're_lease' ? d.net_cap_cost : d.total_amount_financed;
      const denom = d.vehicle_condition === 'used' ? d.jd_power_retail : d.msrp;
      const ltv = calculateLTV(fin, denom);
      return ltv !== null && ltv >= range.min && ltv < range.max;
    });
    const approved = inRange.filter((d: any) => ['approved', 'signed_and_delivered'].includes(d.status));
    return {
      range: range.label,
      total: inRange.length,
      approved: approved.length,
      rate: inRange.length > 0 ? +((approved.length / inRange.length) * 100).toFixed(1) : 0,
      avgDays: null,
    };
  });
}

export function computeApprovalByDealType(deals: any[]): ApprovalBucket[] {
  const types: { key: DealType; label: string }[] = [
    { key: 'lease', label: 'Lease' },
    { key: 'retail_purchase', label: 'Retail Purchase' },
    { key: 're_lease', label: 'Re-Lease' },
    { key: 'lease_buyout', label: 'Lease Buy-out' },
  ];
  return types.map(t => {
    const ofType = deals.filter((d: any) => d.deal_type === t.key);
    const approved = ofType.filter((d: any) => ['approved', 'signed_and_delivered'].includes(d.status));
    return {
      range: t.label,
      total: ofType.length,
      approved: approved.length,
      rate: ofType.length > 0 ? +((approved.length / ofType.length) * 100).toFixed(1) : 0,
      avgDays: null,
    };
  });
}

// === Volume Metrics ===

export interface MonthlyVolume {
  month: string;
  submissions: number;
  completions: number;
}

export function computeMonthlyVolume(deals: any[]): MonthlyVolume[] {
  const monthlyData: Record<string, { submissions: number; completions: number }> = {};
  deals.forEach((d: any) => {
    const date = new Date(d.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[key]) monthlyData[key] = { submissions: 0, completions: 0 };
    monthlyData[key].submissions++;
    if (d.status === 'signed_and_delivered') {
      monthlyData[key].completions++;
    }
  });
  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => {
      const [y, m] = key.split('-');
      return {
        month: new Date(+y, +m - 1).toLocaleString('en-US', { year: 'numeric', month: 'short' }),
        ...data,
      };
    })
    .slice(-12);
}

export interface VolumeByEntity {
  name: string;
  count: number;
}

export function computeVolumeByOffice(deals: any[], users: any[], offices: any[]): VolumeByEntity[] {
  const userOfficeMap = new Map(users.map((u: any) => [u.id, u.primary_office_id]));
  const officeMap = new Map(offices.map((o: any) => [o.id, o.name]));
  const counts: Record<string, number> = {};
  deals.forEach((d: any) => {
    const officeId = d.submitter?.primary_office_id || userOfficeMap.get(d.submitted_by);
    const name = officeMap.get(officeId) || 'Unknown';
    counts[name] = (counts[name] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeVolumeByPerson(
  deals: any[],
  field: 'assigned_manager' | 'assigned_underwriter' | 'submitted_by',
  users: any[]
): VolumeByEntity[] {
  const userMap = new Map(users.map((u: any) => [u.id, getFullName(u.first_name, u.last_name)]));
  const counts: Record<string, number> = {};
  deals.forEach((d: any) => {
    const userId = d[field];
    if (!userId) return;
    const name = userMap.get(userId) || 'Unknown';
    counts[name] = (counts[name] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// === My Metrics ===

export interface MyMetricsData {
  totalDeals: number;
  kickbackRate: number;
  avgResponseHours: number;
  dealsByStatus: { status: string; count: number }[];
  percentileRank: {
    kickbackRate: number | null;
    responseTime: number | null;
  };
  trend: MonthlyVolume[];
}

export function computeMyMetrics(
  deals: any[],
  statusHistory: any[],
  messages: any[],
  userId: string,
  userRole: UserRole,
  users: any[]
): MyMetricsData {
  let myDeals: any[] = [];
  let kbRate = 0;
  let avgResponse = 0;
  let percentileKB: number | null = null;
  let percentileRT: number | null = null;

  if (userRole === 'agent') {
    myDeals = deals.filter((d: any) => d.submitted_by === userId);
    const withKB = myDeals.filter((d: any) => (d.kickback_count || 0) > 0);
    kbRate = myDeals.length > 0 ? (withKB.length / myDeals.length) * 100 : 0;

    // Avg response to kickbacks
    const kbResponses = statusHistory.filter((h: any) =>
      h.changed_by === userId && h.from_status === 'kicked_back_to_sales'
    );
    avgResponse = kbResponses.length > 0
      ? kbResponses.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / kbResponses.length
      : 0;

    // Percentile vs team peers
    const user = users.find((u: any) => u.id === userId);
    if (user?.team_id) {
      const teamAgents = users.filter((u: any) => u.role === 'agent' && u.team_id === user.team_id && u.id !== userId);
      const peerKBRates = teamAgents.map((a: any) => {
        const pDeals = deals.filter((d: any) => d.submitted_by === a.id);
        const pKB = pDeals.filter((d: any) => (d.kickback_count || 0) > 0);
        return pDeals.length > 0 ? (pKB.length / pDeals.length) * 100 : 0;
      });
      percentileKB = computePercentile(kbRate, peerKBRates, true);

      const peerRTs = teamAgents.map((a: any) => {
        const pResp = statusHistory.filter((h: any) => h.changed_by === a.id && h.from_status === 'kicked_back_to_sales');
        return pResp.length > 0 ? pResp.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / pResp.length : 0;
      });
      percentileRT = computePercentile(avgResponse, peerRTs, true);
    }
  } else if (userRole === 'manager' || userRole === 'general_manager') {
    myDeals = deals.filter((d: any) => d.assigned_manager === userId);
    const withKB = statusHistory.filter((h: any) =>
      myDeals.some((d: any) => d.id === h.deal_id) && h.to_status === 'kicked_back_to_manager'
    );
    const dealIdsWithKB = new Set(withKB.map((h: any) => h.deal_id));
    kbRate = myDeals.length > 0 ? (dealIdsWithKB.size / myDeals.length) * 100 : 0;

    const reviewTransitions = statusHistory.filter((h: any) =>
      h.changed_by === userId && h.from_status === 'pending_manager_review'
    );
    avgResponse = reviewTransitions.length > 0
      ? reviewTransitions.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / reviewTransitions.length
      : 0;
  } else if (userRole === 'underwriter') {
    myDeals = deals.filter((d: any) => d.assigned_underwriter === userId);
    const uwTransitions = statusHistory.filter((h: any) =>
      h.changed_by === userId && h.from_status === 'submitted_to_underwriting'
    );
    avgResponse = uwTransitions.length > 0
      ? uwTransitions.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / uwTransitions.length
      : 0;
  }

  const dealsByStatus: Record<string, number> = {};
  myDeals.forEach((d: any) => {
    dealsByStatus[d.status] = (dealsByStatus[d.status] || 0) + 1;
  });

  const trend = computeMonthlyVolume(myDeals);

  return {
    totalDeals: myDeals.length,
    kickbackRate: +kbRate.toFixed(1),
    avgResponseHours: +avgResponse.toFixed(1),
    dealsByStatus: Object.entries(dealsByStatus).map(([status, count]) => ({ status, count })),
    percentileRank: { kickbackRate: percentileKB, responseTime: percentileRT },
    trend,
  };
}

// === Kickback Reason Breakdown ===

export interface KickbackReasonSummary {
  reason: string;
  count: number;
  percentage: number;
}

export function computeKickbackReasonBreakdown(kickbackReasons: any[]): KickbackReasonSummary[] {
  const total = kickbackReasons.length;
  const counts: Record<string, number> = {};
  kickbackReasons.forEach((kr: any) => {
    counts[kr.reason_category] = (counts[kr.reason_category] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([reason, count]) => ({
      reason: KICKBACK_REASON_CATEGORY_LABELS[reason as keyof typeof KICKBACK_REASON_CATEGORY_LABELS] || reason,
      count,
      percentage: total > 0 ? +((count / total) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// === Utility Helpers ===

/**
 * Compute what percentile a value falls in compared to peers.
 * Returns 0-100 where 100 = best. For lowerIsBetter metrics (e.g. kickback rate),
 * a lower value = higher percentile.
 */
function computePercentile(value: number, peerValues: number[], lowerIsBetter: boolean): number | null {
  if (peerValues.length === 0) return null;
  const allValues = [...peerValues, value];
  const sorted = lowerIsBetter
    ? [...allValues].sort((a, b) => b - a) // worst first
    : [...allValues].sort((a, b) => a - b); // worst first
  const rank = sorted.indexOf(value) + 1;
  return Math.round((rank / allValues.length) * 100);
}

/**
 * Classify a value into quartile buckets for color coding.
 */
export function classifyQuartile(
  value: number,
  allValues: number[],
  lowerIsBetter: boolean
): 'top' | 'middle' | 'bottom' {
  if (allValues.length < 4) return 'middle';
  const sorted = lowerIsBetter
    ? [...allValues].sort((a, b) => a - b)
    : [...allValues].sort((a, b) => b - a);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  if (lowerIsBetter) {
    if (value <= q1) return 'top';
    if (value >= q3) return 'bottom';
  } else {
    if (value >= q1) return 'top';
    if (value <= q3) return 'bottom';
  }
  return 'middle';
}

/**
 * Compute avg hours between action_required message creation and resolution.
 */
function computeAvgResponseToActionRequired(resolvedMessages: any[], allMessages: any[]): number {
  if (resolvedMessages.length === 0) return 0;
  const totalHours = resolvedMessages.reduce((sum: number, m: any) => {
    const created = new Date(m.created_at).getTime();
    const resolved = new Date(m.resolved_at).getTime();
    return sum + (resolved - created) / 3600000;
  }, 0);
  return +(totalHours / resolvedMessages.length).toFixed(1);
}

// === Filter Options Builder ===

export interface FilterOptions {
  offices: { value: string; label: string }[];
  teams: { value: string; label: string; officeId: string }[];
  managers: { value: string; label: string }[];
  underwriters: { value: string; label: string }[];
  agents: { value: string; label: string }[];
}

export function buildFilterOptions(users: any[], offices: any[], teams: any[]): FilterOptions {
  return {
    offices: offices.map((o: any) => ({ value: o.id, label: o.name })),
    teams: teams.map((t: any) => {
      const officeSuffix = t.office?.name ? ` (${t.office.name})` : '';
      return {
        value: t.id,
        label: `${t.name}${officeSuffix}`,
        officeId: t.office_id,
      };
    }),
    managers: users
      .filter((u: any) => (u.role === 'manager' || u.role === 'general_manager') && u.is_active)
      .map((u: any) => ({ value: u.id, label: getFullName(u.first_name, u.last_name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    underwriters: users
      .filter((u: any) => u.role === 'underwriter' && u.is_active)
      .map((u: any) => ({ value: u.id, label: getFullName(u.first_name, u.last_name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    agents: users
      .filter((u: any) => u.role === 'agent' && u.is_active)
      .map((u: any) => ({ value: u.id, label: getFullName(u.first_name, u.last_name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}
