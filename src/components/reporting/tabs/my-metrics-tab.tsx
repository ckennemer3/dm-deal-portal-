'use client';

import { KPICard } from '../charts/kpi-card';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/lib/types';
import { DEAL_STATUS_CONFIG, ROLE_LABELS } from '@/lib/constants';
import type { MyMetricsData, MonthlyVolume } from '@/lib/reporting-queries';
import { DealStatus } from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface MyMetricsTabProps {
  data: {
    myMetrics: MyMetricsData;
  };
  userRole: UserRole;
}

/**
 * My Metrics tab — visible to ALL roles with role-specific content.
 *
 * Agent: total submitted, kickback rate, avg response, deals by status,
 *        percentile ranking vs team peers, submission trend.
 * Manager/GM: total reviewed, kickback rate, avg review time, deals by status, trend.
 * Underwriter: total processed, avg time to submit to lender, queue depth, trend.
 * Executive/Admin: summary redirecting to other tabs.
 */
export function MyMetricsTab({ data, userRole }: MyMetricsTabProps) {
  const { myMetrics: metrics } = data;

  const roleLabel = ROLE_LABELS[userRole] || userRole;

  // Status breakdown for chart
  const statusChartData = metrics.dealsByStatus
    .map(s => ({
      name: DEAL_STATUS_CONFIG[s.status as DealStatus]?.label || s.status,
      count: s.count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-surface-900">My Performance</h2>
        <Badge variant="default">{roleLabel}</Badge>
      </div>

      {/* Executive/Admin see a message since they have full reporting access */}
      {(userRole === 'executive' || userRole === 'administrator') && (
        <Card padding="md">
          <p className="text-sm text-surface-600">
            As {roleLabel === 'Administrator' ? 'an' : 'a'} {roleLabel}, you have full access to all reporting tabs.
            Use the Overview, Manager Scorecard, Response Times, Approval Metrics, and Volume tabs
            for comprehensive organizational metrics.
          </p>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label={userRole === 'agent' ? 'Total Submitted' : userRole === 'underwriter' ? 'Total Processed' : 'Total Reviewed'}
          value={metrics.totalDeals}
        />
        {(userRole === 'agent' || userRole === 'manager' || userRole === 'general_manager') && (
          <KPICard label="Kickback Rate" value={`${metrics.kickbackRate}%`} />
        )}
        <KPICard
          label={userRole === 'agent' ? 'Avg KB Response' : userRole === 'underwriter' ? 'Avg Processing' : 'Avg Review Time'}
          value={metrics.avgResponseHours > 0 ? `${metrics.avgResponseHours}h` : '\u2014'}
        />
        {userRole === 'agent' && metrics.totalDeals > 0 && (
          <KPICard
            label="Deals Active"
            value={metrics.dealsByStatus.filter(s => !['signed_and_delivered', 'cancelled'].includes(s.status)).reduce((s, d) => s + d.count, 0)}
          />
        )}
      </div>

      {/* Percentile Rankings (agent only) */}
      {userRole === 'agent' && (metrics.percentileRank.kickbackRate !== null || metrics.percentileRank.responseTime !== null) && (
        <Card padding="md">
          <CardHeader title="Team Ranking" />
          <p className="text-xs text-surface-500 mt-1 mb-4">How you compare to teammates (higher percentile = better)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metrics.percentileRank.kickbackRate !== null && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-surface-700">Kickback Rate</span>
                  <span className={`text-sm font-bold ${getPercentileColor(metrics.percentileRank.kickbackRate)}`}>
                    {getPercentileLabel(metrics.percentileRank.kickbackRate)}
                  </span>
                </div>
                <div className="w-full bg-surface-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${getPercentileBarColor(metrics.percentileRank.kickbackRate)}`}
                    style={{ width: `${metrics.percentileRank.kickbackRate}%` }}
                  />
                </div>
                <p className="text-xs text-surface-400 mt-1">
                  {metrics.percentileRank.kickbackRate}th percentile (lower kickback rate = better)
                </p>
              </div>
            )}
            {metrics.percentileRank.responseTime !== null && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-surface-700">Response Time</span>
                  <span className={`text-sm font-bold ${getPercentileColor(metrics.percentileRank.responseTime)}`}>
                    {getPercentileLabel(metrics.percentileRank.responseTime)}
                  </span>
                </div>
                <div className="w-full bg-surface-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${getPercentileBarColor(metrics.percentileRank.responseTime)}`}
                    style={{ width: `${metrics.percentileRank.responseTime}%` }}
                  />
                </div>
                <p className="text-xs text-surface-400 mt-1">
                  {metrics.percentileRank.responseTime}th percentile (faster response = better)
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals by Status */}
        <Card padding="md">
          <CardHeader title="My Deals by Status" />
          <div className="mt-4">
            {statusChartData.length === 0 ? (
              <p className="text-sm text-surface-500 py-4">No deals yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} layout="vertical" margin={{ left: 140 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1A569B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Card>

        {/* Submission Trend */}
        <Card padding="md">
          <CardHeader title="My Monthly Trend" />
          <div className="mt-4">
            {metrics.trend.length === 0 ? (
              <p className="text-sm text-surface-500 py-4">Not enough data for trend.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="submissions" fill="#1A569B" radius={[4, 4, 0, 0]} name="My Deals" />
                    <Bar dataKey="completions" fill="#10B981" radius={[4, 4, 0, 0]} name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function getPercentileColor(percentile: number): string {
  if (percentile >= 75) return 'text-emerald-600';
  if (percentile >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function getPercentileBarColor(percentile: number): string {
  if (percentile >= 75) return 'bg-emerald-500';
  if (percentile >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getPercentileLabel(percentile: number): string {
  if (percentile >= 75) return 'Top Quartile';
  if (percentile >= 50) return 'Above Average';
  if (percentile >= 25) return 'Below Average';
  return 'Bottom Quartile';
}
