'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { DEAL_TYPE_LABELS, CREDIT_SCORE_RANGES, LTV_RANGES } from '@/lib/constants';
import { UserRole } from '@/lib/types';
import { canViewAllOfficeReporting, canViewUWInternals } from '@/lib/permissions';
import type { FilterOptions } from '@/lib/reporting-queries';

interface ReportFiltersProps {
  filterOptions: FilterOptions;
  effectiveRole: UserRole;
}

const DATE_PRESETS = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-30', label: 'Last 30 Days' },
  { value: 'last-90', label: 'Last 90 Days' },
  { value: 'ytd', label: 'Year to Date' },
];

/**
 * Compact horizontal filter bar for reporting. Pushes URL search params
 * via router.push() for server-side filtering.
 */
export function ReportFilters({ filterOptions, effectiveRole }: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState(false);

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

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const tab = params.get('tab');
    const newParams = new URLSearchParams();
    if (tab) newParams.set('tab', tab);
    router.push(`/dashboard/reporting?${newParams.toString()}`);
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

  // Count active filters
  const activeFilterCount = [
    currentPreset, currentOffice, currentTeam, currentManager,
    currentUW, currentAgent, currentDealType, currentCreditRange,
    currentLTVRange,
  ].filter(Boolean).length;

  // Cascade: filter teams by selected office
  const filteredTeams = currentOffice
    ? filterOptions.teams.filter(t => t.officeId === currentOffice)
    : filterOptions.teams;

  const dealTypeOptions = Object.entries(DEAL_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }));
  const creditOptions = CREDIT_SCORE_RANGES.map(r => ({ value: r.label, label: r.label }));
  const ltvOptions = LTV_RANGES.map(r => ({ value: r.label, label: r.label }));

  return (
    <div className="space-y-2">
      {/* Primary row: date presets + filter toggle + active count */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Date preset pills */}
        <div className="flex items-center gap-1">
          {DATE_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => updateFilter('datePreset', p.value === currentPreset ? '' : p.value, ['dateFrom', 'dateTo'])}
              className={cn(
                'px-2.5 py-1 text-xs rounded-full border transition-colors whitespace-nowrap',
                currentPreset === p.value
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-surface-600 border-surface-200 hover:border-surface-300 hover:bg-surface-50'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-surface-200 mx-1" />

        {/* Filter toggle button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-colors',
            expanded || activeFilterCount > 0
              ? 'bg-brand-50 text-brand-700 border-brand-200'
              : 'bg-white text-surface-600 border-surface-200 hover:border-surface-300'
          )}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-brand-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-surface-400 hover:text-surface-600 underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expandable filter row */}
      {expanded && (
        <div className="flex items-end gap-2 flex-wrap pb-1">
          {showAllOffice && (
            <CompactSelect
              label="Office"
              options={[{ value: '', label: 'All Offices' }, ...filterOptions.offices]}
              value={currentOffice}
              onChange={(v) => updateFilter('office', v, ['team', 'manager', 'agent'])}
            />
          )}
          {showAllOffice && (
            <CompactSelect
              label="Team"
              options={[{ value: '', label: 'All Teams' }, ...filteredTeams]}
              value={currentTeam}
              onChange={(v) => updateFilter('team', v)}
            />
          )}
          <CompactSelect
            label="Manager"
            options={[{ value: '', label: 'All Managers' }, ...filterOptions.managers]}
            value={currentManager}
            onChange={(v) => updateFilter('manager', v)}
          />
          {showUW && (
            <CompactSelect
              label="UW"
              options={[{ value: '', label: 'All UWs' }, ...filterOptions.underwriters]}
              value={currentUW}
              onChange={(v) => updateFilter('underwriter', v)}
            />
          )}
          <CompactSelect
            label="Agent"
            options={[{ value: '', label: 'All Agents' }, ...filterOptions.agents]}
            value={currentAgent}
            onChange={(v) => updateFilter('agent', v)}
          />
          <CompactSelect
            label="Type"
            options={[{ value: '', label: 'All Types' }, ...dealTypeOptions]}
            value={currentDealType}
            onChange={(v) => updateFilter('dealType', v)}
          />
          <CompactSelect
            label="Credit"
            options={[{ value: '', label: 'All' }, ...creditOptions]}
            value={currentCreditRange}
            onChange={(v) => updateFilter('creditScoreRange', v)}
          />
          <CompactSelect
            label="LTV"
            options={[{ value: '', label: 'All' }, ...ltvOptions]}
            value={currentLTVRange}
            onChange={(v) => updateFilter('ltvRange', v)}
          />
        </div>
      )}
    </div>
  );
}

/** Minimal inline select for the filter bar */
function CompactSelect({ label, options, value, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-surface-400 font-medium mb-0.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'text-xs pl-2 pr-6 py-1.5 rounded border bg-white appearance-none cursor-pointer',
          'focus:outline-none focus:ring-1 focus:ring-brand-300 focus:border-brand-300',
          value ? 'border-brand-300 text-brand-700' : 'border-surface-200 text-surface-600'
        )}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
