'use client';

import { UserRole } from '@/lib/types';

interface VolumeTabProps {
  data: any;
  effectiveRole: UserRole;
}

/**
 * Volume & Throughput tab — placeholder for Commit 5.
 */
export function VolumeTab({ data, effectiveRole }: VolumeTabProps) {
  return (
    <div className="text-center py-12 text-surface-500">
      <p className="text-sm">Volume &amp; Throughput tab — coming soon.</p>
    </div>
  );
}
