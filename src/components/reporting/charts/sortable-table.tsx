'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { downloadCSV } from '../csv-export';

/**
 * Classify a value into quartile buckets for color coding.
 * Inlined here to avoid importing server-only reporting-queries.ts.
 */
function classifyQuartile(
  value: number,
  allValues: number[],
  lowerIsBetter: boolean
): 'top' | 'middle' | 'bottom' {
  if (allValues.length < 4) return 'middle';
  const sorted = lowerIsBetter
    ? [...allValues].sort((a, b) => a - b)
    : [...allValues].sort((a, b) => b - a);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  if (lowerIsBetter) {
    if (value <= q1) return 'top';
    if (value >= q3) return 'bottom';
  } else {
    if (value >= q1) return 'top';
    if (value <= q3) return 'bottom';
  }
  return 'middle';
}

export interface SortableColumn<T> {
  key: keyof T & string;
  label: string;
  /** Format function for display. Receives the cell value. */
  format?: (value: any) => string;
  /** If true, lower values are better for quartile coloring */
  lowerIsBetter?: boolean;
  /** If true, this column participates in quartile color coding */
  quartile?: boolean;
  /** Text alignment */
  align?: 'left' | 'right' | 'center';
}

interface SortableTableProps<T extends Record<string, any>> {
  data: T[];
  columns: SortableColumn<T>[];
  title?: string;
  /** Default sort column key */
  defaultSort?: keyof T & string;
  defaultSortDir?: 'asc' | 'desc';
  /** Show CSV export button */
  exportable?: boolean;
  exportFilename?: string;
}

const QUARTILE_COLORS = {
  top: 'bg-emerald-50 text-emerald-800',
  middle: '',
  bottom: 'bg-red-50 text-red-800',
};

/**
 * Client-side sortable table with quartile color coding and CSV export.
 */
export function SortableTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  defaultSort,
  defaultSortDir = 'desc',
  exportable = true,
  exportFilename = 'export',
}: Readonly<SortableTableProps<T>>) {
  const [sortKey, setSortKey] = useState<string>(defaultSort || columns[0]?.key || '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // Pre-compute quartile values for each quartile-enabled column
  const quartileValues = useMemo(() => {
    const map: Record<string, number[]> = {};
    columns.forEach(col => {
      if (col.quartile) {
        map[col.key] = data.map(row => Number(row[col.key]) || 0);
      }
    });
    return map;
  }, [data, columns]);

  const handleExport = () => {
    const exportData = sortedData.map(row => {
      const obj: Record<string, unknown> = {};
      columns.forEach(col => {
        obj[col.label] = col.format ? col.format(row[col.key]) : row[col.key];
      });
      return obj;
    });
    downloadCSV(exportData, exportFilename);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-surface-500">No data available.</div>
    );
  }

  return (
    <div>
      {(title || exportable) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="text-sm font-semibold text-surface-800">{title}</h3>}
          {exportable && (
            <button
              onClick={handleExport}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              Export CSV
            </button>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-surface-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50">
              {columns.map(col => {
                const nonRightAlign = col.align === 'center' ? 'text-center' : 'text-left';
                const headerAlign = col.align === 'right' ? 'text-right' : nonRightAlign;
                return (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    'px-3 py-2 text-xs font-semibold uppercase tracking-wider text-surface-500 cursor-pointer hover:text-surface-700 select-none whitespace-nowrap',
                    headerAlign
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-brand-500">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
                    )}
                  </span>
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {sortedData.map((row, i) => (
              <tr key={`row-${i}`} className={cn(i % 2 === 1 && 'bg-surface-25', 'hover:bg-surface-50 transition-colors')}>
                {columns.map(col => {
                  const val = row[col.key];
                  const display = col.format ? col.format(val) : String(val ?? '—');
                  let cellClass = '';
                  if (col.quartile && quartileValues[col.key]) {
                    const q = classifyQuartile(Number(val) || 0, quartileValues[col.key], !!col.lowerIsBetter);
                    cellClass = QUARTILE_COLORS[q];
                  }
                  const nonRightCellAlign = col.align === 'center' ? 'text-center' : 'text-left';
                  const alignClass = col.align === 'right' ? 'text-right' : nonRightCellAlign;
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        'px-3 py-2 whitespace-nowrap',
                        alignClass,
                        cellClass
                      )}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
