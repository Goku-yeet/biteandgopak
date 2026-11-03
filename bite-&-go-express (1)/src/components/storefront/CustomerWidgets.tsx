import React, { useState } from 'react';
import { CustomerWidgetsConfig, Order, StoreSettings, MenuItem, CustomerTicket, CustomerUser } from '../../types';
import {
  Flame,
  Clock,
  Sparkles,
  Award,
  PhoneCall,
  Ticket,
  HelpCircle,
  X,
  MessageCircle,
  ChefHat,
  Tag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  CloudRain,
  Zap,
  Star,
  ShoppingBag,
  RotateCcw,
  Radio,
} from 'lucide-react';

interface CustomerWidgetsProps {
  settings: StoreSettings;
  orders: Order[];
  menuItems: MenuItem[];
  onOpenTracker: () => void;
  onOpenCreateTicket: () => void;
  onSelectDealItem?: (item: MenuItem) => void;
}

export const AnnouncementBarHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = ({ config }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!config || !config.announcementBarEnabled || isDismissed) {
    return null;
  }

  const themeStyles = {
    amber: 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-neutral-950 font-bold',
    emerald: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 text-neutral-950 font-bold',
    crimson: 'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-bold',
    indigo: 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-700 text-white font-bold',
    dark: 'bg-neutral-900 border-b border-neutral-800 text-neutral-200 font-medium',
  };

  const badgeStyles = {
    amber: 'bg-neutral-950 text-amber-400',
    emerald: 'bg-neutral-950 text-emerald-400',
    crimson: 'bg-white text-red-700',
    indigo: 'bg-white text-indigo-800',
    dark: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  };

  return (
    <div
      className={`relative z-40 px-4 py-2 text-xs flex items-center justify-between shadow-md transition-all ${
        themeStyles[config.announcementTheme || 'amber']
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5 text-center flex-1 pr-6">
        {config.announcementBadge && (
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded font-extrabold shadow-sm shrink-0 ${
              badgeStyles[config.announcementTheme || 'amber']
            }`}
          >
            {config.announcementBadge}
          </span>
        )}
        <span className="truncate sm:whitespace-normal font-sans">
          {config.announcementText}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="opacity-70 hover:opacity-100 p-1 rounded transition-opacity shrink-0"
        title="Dismiss banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const LiveKitchenStatusWidget: React.FC<{
  config?: CustomerWidgetsConfig;
  orders: Order[];
}> = ({ config, orders }) => {
  if (!config || !config.showLiveKitchenStatus) {
    return null;
  }

  const activePreparingCount = orders.filter((o) => o.status === 'preparing').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div className="rounded-xl bg-neutral-900/90 border border-neutral-800 p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 shrink-0">
            <Flame className="w-4 h-4 fill-red-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Live Kitchen Station
              </span>
              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded font-bold">
                {activePreparingCount > 0 ? `${activePreparingCount} On The Grill` : 'Station Ready'}
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-0.5">
              {config.kitchenStatusCustomText ||
                (activePreparingCount > 0
                  ? `High energy on the chrome flat-top! ${activePreparingCount} orders currently grilling. Avg prep ~12-15 mins.`
                  : 'Grills are hot & prepped. Orders placed right now go straight onto the flame!')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono ml-auto">
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Avg Wait: <strong className="text-amber-400">14m</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accepting Orders</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DealOfTheDayWidget: React.FC<{
  config?: CustomerWidgetsConfig;
  menuItems: MenuItem[];
  onSelectDealItem?: (item: MenuItem) => void;
}> = ({ config, menuItems, onSelectDealItem }) => {
  if (!config || !config.showDealOfTheDay) {
    return null;
  }

  const dealItem = config.dealItemId
    ? menuItems.find((i) => i.id === config.dealItemId)
    : menuItems.find((i) => i.categoryId === 'cat-combos' || i.isBestseller) || menuItems[0];

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-1.5 sm:py-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/40 border border-amber-500/30 p-2.5 sm:p-6 shadow-lg">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 sm:gap-5">
          <div className="space-y-1 sm:space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-amber-400 text-neutral-950 shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3 fill-neutral-950" />
                <span>{config.dealBadge || "CHEF'S SPECIAL"}</span>
              </span>
              {config.dealDiscountText && (
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
                  {config.dealDiscountText}
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-2xl font-heading font-black text-white tracking-tight">
              {config.dealTitle || 'Signature Double Smash Combo Special'}
            </h3>

            <p className="text-[11px] sm:text-sm text-neutral-300 leading-relaxed line-clamp-2 sm:line-clamp-none">
              {config.dealDescription ||
                'Two juicy smashed patties, aged melted cheddar, caramelized onions, toasted brioche & loaded fries.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-end">
            {dealItem && onSelectDealItem && (
              <button
                type="button"
                onClick={() => onSelectDealItem(dealItem)}
                className="w-full sm:w-auto px-3.5 py-1.5 sm:px-5 sm:py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 hover:scale-102 transition-all cursor-pointer"
              >
                <span>View Deal ({dealItem.name})</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const LoyaltyClubBanner: React.FC<{
  config?: CustomerWidgetsConfig;
}> = ({ config }) => {
  if (!config || !config.showLoyaltyBanner) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-1 sm:py-3">
      <div className="rounded-xl bg-gradient-to-r from-neutral-900 to-indigo-950/40 border border-indigo-500/25 p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 shadow-md">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>{config.loyaltyHeadline || '🎁 Bite & Go Loyalty Club'}</span>
            </h4>
            <p className="text-[10px] sm:text-xs text-neutral-300 mt-0.5 line-clamp-1 sm:line-clamp-none">
              {config.loyaltySubtext || 'Order 3 times this month to unlock a complimentary Gourmet Lotus Biscoff Shake!'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-indigo-300 bg-neutral-950 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-indigo-500/30 shrink-0">
          <span>Tier: VIP Foodie 🌟</span>
        </div>
      </div>
    </div>
  );
};

export const FloatingCustomerHelpBubble: React.FC<{
  config?: CustomerWidgetsConfig;
  settings: StoreSettings;
  onOpenTracker: () => void;
  onOpenCreateTicket: () => void;
  onOpenTicketChat?: (ticket: CustomerTicket) => void;
  activeTicket?: CustomerTicket | null;
}> = ({ config, settings, onOpenTracker, onOpenCreateTicket, onOpenTicketChat, activeTicket }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!config || !config.showQuickHelpBubble) {
    return null;
  }

  const whatsappClean = (settings.whatsappNumber || '+923012945576').replace(/[^0-9]/g, '');

  return (
    <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-72 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-4 text-xs space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white">Bite &amp; Go Customer Care</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            {activeTicket && activeTicket.status !== 'closed' && onOpenTicketChat && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenTicketChat(activeTicket);
                }}
                className="w-full text-left px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Talk Back ({activeTicket.id})</span>
                </span>
                <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded font-mono uppercase">
                  {activeTicket.status}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenTracker();
              }}
              className="w-full text-left px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-white font-medium flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Track My Active Order</span>
              </span>
              <ArrowRight className="w-3 h-3 text-neutral-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenCreateTicket();
              }}
              className="w-full text-left px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-amber-400 hover:text-amber-300 font-medium flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Ticket className="w-3.5 h-3.5" />
                <span>Report Issue / Support Ticket</span>
              </span>
              <ArrowRight className="w-3 h-3 text-neutral-400" />
            </button>

            <a
              href={`https://wa.me/${whatsappClean}?text=Hello%20Bite%20%26%20Go%20Support,%20I%20have%20an%20inquiry.`}
              target="_blank"
              rel="noreferrer"
              className="w-full text-left px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/80 text-emerald-300 font-medium flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Chat via WhatsApp Hotline</span>
              </span>
              <ArrowRight className="w-3 h-3 text-emerald-400" />
            </a>

            <a
              href={`tel:${settings.contactPhone || '+923012945576'}`}
              className="w-full text-left px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-medium flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-neutral-400" />
                <span>Call Helpline: {settings.contactPhone || '+923012945576'}</span>
              </span>
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-full shadow-2xl shadow-amber-500/30 hover:scale-105 transition-all cursor-pointer"
        title="Open Bite & Go Customer Care"
      >
        <HelpCircle className="w-4 h-4 fill-neutral-950" />
        <span className="font-heading font-black tracking-wide">Quick Help</span>
      </button>
    </div>
  );
};

export const FreeDeliveryGoalMeterHUD: React.FC<{
  config?: CustomerWidgetsConfig;
  cartTotal: number;
  freeDeliveryThreshold?: number;
}> = ({ config, cartTotal, freeDeliveryThreshold = 1500 }) => {
  // Only display if explicitly enabled by manager and cart has items
  if (!config || !config.showFreeDeliveryGoalMeter || cartTotal === 0) {
    return null;
  }

  const effectiveThreshold = config.freeDeliveryGoalAmount || freeDeliveryThreshold || 1500;
  const remaining = Math.max(0, effectiveThreshold - cartTotal);
  const percent = Math.min(100, Math.round((cartTotal / effectiveThreshold) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-base">🛵</span>
          <div>
            {remaining > 0 ? (
              <p className="text-neutral-200">
                {config.freeDeliveryGoalCustomText ? (
                  <span>{config.freeDeliveryGoalCustomText.replace('{remaining}', `Rs. ${remaining.toLocaleString()}`)}</span>
                ) : (
                  <>
                    Add <strong className="text-amber-400 font-mono">Rs. {remaining.toLocaleString()}</strong> more to your bag to unlock{' '}
                    <strong className="text-emerald-400">FREE Express Delivery!</strong>
                  </>
                )}
              </p>
            ) : (
              <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Congratulations! Your order qualifies for FREE Express Delivery in Karachi!</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:w-48 shrink-0">
          <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
            <div
              className={`h-full transition-all duration-300 ${
                percent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-neutral-400 font-bold shrink-0">{percent}%</span>
        </div>
      </div>
    </div>
  );
};

export const RushHourAlertHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = ({ config }) => {
  if (!config || !config.showRushHourAlert) {
    return null;
  }

  const text = config.rushHourText || 'Active Kitchen: Fresh hand-smashed orders prepared in ~12-15 mins';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5">
      <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-mono font-bold text-amber-400 uppercase tracking-wider text-[10px]">
            Live Dispatch Notice:
          </span>
          <span className="text-neutral-300">{text}</span>
        </div>
        <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline">
          Branch: North Nazimabad Block-I
        </span>
      </div>
    </div>
  );
};

export const SatisfactionGuaranteeHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = ({ config }) => {
  if (!config || config.showSatisfactionGuarantee === false) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-white block text-[11px]">100% Halal Certified</span>
            <span className="text-[10px] text-neutral-400">Strictly hand-slaughtered prime beef</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-2.5">
          <Flame className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-white block text-[11px]">Smashed Fresh to Order</span>
            <span className="text-[10px] text-neutral-400">Never pre-cooked or frozen patties</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <span className="font-bold text-white block text-[11px]">Sealed Thermal Delivery</span>
            <span className="text-[10px] text-neutral-400">Tamper-evident hot insulated packaging</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ExpressRiderFleetLiveTickerHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = ({ config }) => {
  if (!config || !config.showGoogleMapsRiderLiveTicker) {
    return null;
  }

  const text =
    config.googleMapsRiderTickerText ||
    '🛵 Express Rider Fleet Active: Instant Delivery Dispatch across North Nazimabad, Hyderi, Buffer Zone & FB Area';

  return (
    <div className="bg-neutral-950/95 border-b border-neutral-850 px-4 py-1.5 text-xs text-neutral-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>Express Fleet:</span>
          </span>
          <span className="truncate text-neutral-200 text-xs">{text}</span>
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0 text-[11px] text-neutral-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>Central Hub: Block-I North Nazimabad</span>
        </div>
      </div>
    </div>
  );
};

// Backwards-compatible export alias
export const GoogleMapsRiderLiveTickerHUD = ExpressRiderFleetLiveTickerHUD;

export const MonsoonRainAlertHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = ({ config }) => {
  if (!config || !config.showMonsoonRainAlert) {
    return null;
  }

  const text =
    config.monsoonRainText ||
    '🌧️ Karachi Weather Alert: Delivery riders moving with extra care in wet areas. Slight delays possible.';

  return (
    <div className="bg-cyan-950/40 border-y border-cyan-800/40 px-4 py-2 text-xs text-cyan-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CloudRain className="w-4 h-4 text-cyan-400 shrink-0 animate-bounce" />
          <span className="font-semibold">{text}</span>
        </div>
        <span className="text-[10px] font-mono text-cyan-300/80 bg-cyan-900/50 px-2 py-0.5 rounded shrink-0 hidden sm:inline">
          Rider Safety Protocol Active
        </span>
      </div>
    </div>
  );
};

export const LiveOrderCounterHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = () => {
  return null;
};

export const CustomerFeedbackBannerHUD: React.FC<{
  config?: CustomerWidgetsConfig;
  onOpenFeedback?: () => void;
}> = () => {
  // Removed per customer storefront request
  return null;
};

export const LiveVisitorCounterHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = ({ config }) => {
  if (!config || !config.showLiveVisitorCounter) return null;
  const text = config.liveVisitorText || '👥 24 Karachi foodies browsing the menu right now';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
      <div className="px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-neutral-300">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-[11px] sm:text-xs">{text}</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
          LIVE DEMAND
        </span>
      </div>
    </div>
  );
};

export const NightOwlDealBannerHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = ({ config }) => {
  if (!config || !config.showNightOwlDealBanner) return null;
  const text = config.nightOwlDealText || '🌙 Midnight Craving Deal: 15% off all Double Smash Combos after 11 PM! Fresh on the grill until 3 AM.';

  return (
    <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/70 to-indigo-950/80 border-b border-indigo-500/30 px-4 py-1.5 text-xs text-indigo-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">🌙</span>
          <span className="font-semibold text-white">{text}</span>
        </div>
        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-500/30 font-bold shrink-0 hidden sm:inline">
          LATE NIGHT SERVICE
        </span>
      </div>
    </div>
  );
};

export const DeliveryZonePillHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = ({ config }) => {
  if (!config || !config.showDeliveryZonePill) return null;
  const text = config.deliveryZoneText || '📍 Fast 30-min express delivery in North Nazimabad Blocks A–W, Hyderi, Buffer Zone & FB Area';

  return (
    <div className="bg-neutral-900/90 border-b border-neutral-800 px-4 py-1.5 text-xs text-neutral-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate text-neutral-200 font-medium">{text}</span>
        </div>
        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-bold border border-amber-500/20 shrink-0">
          30-MIN ETA
        </span>
      </div>
    </div>
  );
};

export const SpecialHoursNoticeHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = ({ config }) => {
  if (!config || !config.showSpecialHoursNotice) return null;
  const text = config.specialHoursNoticeText || '✨ Special Hours Active: Kitchen taking late orders until 3:30 AM tonight!';

  return (
    <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-semibold">{text}</span>
        </div>
        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
          EXTENDED LINE
        </span>
      </div>
    </div>
  );
};

export const BiteClubPointsTickerHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = ({ config }) => {
  if (!config || !config.showBiteClubPointsTicker) return null;
  const text = config.biteClubPointsText || '⭐ 2X Loyalty Points Active: Order any Smash Burger today to earn bonus perks!';

  return (
    <div className="bg-gradient-to-r from-amber-950/70 via-neutral-900 to-amber-950/70 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
          <span className="truncate text-white font-medium">{text}</span>
        </div>
        <span className="text-[10px] font-mono text-neutral-950 bg-amber-400 px-2 py-0.5 rounded font-extrabold shrink-0 shadow-sm">
          BITE CLUB VIP
        </span>
      </div>
    </div>
  );
};

export const LiveKitchenCamNoticeHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = ({ config }) => {
  if (!config || !config.showLiveKitchenCamNotice) return null;
  const text = config.liveKitchenCamText || '🔴 Live Kitchen Griddle Feed: 4 Patties Sizzling on Chrome Flat-Top';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5">
      <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-red-500/30 flex items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="font-mono font-bold text-red-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
            <Radio className="w-3 h-3 text-red-400" />
            LIVE STATION:
          </span>
          <span className="text-neutral-200 font-medium">{text}</span>
        </div>
        <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline">
          Smash Temp: 420°F
        </span>
      </div>
    </div>
  );
};

export const FreshBeefGuaranteeCardHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = () => {
  // Permanently disabled to remove fake branding / claims
  return null;
};

export const HalalAccreditationPillHUD: React.FC<{
  config?: CustomerWidgetsConfig;
}> = () => {
  // Permanently disabled: removed fake "Zero MSG" and "Pure Ghee" claims
  return null;
};

export const CustomerAccountPreviousOrdersBanner: React.FC<{
  activeCustomer: CustomerUser | null;
  orders: Order[];
  onOpenCustomerProfile: () => void;
  onOpenCustomerAuth: () => void;
  config?: CustomerWidgetsConfig;
}> = ({ activeCustomer, orders, onOpenCustomerProfile, onOpenCustomerAuth, config }) => {
  if (!config || !config.showPreviousOrdersWidget) return null;

  // If customer is signed up / logged in
  if (activeCustomer) {
    const customerOrders = orders.filter((o) => {
      const emailMatch =
        Boolean(activeCustomer.email && o.customerEmail && o.customerEmail.toLowerCase().trim() === activeCustomer.email.toLowerCase().trim());
      const phoneClean = activeCustomer.phone.replace(/[^0-9]/g, '');
      const orderPhoneClean = (o.customerPhone || '').replace(/[^0-9]/g, '');
      const phoneMatch = Boolean(phoneClean && orderPhoneClean && (phoneClean === orderPhoneClean || orderPhoneClean.endsWith(phoneClean) || phoneClean.endsWith(orderPhoneClean)));
      return emailMatch || phoneMatch;
    });

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white">
                  Welcome back, {activeCustomer.name.split(' ')[0]}!
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  {customerOrders.length} Previous Order{customerOrders.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {config?.previousOrdersWidgetText ||
                  'Check your previous order history, track active deliveries, and 1-click reorder your favorites.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={onOpenCustomerProfile}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:scale-102 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>View Previous Orders ({customerOrders.length})</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If NOT signed up, show an invite widget so they can sign up / log in to access previous orders
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5">
      <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-neutral-300">
          <ShoppingBag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Have a Bite &amp; Go account? <strong className="text-white">Sign In to check your previous orders</strong> &amp; reorder with 1-tap!
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenCustomerAuth}
          className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-bold rounded-lg text-xs shrink-0 transition-colors cursor-pointer"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};
