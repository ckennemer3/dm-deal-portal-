'use client';

import { useMemo } from 'react';
import { KPICard } from '../charts/kpi-card';
import { SortableTable, SortableColumn } from '../charts/sortable-table';
import { Card, CardHeader } from '@/components/ui/card';
import type { ManagerScorecardRow, KickbackReasonSummary } from '@/lib/reporting-queries';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface ManagerScorecardTabProps {
  data: {
    managerScorecard: ManagerScorecardRow[];
    kickbackReasonBreakdown: KickbackReasonSummary[];
    deals: any[];
    statusHistory: any[];
    users: any[];
  };
}

const managerColumns: SortableColumn<ManagerScorecardRow>[] = [
  { key: 'name', label: 'Manager', align: 'left' },
  { key: 'office', label: 'Office', align: 'left' },
  { key: 'totalDeals', label: 'Total Deals', align: 'right' },
  { key: 'dealsForwarded', label: 'Forwarded', align: 'right' },
  { key: 'kickbackCount', label: 'KB Count', align: 'right', quartile: true, lowerIsBetter: true },
  {
    key: 'kickbackRate',
    label: 'KB Rate',
    align: 'right',
    format: (v) => `${v}%`,
    quartile: true,
    lowerIsBetter: true,
  },
  {
    key: 'firstTimePassRate',
    label: '1st-Time Pass',
    align: 'right',
    format: (v) => `${v}%`,
    quartile: true,
    lowerIsBetter: false,
  },
  {
    key: 'avgReviewHours',
    label: 'Avg Review',
    align: 'right',
    format: (v) => v > 0 ? `${v}h` : '\u2014',
    quartile: true,
    lowerIsBetter: true,
  },
  {
    key: 'avgUWKickbackResponseHours',
    label: 'Avg UW KB Resp',
    align: 'right',
    format: (v) => v > 0 ? `${v}h` : '\u2014',
    quartile: true,
    lowerIsBetter: true,
  },
  {
    key: 'avgResponseRequestedHours',
    label: 'Avg RR Resp',
    align: 'right',
    format: (v) => v > 0 ? `${v}h` : '\u2014',
    quartile: true,
    lowerIsBetter: true,
  },
];

/**
 * Manager Scorecard tab: KPIs, ranking table, kickback reason breakdown.
 */
export function ManagerScorecardTab({ data }: Readonly<ManagerScorecardTabProps>) {
  const { managerScorecard: managers, kickbackReasonBreakdown: reasons } = data;

  // Aggregate KPIs across all managers
  const kpis = useMemo(() => {
    if (managers.length === 0) return { avgKBRate: 0, avgReviewTime: 0, avgKBPerDeal: 0, firstTimePassRate: 0 };
    const totalDeals = managers.reduce((s, m) => s + m.totalDeals, 0);
    const totalKB = managers.reduce((s, m) => s + m.kickbackCount, 0);
    const avgKBRate = totalDeals > 0 ? +((totalKB / totalDeals) * 100).toFixed(1) : 0;
    const avgReviewTime = managers.some(m => m.avgReviewHours > 0)
      ? +(managers.reduce((s, m) => s + m.avgReviewHours, 0) / managers.filter(m => m.avgReviewHours > 0).length).toFixed(1)
      : 0;
    const dealsWithKB = managers.filter(m => m.kickbackCount > 0);
    const avgKBPerDeal = dealsWithKB.length > 0
      ? +(totalKB / dealsWithKB.reduce((s, m) => s + m.totalDeals, 0)).toFixed(1)
      : 0;
    const totalForwarded = managers.reduce((s, m) => s + m.dealsForwarded, 0);
    const totalFirstPass = managers.reduce((s, m) => {
      const deals = m.totalDeals > 0 ? Math.round(m.firstTimePassRate / 100 * m.dealsForwarded) : 0;
      return s + deals;
    }, 0);
    const firstTimePassRate = totalForwarded > 0 ? +((totalFirstPass / totalForwarded) * 100).toFixed(1) : 0;

    return { avgKBRate, avgReviewTime, avgKBPerDeal, firstTimePassRate };
  }, [managers]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Avg Kickback Rate" value={`${kpis.avgKBRate}%`} />
        <KPICard label="Avg Review Time" value={kpis.avgReviewTime > 0 ? `${kpis.avgReviewTime}h` : '\u2014'} />
        <KPICard label="Avg KB/Deal" value={kpis.avgKBPerDeal > 0 ? String(kpis.avgKBPerDeal) : '\u2014'} />
        <KPICard label="1st-Time Pass Rate" value={`${kpis.firstTimePassRate}%`} />
      </div>

      {/* Manager Ranking Table */}
      <Card padding="md">
        <SortableTable
          title="Manager Rankings"
          data={managers}
          columns={managerColumns}
          defaultSort="totalDeals"
          exportFilename="manager-scorecard"
        />
      </Card>

      {/* Kickback Reason Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <CardHeader title="Kickbacks by Reason" />
          <div className="mt-4 h-64">
            {reasons.length === 0 ? (
              <p className="text-sm text-surface-500 py-4">No kickback data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasons}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="reason" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={80} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card padding="md">
          <CardHeader title="Reason Breakdown" />
          <div className="mt-4 space-y-3">
            {reasons.length === 0 ? (
              <p className="text-sm text-surface-500">No kickback data.</p>
            ) : (
              reasons.map((item) => (
                <div key={`reason-${item.reason}`} className="flex items-center justify-between py-1.5 border-b border-surface-50 last:border-0">
                  <span className="text-sm text-surface-700">{item.reason}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-900">{item.count}</span>
                    <span className="text-xs text-surface-400">({item.percentage}%)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
