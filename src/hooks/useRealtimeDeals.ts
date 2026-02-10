'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type { DealStatus } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Public types ──────────────────────────────────────────────────────────────

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface DealChangePayload {
  eventType: RealtimeEventType;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

export interface RealtimeDealsFilter {
  /** Subscribe only to deals with one of these statuses. */
  statuses?: DealStatus[];
  /** Subscribe only to deals assigned to this user (checks submitted_by, assigned_manager, assigned_underwriter). */
  userId?: string;
}

export interface UseRealtimeDealsOptions {
  /** Called whenever a matching INSERT, UPDATE, or DELETE occurs on the deals table. */
  onDealChange: (payload: DealChangePayload) => void;
  /** Optional column-level filters applied server-side when possible. */
  filter?: RealtimeDealsFilter;
}

export interface UseRealtimeDealsReturn {
  /** True once the Realtime channel has successfully joined. */
  isSubscribed: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRealtimeDeals({
  onDealChange,
  filter,
}: UseRealtimeDealsOptions): UseRealtimeDealsReturn {
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Keep the latest callback in a ref so the channel handler always calls
  // the most recent version without needing to re-subscribe.
  const callbackRef = useRef(onDealChange);
  callbackRef.current = onDealChange;

  // Serialize the filter into a stable string so the effect only re-runs
  // when the actual filter values change.
  const filterKey = JSON.stringify(filter ?? null);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel;

    const parsedFilter: RealtimeDealsFilter | null =
      filterKey === 'null' ? null : JSON.parse(filterKey);

    // Build a Supabase Realtime Postgres Changes filter string if we can
    // push filtering to the server.  Supabase supports a single `filter`
    // param of the form `column=eq.value` or `column=in.(a,b)`.
    let serverFilter: string | undefined;

    if (parsedFilter?.statuses && parsedFilter.statuses.length > 0) {
      serverFilter = `status=in.(${parsedFilter.statuses.join(',')})`;
    }

    // Handler that normalises the payload and forwards it to the consumer.
    const handleChange = (
      payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> },
    ) => {
      const eventType = payload.eventType as RealtimeEventType;
      const newRecord = payload.new ?? {};
      const oldRecord = payload.old ?? {};

      // Client-side filter: if a userId filter is set, only forward events
      // where the deal is relevant to that user.  We check multiple columns
      // because the user may be the submitter, the assigned manager, or the
      // assigned underwriter.
      if (parsedFilter?.userId) {
        const uid = parsedFilter.userId;
        const record = eventType === 'DELETE' ? oldRecord : newRecord;
        const relevant =
          record.submitted_by === uid ||
          record.assigned_manager === uid ||
          record.assigned_underwriter === uid;
        if (!relevant) return;
      }

      logger.debug('Realtime deal change received', {
        component: 'useRealtimeDeals',
        action: eventType,
        dealId: (newRecord.id ?? oldRecord.id) as string | undefined,
      });

      callbackRef.current({ eventType, new: newRecord, old: oldRecord });
    };

    // Build the channel subscription.  We use a unique channel name so
    // multiple instances of the hook with different filters don't collide.
    const channelName = `deals-realtime-${filterKey}`;

    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'deals',
          ...(serverFilter ? { filter: serverFilter } : {}),
        },
        handleChange as any,
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          logger.info('Realtime subscription active for deals', {
            component: 'useRealtimeDeals',
            action: 'subscribe',
            channelName,
            filter: serverFilter,
          } as Record<string, unknown>);
        }

        if (status === 'CHANNEL_ERROR') {
          setIsSubscribed(false);
          logger.error('Realtime subscription error for deals', null, {
            component: 'useRealtimeDeals',
            action: 'subscribe_error',
            channelName,
          });
        }

        if (status === 'CLOSED') {
          setIsSubscribed(false);
          logger.info('Realtime subscription closed for deals', {
            component: 'useRealtimeDeals',
            action: 'unsubscribe',
            channelName,
          });
        }
      });

    // Cleanup: remove the channel when the component unmounts or when the
    // filter changes.
    return () => {
      logger.debug('Cleaning up realtime deals subscription', {
        component: 'useRealtimeDeals',
        action: 'cleanup',
        channelName,
      });
      supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  return { isSubscribed };
}
