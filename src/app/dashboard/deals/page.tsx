import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DealsList } from '@/components/deals/deals-list';

export default async function DealsPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/auth/login');

  const { data: userProfile } = await supabase
    .from('users')
    .select('*, team:teams(*, office:offices(*))').eq('id', authUser.id).single();
  if (!userProfile) redirect('/auth/login');

  let query = supabase
    .from('deals')
    .select(`
      *,
      submitter:users!deals_submitted_by_fkey(id, first_name, last_name),
      manager:users!deals_assigned_manager_fkey(id, first_name, last_name),
      underwriter:users!deals_assigned_underwriter_fkey(id, first_name, last_name),
      applicants:deal_applicants(first_name, last_name, applicant_number)
    `)
    .order('created_at', { ascending: false });

  if (userProfile.role === 'agent') {
    query = query.eq('submitted_by', authUser.id);
  }

  const { data: deals } = await query;

  return <DealsList deals={deals || []} user={userProfile} />;
}
