'use client';

import { UserRole } from '@/lib/types';

interface ResponseTimesTabProps {
  data: any;
  effectiveRole: UserRole;
}

/**
 * Response Times tab — placeholder for Commit 4.
 */
export function ResponseTimesTab({ data, effectiveRole }: ResponseTimesTabProps) {
  return (
    <div className="text-center py-12 text-surface-500">
      <p className="text-sm">Response Times tab — coming soon.</p>
    </div>
  );
}
