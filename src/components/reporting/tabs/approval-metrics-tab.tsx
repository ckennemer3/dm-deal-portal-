'use client';

import { useMemo } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { SortableTable, SortableColumn } from '../charts/sortable-table';
import type { ApprovalBucket } from '@/lib/reporting-queries';
import { CREDIT_SCORE_RANGES, LTV_RANGES, DEAL_TYPE_LABELS } from '@/lib/constants';
import { calculateLTV } from '@/lib/utils';
import { DealType } from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface ApprovalMetricsTabProps {
  data: {
    approvalByCredit: ApprovalBucket[];
    approvalByLTV: ApprovalBucket[];
    approvalByDealType: ApprovalBucket[];
    deals: any[];
  };
}

const approvalColumns: SortableColumn<ApprovalBucket>[] = [
  { key: 'range', label: 'Range', align: 'left' },
  { key: 'total', label: 'Submitted', align: 'right' },
  { key: 'approved', label: 'Approved', align: 'right' },
  { key: 'rate', label: 'Rate', align: 'right', format: (v) => `${v}%`, quartile: true, lowerIsBetter: false },
  { key: 'avgDays', label: 'Avg Days', align: 'right', format: (v) => v === null ? '\u2014' : `${v}d` },
];

/**
 * Approval Metrics tab: approval rates by credit score, LTV, deal type.
 * Efficiency matrix (credit x LTV heatmap). Term length analysis.
 */
export function ApprovalMetricsTab({ data }: Readonly<ApprovalMetricsTabProps>) {
  const { approvalByCredit, approvalByLTV, approvalByDealType, deals } = data;

  // Efficiency matrix: credit score rows x LTV columns → avg days
  const efficiencyMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, { total: number; sumDays: number }>> = {};
    CREDIT_SCORE_RANGES.forEach(cr => {
      matrix[cr.label] = {};
      LTV_RANGES.forEach(lr => {
        matrix[cr.label][lr.label] = { total: 0, sumDays: 0 };
      });
    });

    deals.forEach((d: any) => {
      const primary = d.applicants?.find((a: any) => a.applicant_number === 1);
      const score = primary?.experian_score;
      if (!score) return;
      const creditRange = CREDIT_SCORE_RANGES.find(r => score >= r.min && score <= r.max);
      if (!creditRange) return;

      const fin = d.deal_type === 'lease' || d.deal_type === 're_lease' ? d.net_cap_cost : d.total_amount_financed;
      const denom = d.vehicle_condition === 'used' ? d.jd_power_retail : d.msrp;
      const ltv = calculateLTV(fin, denom);
      if (ltv === null) return;
      const ltvRange = LTV_RANGES.find(r => ltv >= r.min && ltv < r.max);
      if (!ltvRange) return;

      if (['approved', 'signed_and_delivered'].includes(d.status)) {
        const days = (new Date(d.completed_at || d.updated_at).getTime() - new Date(d.created_at).getTime()) / 86400000;
        matrix[creditRange.label][ltvRange.label].total++;
        matrix[creditRange.label][ltvRange.label].sumDays += days;
      }
    });

    return matrix;
  }, [deals]);

  // Term length analysis
  const termAnalysis = useMemo(() => {
    const byType: Record<string, { terms: number[]; count: number }> = {};
    deals.forEach((d: any) => {
      if (!d.term) return;
      const key = d.deal_type as string;
      if (!byType[key]) byType[key] = { terms: [], count: 0 };
      byType[key].terms.push(d.term);
      byType[key].count++;
    });

    return Object.entries(byType).map(([type, data]) => ({
      type: DEAL_TYPE_LABELS[type as DealType] || type,
      avgTerm: data.terms.length > 0 ? +(data.terms.reduce((s, t) => s + t, 0) / data.terms.length).toFixed(0) : 0,
      minTerm: data.terms.length > 0 ? Math.min(...data.terms) : 0,
      maxTerm: data.terms.length > 0 ? Math.max(...data.terms) : 0,
      count: data.count,
    }));
  }, [deals]);

  const getCellColor = (total: number, avgDays: number): string => {
    if (total === 0) return 'bg-surface-50 text-surface-400';
    if (avgDays <= 3) return 'bg-emerald-50 text-emerald-800';
    if (avgDays <= 7) return 'bg-yellow-50 text-yellow-800';
    return 'bg-red-50 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Approval by Credit Score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <CardHeader title="Approval Rate by Credit Score" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={approvalByCredit}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="rate" fill="#10B981" radius={[4, 4, 0, 0]} name="Approval Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md">
          <SortableTable
            title="Credit Score Breakdown"
            data={approvalByCredit}
            columns={approvalColumns}
            defaultSort="rate"
            exportFilename="approval-by-credit"
          />
        </Card>
      </div>

      {/* Approval by LTV */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <CardHeader title="Approval Rate by LTV Range" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={approvalByLTV}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="rate" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Approval Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md">
          <SortableTable
            title="LTV Range Breakdown"
            data={approvalByLTV}
            columns={approvalColumns.filter(c => c.key !== 'avgDays')}
            defaultSort="rate"
            exportFilename="approval-by-ltv"
          />
        </Card>
      </div>

      {/* Approval by Deal Type */}
      <Card padding="md">
        <CardHeader title="Approval Rate by Deal Type" />
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={approvalByDealType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="rate" fill="#1A569B" radius={[4, 4, 0, 0]} name="Approval Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {approvalByDealType.map((t) => (
              <div key={t.range} className="flex items-center justify-between py-1.5 border-b border-surface-50 last:border-0">
                <span className="text-sm text-surface-700">{t.range}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-surface-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${t.rate}%` }} />
                  </div>
                  <span className="text-sm font-medium text-surface-900 w-16 text-right">{t.rate}%</span>
                  <span className="text-xs text-surface-400 w-16 text-right">{t.approved}/{t.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Efficiency Matrix */}
      <Card padding="md">
        <CardHeader title="Efficiency Matrix: Avg Days to Approval" />
        <p className="text-xs text-surface-500 mt-1 mb-4">Credit Score (rows) vs LTV (columns). Green &le; 3d, Yellow &le; 7d, Red &gt; 7d</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Credit \\ LTV</th>
                {LTV_RANGES.map(lr => (
                  <th key={lr.label} className="px-3 py-2 text-center text-xs font-semibold text-surface-500">{lr.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {CREDIT_SCORE_RANGES.map(cr => (
                <tr key={cr.label}>
                  <td className="px-3 py-2 font-medium text-surface-700">{cr.label}</td>
                  {LTV_RANGES.map(lr => {
                    const cell = efficiencyMatrix[cr.label]?.[lr.label];
                    const avg = cell && cell.total > 0 ? +(cell.sumDays / cell.total).toFixed(1) : 0;
                    return (
                      <td
                        key={lr.label}
                        className={`px-3 py-2 text-center text-xs font-medium ${getCellColor(cell?.total || 0, avg)}`}
                      >
                        {cell && cell.total > 0 ? `${avg}d (${cell.total})` : '\u2014'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Term Length Analysis */}
      <Card padding="md">
        <CardHeader title="Term Length Analysis" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-surface-500">Deal Type</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-surface-500">Avg Term (mo)</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-surface-500">Min</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-surface-500">Max</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-surface-500">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {termAnalysis.map(row => (
                <tr key={row.type}>
                  <td className="px-3 py-2 text-surface-700">{row.type}</td>
                  <td className="px-3 py-2 text-right font-medium">{row.avgTerm || '\u2014'}</td>
                  <td className="px-3 py-2 text-right text-surface-500">{row.minTerm || '\u2014'}</td>
                  <td className="px-3 py-2 text-right text-surface-500">{row.maxTerm || '\u2014'}</td>
                  <td className="px-3 py-2 text-right text-surface-500">{row.count}</td>
                </tr>
              ))}
              {termAnalysis.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-surface-500">No term data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
