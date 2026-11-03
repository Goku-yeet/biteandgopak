import React, { useState, useEffect } from 'react';
import { CustomerWidgetsConfig, Order } from '../../types';
import {
  Flame,
  Clock,
  Sparkles,
  Award,
  PhoneCall,
  MapPin,
  CloudRain,
  Zap,
  Star,
  ShoppingBag,
  RotateCcw,
  Radio,
  ChevronRight,
  X,
  ChevronLeft,
  Info,
} from 'lucide-react';

interface MobileUnifiedHUDProps {
  config?: CustomerWidgetsConfig;
  orders: Order[];
  onOpenPreviousOrders?: () => void;
  cartTotal?: number;
  freeDeliveryThreshold?: number;
}

export const MobileUnifiedHUD: React.FC<MobileUnifiedHUDProps> = ({
  config,
  orders,
  onOpenPreviousOrders,
  cartTotal = 0,
  freeDeliveryThreshold = 1500,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!config || isDismissed) return null;

  // Compile active alerts/messages into a unified list
  const activeAlerts: Array<{
    id: string;
    icon: React.ReactNode;
    badge: string;
    badgeColor: string;
    text: string;
    action?: () => void;
    actionLabel?: string;
  }> = [];

  if (config.announcementBarEnabled && config.announcementText) {
    activeAlerts.push({
      id: 'announcement',
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
      badge: config.announcementBadge || 'UPDATE',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      text: config.announcementText,
    });
  }

  if (config.showGoogleMapsRiderLiveTicker) {
    activeAlerts.push({
      id: 'rider',
      icon: <MapPin className="w-3.5 h-3.5 text-emerald-400" />,
      badge: 'LIVE FLEET',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      text: config.googleMapsRiderTickerText || 'Express Karachi Riders Active · Avg delivery 35–50 mins',
    });
  }

  if (config.showNightOwlDealBanner) {
    activeAlerts.push({
      id: 'night_owl',
      icon: <Clock className="w-3.5 h-3.5 text-purple-400" />,
      badge: 'NIGHT OWL',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      text: config.nightOwlDealText || 'Late Night Cravings: Fast midnight delivery across Karachi!',
    });
  }

  if (config.showRushHourAlert) {
    activeAlerts.push({
      id: 'rush_hour',
      icon: <Flame className="w-3.5 h-3.5 text-red-400" />,
      badge: 'PEAK RUSH',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
      text: config.rushHourText || 'High Order Volume: Kitchen running at full throttle!',
    });
  }

  if (config.showMonsoonRainAlert) {
    activeAlerts.push({
      id: 'monsoon',
      icon: <CloudRain className="w-3.5 h-3.5 text-blue-400" />,
      badge: 'ROAD WEATHER',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      text: config.monsoonRainText || 'Rain Notice: Hot sealed bags used. Riders driving safely.',
    });
  }

  if (config.showDeliveryZonePill !== false) {
    activeAlerts.push({
      id: 'delivery_zone',
      icon: <MapPin className="w-3.5 h-3.5 text-amber-400" />,
      badge: 'DELIVERY ZONE',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      text: config.deliveryZoneText || '📍 Fast 30-min express delivery in North Nazimabad Blocks A–W, Hyderi, Buffer Zone & FB Area',
    });
  }

  if (config.showSpecialHoursNotice) {
    activeAlerts.push({
      id: 'special_hours',
      icon: <Clock className="w-3.5 h-3.5 text-blue-400" />,
      badge: 'TIMINGS',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      text: config.specialHoursNoticeText || 'Open Daily 12:00 PM — 04:00 AM (Weekends till 04:30 AM)',
    });
  }



  if (config.showLiveVisitorCounter) {
    activeAlerts.push({
      id: 'live_visitors',
      icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />,
      badge: 'LIVE FOODIES',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      text: config.liveVisitorText || '👀 28 foodies browsing Bite & Go Karachi menu right now',
    });
  }

  if (config.showBiteClubPointsTicker) {
    activeAlerts.push({
      id: 'bite_club',
      icon: <Star className="w-3.5 h-3.5 text-purple-400" />,
      badge: 'BITE CLUB',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      text: config.biteClubPointsText || '⭐ 2X Loyalty Points Active: Order any Smash Burger today to earn bonus perks!',
    });
  }

  if (config.showLiveKitchenCamNotice) {
    activeAlerts.push({
      id: 'kitchen_cam',
      icon: <Radio className="w-3.5 h-3.5 text-red-400" />,
      badge: 'LIVE GRIDDLE',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
      text: config.liveKitchenCamText || '🔴 Live Kitchen Griddle Feed: 4 Patties Sizzling on Chrome Flat-Top',
    });
  }

  if (config.showHalalAccreditationPill) {
    activeAlerts.push({
      id: 'halal',
      icon: <Award className="w-3.5 h-3.5 text-emerald-400" />,
      badge: '100% HALAL',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      text: 'Verified 100% Hand-Slaughtered Fresh Beef & Chicken Daily',
    });
  }

  if (config.showFreeDeliveryProgressBanner && freeDeliveryThreshold > 0) {
    const remaining = Math.max(0, freeDeliveryThreshold - cartTotal);
    activeAlerts.push({
      id: 'free_delivery',
      icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
      badge: remaining === 0 ? 'FREE DELIVERY' : 'DELIVERY GOAL',
      badgeColor: remaining === 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      text: remaining === 0 ? '🎉 Free Karachi Delivery Unlocked on this order!' : `Add Rs. ${remaining.toLocaleString()} more for FREE delivery!`,
    });
  }

  if (activeAlerts.length === 0) return null;

  // Auto-cycle alerts every 4.5 seconds
  useEffect(() => {
    if (activeAlerts.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAlerts.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [activeAlerts.length]);

  const current = activeAlerts[currentIndex % activeAlerts.length];

  return (
    <div className="sm:hidden relative z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-850/80">
      {/* Sleek ultra-compact single-line micro ticker (22px height) */}
      <div className="px-2 py-0.5 flex items-center justify-between gap-1.5 text-xs h-6">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center gap-1.5 overflow-hidden text-left focus:outline-none min-w-0"
        >
          <span className="shrink-0 scale-75">{current.icon}</span>
          <span
            className={`text-[8px] font-mono uppercase tracking-wider px-1 py-0.2 rounded font-black border shrink-0 ${current.badgeColor}`}
          >
            {current.badge}
          </span>
          <p className="text-[10px] text-neutral-300 truncate font-medium flex-1">
            {current.text}
          </p>
        </button>

        <div className="flex items-center gap-1 shrink-0 text-neutral-400">
          {activeAlerts.length > 1 && (
            <div className="flex items-center gap-0.5 bg-neutral-900/60 px-1 py-0.5 rounded border border-neutral-800/60">
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev - 1 + activeAlerts.length) % activeAlerts.length)
                }
                className="p-0.5 hover:text-white"
                title="Previous"
              >
                <ChevronLeft className="w-2.5 h-2.5" />
              </button>
              <span className="text-[8.5px] font-mono text-neutral-400 px-0.5">
                {currentIndex + 1}/{activeAlerts.length}
              </span>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev + 1) % activeAlerts.length)}
                className="p-0.5 hover:text-white"
                title="Next"
              >
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-neutral-500 hover:text-neutral-300 rounded"
            title="Dismiss"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Expanded Drawer showing all active alerts */}
      {isExpanded && (
        <div className="p-3 bg-neutral-900 border-t border-neutral-800 space-y-2 animate-in fade-in max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800 text-[11px] font-bold text-neutral-300">
            <span>Store Live Updates ({activeAlerts.length})</span>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-neutral-500 hover:text-white text-[10px]"
            >
              Close
            </button>
          </div>
          {activeAlerts.map((alt) => (
            <div
              key={alt.id}
              className="p-2 rounded-lg bg-neutral-950 border border-neutral-850 flex items-start gap-2 text-xs"
            >
              <span className="mt-0.5 shrink-0">{alt.icon}</span>
              <div className="flex-1">
                <span
                  className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded font-bold border inline-block mb-1 ${alt.badgeColor}`}
                >
                  {alt.badge}
                </span>
                <p className="text-[11px] text-neutral-300">{alt.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
