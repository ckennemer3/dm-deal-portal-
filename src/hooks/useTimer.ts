'use client';

import { useState, useEffect, useRef } from 'react';
import { formatDuration, getTimerUrgency } from '@/lib/utils';
import { TimerThreshold, TimerUrgency } from '@/lib/types';

/**
 * useTimer hook — supports both positional and options-object call signatures.
 *
 * Positional: useTimer(startTime, thresholds, running?)
 * Options:    useTimer({ startTime, greenMaxHours?, yellowMaxHours?, running? })
 */

// Overload signatures
export function useTimer(startTime: string | null, thresholds: TimerThreshold, running?: boolean): { elapsed: number; display: string; urgency: TimerUrgency };
export function useTimer(options: { startTime: string | null; greenMaxHours?: number; yellowMaxHours?: number; running?: boolean }): { elapsed: number; display: string; urgency: TimerUrgency };

export function useTimer(
  startTimeOrOptions: string | null | { startTime: string | null; greenMaxHours?: number; yellowMaxHours?: number; running?: boolean },
  thresholds?: TimerThreshold,
  runningArg?: boolean
): { elapsed: number; display: string; urgency: TimerUrgency } {
  // Normalise arguments
  let startTime: string | null;
  let greenMaxHours: number;
  let yellowMaxHours: number;
  let running: boolean;

  if (typeof startTimeOrOptions === 'object' && startTimeOrOptions !== null && 'startTime' in startTimeOrOptions) {
    // Options-object form
    const opts = startTimeOrOptions;
    startTime = opts.startTime;
    greenMaxHours = opts.greenMaxHours ?? 4;
    yellowMaxHours = opts.yellowMaxHours ?? 8;
    running = opts.running ?? true;
  } else {
    // Positional form
    startTime = typeof startTimeOrOptions === 'string' ? startTimeOrOptions : null;
    greenMaxHours = thresholds?.green_max_hours ?? 4;
    yellowMaxHours = thresholds?.yellow_max_hours ?? 8;
    running = runningArg ?? true;
  }

  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!startTime || !running) {
      setElapsed(0);
      return;
    }

    const start = new Date(startTime).getTime();

    const update = () => {
      setElapsed(Date.now() - start);
    };

    update();
    intervalRef.current = setInterval(update, 60000); // Update every minute

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime, running]);

  const urgency = getTimerUrgency(elapsed, greenMaxHours, yellowMaxHours);
  const display = elapsed > 0 ? formatDuration(elapsed) : '--';

  return { elapsed, display, urgency };
}
