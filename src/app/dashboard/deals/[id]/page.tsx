import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { DealDetail } from '@/components/deals/deal-detail';
import { recordDealView } from './actions';
import type { UserRole } from '@/lib/types';

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: dealId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/auth/login');

  // Fetch user profile — try full query first, fallback without office FK join
  let { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*, team:teams!users_team_id_fkey(*, office:offices(*))')
    .eq('id', authUser.id).single();

  if (profileError && !userProfile) {
    ({ data: userProfile } = await supabase
      .from('users')
      .select('*, team:teams!users_team_id_fkey(*, office:offices(*))')
      .eq('id', authUser.id).single());
  }
  if (!userProfile) redirect('/auth/login');

  // Apply admin "View As" role override
  const cookieStore = await cookies();
  const viewAsRole = cookieStore.get('viewAsRole')?.value as UserRole | undefined;
  if (userProfile.role === 'administrator' && viewAsRole) {
    userProfile = { ...userProfile, role: viewAsRole };
  }

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

  // Fetch audit log entries for this deal
  const { data: auditEntries } = await supabase
    .from('audit_log')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false });

  // Collect audit log user IDs too
  (auditEntries || []).forEach((a: any) => { if (a.user_id) allUserIds.add(a.user_id); });

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

  // Attach user data to audit entries
  const enrichedAuditEntries = (auditEntries || []).map((a: any) => ({
    ...a,
    user: usersMap[a.user_id] || null,
  }));

  // Compute latest unresolved action_required timestamp for timer display
  const unresolvedActions = (deal.messages || [])
    .filter((m: any) => m.message_type === 'action_required' && !m.is_resolved)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  (deal as any).latest_action_required_at = unresolvedActions[0]?.created_at || null;

  // Fetch underwriters for reassignment dropdown
  const { data: underwriters } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('role', 'underwriter')
    .eq('is_active', true);

  // Record that the user viewed this deal (for unread tracking)
  // Fire-and-forget — don't block page render
  recordDealView(dealId).catch(() => {});

  return (
    <DealDetail
      deal={deal}
      user={userProfile}
      underwriters={underwriters || []}
      auditEntries={enrichedAuditEntries}
    />
  );
}
