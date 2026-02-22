'use client';

import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

/**
 * Reusable KPI display card for reporting dashboards.
 */
export function KPICard({ label, value, subtitle, trend, className }: KPICardProps) {
  return (
    <div className={cn('rounded-lg border border-surface-200 bg-white p-4 shadow-sm', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-surface-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-surface-900">{value}</p>
        {trend && trend !== 'neutral' && (
          <span className={cn(
            'text-xs font-semibold',
            trend === 'up' ? 'text-emerald-600' : 'text-red-600'
          )}>
            {trend === 'up' ? '\u2191' : '\u2193'}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-0.5 text-xs text-surface-400">{subtitle}</p>
      )}
    </div>
  );
}
