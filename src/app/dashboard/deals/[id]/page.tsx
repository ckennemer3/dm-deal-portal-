import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { DealDetail } from '@/components/deals/deal-detail';

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: dealId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/auth/login');

  const { data: userProfile } = await supabase
    .from('users')
    .select('*, team:teams(*, office:offices(*))')
    .eq('id', authUser.id).single();
  if (!userProfile) redirect('/auth/login');

  // Fetch deal with all related data
  const { data: deal, error } = await supabase
    .from('deals')
    .select(`
      *,
      applicants:deal_applicants(*),
      trade_in:deal_trade_ins(*),
      open_autos:deal_open_autos(*),
      documents:deal_documents(*),
      messages:deal_messages(*),
      status_history:deal_status_history(*),
      field_changes:deal_field_changes(*)
    `)
    .eq('id', dealId)
    .single();

  if (error) {
    console.error('Deal detail query error:', error.message);
  }
  if (!deal) notFound();

  // Collect all user IDs referenced across the deal and its sub-records
  const allUserIds = new Set<string>();
  if (deal.submitted_by) allUserIds.add(deal.submitted_by);
  if (deal.assigned_manager) allUserIds.add(deal.assigned_manager);
  if (deal.assigned_underwriter) allUserIds.add(deal.assigned_underwriter);
  (deal.documents || []).forEach((d: any) => { if (d.uploaded_by) allUserIds.add(d.uploaded_by); });
  (deal.messages || []).forEach((m: any) => { if (m.sender_id) allUserIds.add(m.sender_id); });
  (deal.status_history || []).forEach((h: any) => { if (h.changed_by) allUserIds.add(h.changed_by); });
  (deal.field_changes || []).forEach((f: any) => { if (f.changed_by) allUserIds.add(f.changed_by); });

  // Fetch all referenced users in one query
  const { data: relatedUsers } = allUserIds.size > 0
    ? await supabase.from('users').select('id, first_name, last_name, email, role').in('id', Array.from(allUserIds))
    : { data: [] };

  const usersMap = Object.fromEntries((relatedUsers || []).map(u => [u.id, u]));

  // Attach user data to deal
  (deal as any).submitter = usersMap[deal.submitted_by] || null;
  (deal as any).manager = usersMap[deal.assigned_manager] || null;
  (deal as any).underwriter = deal.assigned_underwriter ? usersMap[deal.assigned_underwriter] || null : null;

  // Attach user data to sub-records
  (deal.documents || []).forEach((d: any) => { d.uploader = usersMap[d.uploaded_by] || null; });
  (deal.messages || []).forEach((m: any) => { m.sender = usersMap[m.sender_id] || null; });
  (deal.status_history || []).forEach((h: any) => { h.changer = usersMap[h.changed_by] || null; });
  (deal.field_changes || []).forEach((f: any) => { f.changer = usersMap[f.changed_by] || null; });

  // Fetch underwriters for reassignment dropdown
  const { data: underwriters } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('role', 'underwriter')
    .eq('is_active', true);

  return <DealDetail deal={deal} user={userProfile} underwriters={underwriters || []} />;
}
