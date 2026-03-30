'use client';

import { KPICard } from '../charts/kpi-card';
import { SortableTable, SortableColumn } from '../charts/sortable-table';
import { BottleneckChart } from '../charts/bottleneck-chart';
import { Card, CardHeader } from '@/components/ui/card';
import { UserRole } from '@/lib/types';
import { canViewUWInternals } from '@/lib/permissions';
import type { ResponseTimeKPIs, PersonResponseRow, BottleneckPhase } from '@/lib/reporting-queries';

interface ResponseTimesTabProps {
  data: {
    responseTimeKPIs: ResponseTimeKPIs;
    managerResponseTimes: PersonResponseRow[];
    underwriterResponseTimes: PersonResponseRow[];
    agentResponseTimes: PersonResponseRow[];
    bottleneck: BottleneckPhase[];
  };
  effectiveRole: UserRole;
}

const formatHours = (v: any) => (v > 0 ? `${v}h` : '\u2014');

const managerRTColumns: SortableColumn<PersonResponseRow>[] = [
  { key: 'name', label: 'Manager', align: 'left' },
  { key: 'office', label: 'Office', align: 'left' },
  { key: 'avgReviewHours', label: 'Avg Review', align: 'right', format: formatHours, quartile: true, lowerIsBetter: true },
  { key: 'avgKBResponseHours', label: 'Avg UW KB Resp', align: 'right', format: formatHours, quartile: true, lowerIsBetter: true },
  { key: 'avgRRResponseHours', label: 'Avg RR Resp', align: 'right', format: formatHours, quartile: true, lowerIsBetter: true },
  { key: 'slowestDealHours', label: 'Slowest Deal', align: 'right', format: formatHours },
  { key: 'totalDeals', label: 'Total Deals', align: 'right' },
];

const uwRTColumns: SortableColumn<PersonResponseRow>[] = [
  { key: 'name', label: 'Underwriter', align: 'left' },
  { key: 'avgReviewHours', label: 'Avg Claim\u2192Action', align: 'right', format: formatHours, quartile: true, lowerIsBetter: true },
  { key: 'avgKBResponseHours', label: 'Avg Claim\u2192Lender', align: 'right', format: formatHours, quartile: true, lowerIsBetter: true },
  { key: 'avgRRResponseHours', label: 'Avg RR Resp', align: 'right', format: formatHours, quartile: true, lowerIsBetter: true },
  { key: 'totalDeals', label: 'Total Deals', align: 'right' },
  { key: 'currentQueueDepth', label: 'Queue', align: 'right' },
];

const agentRTColumns: SortableColumn<PersonResponseRow>[] = [
  { key: 'name', label: 'Agent', align: 'left' },
  { key: 'team', label: 'Team', align: 'left' },
  { key: 'avgKBResponseHours', label: 'Avg KB Resp', align: 'right', format: formatHours, quartile: true, lowerIsBetter: true },
  { key: 'avgRRResponseHours', label: 'Avg RR Resp', align: 'right', format: formatHours, quartile: true, lowerIsBetter: true },
  { key: 'totalDeals', label: 'Total Submitted', align: 'right' },
];

/**
 * Response Times tab: KPIs, manager/UW/agent ranking tables, bottleneck chart.
 */
export function ResponseTimesTab({ data, effectiveRole }: Readonly<ResponseTimesTabProps>) {
  const { responseTimeKPIs: kpis, managerResponseTimes, underwriterResponseTimes, agentResponseTimes, bottleneck } = data;
  const showUW = canViewUWInternals(effectiveRole);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          label="Pending \u2192 UW"
          value={kpis.avgPendingToUW === null ? '\u2014' : `${kpis.avgPendingToUW}h`}
          subtitle="Avg manager review"
        />
        <KPICard
          label="UW \u2192 Lender"
          value={kpis.avgUWToLender === null ? '\u2014' : `${kpis.avgUWToLender}h`}
          subtitle="Avg UW processing"
        />
        <KPICard
          label="Lender \u2192 Approved"
          value={kpis.avgLenderToApproved === null ? '\u2014' : `${kpis.avgLenderToApproved}h`}
          subtitle="Avg lender decision"
        />
        <KPICard
          label="Approved \u2192 Delivered"
          value={kpis.avgApprovedToDelivered === null ? '\u2014' : `${kpis.avgApprovedToDelivered}h`}
          subtitle="Avg closing"
        />
        <KPICard
          label="Total Lifecycle"
          value={kpis.avgTotalLifecycle === null ? '\u2014' : `${kpis.avgTotalLifecycle}h`}
          subtitle="Avg end-to-end"
        />
      </div>

      {/* Manager Response Times */}
      <Card padding="md">
        <SortableTable
          title="Manager Response Times"
          data={managerResponseTimes}
          columns={managerRTColumns}
          defaultSort="avgReviewHours"
          defaultSortDir="asc"
          exportFilename="manager-response-times"
        />
      </Card>

      {/* Underwriter Response Times (exec/admin only) */}
      {showUW && (
        <Card padding="md">
          <SortableTable
            title="Underwriter Response Times"
            data={underwriterResponseTimes}
            columns={uwRTColumns}
            defaultSort="avgReviewHours"
            defaultSortDir="asc"
            exportFilename="uw-response-times"
          />
        </Card>
      )}

      {/* Agent Response Times */}
      <Card padding="md">
        <SortableTable
          title="Agent Response Times"
          data={agentResponseTimes}
          columns={agentRTColumns}
          defaultSort="avgKBResponseHours"
          defaultSortDir="asc"
          exportFilename="agent-response-times"
        />
      </Card>

      {/* Bottleneck Chart */}
      <Card padding="md">
        <CardHeader title="Pipeline Bottleneck Analysis" />
        <p className="text-xs text-surface-500 mt-1 mb-4">Avg hours per phase for completed deals</p>
        <BottleneckChart data={bottleneck} />
      </Card>
    </div>
  );
}
