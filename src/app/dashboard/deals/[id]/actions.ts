'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { DealStatus, KickbackReason } from '@/lib/types';
import { logAuditEvent, notifyDealParticipants } from '@/services/audit';
import { DEAL_STATUS_CONFIG, KICKBACK_REASON_LABELS } from '@/lib/constants';

interface StatusUpdateOptions {
  kickbackReason?: KickbackReason;
  kickbackExplanation?: string;
}

/**
 * Determines the audit action type and description for a deal status change.
 */
function determineAuditAction(
  dealStatus: string,
  newStatus: DealStatus,
  options?: StatusUpdateOptions
): { auditAction: 'deal_kicked_back' | 'deal_resubmitted' | 'status_changed'; auditDescription: string } {
  const isKickback = newStatus === 'kicked_back_to_manager' || newStatus === 'kicked_back_to_sales';
  const isResubmit =
    (dealStatus === 'kicked_back_to_sales' && newStatus === 'pending_manager_review') ||
    (dealStatus === 'kicked_back_to_manager' && newStatus === 'submitted_to_underwriting');

  if (isKickback) {
    const reasonLabel = options?.kickbackReason ? KICKBACK_REASON_LABELS[options.kickbackReason] : 'N/A';
    const explanation = options?.kickbackExplanation ? ` — ${options.kickbackExplanation}` : '';
    return { auditAction: 'deal_kicked_back', auditDescription: `Deal kicked back: ${reasonLabel}${explanation}` };
  }
  if (isResubmit) {
    return {
      auditAction: 'deal_resubmitted',
      auditDescription: `Deal resubmitted from ${DEAL_STATUS_CONFIG[dealStatus as DealStatus]?.label || dealStatus}`,
    };
  }
  return {
    auditAction: 'status_changed',
    auditDescription: `Status changed to ${DEAL_STATUS_CONFIG[newStatus]?.label || newStatus}`,
  };
}

export async function updateDealStatus(dealId: string, newStatus: DealStatus, notes?: string, options?: StatusUpdateOptions) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: deal } = await supabase.from('deals').select('status, deal_number, submitted_by, assigned_manager').eq('id', dealId).single();
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

  const { auditAction, auditDescription } = determineAuditAction(deal.status, newStatus, options);
  const isKickback = newStatus === 'kicked_back_to_manager' || newStatus === 'kicked_back_to_sales';

  await logAuditEvent({
    dealId,
    userId: user.id,
    actionType: auditAction,
    description: auditDescription,
    metadata: {
      from_status: deal.status,
      to_status: newStatus,
      ...(options?.kickbackReason && { kickback_reason: options.kickbackReason }),
      ...(notes && { notes }),
    },
  });

  // Insert normalized kickback reason for reporting
  if (isKickback && options?.kickbackReason) {
    const kickedToUserId = newStatus === 'kicked_back_to_manager'
      ? deal.assigned_manager
      : deal.submitted_by;

    await supabase.from('kickback_reasons').insert({
      deal_id: dealId,
      kicked_by_user_id: user.id,
      kicked_to_user_id: kickedToUserId || null,
      reason_category: options.kickbackReason,
      reason_detail: options.kickbackExplanation || null,
    }).then(({ error: kbError }) => {
      if (kbError) {
        console.error('Failed to insert kickback_reason:', kbError.message);
      }
    });
  }

  // Notify deal participants
  await notifyDealParticipants({
    dealId,
    excludeUserId: user.id,
    type: auditAction,
    title: `Deal ${deal.deal_number}: ${DEAL_STATUS_CONFIG[newStatus]?.label || newStatus}`,
    message: auditDescription,
  });

  revalidatePath(`/dashboard/deals/${dealId}`);
  revalidatePath('/dashboard/deals');
  revalidatePath('/dashboard');
}

export async function claimDeal(dealId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Atomic conditional update — only succeeds if assigned_underwriter IS NULL
  const { data, error } = await supabase
    .from('deals')
    .update({ assigned_underwriter: user.id })
    .eq('id', dealId)
    .is('assigned_underwriter', null)
    .select('id, deal_number')
    .single();

  if (error || !data) {
    // Someone else claimed it — find who
    const { data: deal } = await supabase
      .from('deals')
      .select('assigned_underwriter, uw:users!deals_assigned_underwriter_fkey(first_name, last_name)')
      .eq('id', dealId)
      .single();

    // Supabase returns FK joins as arrays; grab the first element
    const uwArr = deal?.uw as unknown as { first_name: string; last_name: string }[] | null;
    const uw = uwArr?.[0];
    const uwName = uw ? `${uw.first_name} ${uw.last_name}` : 'another underwriter';
    throw new Error(`CLAIM_CONFLICT:${uwName}`);
  }

  // claimed_at is set automatically by trigger (tr_deals_set_claimed_at)
  await supabase.from('deal_assignments').insert({
    deal_id: dealId,
    assigned_to: user.id,
    assigned_by: null,
    assignment_type: 'underwriter_claim',
  });

  await logAuditEvent({
    dealId,
    userId: user.id,
    actionType: 'deal_claimed',
    description: 'Deal claimed by underwriter',
  });

  await notifyDealParticipants({
    dealId,
    excludeUserId: user.id,
    type: 'deal_claimed',
    title: `Deal ${data.deal_number}: Claimed`,
    message: 'An underwriter has claimed this deal for review.',
  });

  revalidatePath(`/dashboard/deals/${dealId}`);
  revalidatePath('/dashboard/deals');
  revalidatePath('/dashboard');
}

export async function reassignDeal(dealId: string, newUnderwriterId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: deal } = await supabase.from('deals').select('deal_number').eq('id', dealId).single();

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

  // Get new UW name for audit description
  const { data: newUw } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', newUnderwriterId)
    .single();

  const uwName = newUw ? `${newUw.first_name} ${newUw.last_name}` : newUnderwriterId;

  await logAuditEvent({
    dealId,
    userId: user.id,
    actionType: 'deal_reassigned',
    description: `Deal reassigned to ${uwName}`,
    metadata: { new_underwriter_id: newUnderwriterId },
  });

  await notifyDealParticipants({
    dealId,
    excludeUserId: user.id,
    type: 'deal_reassigned',
    title: `Deal ${deal?.deal_number || ''}: Reassigned`,
    message: `Deal has been reassigned to ${uwName}.`,
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

  // Auto-resolve unresolved "Response Requested" messages where the flagger
  // has a different role than the replying user
  const { data: currentUserProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentUserProfile?.role) {
    const { data: unresolvedActions } = await supabase
      .from('deal_messages')
      .select('id, sender_id')
      .eq('deal_id', dealId)
      .eq('message_type', 'action_required')
      .eq('is_resolved', false);

    if (unresolvedActions && unresolvedActions.length > 0) {
      // Look up roles for all flaggers
      const flaggerIds = Array.from(new Set(unresolvedActions.map(m => m.sender_id)));
      const { data: flaggerProfiles } = await supabase
        .from('users')
        .select('id, role')
        .in('id', flaggerIds);

      const flaggerRoleMap = Object.fromEntries(
        (flaggerProfiles || []).map(u => [u.id, u.role])
      );

      // Resolve messages where flagger has a different role
      const toResolve = unresolvedActions.filter(
        m => flaggerRoleMap[m.sender_id] && flaggerRoleMap[m.sender_id] !== currentUserProfile.role
      );

      if (toResolve.length > 0) {
        await supabase
          .from('deal_messages')
          .update({
            is_resolved: true,
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
          })
          .in('id', toResolve.map(m => m.id));
      }
    }
  }

  const { data: deal } = await supabase.from('deals').select('deal_number').eq('id', dealId).single();

  await logAuditEvent({
    dealId,
    userId: user.id,
    actionType: 'message_sent',
    description: `${messageType === 'action_required' ? 'Response requested' : 'Comment'} added`,
    metadata: { message_type: messageType },
  });

  const notifType = messageType === 'action_required' ? 'action_required' : 'new_message';
  await notifyDealParticipants({
    dealId,
    excludeUserId: user.id,
    type: notifType,
    title: `Deal ${deal?.deal_number || ''}: ${messageType === 'action_required' ? 'Response Requested' : 'New Comment'}`,
    message: content.length > 100 ? content.slice(0, 100) + '...' : content,
  });

  revalidatePath(`/dashboard/deals/${dealId}`);
}

export async function resolveMessage(messageId: string, dealId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the message to find the deal_id if not provided
  const { data: msg } = await supabase
    .from('deal_messages')
    .select('deal_id')
    .eq('id', messageId)
    .single();

  const resolvedDealId = dealId || msg?.deal_id;

  const { error } = await supabase.from('deal_messages').update({
    is_resolved: true,
    resolved_by: user.id,
    resolved_at: new Date().toISOString(),
  }).eq('id', messageId);
  if (error) throw new Error(error.message);

  if (resolvedDealId) {
    await logAuditEvent({
      dealId: resolvedDealId,
      userId: user.id,
      actionType: 'action_required_resolved',
      description: 'Response request resolved',
      metadata: { message_id: messageId },
    });
  }

  revalidatePath('/dashboard/deals');
  if (resolvedDealId) {
    revalidatePath(`/dashboard/deals/${resolvedDealId}`);
  }
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

  await logAuditEvent({
    dealId,
    userId: user.id,
    actionType: 'field_changed',
    description: `Field "${fieldName}" changed`,
    metadata: { field_name: fieldName, old_value: oldValue, new_value: newValue },
  });

  revalidatePath(`/dashboard/deals/${dealId}`);
}

/**
 * Record that the current user has viewed a deal (for unread tracking).
 * Only tracks views for participants (agent, manager, underwriter).
 * Executives and administrators are observers — their views are not recorded.
 */
export async function recordDealView(dealId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Only record views for participant roles
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || ['executive', 'administrator'].includes(profile.role)) return;

  await supabase.from('deal_views').upsert(
    {
      user_id: user.id,
      deal_id: dealId,
      last_viewed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,deal_id' }
  );
}

/**
 * Submit a response to a kickback reason.
 * Called by the kickback recipient (manager or agent) from the kickback banner.
 * Marks the kickback as resolved and logs the response.
 */
export async function respondToKickback(kickbackReasonId: string, responseText: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (!responseText.trim()) throw new Error('Response text is required');

  const now = new Date().toISOString();

  const { data: kickback, error: fetchError } = await supabase
    .from('kickback_reasons')
    .select('deal_id, kicked_by_user_id, reason_category, reason_detail')
    .eq('id', kickbackReasonId)
    .single();

  if (fetchError || !kickback) throw new Error('Kickback reason not found');

  // .select() so an RLS-filtered (0-row) update is detected instead of
  // silently succeeding — see migration 012.
  const { data: updatedRows, error } = await supabase
    .from('kickback_reasons')
    .update({
      response_text: responseText.trim(),
      responded_by: user.id,
      responded_at: now,
      is_resolved: true,
      resolved_at: now,
    })
    .eq('id', kickbackReasonId)
    .select('id');

  if (error) throw new Error(error.message);
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('Failed to save kickback response — no rows updated');
  }

  await logAuditEvent({
    dealId: kickback.deal_id,
    userId: user.id,
    actionType: 'kickback_responded',
    description: `Kickback response: ${responseText.trim().slice(0, 100)}`,
    metadata: {
      kickback_reason_id: kickbackReasonId,
      reason_category: kickback.reason_category,
    },
  });

  revalidatePath(`/dashboard/deals/${kickback.deal_id}`);
  revalidatePath('/dashboard/deals');
}
