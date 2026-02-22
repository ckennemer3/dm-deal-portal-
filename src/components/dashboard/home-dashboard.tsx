'use client';

import Link from 'next/link';
import { UserWithRelations, DealStatus } from '@/lib/types';
import { PORTAL_MODULES, DEAL_STATUS_CONFIG, DEAL_TYPE_LABELS } from '@/lib/constants';
import { Card, CardHeader } from '@/components/ui/card';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatRelativeTime } from '@/lib/utils';
import { canSubmitDeals } from '@/lib/permissions';

interface HomeDashboardProps {
  user: UserWithRelations;
  recentDeals: any[];
  actionMessages: any[];
}

export function HomeDashboard({ user, recentDeals, actionMessages }: HomeDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
          Welcome back, {user.first_name}
        </h1>
        <p className="text-surface-500 mt-1 text-sm">
          Here&apos;s what&apos;s happening with your deals today.
        </p>
      </div>

      {/* Module Cards */}
      {canSubmitDeals(user.role) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PORTAL_MODULES.map((module) => (
            <Link
              key={module.id}
              href={module.available ? module.href : '#'}
              className={!module.available ? 'pointer-events-none' : ''}
            >
              <Card hover={module.available} className={!module.available ? 'opacity-40' : ''}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${
                    module.available ? 'bg-brand-100' : 'bg-surface-100'
                  }`}>
                    <svg className={`w-5 h-5 ${module.available ? 'text-brand-600' : 'text-surface-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900 text-sm tracking-tight">{module.title}</h3>
                    <p className="text-xs text-surface-500 mt-1">{module.description}</p>
                    {!module.available && (
                      <Badge variant="default" className="mt-2">Coming Soon</Badge>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Items */}
        <div className="card overflow-hidden">
          <div className="px-6 py-3 bg-surface-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Action Items</h3>
              <span className="text-xs text-white/60">{actionMessages.length} pending</span>
            </div>
          </div>
          <div className="divide-y divide-surface-200">
            {actionMessages.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="All caught up"
                  description="No action items waiting on you right now."
                />
              </div>
            ) : (
              actionMessages.slice(0, 5).map((msg: any) => (
                <Link
                  key={msg.id}
                  href={`/dashboard/deals/${msg.deal?.id}`}
                  className="flex items-start gap-3 px-6 py-3 hover:bg-surface-50 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-status-danger mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 truncate">
                      {msg.deal?.deal_number} — Response Requested
                    </p>
                    <p className="text-xs text-surface-500 truncate mt-0.5">
                      From {msg.sender?.first_name} {msg.sender?.last_name}: {msg.content}
                    </p>
                    <p className="text-xs text-surface-400 mt-0.5">
                      {formatRelativeTime(msg.created_at)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Deals */}
        <div className="card overflow-hidden">
          <div className="px-6 py-3 bg-surface-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Recent Deals</h3>
              <Link href="/dashboard/deals" className="text-xs text-white/60 hover:text-white transition-colors">
                View all →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-surface-200">
            {recentDeals.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No deals yet"
                  description="Deals you submit or manage will appear here."
                />
              </div>
            ) : (
              recentDeals.slice(0, 8).map((deal: any) => {
                const primaryApplicant = deal.applicants?.find((a: any) => a.applicant_number === 1);
                const clientName = primaryApplicant
                  ? `${primaryApplicant.first_name} ${primaryApplicant.last_name}`
                  : 'Unknown';

                return (
                  <Link
                    key={deal.id}
                    href={`/dashboard/deals/${deal.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-surface-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-surface-900">{deal.deal_number}</span>
                        <StatusBadge status={deal.status} />
                      </div>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {clientName} &mdash; {deal.vehicle_year} {deal.vehicle_make} {deal.vehicle_model}
                      </p>
                    </div>
                    <span className="text-xs text-surface-400 flex-shrink-0 ml-4">
                      {formatRelativeTime(deal.created_at)}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
