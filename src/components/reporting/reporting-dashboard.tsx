'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DEAL_TYPE_LABELS, DEAL_STATUS_CONFIG, CREDIT_SCORE_RANGES, LTV_RANGES, PIPELINE_AGE_BUCKETS, KICKBACK_REASON_LABELS } from '@/lib/constants';
import { DealType, DealStatus, KickbackReason, Office } from '@/lib/types';
import { formatCurrency, getFullName, calculateLTV } from '@/lib/utils';
import { ReportFilters } from './report-filters';
import { downloadCSV } from './csv-export';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

interface ReportingDashboardProps {
  deals: any[];
  offices: Office[];
  teams: any[];
  agents: any[];
  kickbackReasons: any[];
  statusHistory: any[];
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'kickbacks', label: 'Kickbacks' },
  { id: 'response', label: 'Response Times' },
  { id: 'approval', label: 'Approval Metrics' },
  { id: 'volume', label: 'Volume' },
] as const;

const CHART_COLORS = ['#1A569B', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export function ReportingDashboard({ deals, offices, teams, agents, kickbackReasons, statusHistory }: ReportingDashboardProps) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('overview');
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

  const handleExport = () => {
    const exportData = filteredDeals.map((d: any) => ({
      deal_number: d.deal_number,
      deal_type: d.deal_type,
      status: d.status,
      client: d.applicants?.[0] ? `${d.applicants[0].first_name} ${d.applicants[0].last_name}` : '',
      vehicle: `${d.vehicle_year} ${d.vehicle_make} ${d.vehicle_model}`,
      monthly_payment: d.monthly_payment,
      kickback_count: d.kickback_count || 0,
      created_at: d.created_at,
    }));
    downloadCSV(exportData, `deal-report-${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Reporting</h1>
        <p className="text-surface-500 mt-1 text-sm">Deal performance metrics and analytics.</p>
      </div>

      <ReportFilters
        offices={offices}
        teams={teams}
        officeFilter={officeFilter}
        teamFilter={teamFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onOfficeChange={setOfficeFilter}
        onTeamChange={setTeamFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onExport={handleExport}
      />

      {/* Tabs */}
      <div className="border-b border-surface-200">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab deals={filteredDeals} teams={teams} />}
      {activeTab === 'kickbacks' && <KickbacksTab deals={filteredDeals} kickbackReasons={kickbackReasons} />}
      {activeTab === 'response' && <ResponseTimesTab deals={filteredDeals} statusHistory={statusHistory} />}
      {activeTab === 'approval' && <ApprovalMetricsTab deals={filteredDeals} />}
      {activeTab === 'volume' && <VolumeTab deals={filteredDeals} />}
    </div>
  );
}

// ---- OVERVIEW TAB ----
function OverviewTab({ deals, teams }: { deals: any[]; teams: any[] }) {
  const totalDeals = deals.length;
  const completedDeals = deals.filter((d: any) => d.status === 'signed_and_delivered').length;
  const cancelledDeals = deals.filter((d: any) => d.status === 'cancelled').length;
  const activeDeals = totalDeals - completedDeals - cancelledDeals;
  const kickbackDeals = deals.filter((d: any) => (d.kickback_count || 0) > 0).length;
  const kickbackRate = totalDeals > 0 ? (kickbackDeals / totalDeals * 100) : 0;

  // By type
  const byType = deals.reduce((acc: Record<string, number>, d: any) => {
    acc[d.deal_type] = (acc[d.deal_type] || 0) + 1;
    return acc;
  }, {});
  const typeChartData = Object.entries(byType).map(([type, count]) => ({
    name: DEAL_TYPE_LABELS[type as DealType] || type,
    value: count,
  }));

  // By status
  const byStatus = deals.reduce((acc: Record<string, number>, d: any) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});
  const statusChartData = Object.entries(byStatus).sort(([, a], [, b]) => (b as number) - (a as number)).map(([status, count]) => ({
    name: DEAL_STATUS_CONFIG[status as DealStatus]?.label || status,
    value: count,
  }));

  // Top agents
  const agentVolume: Record<string, { name: string; count: number }> = {};
  deals.forEach((d: any) => {
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <p className="text-3xl font-bold text-emerald-600 mt-1">{completedDeals}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-surface-500">Cancelled</p>
          <p className="text-3xl font-bold text-surface-500 mt-1">{cancelledDeals}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-surface-500">Kickback Rate</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{kickbackRate.toFixed(1)}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals by Type Chart */}
        <Card padding="md">
          <CardHeader title="Deals by Type" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry: any) => entry.name}>
                  {typeChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Deals by Status */}
        <Card padding="md">
          <CardHeader title="Deals by Status" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#1A569B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
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

        {/* Pipeline Aging */}
        <Card padding="md">
          <CardHeader title="Pipeline Aging" />
          <div className="mt-4 space-y-3">
            {PIPELINE_AGE_BUCKETS.map((bucket) => {
              const prevMax = PIPELINE_AGE_BUCKETS[PIPELINE_AGE_BUCKETS.indexOf(bucket) - 1]?.maxHours || 0;
              const count = deals.filter((d: any) => {
                if (['signed_and_delivered', 'cancelled'].includes(d.status)) return false;
                const ageHours = (Date.now() - new Date(d.created_at).getTime()) / 3600000;
                return ageHours >= prevMax && ageHours < bucket.maxHours;
              }).length;
              return (
                <div key={bucket.label} className="flex items-center justify-between">
                  <span className="text-sm text-surface-700">{bucket.label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-surface-100 rounded-full h-2">
                      <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${activeDeals > 0 ? (count / (totalDeals - completedDeals - cancelledDeals)) * 100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-medium text-surface-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---- KICKBACKS TAB ----
function KickbacksTab({ deals, kickbackReasons }: { deals: any[]; kickbackReasons: any[] }) {
  const totalDeals = deals.length;
  const dealsWithKB = deals.filter((d: any) => (d.kickback_count || 0) > 0);
  const totalKickbacks = dealsWithKB.reduce((sum: number, d: any) => sum + (d.kickback_count || 0), 0);
  const kbRate = totalDeals > 0 ? (dealsWithKB.length / totalDeals * 100) : 0;

  // By reason
  const byReason: Record<string, number> = {};
  kickbackReasons.forEach((kr: any) => {
    byReason[kr.reason_category] = (byReason[kr.reason_category] || 0) + 1;
  });
  const reasonChartData = Object.entries(byReason)
    .map(([reason, count]) => ({
      name: KICKBACK_REASON_LABELS[reason as KickbackReason] || reason,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="md">
          <p className="text-sm text-surface-500">Total Kickbacks</p>
          <p className="text-3xl font-bold text-surface-900 mt-1">{totalKickbacks}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-surface-500">Deals Kicked Back</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{dealsWithKB.length}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-surface-500">Kickback Rate</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{kbRate.toFixed(1)}%</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-surface-500">Avg Kickbacks/Deal</p>
          <p className="text-3xl font-bold text-surface-900 mt-1">
            {dealsWithKB.length > 0 ? (totalKickbacks / dealsWithKB.length).toFixed(1) : '0'}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <CardHeader title="Kickbacks by Reason" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md">
          <CardHeader title="Reason Breakdown" />
          <div className="mt-4 space-y-3">
            {reasonChartData.length === 0 ? (
              <p className="text-sm text-surface-500">No kickback data.</p>
            ) : (
              reasonChartData.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-surface-50 last:border-0">
                  <span className="text-sm text-surface-700">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-900">{item.count}</span>
                    <span className="text-xs text-surface-400">
                      ({totalKickbacks > 0 ? ((item.count / totalKickbacks) * 100).toFixed(0) : 0}%)
                    </span>
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

// ---- RESPONSE TIMES TAB ----
function ResponseTimesTab({ deals, statusHistory }: { deals: any[]; statusHistory: any[] }) {
  // Compute avg time per transition type
  const transitions: Record<string, { total: number; count: number }> = {};
  statusHistory.forEach((h: any) => {
    if (!h.from_status || !h.to_status) return;
    const key = `${h.from_status} -> ${h.to_status}`;
    if (!transitions[key]) transitions[key] = { total: 0, count: 0 };
    const hours = h.hours_in_status || 0;
    if (hours > 0) {
      transitions[key].total += hours;
      transitions[key].count++;
    }
  });

  const transitionData = Object.entries(transitions)
    .map(([key, val]) => ({
      transition: key.replace(/_/g, ' '),
      avg_hours: val.count > 0 ? +(val.total / val.count).toFixed(1) : 0,
      count: val.count,
    }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Key metrics
  const managerReviews = statusHistory.filter((h: any) =>
    h.from_status === 'pending_manager_review' &&
    (h.to_status === 'submitted_to_underwriting' || h.to_status === 'kicked_back_to_sales')
  );
  const avgManagerTime = managerReviews.length > 0
    ? managerReviews.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / managerReviews.length
    : 0;

  const uwReviews = statusHistory.filter((h: any) =>
    h.from_status === 'submitted_to_underwriting' &&
    (h.to_status === 'submitted_to_lender' || h.to_status === 'kicked_back_to_manager')
  );
  const avgUWTime = uwReviews.length > 0
    ? uwReviews.reduce((s: number, h: any) => s + (h.hours_in_status || 0), 0) / uwReviews.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card padding="md">
          <p className="text-sm text-surface-500">Avg Manager Review</p>
          <p className="text-3xl font-bold text-surface-900 mt-1">{avgManagerTime > 0 ? `${avgManagerTime.toFixed(1)}h` : '—'}</p>
          <p className="text-xs text-surface-400 mt-1">{managerReviews.length} reviews</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-surface-500">Avg UW Review</p>
          <p className="text-3xl font-bold text-surface-900 mt-1">{avgUWTime > 0 ? `${avgUWTime.toFixed(1)}h` : '—'}</p>
          <p className="text-xs text-surface-400 mt-1">{uwReviews.length} reviews</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-surface-500">Total Transitions</p>
          <p className="text-3xl font-bold text-surface-900 mt-1">{statusHistory.length}</p>
        </Card>
      </div>

      <Card padding="md">
        <CardHeader title="Avg Time by Status Transition" />
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={transitionData} layout="vertical" margin={{ left: 180 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Hours', position: 'insideBottom', offset: -5 }} />
              <YAxis type="category" dataKey="transition" width={170} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `${v}h`} />
              <Bar dataKey="avg_hours" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

// ---- APPROVAL METRICS TAB ----
function ApprovalMetricsTab({ deals }: { deals: any[] }) {
  // By credit score range
  const scoreBuckets = CREDIT_SCORE_RANGES.map((range) => {
    const inRange = deals.filter((d: any) => {
      const primary = d.applicants?.find((a: any) => a.applicant_number === 1);
      const score = primary?.experian_score;
      return score && score >= range.min && score <= range.max;
    });
    const approved = inRange.filter((d: any) => ['approved', 'signed_and_delivered'].includes(d.status));
    return {
      range: range.label,
      total: inRange.length,
      approved: approved.length,
      rate: inRange.length > 0 ? +((approved.length / inRange.length) * 100).toFixed(1) : 0,
    };
  });

  // By LTV range
  const ltvBuckets = LTV_RANGES.map((range) => {
    const inRange = deals.filter((d: any) => {
      const fin = d.deal_type === 'lease' || d.deal_type === 're_lease' ? d.net_cap_cost : d.total_amount_financed;
      const denom = d.vehicle_condition === 'used' ? d.jd_power_retail : d.msrp;
      const ltv = calculateLTV(fin, denom);
      return ltv !== null && ltv >= range.min && ltv < range.max;
    });
    const approved = inRange.filter((d: any) => ['approved', 'signed_and_delivered'].includes(d.status));
    return {
      range: range.label,
      total: inRange.length,
      approved: approved.length,
      rate: inRange.length > 0 ? +((approved.length / inRange.length) * 100).toFixed(1) : 0,
    };
  });

  // By deal type
  const typeApproval = Object.entries(DEAL_TYPE_LABELS).map(([type, label]) => {
    const ofType = deals.filter((d: any) => d.deal_type === type);
    const approved = ofType.filter((d: any) => ['approved', 'signed_and_delivered'].includes(d.status));
    return {
      type: label,
      total: ofType.length,
      approved: approved.length,
      rate: ofType.length > 0 ? +((approved.length / ofType.length) * 100).toFixed(1) : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <CardHeader title="Approval Rate by Credit Score" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreBuckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="rate" fill="#10B981" radius={[4, 4, 0, 0]} name="Approval Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1">
            {scoreBuckets.map((b) => (
              <div key={b.range} className="flex items-center justify-between text-xs text-surface-600">
                <span>{b.range}</span>
                <span>{b.approved}/{b.total} ({b.rate}%)</span>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <CardHeader title="Approval Rate by LTV Range" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ltvBuckets}>
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
          <CardHeader title="Approval Rate by Deal Type" />
          <div className="mt-4 space-y-3">
            {typeApproval.map((t) => (
              <div key={t.type} className="flex items-center justify-between py-1.5 border-b border-surface-50 last:border-0">
                <span className="text-sm text-surface-700">{t.type}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-surface-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${t.rate}%` }} />
                  </div>
                  <span className="text-sm font-medium text-surface-900 w-16 text-right">{t.rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---- VOLUME TAB ----
function VolumeTab({ deals }: { deals: any[] }) {
  // Monthly volume
  const monthlyData: Record<string, { submissions: number; completions: number }> = {};
  deals.forEach((d: any) => {
    const month = new Date(d.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short' });
    if (!monthlyData[month]) monthlyData[month] = { submissions: 0, completions: 0 };
    monthlyData[month].submissions++;
    if (d.status === 'signed_and_delivered') {
      monthlyData[month].completions++;
    }
  });
  const volumeChartData = Object.entries(monthlyData)
    .map(([month, data]) => ({ month, ...data }))
    .slice(-12);

  // By office
  const byOffice: Record<string, number> = {};
  deals.forEach((d: any) => {
    const officeName = d.submitter_office_name || 'Unknown';
    byOffice[officeName] = (byOffice[officeName] || 0) + 1;
  });
  const officeData = Object.entries(byOffice)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <Card padding="md">
        <CardHeader title="Monthly Submissions & Completions" />
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="submissions" fill="#1A569B" radius={[4, 4, 0, 0]} name="Submissions" />
              <Bar dataKey="completions" fill="#10B981" radius={[4, 4, 0, 0]} name="Completions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <CardHeader title="Volume by Office" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={officeData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry: any) => `${entry.name}: ${entry.count}`}>
                  {officeData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md">
          <CardHeader title="Summary" />
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="text-sm text-surface-600">Total Submissions</span>
              <span className="text-sm font-semibold text-surface-900">{deals.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="text-sm text-surface-600">Signed & Delivered</span>
              <span className="text-sm font-semibold text-emerald-600">
                {deals.filter((d: any) => d.status === 'signed_and_delivered').length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span className="text-sm text-surface-600">In Pipeline</span>
              <span className="text-sm font-semibold text-brand-600">
                {deals.filter((d: any) => !['signed_and_delivered', 'cancelled'].includes(d.status)).length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-surface-600">Cancelled</span>
              <span className="text-sm font-semibold text-surface-500">
                {deals.filter((d: any) => d.status === 'cancelled').length}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
