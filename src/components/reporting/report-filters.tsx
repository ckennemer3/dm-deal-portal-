'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DEAL_TYPE_LABELS, CREDIT_SCORE_RANGES, LTV_RANGES } from '@/lib/constants';
import { DealType, UserRole } from '@/lib/types';
import { canViewAllOfficeReporting, canViewUWInternals } from '@/lib/permissions';
import type { FilterOptions } from '@/lib/reporting-queries';

interface ReportFiltersProps {
  filterOptions: FilterOptions;
  effectiveRole: UserRole;
  onExport?: () => void;
}

const DATE_PRESETS = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-30', label: 'Last 30 Days' },
  { value: 'last-90', label: 'Last 90 Days' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' },
];

/**
 * Filter bar for reporting. Pushes URL search params via router.push() for
 * server-side filtering. Cascading: office change clears team/manager/agent.
 */
export function ReportFilters({ filterOptions, effectiveRole, onExport }: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback((key: string, value: string, clearKeys?: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (clearKeys) {
      clearKeys.forEach(k => params.delete(k));
    }
    router.push(`/dashboard/reporting?${params.toString()}`);
  }, [router, searchParams]);

  const currentPreset = searchParams.get('datePreset') || '';
  const currentOffice = searchParams.get('office') || '';
  const currentTeam = searchParams.get('team') || '';
  const currentManager = searchParams.get('manager') || '';
  const currentUW = searchParams.get('underwriter') || '';
  const currentAgent = searchParams.get('agent') || '';
  const currentDealType = searchParams.get('dealType') || '';
  const currentCreditRange = searchParams.get('creditScoreRange') || '';
  const currentLTVRange = searchParams.get('ltvRange') || '';
  const currentDateFrom = searchParams.get('dateFrom') || '';
  const currentDateTo = searchParams.get('dateTo') || '';

  const showAllOffice = canViewAllOfficeReporting(effectiveRole);
  const showUW = canViewUWInternals(effectiveRole);

  // Cascade: filter teams/managers/agents by selected office
  const filteredTeams = currentOffice
    ? filterOptions.teams.filter(t => t.officeId === currentOffice)
    : filterOptions.teams;

  const dealTypeOptions = Object.entries(DEAL_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }));
  const creditOptions = CREDIT_SCORE_RANGES.map(r => ({ value: r.label, label: r.label }));
  const ltvOptions = LTV_RANGES.map(r => ({ value: r.label, label: r.label }));

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3 flex-wrap">
        {/* Date Preset */}
        <Select
          label="Date Range"
          options={DATE_PRESETS.map(p => ({ value: p.value, label: p.label }))}
          value={currentPreset}
          onChange={(e) => updateFilter('datePreset', e.target.value, ['dateFrom', 'dateTo'])}
          className="max-w-[160px]"
        />

        {currentPreset === 'custom' && (
          <>
            <Input
              label="From"
              type="date"
              value={currentDateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="max-w-[160px]"
            />
            <Input
              label="To"
              type="date"
              value={currentDateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="max-w-[160px]"
            />
          </>
        )}

        {/* Office filter — only for roles that can see all offices */}
        {showAllOffice && (
          <Select
            label="Office"
            options={[{ value: '', label: 'All Offices' }, ...filterOptions.offices]}
            value={currentOffice}
            onChange={(e) => updateFilter('office', e.target.value, ['team', 'manager', 'agent'])}
            className="max-w-[180px]"
          />
        )}

        {/* Team filter */}
        {showAllOffice && (
          <Select
            label="Team"
            options={[{ value: '', label: 'All Teams' }, ...filteredTeams]}
            value={currentTeam}
            onChange={(e) => updateFilter('team', e.target.value)}
            className="max-w-[200px]"
          />
        )}

        {/* Manager filter */}
        <Select
          label="Manager"
          options={[{ value: '', label: 'All Managers' }, ...filterOptions.managers]}
          value={currentManager}
          onChange={(e) => updateFilter('manager', e.target.value)}
          className="max-w-[180px]"
        />

        {/* Underwriter filter — exec/admin only */}
        {showUW && (
          <Select
            label="Underwriter"
            options={[{ value: '', label: 'All UWs' }, ...filterOptions.underwriters]}
            value={currentUW}
            onChange={(e) => updateFilter('underwriter', e.target.value)}
            className="max-w-[180px]"
          />
        )}

        {/* Agent filter */}
        <Select
          label="Agent"
          options={[{ value: '', label: 'All Agents' }, ...filterOptions.agents]}
          value={currentAgent}
          onChange={(e) => updateFilter('agent', e.target.value)}
          className="max-w-[180px]"
        />
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        {/* Deal Type */}
        <Select
          label="Deal Type"
          options={[{ value: '', label: 'All Types' }, ...dealTypeOptions]}
          value={currentDealType}
          onChange={(e) => updateFilter('dealType', e.target.value)}
          className="max-w-[160px]"
        />

        {/* Credit Score Range */}
        <Select
          label="Credit Score"
          options={[{ value: '', label: 'All Scores' }, ...creditOptions]}
          value={currentCreditRange}
          onChange={(e) => updateFilter('creditScoreRange', e.target.value)}
          className="max-w-[140px]"
        />

        {/* LTV Range */}
        <Select
          label="LTV Range"
          options={[{ value: '', label: 'All LTV' }, ...ltvOptions]}
          value={currentLTVRange}
          onChange={(e) => updateFilter('ltvRange', e.target.value)}
          className="max-w-[140px]"
        />

        {onExport && (
          <Button variant="secondary" onClick={onExport} className="mb-0.5">
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </Button>
        )}
      </div>
    </div>
  );
}
