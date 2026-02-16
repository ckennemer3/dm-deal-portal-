'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { AUDIT_ACTION_LABELS } from '@/lib/constants';
import { formatTimestamp } from '@/lib/utils';
import type { AuditActionType } from '@/lib/types';

interface AuditEntry {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  user?: { first_name: string; last_name: string } | null;
}

interface AuditLogProps {
  entries: AuditEntry[];
}

/** Color dot based on action category */
function getActionColor(actionType: string): string {
  switch (actionType) {
    case 'status_changed':
    case 'deal_resubmitted':
      return 'bg-brand-400';
    case 'deal_kicked_back':
      return 'bg-orange-400';
    case 'deal_claimed':
    case 'deal_reassigned':
      return 'bg-purple-400';
    case 'document_uploaded':
    case 'document_replaced':
      return 'bg-emerald-400';
    case 'document_deleted':
      return 'bg-red-400';
    case 'message_sent':
    case 'action_required_resolved':
      return 'bg-sky-400';
    case 'field_changed':
      return 'bg-amber-400';
    default:
      return 'bg-surface-400';
  }
}

/**
 * Collapsible audit log section for the deal detail page.
 * Displays all tracked actions in reverse chronological order.
 */
export function AuditLog({ entries }: AuditLogProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card padding="md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <CardHeader title={`Audit Log (${entries.length})`} />
        <svg
          className={`w-5 h-5 text-surface-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-1 max-h-96 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-sm text-surface-500">No audit entries yet.</p>
          ) : (
            entries.map((entry) => {
              const userName = entry.user
                ? `${entry.user.first_name} ${entry.user.last_name}`
                : 'System';
              const actionLabel = AUDIT_ACTION_LABELS[entry.action_type as AuditActionType] || entry.action_type;

              return (
                <div key={entry.id} className="flex items-start gap-3 py-1.5 border-b border-surface-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getActionColor(entry.action_type)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-surface-700">{userName}</span>
                      <span className="text-xs text-surface-400">{actionLabel}</span>
                    </div>
                    <p className="text-xs text-surface-600">{entry.description}</p>
                    <p className="text-xs text-surface-400">{formatTimestamp(entry.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </Card>
  );
}
