import React from 'react';
import { PushNotificationMessage } from '../../types';
import { X, Bell, CheckCircle2, Clock, ShieldCheck, Trash2 } from 'lucide-react';

import { StorageService } from '../../utils/storage';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: PushNotificationMessage[];
  onOpenTracker: (orderId: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onOpenTracker,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;

  const handleNotificationClick = (n: PushNotificationMessage) => {
    StorageService.markNotificationAsRead(n.id);
    if (n.orderId) {
      onOpenTracker(n.orderId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Order Notifications</h3>
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                    {notifications.filter((n) => !n.read).length} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">Live order &amp; payment alerts</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.read) && (
              <button
                onClick={onMarkAllRead}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                Mark All Read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 space-y-2">
              <Bell className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs font-semibold text-neutral-300">No alerts yet</p>
              <p className="text-[11px] text-neutral-500">
                You'll receive live notifications as your order status progresses.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                  !n.read
                    ? 'bg-neutral-950 border-amber-500/50 shadow-md shadow-amber-500/5 hover:border-amber-400'
                    : 'bg-neutral-950/60 border-neutral-850 hover:border-neutral-700 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {n.type === 'payment_verified' ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Bell className={`w-3.5 h-3.5 ${!n.read ? 'text-amber-400' : 'text-neutral-500'}`} />
                    )}
                    <h4 className={`text-xs font-bold ${!n.read ? 'text-white' : 'text-neutral-300'}`}>
                      {n.title}
                    </h4>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-neutral-500">
                      {new Date(n.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {!n.read && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          StorageService.markNotificationAsRead(n.id);
                        }}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-emerald-400 cursor-pointer"
                        title="Mark as Read"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        StorageService.deleteNotification(n.id);
                      }}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-600 hover:text-red-400 cursor-pointer"
                      title="Delete Notification"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{n.body}</p>
                {n.orderId && (
                  <span className="text-[10px] font-mono font-bold text-amber-400 mt-2 block group-hover:underline">
                    View Live Tracker #{n.orderId} →
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
