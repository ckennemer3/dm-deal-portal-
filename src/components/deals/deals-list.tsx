'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserWithRelations, DealType } from '@/lib/types';
import { DEAL_STATUS_CONFIG, DEAL_TYPE_LABELS, ACTIVE_DEAL_STATUSES, AWAITING_ACTION_STATUSES } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatRelativeTime, formatDealAge, toTitleCase, isDealUnread } from '@/lib/utils';
import { canSubmitDeals } from '@/lib/permissions';

interface DealsListProps {
  deals: any[];
  user: UserWithRelations;
  dealViews?: Record<string, string>;
  initialStatusFilter?: string;
  initialDeliveredMonth?: string;
}

/** Resolve named filter shortcuts to comma-separated status strings */
function resolveStatusFilter(filter: string): string {
  if (filter === 'active') return ACTIVE_DEAL_STATUSES.join(',');
  if (filter === 'awaiting') return AWAITING_ACTION_STATUSES.join(',');
  return filter;
}

/** Get a human-readable label for the active filter pill */
function getFilterLabel(statusFilter: string, deliveredMonth: string, originalFilter: string): string {
  if (deliveredMonth === 'current') return 'Delivered This Month';
  if (originalFilter === 'active') return 'Active Deals';
  if (originalFilter === 'awaiting') return 'Awaiting Action';
  const count = statusFilter.split(',').length;
  return `${count} statuses selected`;
}

export function DealsList({
  deals,
  user,
  dealViews = {},
  initialStatusFilter = '',
  initialDeliveredMonth = '',
}: Readonly<DealsListProps>) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(resolveStatusFilter(initialStatusFilter));
  const [typeFilter, setTypeFilter] = useState('');
  const [deliveredMonthFilter, setDeliveredMonthFilter] = useState(initialDeliveredMonth);
  // Track the original named filter for labeling
  const [originalFilter] = useState(initialStatusFilter);

  const statusOptions = Object.entries(DEAL_STATUS_CONFIG).map(([value, { label }]) => ({ value, label }));
  const typeOptions = Object.entries(DEAL_TYPE_LABELS).map(([value, label]) => ({ value, label }));

  const isMultiStatusFilter = statusFilter.includes(',');
  const hasSpecialFilter = isMultiStatusFilter || deliveredMonthFilter;

  const clearFilters = () => {
    setStatusFilter('');
    setDeliveredMonthFilter('');
    router.push('/dashboard/deals');
  };

  const filtered = deals.filter((deal: any) => {
    const app = deal.applicants?.find((a: any) => a.applicant_number === 1);
    const clientName = app ? `${app.first_name} ${app.last_name}` : '';
    const matchesSearch = !search ||
      deal.deal_number.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase()) ||
      `${deal.vehicle_year} ${deal.vehicle_make} ${deal.vehicle_model}`.toLowerCase().includes(search.toLowerCase());

    let matchesStatus = true;
    if (statusFilter) {
      const statuses = statusFilter.split(',');
      matchesStatus = statuses.includes(deal.status);
    }

    const matchesType = !typeFilter || deal.deal_type === typeFilter;

    let matchesDeliveredMonth = true;
    if (deliveredMonthFilter === 'current') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      matchesDeliveredMonth = new Date(deal.updated_at) >= startOfMonth;
    }

    return matchesSearch && matchesStatus && matchesType && matchesDeliveredMonth;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Deals</h1>
          <p className="text-surface-500 mt-1 text-sm">
            {filtered.length === deals.length
              ? `${deals.length} total deals`
              : `Showing ${filtered.length} of ${deals.length} deals`}
          </p>
        </div>
        {canSubmitDeals(user.role) && (
          <Link href="/dashboard/deals/new">
            <Button>Submit New Deal</Button>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Input placeholder="Search deals..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />

        {hasSpecialFilter ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-sm font-medium border border-brand-200">
            {getFilterLabel(statusFilter, deliveredMonthFilter, originalFilter)}
            <button
              onClick={clearFilters}
              className="ml-1 hover:text-brand-900 transition-colors"
              aria-label="Clear filter"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ) : (
          <Select
            options={[{ value: '', label: 'All Statuses' }, ...statusOptions]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="max-w-[220px]"
          />
        )}

        <Select options={[{ value: '', label: 'All Types' }, ...typeOptions]} value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)} className="max-w-[200px]" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No deals found" description="Try adjusting your search or filters." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-800">
                  <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Deal #</th>
                  <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Vehicle</th>
                  <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Age</th>
                  <th className="text-left text-xs font-semibold text-white/80 uppercase tracking-wider px-6 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {filtered.map((deal: any) => {
                  const app = deal.applicants?.find((a: any) => a.applicant_number === 1);
                  const clientName = app ? toTitleCase(`${app.first_name} ${app.last_name}`) : 'Unknown';
                  const unread = isDealUnread(deal, dealViews);
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                      className={`hover:bg-surface-50 transition-colors cursor-pointer ${
                        unread ? 'border-l-4 border-l-brand-400 bg-brand-50/50' : ''
                      }`}
                    >
                      <td className="px-6 py-3 text-sm font-medium text-brand-600">
                        {deal.deal_number}
                        {unread && (
                          <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-brand-500" />
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-surface-900">{clientName}</td>
                      <td className="px-6 py-3 text-sm text-surface-600">
                        {deal.vehicle_year} {toTitleCase(deal.vehicle_make)} {toTitleCase(deal.vehicle_model)} {toTitleCase(deal.vehicle_trim)}
                      </td>
                      <td className="px-6 py-3 text-sm text-surface-600">{DEAL_TYPE_LABELS[deal.deal_type as DealType]}</td>
                      <td className="px-6 py-3"><StatusBadge status={deal.status} /></td>
                      <td className="px-6 py-3 text-sm text-surface-600">{formatDealAge(deal.created_at)}</td>
                      <td className="px-6 py-3 text-sm text-surface-400">{formatRelativeTime(deal.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
