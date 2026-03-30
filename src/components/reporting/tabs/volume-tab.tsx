'use client';

import { useMemo } from 'react';
import { KPICard } from '../charts/kpi-card';
import { Card, CardHeader } from '@/components/ui/card';
import { UserRole } from '@/lib/types';
import { canViewUWInternals } from '@/lib/permissions';
import type { MonthlyVolume, VolumeByEntity } from '@/lib/reporting-queries';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface VolumeTabProps {
  data: {
    monthlyVolume: MonthlyVolume[];
    volumeByOffice: VolumeByEntity[];
    volumeByManager: VolumeByEntity[];
    volumeByUnderwriter: VolumeByEntity[];
    deals: any[];
    users: any[];
  };
  effectiveRole: UserRole;
}

/**
 * Volume & Throughput tab: KPIs, monthly chart, volume by office/manager/UW,
 * throughput table, capacity planning.
 */
export function VolumeTab({ data, effectiveRole }: Readonly<VolumeTabProps>) {
  const { monthlyVolume, volumeByOffice, volumeByManager, volumeByUnderwriter, deals } = data;
  const showUW = canViewUWInternals(effectiveRole);

  const totalSubmissions = deals.length;
  const totalCompleted = deals.filter((d: any) => d.status === 'signed_and_delivered').length;
  const activePipeline = deals.filter((d: any) => !['signed_and_delivered', 'cancelled'].includes(d.status)).length;
  const completionRate = totalSubmissions > 0 ? +((totalCompleted / totalSubmissions) * 100).toFixed(1) : 0;

  // Throughput table from monthly data
  const throughput = useMemo(() => {
    return monthlyVolume.map((mv) => {
      const netChange = mv.submissions - mv.completions;
      return {
        ...mv,
        netChange,
      };
    });
  }, [monthlyVolume]);

  // Capacity: avg deals per manager/UW per week (last 30 days)
  const capacity = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentDeals = deals.filter((d: any) => new Date(d.created_at) >= thirtyDaysAgo);

    const mgrCounts: Record<string, number> = {};
    const uwCounts: Record<string, number> = {};
    recentDeals.forEach((d: any) => {
      if (d.assigned_manager) mgrCounts[d.assigned_manager] = (mgrCounts[d.assigned_manager] || 0) + 1;
      if (d.assigned_underwriter) uwCounts[d.assigned_underwriter] = (uwCounts[d.assigned_underwriter] || 0) + 1;
    });

    const mgrValues = Object.values(mgrCounts);
    const uwValues = Object.values(uwCounts);
    const weeks = 30 / 7;

    return {
      avgDealsPerMgrPerWeek: mgrValues.length > 0
        ? +(mgrValues.reduce((s, v) => s + v, 0) / mgrValues.length / weeks).toFixed(1)
        : 0,
      avgDealsPerUWPerWeek: uwValues.length > 0
        ? +(uwValues.reduce((s, v) => s + v, 0) / uwValues.length / weeks).toFixed(1)
        : 0,
      mgrCount: mgrValues.length,
      uwCount: uwValues.length,
    };
  }, [deals]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard label="Total Submissions" value={totalSubmissions} />
        <KPICard label="Completed" value={totalCompleted} />
        <KPICard label="Completion Rate" value={`${completionRate}%`} />
        <KPICard label="Active Pipeline" value={activePipeline} />
        <KPICard
          label="Avg/Mgr/Week"
          value={capacity.avgDealsPerMgrPerWeek}
          subtitle={`${capacity.mgrCount} managers (30d)`}
        />
      </div>

      {/* Monthly Chart */}
      <Card padding="md">
        <CardHeader title="Monthly Submissions & Completions" />
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyVolume}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="submissions" fill="#1A569B" radius={[4, 4, 0, 0]} name="Submissions" />
              <Bar dataKey="completions" fill="#10B981" radius={[4, 4, 0, 0]} name="Completions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume by Office */}
        <Card padding="md">
          <CardHeader title="Volume by Office" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeByOffice} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Volume by Manager */}
        <Card padding="md">
          <CardHeader title="Volume by Manager" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeByManager.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Volume by Underwriter (exec/admin only) */}
      {showUW && (
        <Card padding="md">
          <CardHeader title="Volume by Underwriter" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeByUnderwriter.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#F59E0B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Throughput Table */}
      <Card padding="md">
        <CardHeader title="Monthly Throughput" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Month</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-surface-500">Submitted</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-surface-500">Completed</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-surface-500">Net Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {throughput.map(row => {
                const netNegativeColor = row.netChange < 0 ? 'text-emerald-600' : 'text-surface-500';
                const netChangeColor = row.netChange > 0 ? 'text-red-600' : netNegativeColor;
                return (
                  <tr key={row.month}>
                    <td className="px-3 py-2 font-medium text-surface-700">{row.month}</td>
                    <td className="px-3 py-2 text-right">{row.submissions}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{row.completions}</td>
                    <td className={`px-3 py-2 text-right font-medium ${netChangeColor}`}>
                      {row.netChange > 0 ? '+' : ''}{row.netChange}
                    </td>
                  </tr>
                );
              })}
              {throughput.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-surface-500">No data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Capacity Planning */}
      <Card padding="md">
        <CardHeader title="Capacity Planning (Last 30 Days)" />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-surface-100">
              <span className="text-sm text-surface-600">Avg Deals/Manager/Week</span>
              <span className="text-sm font-semibold">{capacity.avgDealsPerMgrPerWeek}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-surface-100">
              <span className="text-sm text-surface-600">Active Managers</span>
              <span className="text-sm font-semibold">{capacity.mgrCount}</span>
            </div>
          </div>
          {showUW && (
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-surface-100">
                <span className="text-sm text-surface-600">Avg Deals/UW/Week</span>
                <span className="text-sm font-semibold">{capacity.avgDealsPerUWPerWeek}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-100">
                <span className="text-sm text-surface-600">Active Underwriters</span>
                <span className="text-sm font-semibold">{capacity.uwCount}</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
