import React from 'react';
import { PushNotificationMessage } from '../../types';
import { Bell, CheckCircle2, Clock, X, ShieldCheck } from 'lucide-react';

interface PushNotificationBannerProps {
  notifications: PushNotificationMessage[];
  onDismiss: (id: string) => void;
  onOpenTracker: (orderId: string) => void;
}

export const PushNotificationBanner: React.FC<PushNotificationBannerProps> = ({
  notifications,
  onDismiss,
  onOpenTracker,
}) => {
  // Track notifications dismissed in this session or pre-existing on page reload
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem('bg_dismissed_notifs');
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
    // On page load/reload, do not pop up notifications that already existed before this reload
    return new Set(notifications.map((n) => n.id));
  });

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        sessionStorage.setItem('bg_dismissed_notifs', JSON.stringify([...next]));
      } catch {}
      return next;
    });
    onDismiss(id);
  };

  // Only show active unread notifications that were created during the active user session and not dismissed
  const activeNotif = notifications.find((n) => !n.read && !dismissedIds.has(n.id));

  if (!activeNotif) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-bottom duration-300">
      <div className="p-4 rounded-2xl bg-neutral-900 border border-amber-500/40 shadow-2xl shadow-neutral-950 flex items-start gap-3.5 relative overflow-hidden">
        {/* Amber accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-300" />

        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
          {activeNotif.type === 'payment_verified' ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          ) : (
            <Bell className="w-5 h-5 text-amber-400" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-white truncate">{activeNotif.title}</h4>
            <span className="text-[10px] font-mono text-amber-400">{activeNotif.orderId}</span>
          </div>
          <p className="text-xs text-neutral-300 mt-1 line-clamp-2 leading-relaxed">
            {activeNotif.body}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={() => {
                onOpenTracker(activeNotif.orderId);
                handleDismiss(activeNotif.id);
              }}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/30 transition-colors"
            >
              Track Live
            </button>
            <button
              onClick={() => handleDismiss(activeNotif.id)}
              className="text-[11px] text-neutral-400 hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={() => handleDismiss(activeNotif.id)}
          className="absolute top-3 right-3 text-neutral-400 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
