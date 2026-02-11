'use client';

import Link from 'next/link';
import { DealStatus, DealType } from '@/lib/types';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  formatCurrency,
  formatDealAge,
  calculateLTV,
  formatPercentage,
  getLTVColor,
} from '@/lib/utils';

interface SubmittedDealsQueueProps {
  deals: any[];
}

function getFinancingAmount(deal: any): number | null {
  if (deal.deal_type === 'lease' || deal.deal_type === 're_lease') {
    return deal.net_cap_cost;
  }
  return deal.total_amount_financed;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
}

export function SubmittedDealsQueue({ deals }: SubmittedDealsQueueProps) {
  if (deals.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-surface-900 mb-4">Submitted Deals</h2>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-800">
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Client</th>
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Vehicle</th>
                <th className="text-right text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Credit</th>
                <th className="text-right text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Payment</th>
                <th className="text-right text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Retail LTV</th>
                <th className="text-right text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Wholesale LTV</th>
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {deals.map((deal: any) => {
                const primaryApplicant = deal.applicants?.find(
                  (a: any) => a.applicant_number === 1
                );
                const clientName = primaryApplicant
                  ? `${primaryApplicant.first_name} ${primaryApplicant.last_name}`
                  : '—';
                const creditScore = primaryApplicant?.experian_score ?? null;

                const financingAmount = getFinancingAmount(deal);
                const retailLTV = calculateLTV(financingAmount, deal.jd_power_retail);
                const wholesaleLTV = calculateLTV(financingAmount, deal.jd_power_wholesale);

                return (
                  <tr key={deal.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-surface-600 whitespace-nowrap">
                      <Link href={`/dashboard/deals/${deal.id}`} className="hover:text-brand-600">
                        {formatShortDate(deal.created_at)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-surface-900 whitespace-nowrap">
                      <Link href={`/dashboard/deals/${deal.id}`} className="hover:text-brand-600">
                        {clientName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-600 whitespace-nowrap">
                      {deal.vehicle_year} {deal.vehicle_make} {deal.vehicle_model}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-900 font-medium text-right tabular-nums">
                      {creditScore ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-900 font-medium text-right tabular-nums whitespace-nowrap">
                      {formatCurrency(deal.monthly_payment)}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium text-right tabular-nums ${getLTVColor(retailLTV)}`}>
                      {formatPercentage(retailLTV)}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium text-right tabular-nums ${getLTVColor(wholesaleLTV)}`}>
                      {formatPercentage(wholesaleLTV)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={deal.status as DealStatus} />
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-500 whitespace-nowrap">
                      {formatDealAge(deal.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
