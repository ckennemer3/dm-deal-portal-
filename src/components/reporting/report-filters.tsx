'use client';

import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ReportFiltersProps {
  offices: { id: string; name: string }[];
  teams: { id: string; name: string; office_id: string; office?: { name: string } }[];
  officeFilter: string;
  teamFilter: string;
  dateFrom: string;
  dateTo: string;
  onOfficeChange: (value: string) => void;
  onTeamChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onExport?: () => void;
}

/**
 * Shared filter bar for all reporting tabs.
 */
export function ReportFilters({
  offices, teams, officeFilter, teamFilter,
  dateFrom, dateTo,
  onOfficeChange, onTeamChange, onDateFromChange, onDateToChange,
  onExport,
}: ReportFiltersProps) {
  const officeOptions = offices.map(o => ({ value: o.id, label: o.name }));
  const teamOptions = teams
    .filter(t => !officeFilter || t.office_id === officeFilter)
    .map(t => ({ value: t.id, label: `${t.name}${t.office?.name ? ` (${t.office.name})` : ''}` }));

  return (
    <div className="flex items-end gap-4 flex-wrap">
      <Select
        label="Office"
        options={[{ value: '', label: 'All Offices' }, ...officeOptions]}
        value={officeFilter}
        onChange={(e) => { onOfficeChange(e.target.value); onTeamChange(''); }}
        className="max-w-[200px]"
      />
      <Select
        label="Team"
        options={[{ value: '', label: 'All Teams' }, ...teamOptions]}
        value={teamFilter}
        onChange={(e) => onTeamChange(e.target.value)}
        className="max-w-[250px]"
      />
      <Input label="From" type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className="max-w-[180px]" />
      <Input label="To" type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} className="max-w-[180px]" />
      {onExport && (
        <Button variant="secondary" onClick={onExport} className="mb-0.5">
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </Button>
      )}
    </div>
  );
}
