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

  // Fetch deals for reporting
  const { data: deals } = await supabase
    .from('deals')
    .select(`
      *,
      submitter:users!deals_submitted_by_fkey(id, first_name, last_name, team_id),
      applicants:deal_applicants(first_name, last_name, applicant_number),
      status_history:deal_status_history(from_status, to_status, changed_at, changed_by)
    `)
    .order('created_at', { ascending: false });

  // Fetch offices and teams for filters
  const { data: offices } = await supabase.from('offices').select('*').order('name');
  const { data: teams } = await supabase.from('teams').select('*, office:offices(name)').order('name');
  const { data: agents } = await supabase.from('users').select('id, first_name, last_name, team_id')
    .eq('role', 'agent').eq('is_active', true).order('last_name');

  return (
    <ReportingDashboard
      deals={deals || []}
      offices={offices || []}
      teams={teams || []}
      agents={agents || []}
    />
  );
}
