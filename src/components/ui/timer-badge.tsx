'use client';

import { useTimer } from '@/hooks/useTimer';
import { cn } from '@/lib/utils';
import { TimerThreshold } from '@/lib/types';

interface TimerBadgeProps {
  startTime: string;
  thresholds: TimerThreshold;
  running?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const urgencyStyles = {
  green: {
    badge: 'bg-green-50 text-green-700 ring-green-600/20',
    dot: 'bg-green-500',
  },
  yellow: {
    badge: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    dot: 'bg-amber-500',
  },
  red: {
    badge: 'bg-red-50 text-red-700 ring-red-600/20',
    dot: 'bg-red-500 animate-pulse',
  },
};

export function TimerBadge({ startTime, thresholds, running = true, showLabel = false, size = 'sm' }: TimerBadgeProps) {
  const { display, urgency } = useTimer(startTime, thresholds, running);
  const styles = urgencyStyles[urgency];

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
      styles.badge,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', styles.dot)} />
      {display}
      {showLabel && <span className="text-[10px] opacity-70 ml-0.5">elapsed</span>}
    </span>
  );
}
