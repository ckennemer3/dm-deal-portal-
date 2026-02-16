'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DealStatus } from '@/lib/types';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DEAL_STATUS_CONFIG } from '@/lib/constants';
import {
  formatCurrency,
  formatDealAge,
  calculateLTV,
  formatPercentage,
  getLTVColor,
  toTitleCase,
} from '@/lib/utils';
import { claimDeal } from '@/app/dashboard/deals/[id]/actions';

interface UnderwriterDashboardProps {
  unassignedDeals: any[];
  myDeals: any[];
  dealViews: Record<string, string>;  // dealId -> last_viewed_at
}

function getFinancingAmount(deal: any): number | null {
  if (deal.deal_type === 'lease' || deal.deal_type === 're_lease') {
    return deal.net_cap_cost;
  }
  return deal.total_amount_financed;
}

function getRetailDenominator(deal: any): number | null {
  return deal.vehicle_condition === 'used' ? deal.jd_power_retail : deal.msrp;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
}

export function UnderwriterDashboard({ unassignedDeals, myDeals, dealViews }: UnderwriterDashboardProps) {
  const router = useRouter();
  const [claimingDealId, setClaimingDealId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  async function handleClaim(e: React.MouseEvent, dealId: string) {
    e.stopPropagation();
    setClaimingDealId(dealId);
    setClaimError(null);
    try {
      await claimDeal(dealId);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.startsWith('CLAIM_CONFLICT:')) {
        const uwName = msg.replace('CLAIM_CONFLICT:', '');
        setClaimError(`This deal was just claimed by ${uwName}. Refreshing...`);
        setTimeout(() => {
          setClaimError(null);
          router.refresh();
        }, 3000);
      } else {
        setClaimError('Failed to claim deal. Please try again.');
      }
    } finally {
      setClaimingDealId(null);
    }
  }

  function isUnread(deal: any): boolean {
    const viewedAt = dealViews[deal.id];
    if (!viewedAt) return true;
    const lastActivity = deal.last_activity_at || deal.updated_at;
    return new Date(lastActivity) > new Date(viewedAt);
  }

  return (
    <div className="space-y-8">
      {/* Claim Conflict Toast */}
      {claimError && (
        <div className="fixed bottom-4 right-4 z-50 bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg shadow-lg max-w-sm animate-slide-up">
          <p className="text-sm font-medium">{claimError}</p>
        </div>
      )}

      {/* Unassigned Queue */}
      <div>
        <h2 className="text-lg font-semibold text-surface-900 mb-4">
          Unassigned Deals
          {unassignedDeals.length > 0 && (
            <span className="ml-2 text-sm font-normal text-surface-500">
              ({unassignedDeals.length} waiting)
            </span>
          )}
        </h2>
        {unassignedDeals.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-surface-500">No unassigned deals in the queue.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-800">
                    <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Deal #</th>
                    <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Client</th>
                    <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Type</th>
                    <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Vehicle</th>
                    <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Manager</th>
                    <th className="text-center text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Credit</th>
                    <th className="text-center text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Retail LTV</th>
                    <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Time in Queue</th>
                    <th className="text-center text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3 w-[100px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {unassignedDeals.map((deal: any) => {
                    const primaryApplicant = deal.applicants?.find((a: any) => a.applicant_number === 1);
                    const clientName = primaryApplicant
                      ? toTitleCase(`${primaryApplicant.first_name} ${primaryApplicant.last_name}`)
                      : '—';
                    const creditScore = primaryApplicant?.experian_score ?? null;
                    const financingAmount = getFinancingAmount(deal);
                    const retailLTV = calculateLTV(financingAmount, getRetailDenominator(deal));
                    const manager = deal.manager_user;
                    const managerName = manager
                      ? toTitleCase(`${manager.first_name} ${manager.last_name}`)
                      : '—';

                    return (
                      <tr
                        key={deal.id}
                        onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                        className="hover:bg-surface-50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-brand-600 whitespace-nowrap">
                          {deal.deal_number}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-surface-900 whitespace-nowrap">
                          {clientName}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-600 whitespace-nowrap capitalize">
                          {deal.deal_type?.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-600 whitespace-nowrap">
                          {deal.vehicle_year} {toTitleCase(deal.vehicle_make)} {toTitleCase(deal.vehicle_model)}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-600 whitespace-nowrap">
                          {managerName}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-900 font-medium text-center tabular-nums">
                          {creditScore ?? '—'}
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium text-center tabular-nums ${getLTVColor(retailLTV)}`}>
                          {formatPercentage(retailLTV)}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-500 whitespace-nowrap">
                          {formatDealAge(deal.created_at)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            onClick={(e) => handleClaim(e, deal.id)}
                            loading={claimingDealId === deal.id}
                            disabled={!!claimingDealId}
                          >
                            Claim
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* My Deals */}
      <div>
        <h2 className="text-lg font-semibold text-surface-900 mb-4">
          My Deals
          {myDeals.length > 0 && (
            <span className="ml-2 text-sm font-normal text-surface-500">
              ({myDeals.length})
            </span>
          )}
        </h2>
        {myDeals.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-surface-500">You have no active deals. Claim one from the queue above.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-800">
                    <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Deal #</th>
                    <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Client</th>
                    <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Vehicle</th>
                    <th className="text-center text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Credit</th>
                    <th className="text-center text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Payment</th>
                    <th className="text-center text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Retail LTV</th>
                    <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Deal Age</th>
                    <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {myDeals.map((deal: any) => {
                    const primaryApplicant = deal.applicants?.find((a: any) => a.applicant_number === 1);
                    const clientName = primaryApplicant
                      ? toTitleCase(`${primaryApplicant.first_name} ${primaryApplicant.last_name}`)
                      : '—';
                    const creditScore = primaryApplicant?.experian_score ?? null;
                    const financingAmount = getFinancingAmount(deal);
                    const retailLTV = calculateLTV(financingAmount, getRetailDenominator(deal));
                    const unread = isUnread(deal);

                    return (
                      <tr
                        key={deal.id}
                        onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                        className={`hover:bg-surface-50 transition-colors cursor-pointer ${
                          unread ? 'border-l-4 border-l-brand-400 bg-brand-50/50' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-brand-600 whitespace-nowrap">
                          {deal.deal_number}
                          {unread && (
                            <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-brand-500" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-surface-900 whitespace-nowrap">
                          {clientName}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-600 whitespace-nowrap">
                          {deal.vehicle_year} {toTitleCase(deal.vehicle_make)} {toTitleCase(deal.vehicle_model)}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-900 font-medium text-center tabular-nums">
                          {creditScore ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-900 font-medium text-center tabular-nums whitespace-nowrap">
                          {formatCurrency(deal.monthly_payment)}
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium text-center tabular-nums ${getLTVColor(retailLTV)}`}>
                          {formatPercentage(retailLTV)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={deal.status as DealStatus} />
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-surface-900 whitespace-nowrap">
                          {formatDealAge(deal.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-500 whitespace-nowrap">
                          {formatDealAge(deal.last_activity_at || deal.updated_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
