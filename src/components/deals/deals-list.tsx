'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserWithRelations, DealStatus, DealType } from '@/lib/types';
import { DEAL_STATUS_CONFIG, DEAL_TYPE_LABELS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatRelativeTime, formatDealAge } from '@/lib/utils';
import { canSubmitDeals } from '@/lib/permissions';

interface DealsListProps {
  deals: any[];
  user: UserWithRelations;
}

export function DealsList({ deals, user }: DealsListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const statusOptions = Object.entries(DEAL_STATUS_CONFIG).map(([value, { label }]) => ({ value, label }));
  const typeOptions = Object.entries(DEAL_TYPE_LABELS).map(([value, label]) => ({ value, label }));

  const filtered = deals.filter((deal: any) => {
    const app = deal.applicants?.find((a: any) => a.applicant_number === 1);
    const clientName = app ? `${app.first_name} ${app.last_name}` : '';
    const matchesSearch = !search ||
      deal.deal_number.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase()) ||
      `${deal.vehicle_year} ${deal.vehicle_make} ${deal.vehicle_model}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || deal.status === statusFilter;
    const matchesType = !typeFilter || deal.deal_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Deals</h1>
          <p className="text-surface-500 mt-1 text-sm">{deals.length} total deals</p>
        </div>
        {canSubmitDeals(user.role) && (
          <Link href="/dashboard/deals/new">
            <Button>Submit New Deal</Button>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Input placeholder="Search deals..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select options={[{ value: '', label: 'All Statuses' }, ...statusOptions]} value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} className="max-w-[220px]" />
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
                  const clientName = app ? `${app.first_name} ${app.last_name}` : 'Unknown';
                  return (
                    <tr key={deal.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`/dashboard/deals/${deal.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                          {deal.deal_number}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-sm text-surface-900">{clientName}</td>
                      <td className="px-6 py-3 text-sm text-surface-600">
                        {deal.vehicle_year} {deal.vehicle_make} {deal.vehicle_model} {deal.vehicle_trim}
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
