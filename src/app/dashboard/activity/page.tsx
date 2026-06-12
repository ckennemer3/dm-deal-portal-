import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/badge';
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_COLORS } from '@/lib/constants';
import { formatTimestamp, getFullName } from '@/lib/utils';
import type { UserRole, AuditActionType, DealStatus } from '@/lib/types';

/** Maximum number of activity entries shown on the feed */
const ACTIVITY_LIMIT = 75;

interface ActivityDeal {
  id: string;
  deal_number: string;
  status: DealStatus;
  submitted_by: string;
}

interface ActivityRow {
  id: string;
  deal_id: string;
  user_id: string;
  action_type: AuditActionType;
  description: string;
  created_at: string;
  deal: ActivityDeal | null;
}

/**
 * Recent Activity page — chronological feed of audit log entries across all
 * deals visible to the current user. Visibility is enforced by RLS (audit_log
 * inherits deal visibility); agents are additionally scoped to their own deals
 * so the admin "View As" feature behaves consistently.
 */
export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect('/auth/login');

  const { data: userProfile } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single();

  if (!userProfile) redirect('/auth/login');

  // Read effective role from cookie (admin "View As" feature)
  const cookieStore = await cookies();
  const viewAsRole = cookieStore.get('viewAsRole')?.value as UserRole | undefined;
  const effectiveRole: UserRole = (userProfile.role === 'administrator' && viewAsRole)
    ? viewAsRole
    : userProfile.role as UserRole;

  // Fetch recent audit entries with their deal (inner join so deal filters apply)
  let activityQuery = supabase
    .from('audit_log')
    .select('id, deal_id, user_id, action_type, description, created_at, deal:deals!inner(id, deal_number, status, submitted_by)')
    .order('created_at', { ascending: false })
    .limit(ACTIVITY_LIMIT);

  if (effectiveRole === 'agent') {
    activityQuery = activityQuery.eq('deal.submitted_by', authUser.id);
  }

  const { data: entries, error } = await activityQuery;

  if (error) {
    console.error('Activity feed query error:', error.message);
  }

  const activityEntries = (entries ?? []) as unknown as ActivityRow[];

  // Batch-fetch all referenced users to avoid N+1 queries
  const actorIds = Array.from(new Set(activityEntries.map((e) => e.user_id).filter(Boolean)));
  const { data: actors } = actorIds.length > 0
    ? await supabase.from('users').select('id, first_name, last_name').in('id', actorIds)
    : { data: [] };

  const actorsMap = Object.fromEntries((actors ?? []).map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Recent Activity</h1>
        <p className="text-sm text-surface-500 mt-1">
          The latest actions across deals you can see — newest first.
        </p>
      </div>

      <Card padding="none" className="overflow-hidden">
        {activityEntries.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Actions on deals — uploads, status changes, messages, and more — will show up here."
          />
        ) : (
          <div className="divide-y divide-surface-100">
            {activityEntries.map((entry) => {
              const actor = actorsMap[entry.user_id];
              const actorName = actor ? getFullName(actor.first_name, actor.last_name) : 'System';
              const actionLabel = AUDIT_ACTION_LABELS[entry.action_type] || entry.action_type;
              const dotColor = AUDIT_ACTION_COLORS[entry.action_type] || 'bg-surface-400';

              return (
                <Link
                  key={entry.id}
                  href={`/dashboard/deals/${entry.deal_id}`}
                  className="flex items-start gap-3 p-4 hover:bg-surface-50 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${dotColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium text-surface-900">{actorName}</span>
                      <span className="text-sm text-surface-500">{actionLabel}</span>
                      {entry.deal && (
                        <span className="text-sm font-medium text-brand-600">{entry.deal.deal_number}</span>
                      )}
                    </div>
                    <p className="text-sm text-surface-600 truncate">{entry.description}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{formatTimestamp(entry.created_at)}</p>
                  </div>
                  {entry.deal && (
                    <div className="hidden sm:block flex-shrink-0">
                      <StatusBadge status={entry.deal.status} />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
