'use client';

import { useRouter } from 'next/navigation';
import { DealStatus, DealType, UserRole } from '@/lib/types';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  formatCurrency,
  formatDealAge,
  calculateLTV,
  formatPercentage,
  getLTVColor,
  toTitleCase,
} from '@/lib/utils';

interface SubmittedDealsQueueProps {
  deals: any[];
  viewerRole: UserRole;
}

function getFinancingAmount(deal: any): number | null {
  if (deal.deal_type === 'lease' || deal.deal_type === 're_lease') {
    return deal.net_cap_cost;
  }
  return deal.total_amount_financed;
}

function isUsedVehicle(deal: any): boolean {
  return deal.vehicle_condition === 'used';
}

function getRetailDenominator(deal: any): number | null {
  // Used vehicles → JD Power Retail; New/demo → MSRP
  return isUsedVehicle(deal) ? deal.jd_power_retail : deal.msrp;
}

function getWholesaleDenominator(deal: any): number | null {
  // Used vehicles → JD Power Wholesale; New/demo → Invoice
  return isUsedVehicle(deal) ? deal.jd_power_wholesale : deal.invoice;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
}

export function SubmittedDealsQueue({ deals, viewerRole }: SubmittedDealsQueueProps) {
  // Managers see the underwriter name; underwriters see the manager name
  const showPersonColumn = viewerRole === 'manager' || viewerRole === 'underwriter' || viewerRole === 'executive' || viewerRole === 'administrator';
  const personColumnLabel = viewerRole === 'underwriter' ? 'Manager' : 'Underwriter';
  const router = useRouter();

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
                <th className="text-center text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3 w-[100px]">Credit</th>
                <th className="text-center text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3 w-[100px]">Payment</th>
                <th className="text-center text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3 w-[110px]">Retail LTV</th>
                <th className="text-center text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3 w-[120px]">Wholesale LTV</th>
                {showPersonColumn && (
                  <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-4 py-3">{personColumnLabel}</th>
                )}
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
                  ? toTitleCase(`${primaryApplicant.first_name} ${primaryApplicant.last_name}`)
                  : '—';
                const creditScore = primaryApplicant?.experian_score ?? null;

                const financingAmount = getFinancingAmount(deal);
                const retailLTV = calculateLTV(financingAmount, getRetailDenominator(deal));
                const wholesaleLTV = calculateLTV(financingAmount, getWholesaleDenominator(deal));

                return (
                  <tr
                    key={deal.id}
                    onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                    className="hover:bg-surface-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-surface-600 whitespace-nowrap">
                      {formatShortDate(deal.created_at)}
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
                    <td className={`px-4 py-3 text-sm font-medium text-center tabular-nums ${getLTVColor(wholesaleLTV)}`}>
                      {formatPercentage(wholesaleLTV)}
                    </td>
                    {showPersonColumn && (() => {
                      const person = viewerRole === 'underwriter'
                        ? deal.manager_user
                        : deal.underwriter_user;
                      const name = person
                        ? toTitleCase(`${person.first_name} ${person.last_name}`)
                        : '—';
                      return (
                        <td className="px-4 py-3 text-sm text-surface-600 whitespace-nowrap">
                          {name}
                        </td>
                      );
                    })()}
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
