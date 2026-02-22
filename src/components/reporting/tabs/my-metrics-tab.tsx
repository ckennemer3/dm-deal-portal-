'use client';

import { UserRole } from '@/lib/types';

interface MyMetricsTabProps {
  data: any;
  userRole: UserRole;
}

/**
 * My Metrics tab — placeholder for Commit 5.
 */
export function MyMetricsTab({ data, userRole }: MyMetricsTabProps) {
  return (
    <div className="text-center py-12 text-surface-500">
      <p className="text-sm">My Metrics tab — coming soon.</p>
    </div>
  );
}
