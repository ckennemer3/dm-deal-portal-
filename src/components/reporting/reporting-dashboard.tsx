'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DEAL_TYPE_LABELS, DEAL_STATUS_CONFIG } from '@/lib/constants';
import { DealType, DealStatus, Office } from '@/lib/types';
import { formatCurrency, getFullName } from '@/lib/utils';

interface ReportingDashboardProps {
  deals: any[];
  offices: Office[];
  teams: any[];
  agents: any[];
}

export function ReportingDashboard({ deals, offices, teams, agents }: ReportingDashboardProps) {
  const [officeFilter, setOfficeFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredDeals = useMemo(() => {
    return deals.filter((deal: any) => {
      if (officeFilter) {
        const agentTeam = teams.find((t: any) => t.id === deal.submitter?.team_id);
        if (!agentTeam || agentTeam.office_id !== officeFilter) return false;
      }
      if (teamFilter && deal.submitter?.team_id !== teamFilter) return false;
      if (dateFrom && new Date(deal.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(deal.created_at) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [deals, officeFilter, teamFilter, dateFrom, dateTo, teams]);

  // Compute metrics
  const totalDeals = filteredDeals.length;
  const completedDeals = filteredDeals.filter((d: any) => d.status === 'signed_and_delivered').length;
  const cancelledDeals = filteredDeals.filter((d: any) => d.status === 'cancelled').length;
  const activeDeals = totalDeals - completedDeals - cancelledDeals;

  // Deal type breakdown
  const byType: Record<string, number> = {};
  filteredDeals.forEach((d: any) => {
    byType[d.deal_type] = (byType[d.deal_type] || 0) + 1;
  });

  // Status breakdown
  const byStatus: Record<string, number> = {};
  filteredDeals.forEach((d: any) => {
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
  });

  // Avg lifecycle (for completed deals)
  const completedWithHistory = filteredDeals.filter((d: any) => d.status === 'signed_and_delivered');
  let avgLifecycleHours = 0;
  if (completedWithHistory.length > 0) {
    const totalMs = completedWithHistory.reduce((sum: number, d: any) => {
      const created = new Date(d.created_at).getTime();
      const completed = d.status_history
        ?.filter((h: any) => h.to_status === 'signed_and_delivered')
        .sort((a: any, b: any) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0];
      if (completed) {
        return sum + (new Date(completed.changed_at).getTime() - created);
      }
      return sum;
    }, 0);
    avgLifecycleHours = totalMs / completedWithHistory.length / 3600000;
  }

  // Kickback metrics
  const dealsWithKickbacks = filteredDeals.filter((d: any) =>
    d.status_history?.some((h: any) => h.to_status === 'kicked_back_to_sales')
  );
  const kickbackRate = totalDeals > 0 ? (dealsWithKickbacks.length / totalDeals * 100) : 0;

  // Agent volume
  const agentVolume: Record<string, { name: string; count: number }> = {};
  filteredDeals.forEach((d: any) => {
    const id = d.submitted_by;
    if (!agentVolume[id]) {
      agentVolume[id] = {
        name: d.submitter ? getFullName(d.submitter.first_name, d.submitter.last_name) : 'Unknown',
        count: 0,
      };
    }
    agentVolume[id].count++;
  });
  const topAgents = Object.values(agentVolume).sort((a, b) => b.count - a.count).slice(0, 10);

  const officeOptions = offices.map(o => ({ value: o.id, label: o.name }));
  const teamOptions = teams
    .filter((t: any) => !officeFilter || t.office_id === officeFilter)
    .map((t: any) => ({ value: t.id, label: `${t.name} (${t.office?.name || ''})` }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Reporting</h1>
        <p className="text-surface-500 mt-1 text-sm">Deal performance metrics and analytics.</p>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4 flex-wrap">
        <Select
          label="Office"
          options={[{ value: '', label: 'All Offices' }, ...officeOptions]}
          value={officeFilter}
          onChange={(e) => { setOfficeFilter(e.target.value); setTeamFilter(''); }}
          className="max-w-[200px]"
        />
        <Select
          label="Team"
          options={[{ value: '', label: 'All Teams' }, ...teamOptions]}
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="max-w-[250px]"
        />
        <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="max-w-[180px]" />
        <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="max-w-[180px]" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="md">
          <p className="text-sm text-surface-500">Total Deals</p>
          <p className="text-3xl font-bold text-surface-900 mt-1">{totalDeals}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-surface-500">Active</p>
          <p className="text-3xl font-bold text-brand-600 mt-1">{activeDeals}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-surface-500">Completed</p>
          <p className="text-3xl font-bold text-status-success mt-1">{completedDeals}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-surface-500">Kickback Rate</p>
          <p className="text-3xl font-bold text-status-warning mt-1">{kickbackRate.toFixed(1)}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type */}
        <Card padding="md">
          <CardHeader title="Deals by Type" />
          <div className="mt-4 space-y-3">
            {Object.entries(byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-surface-700">{DEAL_TYPE_LABELS[type as DealType] || type}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-surface-100 rounded-full h-2">
                    <div
                      className="bg-brand-500 h-2 rounded-full"
                      style={{ width: `${totalDeals > 0 ? (count / totalDeals) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-surface-900 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* By Status */}
        <Card padding="md">
          <CardHeader title="Deals by Status" />
          <div className="mt-4 space-y-2">
            {Object.entries(byStatus).sort(([, a], [, b]) => b - a).map(([status, count]) => {
              const config = DEAL_STATUS_CONFIG[status as DealStatus];
              return (
                <div key={status} className="flex items-center justify-between py-1">
                  <Badge className={`${config?.bgColor} ${config?.color}`}>{config?.label || status}</Badge>
                  <span className="text-sm font-medium text-surface-900">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Response Time */}
        <Card padding="md">
          <CardHeader title="Performance Metrics" />
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="text-sm text-surface-600">Avg Lifecycle (Completed)</span>
              <span className="text-sm font-semibold text-surface-900">
                {avgLifecycleHours > 0 ? `${avgLifecycleHours.toFixed(1)}h` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="text-sm text-surface-600">Deals with Kickbacks</span>
              <span className="text-sm font-semibold text-surface-900">{dealsWithKickbacks.length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-surface-600">Cancelled</span>
              <span className="text-sm font-semibold text-surface-900">{cancelledDeals}</span>
            </div>
          </div>
        </Card>

        {/* Top Agents */}
        <Card padding="md">
          <CardHeader title="Top Agents by Volume" />
          <div className="mt-4 space-y-2">
            {topAgents.length === 0 ? (
              <p className="text-sm text-surface-500">No data available.</p>
            ) : (
              topAgents.map((agent, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-surface-400 w-5">{i + 1}.</span>
                    <span className="text-sm text-surface-900">{agent.name}</span>
                  </div>
                  <span className="text-sm font-medium text-surface-700">{agent.count} deals</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
