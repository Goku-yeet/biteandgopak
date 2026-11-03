import React, { useState, useEffect } from 'react';
import { CustomerWidgetsConfig, StoreSettings } from '../../types';
import { StorageService } from '../../utils/storage';
import {
  Sparkles,
  MapPin,
  Flame,
  Clock,
  CloudRain,
  ChevronLeft,
  ChevronRight,
  X,
  Radio,
  Zap,
} from 'lucide-react';
import {
  AnnouncementBarHUD,
  ExpressRiderFleetLiveTickerHUD,
  NightOwlDealBannerHUD,
  DeliveryZonePillHUD,
  SpecialHoursNoticeHUD,
  MonsoonRainAlertHUD,
  RushHourAlertHUD,
  LiveOrderCounterHUD,
  LiveVisitorCounterHUD,
  BiteClubPointsTickerHUD,
  LiveKitchenCamNoticeHUD,
} from './CustomerWidgets';

interface UnifiedTopBarHUDProps {
  config?: CustomerWidgetsConfig;
}

interface AlertItem {
  id: string;
  icon: React.ReactNode;
  badge: string;
  badgeClass: string;
  text: string;
  themeClass: string;
}

export const UnifiedTopBarHUD: React.FC<UnifiedTopBarHUDProps> = ({ config }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // If user explicitly chose legacy 'stacked' mode in Website HUD Manager, render stacked items
  if (config?.topBarDisplayMode === 'stacked') {
    return (
      <div className="hidden sm:block">
        <AnnouncementBarHUD config={config} />
        <ExpressRiderFleetLiveTickerHUD config={config} />
        <NightOwlDealBannerHUD config={config} />
        <DeliveryZonePillHUD config={config} />
        <SpecialHoursNoticeHUD config={config} />
        <MonsoonRainAlertHUD config={config} />
        <RushHourAlertHUD config={config} />
        <LiveOrderCounterHUD config={config} />
        <LiveVisitorCounterHUD config={config} />
        <BiteClubPointsTickerHUD config={config} />
        <LiveKitchenCamNoticeHUD config={config} />
      </div>
    );
  }

  if (!config || isDismissed) return null;

  // Compile active alerts based on enabled flags
  const items: AlertItem[] = [];

  if (config.announcementBarEnabled && config.announcementText) {
    items.push({
      id: 'announcement',
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
      badge: config.announcementBadge || 'LIMITED TIME',
      badgeClass: 'bg-neutral-950 text-amber-400 border border-amber-500/40',
      text: config.announcementText,
      themeClass:
        config.announcementTheme === 'emerald'
          ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 text-neutral-950 font-bold'
          : config.announcementTheme === 'crimson'
          ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-bold'
          : config.announcementTheme === 'indigo'
          ? 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-700 text-white font-bold'
          : config.announcementTheme === 'dark'
          ? 'bg-neutral-900 border-b border-neutral-800 text-neutral-200 font-medium'
          : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-neutral-950 font-bold',
    });
  }

  if (config.showGoogleMapsRiderLiveTicker) {
    items.push({
      id: 'rider',
      icon: <MapPin className="w-3.5 h-3.5 text-emerald-400" />,
      badge: 'EXPRESS FLEET',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      text: config.googleMapsRiderTickerText || 'Express Delivery Fleet Active: Instant Hot Dispatch across North Nazimabad',
      themeClass: 'bg-neutral-900 border-b border-emerald-500/25 text-neutral-200 font-medium',
    });
  }

  if (Boolean(config.showRushHourAlert)) {
    items.push({
      id: 'rush_hour',
      icon: <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />,
      badge: 'RUSH HOUR',
      badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30',
      text: config.rushHourText || 'Dinner Rush Active: Kitchen is smashing fresh patties at full speed!',
      themeClass: 'bg-neutral-900 border-b border-red-500/25 text-neutral-200 font-medium',
    });
  }

  if (config.showMonsoonRainAlert) {
    items.push({
      id: 'monsoon',
      icon: <CloudRain className="w-3.5 h-3.5 text-cyan-400" />,
      badge: 'WEATHER ALERT',
      badgeClass: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
      text: config.monsoonRainText || 'Karachi Weather Alert: Delivery riders moving with extra care in wet areas.',
      themeClass: 'bg-cyan-950/80 border-b border-cyan-800/40 text-cyan-100 font-medium',
    });
  }



  if (config.showBiteClubPointsTicker) {
    items.push({
      id: 'bite_club',
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
      badge: 'BITE CLUB VIP',
      badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      text: config.biteClubPointsText || '2X Loyalty Points Active: Order any Smash Burger today to earn bonus perks!',
      themeClass: 'bg-neutral-900 border-b border-amber-500/25 text-neutral-200 font-medium',
    });
  }

  if (config.showLiveKitchenCamNotice) {
    items.push({
      id: 'kitchen_cam',
      icon: <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />,
      badge: 'LIVE STATION',
      badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30',
      text: config.liveKitchenCamText || 'Live Kitchen Griddle Feed: 4 Patties Sizzling on Chrome Flat-Top',
      themeClass: 'bg-neutral-900 border-b border-red-500/20 text-neutral-200 font-medium',
    });
  }

  if (config.showNightOwlDealBanner) {
    items.push({
      id: 'night_owl',
      icon: <Clock className="w-3.5 h-3.5 text-purple-400" />,
      badge: 'NIGHT OWL',
      badgeClass: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      text: config.nightOwlDealText || 'Late Night Cravings: Fast midnight delivery across Karachi!',
      themeClass: 'bg-neutral-900 border-b border-purple-500/25 text-neutral-200 font-medium',
    });
  }

  if (config.showSpecialHoursNotice) {
    items.push({
      id: 'special_hours',
      icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
      badge: 'SPECIAL HOURS',
      badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      text: config.specialHoursNoticeText || 'Operating Hours: 12:00 PM to 04:00 AM Daily',
      themeClass: 'bg-neutral-900 border-b border-neutral-800 text-neutral-200 font-medium',
    });
  }

  // If no items enabled, render nothing
  if (items.length === 0) return null;

  // Auto rotate when multiple items
  useEffect(() => {
    if (items.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [items.length, isPaused]);

  // Ensure index in bounds
  const activeItem = items[currentIndex % items.length];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`hidden sm:block relative z-40 px-3 py-2 text-xs transition-colors duration-300 shadow-sm ${activeItem.themeClass}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Navigation Prev Button (only if multiple) */}
        {items.length > 1 ? (
          <button
            type="button"
            onClick={handlePrev}
            className="p-1 rounded hover:bg-black/20 text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
            title="Previous alert"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center gap-2.5 text-center min-w-0">
          <span className="shrink-0">{activeItem.icon}</span>
          {activeItem.badge && (
            <span
              className={`text-[9.5px] font-mono uppercase tracking-wider px-2 py-0.5 rounded font-extrabold shrink-0 ${activeItem.badgeClass}`}
            >
              {activeItem.badge}
            </span>
          )}
          <span className="truncate sm:whitespace-normal font-sans font-medium">
            {activeItem.text}
          </span>
          {items.length > 1 && (
            <div className="hidden lg:flex items-center gap-1 ml-2 shrink-0">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex % items.length
                      ? 'w-4 bg-current opacity-90'
                      : 'w-1.5 bg-current opacity-30 hover:opacity-60'
                  }`}
                  title={`View alert ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Controls: Next & Dismiss */}
        <div className="flex items-center gap-1 shrink-0">
          {items.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded hover:bg-black/20 text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              title="Next alert"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                const currentId = activeItem?.id;
                if (currentId) {
                  const dismissMap: Record<string, Partial<CustomerWidgetsConfig>> = {
                    announcement: { announcementBarEnabled: false },
                    bite_club: { showBiteClubPointsTicker: false },
                    rush_hour: { showRushHourAlert: false },
                    rider: { showGoogleMapsRiderLiveTicker: false },
                    kitchen_cam: { showLiveKitchenCamNotice: false },
                    night_owl: { showNightOwlDealBanner: false },
                    special_hours: { showSpecialHoursNotice: false },
                    live_counter: { showLiveOrderCounter: false },
                    monsoon: { showMonsoonRainAlert: false },
                  };
                  const patch = dismissMap[currentId];
                  if (patch && StorageService && typeof StorageService.updateWidgetConfig === 'function') {
                    StorageService.updateWidgetConfig(patch).catch(() => {});
                  }
                }
                setIsDismissed(true);
              } catch (err) {
                console.warn('Banner dismiss error handled:', err);
                setIsDismissed(true);
              }
            }}
            className="p-1 rounded hover:bg-black/20 text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer ml-1"
            title="Dismiss top banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
