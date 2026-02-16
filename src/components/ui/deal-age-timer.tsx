'use client';

import { useTimer } from '@/hooks/useTimer';
import { cn } from '@/lib/utils';
import type { TimerThreshold } from '@/lib/types';

interface DealAgeTimerProps {
  /** ISO timestamp of when to start counting */
  startTime: string | null;
  /** Label shown above the timer */
  label?: string;
  /** Size: 'sm' for table cells, 'lg' for prominent display */
  size?: 'sm' | 'lg';
  /** Thresholds for color coding (optional — defaults to neutral if omitted) */
  thresholds?: TimerThreshold;
}

const urgencyStyles = {
  green: 'text-emerald-700',
  yellow: 'text-amber-700',
  red: 'text-red-700',
};

const urgencyBgStyles = {
  green: 'bg-emerald-50',
  yellow: 'bg-amber-50',
  red: 'bg-red-50',
};

/**
 * Prominent timer display for deal age and action request timing.
 * Used in table cells (sm) and detail headers (lg).
 */
export function DealAgeTimer({ startTime, label, size = 'sm', thresholds }: DealAgeTimerProps) {
  // Use very generous thresholds if none provided (essentially always green)
  const defaultThresholds: TimerThreshold = thresholds || { green_max_hours: 9999, yellow_max_hours: 99999 };
  const { display, urgency } = useTimer(startTime, defaultThresholds);

  if (!startTime) {
    return <span className="text-surface-400 text-sm">—</span>;
  }

  if (size === 'lg') {
    return (
      <div className={cn('inline-flex flex-col items-center rounded-lg px-4 py-2', thresholds ? urgencyBgStyles[urgency] : 'bg-surface-50')}>
        {label && (
          <span className="text-[10px] font-medium text-surface-500 uppercase tracking-wider mb-0.5">{label}</span>
        )}
        <span className={cn('text-2xl font-bold tabular-nums', thresholds ? urgencyStyles[urgency] : 'text-surface-900')}>
          {display}
        </span>
      </div>
    );
  }

  return (
    <span className={cn('text-sm font-semibold tabular-nums', thresholds ? urgencyStyles[urgency] : 'text-surface-900')}>
      {display}
    </span>
  );
}
