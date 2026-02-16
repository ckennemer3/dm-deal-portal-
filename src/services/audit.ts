/**
 * Audit Service — Logs all deal actions to the unified audit_log table.
 *
 * Every post-submission action (status changes, document uploads, messages, etc.)
 * is recorded for compliance and operational visibility.
 *
 * Uses the user's Supabase client (RLS-scoped) for inserts.
 * The `last_activity_at` column on deals is updated automatically via DB trigger.
 */

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { AuditActionType } from '@/lib/types';

export interface AuditLogInput {
  dealId: string;
  userId: string;
  actionType: AuditActionType;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert a single audit log entry for a deal action.
 * Failures are logged but do not throw — audit logging should never block the primary action.
 */
export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('audit_log').insert({
      deal_id: input.dealId,
      user_id: input.userId,
      action_type: input.actionType,
      description: input.description,
      metadata: input.metadata ?? {},
    });

    if (error) {
      logger.error('Failed to insert audit log entry', new Error(error.message), {
        component: 'audit',
        dealId: input.dealId,
        actionType: input.actionType,
      });
    }
  } catch (err) {
    logger.error(
      'Unexpected error writing audit log',
      err instanceof Error ? err : new Error(String(err)),
      {
        component: 'audit',
        dealId: input.dealId,
        actionType: input.actionType,
      }
    );
  }
}

/**
 * Insert an in-app notification record for a specific user.
 * Supabase Realtime will broadcast the INSERT to subscribed clients.
 * Failures are logged but do not throw.
 */
export async function createInAppNotification(params: {
  userId: string;
  dealId: string;
  dealNumber: string;
  type: string;
  title: string;
  message: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      deal_id: params.dealId,
      deal_number: params.dealNumber,
      type: params.type,
      title: params.title,
      message: params.message,
    });

    if (error) {
      logger.error('Failed to insert notification', new Error(error.message), {
        component: 'notifications',
        userId: params.userId,
        dealId: params.dealId,
      });
    }
  } catch (err) {
    logger.error(
      'Unexpected error creating notification',
      err instanceof Error ? err : new Error(String(err)),
      {
        component: 'notifications',
        userId: params.userId,
        dealId: params.dealId,
      }
    );
  }
}

/**
 * Notify all participants on a deal (submitter, manager, underwriter)
 * except the user who triggered the action.
 */
export async function notifyDealParticipants(params: {
  dealId: string;
  excludeUserId: string;
  type: string;
  title: string;
  message: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: deal } = await supabase
      .from('deals')
      .select('deal_number, submitted_by, assigned_manager, assigned_underwriter')
      .eq('id', params.dealId)
      .single();

    if (!deal) return;

    const participantIds = new Set<string>();
    if (deal.submitted_by) participantIds.add(deal.submitted_by);
    if (deal.assigned_manager) participantIds.add(deal.assigned_manager);
    if (deal.assigned_underwriter) participantIds.add(deal.assigned_underwriter);
    participantIds.delete(params.excludeUserId);

    const notifications = Array.from(participantIds).map((userId) => ({
      user_id: userId,
      deal_id: params.dealId,
      deal_number: deal.deal_number,
      type: params.type,
      title: params.title,
      message: params.message,
    }));

    if (notifications.length > 0) {
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) {
        logger.error('Failed to insert participant notifications', new Error(error.message), {
          component: 'notifications',
          dealId: params.dealId,
        });
      }
    }
  } catch (err) {
    logger.error(
      'Unexpected error notifying deal participants',
      err instanceof Error ? err : new Error(String(err)),
      {
        component: 'notifications',
        dealId: params.dealId,
      }
    );
  }
}
