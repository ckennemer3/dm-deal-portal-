import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DealsList } from '@/components/deals/deals-list';

export default async function DealsPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/auth/login');

  const { data: userProfile } = await supabase
    .from('users')
    .select('*, team:teams!users_team_id_fkey(*, office:offices(*))').eq('id', authUser.id).single();
  if (!userProfile) redirect('/auth/login');

  let query = supabase
    .from('deals')
    .select(`
      *,
      applicants:deal_applicants(first_name, last_name, applicant_number)
    `)
    .order('created_at', { ascending: false });

  if (userProfile.role === 'agent') {
    query = query.eq('submitted_by', authUser.id);
  }

  const [dealsResult, dealViewsResult] = await Promise.all([
    query,
    supabase.from('deal_views').select('deal_id, last_viewed_at').eq('user_id', authUser.id),
  ]);

  const deals = dealsResult.data ?? [];
  const dealViewsMap: Record<string, string> = {};
  (dealViewsResult.data || []).forEach((v: any) => {
    dealViewsMap[v.deal_id] = v.last_viewed_at;
  });

  return <DealsList deals={deals} user={userProfile} dealViews={dealViewsMap} />;
}
