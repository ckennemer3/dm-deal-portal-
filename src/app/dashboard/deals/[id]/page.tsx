import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { DealDetail } from '@/components/deals/deal-detail';

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/auth/login');

  const { data: userProfile } = await supabase
    .from('users')
    .select('*, team:teams(*, office:offices(*))')
    .eq('id', authUser.id).single();
  if (!userProfile) redirect('/auth/login');

  const { data: deal, error } = await supabase
    .from('deals')
    .select(`
      *,
      submitter:users!deals_submitted_by_fkey(id, first_name, last_name, email),
      manager:users!deals_assigned_manager_fkey(id, first_name, last_name, email),
      underwriter:users!deals_assigned_underwriter_fkey(id, first_name, last_name, email),
      applicants:deal_applicants(*),
      trade_in:deal_trade_ins(*),
      open_autos:deal_open_autos(*),
      documents:deal_documents(*, uploader:users!deal_documents_uploaded_by_fkey(first_name, last_name)),
      messages:deal_messages(
        *,
        sender:users!deal_messages_sender_id_fkey(id, first_name, last_name, role),
        views:deal_message_views(*, viewer:users!deal_message_views_viewed_by_fkey(first_name, last_name))
      ),
      status_history:deal_status_history(*, changer:users!deal_status_history_changed_by_fkey(first_name, last_name)),
      field_changes:deal_field_changes(*, changer:users!deal_field_changes_changed_by_fkey(first_name, last_name))
    `)
    .eq('id', params.id)
    .single();

  if (error || !deal) notFound();

  // Fetch underwriters for reassignment dropdown
  const { data: underwriters } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('role', 'underwriter')
    .eq('is_active', true);

  return <DealDetail deal={deal} user={userProfile} underwriters={underwriters || []} />;
}
