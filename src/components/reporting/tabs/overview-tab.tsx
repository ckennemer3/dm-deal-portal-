'use client';

import { useMemo } from 'react';
import { KPICard } from '../charts/kpi-card';
import { Card, CardHeader } from '@/components/ui/card';
import { DEAL_STATUS_CONFIG, DEAL_TYPE_LABELS, PIPELINE_AGE_BUCKETS } from '@/lib/constants';
import { DealStatus, DealType } from '@/lib/types';
import { getFullName } from '@/lib/utils';
import type { OverviewKPIs } from '@/lib/reporting-queries';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const CHART_COLORS = ['#1A569B', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

interface OverviewTabProps {
  data: {
    overviewKPIs: OverviewKPIs;
    deals: any[];
    statusHistory: any[];
    users: any[];
    offices: any[];
    teams: any[];
  };
}

/**
 * Overview tab: KPI cards, deals by status/type/office, pipeline aging, top agents/managers.
 */
export function OverviewTab({ data }: OverviewTabProps) {
  const { overviewKPIs: kpis, deals, users, offices } = data;

  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    deals.forEach((d: any) => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return Object.entries(counts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([status, count]) => ({
        name: DEAL_STATUS_CONFIG[status as DealStatus]?.label || status,
        value: count,
      }));
  }, [deals]);

  const typeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    deals.forEach((d: any) => { counts[d.deal_type] = (counts[d.deal_type] || 0) + 1; });
    return Object.entries(counts).map(([type, count]) => ({
      name: DEAL_TYPE_LABELS[type as DealType] || type,
      value: count,
    }));
  }, [deals]);

  const officeChartData = useMemo(() => {
    const officeMap = new Map(offices.map((o: any) => [o.id, o.name]));
    const userOfficeMap = new Map(users.map((u: any) => [u.id, u.primary_office_id]));
    const counts: Record<string, number> = {};
    deals.forEach((d: any) => {
      const officeId = d.submitter?.primary_office_id || userOfficeMap.get(d.submitted_by);
      const name = officeMap.get(officeId) || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [deals, offices, users]);

  const pipelineAging = useMemo(() => {
    const activePipeline = deals.filter((d: any) =>
      !['signed_and_delivered', 'cancelled'].includes(d.status)
    );
    return PIPELINE_AGE_BUCKETS.map((bucket, idx) => {
      const prevMax = idx > 0 ? PIPELINE_AGE_BUCKETS[idx - 1].maxHours : 0;
      const count = activePipeline.filter((d: any) => {
        const ageHours = (Date.now() - new Date(d.created_at).getTime()) / 3600000;
        return ageHours >= prevMax && ageHours < bucket.maxHours;
      }).length;
      return { label: bucket.label, count };
    });
  }, [deals]);

  const topAgents = useMemo(() => {
    const agentMap: Record<string, { name: string; count: number }> = {};
    deals.forEach((d: any) => {
      const id = d.submitted_by;
      if (!agentMap[id]) {
        agentMap[id] = {
          name: d.submitter ? getFullName(d.submitter.first_name, d.submitter.last_name) : 'Unknown',
          count: 0,
        };
      }
      agentMap[id].count++;
    });
    return Object.values(agentMap).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [deals]);

  const topManagers = useMemo(() => {
    const userMap = new Map(users.map((u: any) => [u.id, getFullName(u.first_name, u.last_name)]));
    const mgrMap: Record<string, { name: string; count: number }> = {};
    deals.forEach((d: any) => {
      const id = d.assigned_manager;
      if (!id) return;
      if (!mgrMap[id]) {
        mgrMap[id] = { name: userMap.get(id) || 'Unknown', count: 0 };
      }
      mgrMap[id].count++;
    });
    return Object.values(mgrMap).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [deals, users]);

  const activeCount = kpis.activePipeline;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard label="Total Deals" value={kpis.totalDeals} />
        <KPICard label="Active Pipeline" value={kpis.activePipeline} />
        <KPICard label="Completed" value={kpis.completed} />
        <KPICard
          label="Avg Days to Complete"
          value={kpis.avgDaysToCompletion !== null ? `${kpis.avgDaysToCompletion}d` : '\u2014'}
        />
        <KPICard
          label="1st-Time Approval"
          value={kpis.firstTimeApprovalRate !== null ? `${kpis.firstTimeApprovalRate}%` : '\u2014'}
        />
        <KPICard label="Kickback Rate" value={`${kpis.kickbackRate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <CardHeader title="Deals by Status" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} layout="vertical" margin={{ left: 140 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#1A569B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md">
          <CardHeader title="Deals by Type" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry: any) => entry.name}>
                  {typeChartData.map((entry, i) => (
                    <Cell key={`type-cell-${entry.name}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md">
          <CardHeader title="Deals by Office" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={officeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md">
          <CardHeader title="Pipeline Aging" />
          <div className="mt-4 space-y-3">
            {pipelineAging.map((bucket) => (
              <div key={bucket.label} className="flex items-center justify-between">
                <span className="text-sm text-surface-700">{bucket.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-surface-100 rounded-full h-2">
                    <div
                      className="bg-brand-500 h-2 rounded-full"
                      style={{ width: `${activeCount > 0 ? (bucket.count / activeCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-surface-900 w-8 text-right">{bucket.count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <CardHeader title="Top Agents by Volume" />
          <div className="mt-4 space-y-2">
            {topAgents.length === 0 ? (
              <p className="text-sm text-surface-500">No data available.</p>
            ) : (
              topAgents.map((agent, i) => (
                <div key={`agent-${agent.name}`} className="flex items-center justify-between py-1.5">
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

        <Card padding="md">
          <CardHeader title="Top Managers by Volume" />
          <div className="mt-4 space-y-2">
            {topManagers.length === 0 ? (
              <p className="text-sm text-surface-500">No data available.</p>
            ) : (
              topManagers.map((mgr, i) => (
                <div key={`mgr-${mgr.name}`} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-surface-400 w-5">{i + 1}.</span>
                    <span className="text-sm text-surface-900">{mgr.name}</span>
                  </div>
                  <span className="text-sm font-medium text-surface-700">{mgr.count} deals</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
