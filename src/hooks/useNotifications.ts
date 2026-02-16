'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { InAppNotification } from '@/lib/types';

interface UseNotificationsReturn {
  notifications: InAppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  latestNotification: InAppNotification | null;
  clearLatest: () => void;
}

/**
 * Subscribes to Supabase Realtime on the `notifications` table for the current user.
 * Returns notifications, unread count, and a "latest" notification for toast display.
 */
export function useNotifications(userId: string | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [latestNotification, setLatestNotification] = useState<InAppNotification | null>(null);

  // Fetch initial notifications on mount
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setNotifications(data as InAppNotification[]);
      });
  }, [userId]);

  // Subscribe to realtime INSERTs
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as InAppNotification;
          setNotifications((prev) => [newNotif, ...prev]);
          setLatestNotification(newNotif);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useCallback(async (id: string) => {
    const supabase = createClient();
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [userId]);

  const clearLatest = useCallback(() => {
    setLatestNotification(null);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    latestNotification,
    clearLatest,
  };
}
