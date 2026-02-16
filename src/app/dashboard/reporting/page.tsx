import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReportingDashboard } from '@/components/reporting/reporting-dashboard';

export default async function ReportingPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/auth/login');

  const { data: userProfile } = await supabase
    .from('users').select('*').eq('id', authUser.id).single();

  if (!userProfile || !['executive', 'administrator'].includes(userProfile.role)) {
    redirect('/dashboard');
  }

  // Fetch deals with applicant credit scores for reporting
  const { data: deals } = await supabase
    .from('deals')
    .select(`
      *,
      submitter:users!deals_submitted_by_fkey(id, first_name, last_name, team_id),
      applicants:deal_applicants(first_name, last_name, applicant_number, experian_score)
    `)
    .order('created_at', { ascending: false });

  // Fetch offices and teams for filters
  const { data: offices } = await supabase.from('offices').select('*').order('name');
  const { data: teams } = await supabase.from('teams').select('*, office:offices(name)').order('name');
  const { data: agents } = await supabase.from('users').select('id, first_name, last_name, team_id')
    .eq('role', 'agent').eq('is_active', true).order('last_name');

  // Fetch kickback reasons for breakdown analytics
  const { data: kickbackReasons } = await supabase
    .from('kickback_reasons')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch status history with timestamps for response time calculations
  const { data: rawStatusHistory } = await supabase
    .from('deal_status_history')
    .select('deal_id, from_status, to_status, changed_at, changed_by')
    .order('changed_at', { ascending: true });

  // Compute hours_in_status client-side by comparing consecutive transitions per deal
  const statusHistory = computeStatusDurations(rawStatusHistory || [], deals || []);

  return (
    <ReportingDashboard
      deals={deals || []}
      offices={offices || []}
      teams={teams || []}
      agents={agents || []}
      kickbackReasons={kickbackReasons || []}
      statusHistory={statusHistory}
    />
  );
}

/**
 * Compute hours spent in each status by comparing consecutive status transitions per deal.
 * Falls back to deal.created_at for the first transition.
 */
function computeStatusDurations(
  history: { deal_id: string; from_status: string; to_status: string; changed_at: string; changed_by: string }[],
  deals: { id: string; created_at: string }[]
): any[] {
  const dealCreatedMap = new Map(deals.map(d => [d.id, d.created_at]));

  // Group by deal_id (already sorted by changed_at asc)
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
