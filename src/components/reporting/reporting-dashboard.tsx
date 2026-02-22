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
 * Client-side reporting controller. Renders sticky filter bar, tab navigation,
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
    <div className="space-y-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Reporting</h1>
        <p className="text-surface-500 mt-1 text-sm">Deal performance metrics and analytics.</p>
      </div>

      {/* Sticky filter bar + tabs */}
      <div className="sticky top-14 z-20 -mx-4 lg:-mx-8 px-4 lg:px-8 bg-surface-100 pb-0 pt-2 border-b border-surface-200">
        <ReportFilters filterOptions={filterOptions} effectiveRole={effectiveRole} />

        {/* Tab navigation */}
        <nav className="flex gap-6 mt-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                currentTab === tab.id
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-surface-500 hover:text-surface-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="pt-6">
        {currentTab === 'overview' && <OverviewTab data={data} />}
        {currentTab === 'manager-scorecard' && <ManagerScorecardTab data={data} />}
        {currentTab === 'response' && <ResponseTimesTab data={data} effectiveRole={effectiveRole} />}
        {currentTab === 'approval' && <ApprovalMetricsTab data={data} />}
        {currentTab === 'volume' && <VolumeTab data={data} effectiveRole={effectiveRole} />}
        {currentTab === 'my-metrics' && <MyMetricsTab data={data} userRole={userRole} />}
      </div>
    </div>
  );
}
