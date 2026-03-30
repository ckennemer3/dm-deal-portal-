'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InAppNotification } from '@/lib/types';

interface ToastNotificationProps {
  notification: InAppNotification;
  onDismiss: () => void;
}

/**
 * A single toast notification that auto-dismisses after 8 seconds.
 * Clicking navigates to the associated deal.
 */
function ToastNotification({ notification, onDismiss }: Readonly<ToastNotificationProps>) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <button
      type="button"
      className="bg-white border border-surface-200 rounded-lg shadow-lg p-4 max-w-sm w-full animate-slide-up cursor-pointer hover:shadow-xl transition-shadow text-left"
      onClick={() => {
        if (notification.deal_id) {
          router.push(`/dashboard/deals/${notification.deal_id}`);
        }
        onDismiss();
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-900 truncate">{notification.title}</p>
          <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{notification.message}</p>
          {notification.deal_number && (
            <p className="text-xs text-brand-600 mt-1 font-medium">{notification.deal_number}</p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="flex-shrink-0 text-surface-400 hover:text-surface-600"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </button>
  );
}

interface ToastContainerProps {
  notification: InAppNotification | null;
  onDismiss: () => void;
}

/**
 * Fixed-position container for toast notifications at the bottom-right of the viewport.
 */
export function ToastContainer({ notification, onDismiss }: Readonly<ToastContainerProps>) {
  const [toasts, setToasts] = useState<InAppNotification[]>([]);

  useEffect(() => {
    if (notification) {
      setToasts((prev) => [notification, ...prev].slice(0, 3));
    }
  }, [notification]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    onDismiss();
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          notification={toast}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  );
}
