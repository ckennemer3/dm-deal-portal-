'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/lib/types';
import { ReportFilters } from './report-filters';
import { OverviewTab } from './tabs/overview-tab';
import { ManagerScorecardTab } from './tabs/manager-scorecard-tab';
import { ResponseTimesTab } from './tabs/response-times-tab';
import { ApprovalMetricsTab } from './tabs/approval-metrics-tab';
import { VolumeTab } from './tabs/volume-tab';
import { MyMetricsTab } from './tabs/my-metrics-tab';
import type { FilterOptions } from '@/lib/reporting-queries';

interface TabDef {
  id: string;
  label: string;
}

function getVisibleTabs(role: UserRole): TabDef[] {
  if (role === 'agent') {
    return [
      { id: 'my-metrics', label: 'My Metrics' },
      { id: 'overview', label: 'Overview' },
    ];
  }
  if (role === 'underwriter') {
    return [
      { id: 'my-metrics', label: 'My Metrics' },
      { id: 'overview', label: 'Overview' },
    ];
  }
  // manager, general_manager, executive, administrator
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'manager-scorecard', label: 'Manager Scorecard' },
    { id: 'response', label: 'Response Times' },
    { id: 'approval', label: 'Approval Metrics' },
    { id: 'volume', label: 'Volume' },
    { id: 'my-metrics', label: 'My Metrics' },
  ];
}

interface ReportingDashboardProps {
  effectiveRole: UserRole;
  filterOptions: FilterOptions;
  data: any;
  activeTab: string;
  userId: string;
  userRole: UserRole;
}

/**
 * Client-side reporting controller. Renders compact filter bar, tab navigation,
 * and the active tab content. Tab switches push URL params via router.
 */
export function ReportingDashboard({
  effectiveRole,
  filterOptions,
  data,
  activeTab,
  userId,
  userRole,
}: ReportingDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabs = getVisibleTabs(effectiveRole);
  const currentTab = tabs.find(t => t.id === activeTab) ? activeTab : tabs[0]?.id || 'overview';

  const handleTabChange = useCallback((tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`/dashboard/reporting?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Reporting</h1>
        <p className="text-surface-500 mt-0.5 text-sm">Deal performance metrics and analytics</p>
      </div>

      {/* Sticky filter bar + tabs */}
      <div className="sticky top-0 z-20 -mx-4 lg:-mx-8 px-4 lg:px-8 bg-white border-b border-surface-200 pt-3 pb-0">
        <ReportFilters filterOptions={filterOptions} effectiveRole={effectiveRole} />

        {/* Tab navigation */}
        <nav className="flex gap-1 mt-3 overflow-x-auto" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={currentTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px',
                currentTab === tab.id
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-surface-500 hover:text-surface-700 hover:bg-surface-50 rounded-t'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="pt-6">
        {currentTab === 'overview' && data.overviewKPIs && <OverviewTab data={data} />}
        {currentTab === 'manager-scorecard' && data.managerScorecard && <ManagerScorecardTab data={data} />}
        {currentTab === 'response' && data.responseTimeKPIs && <ResponseTimesTab data={data} effectiveRole={effectiveRole} />}
        {currentTab === 'approval' && data.approvalByCredit && <ApprovalMetricsTab data={data} />}
        {currentTab === 'volume' && data.monthlyVolume && <VolumeTab data={data} effectiveRole={effectiveRole} />}
        {currentTab === 'my-metrics' && data.myMetrics && <MyMetricsTab data={data} userRole={userRole} />}

        {/* Fallback if no data loaded for the current tab */}
        {!hasDataForTab(currentTab, data) && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-100 mb-4">
              <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <p className="text-sm text-surface-500">Loading metrics...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function hasDataForTab(tab: string, data: any): boolean {
  switch (tab) {
    case 'overview': return !!data.overviewKPIs;
    case 'manager-scorecard': return !!data.managerScorecard;
    case 'response': return !!data.responseTimeKPIs;
    case 'approval': return !!data.approvalByCredit;
    case 'volume': return !!data.monthlyVolume;
    case 'my-metrics': return !!data.myMetrics;
    default: return false;
  }
}
