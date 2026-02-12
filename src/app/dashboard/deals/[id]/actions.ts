'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { DealStatus, KickbackReason } from '@/lib/types';

interface StatusUpdateOptions {
  kickbackReason?: KickbackReason;
  kickbackExplanation?: string;
}

export async function updateDealStatus(dealId: string, newStatus: DealStatus, notes?: string, options?: StatusUpdateOptions) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: deal } = await supabase.from('deals').select('status').eq('id', dealId).single();
  if (!deal) throw new Error('Deal not found');

  const { error } = await supabase.from('deals').update({ status: newStatus }).eq('id', dealId);
  if (error) throw new Error(error.message);

  await supabase.from('deal_status_history').insert({
    deal_id: dealId,
    from_status: deal.status,
    to_status: newStatus,
    changed_by: user.id,
    notes,
    ...(options?.kickbackReason && { kickback_reason: options.kickbackReason }),
    ...(options?.kickbackExplanation && { kickback_explanation: options.kickbackExplanation }),
  });

  revalidatePath(`/dashboard/deals/${dealId}`);
  revalidatePath('/dashboard/deals');
  revalidatePath('/dashboard');
}

export async function claimDeal(dealId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // In the new workflow, claiming a deal just assigns the underwriter.
  // The status remains 'submitted_to_underwriting' — no status change.
  const { error } = await supabase.from('deals').update({
    assigned_underwriter: user.id,
  }).eq('id', dealId);
  if (error) throw new Error(error.message);

  await supabase.from('deal_assignments').insert({
    deal_id: dealId,
    assigned_to: user.id,
    assigned_by: null,
    assignment_type: 'underwriter_claim',
  });

  revalidatePath(`/dashboard/deals/${dealId}`);
  revalidatePath('/dashboard/deals');
  revalidatePath('/dashboard');
}

export async function reassignDeal(dealId: string, newUnderwriterId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('deals').update({
    assigned_underwriter: newUnderwriterId,
  }).eq('id', dealId);
  if (error) throw new Error(error.message);

  await supabase.from('deal_assignments').insert({
    deal_id: dealId,
    assigned_to: newUnderwriterId,
    assigned_by: user.id,
    assignment_type: 'reassignment',
  });

  revalidatePath(`/dashboard/deals/${dealId}`);
}

export async function sendMessage(dealId: string, content: string, messageType: 'note' | 'action_required') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('deal_messages').insert({
    deal_id: dealId,
    sender_id: user.id,
    message_type: messageType,
    content,
    is_resolved: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/deals/${dealId}`);
}

export async function resolveMessage(messageId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('deal_messages').update({
    is_resolved: true,
    resolved_by: user.id,
    resolved_at: new Date().toISOString(),
  }).eq('id', messageId);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/deals');
}

export async function updateDealField(dealId: string, fieldName: string, oldValue: string, newValue: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('deals').update({ [fieldName]: newValue }).eq('id', dealId);
  if (error) throw new Error(error.message);

  await supabase.from('deal_field_changes').insert({
    deal_id: dealId,
    field_name: fieldName,
    old_value: oldValue,
    new_value: newValue,
    changed_by: user.id,
  });

  revalidatePath(`/dashboard/deals/${dealId}`);
}
