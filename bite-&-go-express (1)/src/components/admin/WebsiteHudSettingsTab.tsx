import React, { useState, useEffect, useRef } from 'react';
import {
  CustomerWidgetsConfig,
  MenuItem,
  Order,
  StoreSettings,
  Category,
  PosPermissionsConfig,
  DEFAULT_POS_PERMISSIONS,
} from '../../types';
import { initialCategories } from '../../data/initialMenu';
import { applyThemeToDocument, THEME_CONFIGS, ThemeAccent, THEME_PRESETS, ThemePresetId } from '../../utils/theme';
import { StorageService } from '../../utils/storage';
import { ApiService } from '../../utils/api';
import { DailyOperatingHoursEditor } from './DailyOperatingHoursEditor';
import {
  Monitor,
  Sparkles,
  Flame,
  Award,
  HelpCircle,
  Clock,
  Eye,
  CheckCircle2,
  Sliders,
  Palette,
  Layers,
  Save,
  RotateCcw,
  Check,
  Tag,
  ShieldCheck,
  MessageCircle,
  Ticket,
  Truck,
  HeartHandshake,
  Activity,
  MapPin,
  CloudRain,
  Zap,
  Star,
  MessageSquare,
  ChefHat,
  ShoppingBag,
  Radio,
  Image as ImageIcon,
  CreditCard,
  Lock,
  KeyRound,
  XCircle,
  AlertTriangle,
  Boxes,
  UtensilsCrossed,
} from 'lucide-react';

interface WebsiteHudSettingsTabProps {
  settings: StoreSettings;
  categories?: Category[];
  menuItems: MenuItem[];
  orders: Order[];
  onSaveWidgets: (updatedConfig: CustomerWidgetsConfig) => Promise<void>;
  onSaveStoreSettings?: (updatedSettings: Partial<StoreSettings>) => Promise<void>;
  onSavePosPermissions?: (updatedPerms: PosPermissionsConfig) => Promise<void> | void;
  onRefreshData: () => void;
}

const DEFAULT_CONFIG: CustomerWidgetsConfig = {
  topBarDisplayMode: 'unified',
  announcementBarEnabled: true,
  announcementText: '🔥 Flash Deal: Free Crinkle Fries on orders above Rs. 1,500! Use code BITEGO at checkout',
  announcementBadge: 'LIMITED TIME',
  announcementTheme: 'amber',
  showLiveKitchenStatus: true,
  kitchenStatusCustomText: 'Active Grill Station: 3-4 orders sizzling fresh right now • Avg prep time 12-15m',
  showDealOfTheDay: true,
  dealTitle: 'Chef Special: Double Smash Feast',
  dealDescription: 'Two fresh smashed prime beef patties, double Wisconsin cheddar, caramelized sweet onions & garlic aioli with fries.',
  dealBadge: "CHEF'S SPECIAL ⭐",
  dealDiscountText: 'Save Rs. 350 Today',
  dealItemId: 'item-combos-1',
  showLoyaltyBanner: true,
  loyaltyHeadline: '🎁 Bite & Go Loyalty Club',
  loyaltySubtext: 'Order 3 times this month to unlock a complimentary Gourmet Lotus Biscoff Shake!',
  showQuickHelpBubble: true,
  showQualityGuarantee: true,
  themeAccent: 'amber',
  layoutDensity: 'comfortable',
  showCalorieCounters: true,
  showSpicinessMeters: true,
  showCustomerTicketBar: true,
  showFreeDeliveryGoalMeter: false,
  freeDeliveryGoalAmount: 1800,
  freeDeliveryGoalCustomText: '',
  showRushHourAlert: false,
  rushHourText: 'Peak Smash Hours: Extra grill chefs on line · 12-15 mins prep',
  enableTickerAnimation: true,
  announcementSpeed: 'normal',
  showSatisfactionGuarantee: true,
  showRiderTrackingHud: true,
  showHalalCertificateBadge: true,
  showWhatsAppOrderWidget: true,
  whatsAppWidgetNumber: '+92 345 9821430',
  showSocialProofReviews: true,
  showLateNightBadge: true,
  showDealCountdownTimer: true,
  showGoogleMapsRiderLiveTicker: false,
  googleMapsRiderTickerText: '🛵 Express Rider Fleet Active: Instant Dispatch across North Nazimabad, Hyderi, Buffer Zone & FB Area',
  showMonsoonRainAlert: false,
  monsoonRainText: '🌧️ Karachi Weather Alert: Delivery riders moving with extra care in wet areas. Slight delays possible.',
  showFloatingQuickOrderWidget: true,
  showLiveOrderCounter: false,
  liveOrderCounterText: '🔥 38 orders prepared fresh today in North Nazimabad',
  showChefSpecialPin: true,
  chefSpecialCustomText: "CHEF'S TOP RECOMMENDATION · FRESH DAILY",
  showEstimatedPrepTimeBadge: true,
  estimatedPrepMinutes: 15,
  showCustomerFeedbackBanner: false,
  customerFeedbackHeadline: '💬 Help us stay Karachi’s #1 Smash Joint — Rate your meal!',
  hudCardGlassmorphism: true,
  // Big Chef's Signature Showcase & Hero Banner HUD Controls
  showChefSignatureShowcase: true,
  chefSignatureBadge: "CHEF'S SIGNATURE",
  chefSignatureDishTitle: 'Double Smash Melt & Fries',
  chefSignatureDishSubtitle: 'Aged cheddar · caramelized onions · secret relish',
  chefSignaturePrice: 'Rs. 990',
  chefSignatureImageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80',
  chefSignatureTagline: 'Starting at',
  chefSignatureChefName: "Chef Hassan's Signature",
  heroHeadline: 'Craving Real Smash Burgers & Loaded Crunch?',
  heroSubheadline: 'Crisp lacy beef edges, melted cheddar, Nashville hot fried chicken, and ice-cold Lotus Biscoff thick shakes delivered right to your doorstep in 30 minutes.',
  heroKickerText: 'Freshly Smashed on Order',
  heroDeliveryCitiesText: 'Karachi Express Hot Delivery',
  heroPrimaryButtonText: 'Order Now',
  heroSecondaryButtonText: 'Midnight & Duo Deals',
  heroBadge1Title: '35–50 Mins',
  heroBadge1Subtitle: 'Express Delivery',
  heroBadge2Title: 'EasyPaisa',
  heroBadge2Subtitle: 'Instant Trx Verify',
  heroBadge3Title: '100% Fresh',
  heroBadge3Subtitle: 'Never Frozen Beef',
  showNightOwlDealBanner: false,
  nightOwlDealText: '🌙 Midnight Craving Deal: 15% off all Double Smash Combos after 11 PM! Fresh on the grill until 3 AM.',
  showDeliveryZonePill: false,
  deliveryZoneText: '📍 Fast 30-min express delivery in North Nazimabad Blocks A–W, Hyderi & Buffer Zone',
  showSpecialHoursNotice: false,
  specialHoursNoticeText: '✨ Special Hours Active: Kitchen taking late orders until 3:30 AM tonight!',
  showLiveVisitorCounter: false,
  liveVisitorText: '👥 24 Karachi foodies browsing the menu right now',
  // More Interactive Widgets
  showBiteClubPointsTicker: false,
  biteClubPointsText: '⭐ 2X Loyalty Points Active: Order any Smash Burger today to earn bonus perks!',
  showLiveKitchenCamNotice: false,
  liveKitchenCamText: '🔴 Live Kitchen Griddle Feed: 4 Patties Sizzling on Chrome Flat-Top',
  showFreshBeefGuaranteeCard: false,
  showHalalAccreditationPill: false,
  showFreeDeliveryProgressBanner: true,
  showPreviousOrdersWidget: false,
  previousOrdersWidgetText: '📦 Quick Reorder: Check your previous orders & 1-click reorder from your account!',
};

export const WebsiteHudSettingsTab: React.FC<WebsiteHudSettingsTabProps> = ({
  settings,
  categories,
  menuItems,
  orders,
  onSaveWidgets,
  onSaveStoreSettings,
  onSavePosPermissions,
  onRefreshData,
}) => {
  const [config, setConfig] = useState<CustomerWidgetsConfig>(
    settings.customerWidgets || DEFAULT_CONFIG
  );
  const [currentStoreSettings, setCurrentStoreSettings] = useState<StoreSettings>(settings);
  const [posPerms, setPosPerms] = useState<PosPermissionsConfig>({
    ...DEFAULT_POS_PERMISSIONS,
    ...(settings.posPermissions || {}),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isEmployeeSaving, setIsEmployeeSaving] = useState(false);
  const [showEmployeeSavedToast, setShowEmployeeSavedToast] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'desktop' | 'mobile' | 'employee_pos'>('desktop');
  const isDirtyRef = useRef(false);

  useEffect(() => {
    if (settings && !isDirtyRef.current) {
      if (settings.customerWidgets) {
        setConfig(settings.customerWidgets);
      }
      setCurrentStoreSettings((prev) => {
        const preservedMode = prev?.scheduleOverrideMode || settings.scheduleOverrideMode;
        return {
          ...settings,
          scheduleOverrideMode: preservedMode,
        };
      });
      if (settings.posPermissions) {
        setPosPerms({
          ...DEFAULT_POS_PERMISSIONS,
          ...settings.posPermissions,
        });
      }
    }
  }, [settings]);

  const allCategories = categories && categories.length > 0 ? categories : initialCategories;

  const isGrillCategoryHidden = (posPerms.hiddenCategoryIdsForEmployees || []).includes('cat-smash');

  const handleToggleCategoryVisibility = (catId: string) => {
    const currentHidden = posPerms.hiddenCategoryIdsForEmployees || [];
    const isHidden = currentHidden.includes(catId);
    const updatedHidden = isHidden
      ? currentHidden.filter((id) => id !== catId)
      : [...currentHidden, catId];

    const updated: PosPermissionsConfig = {
      ...posPerms,
      hiddenCategoryIdsForEmployees: updatedHidden,
    };
    setPosPerms(updated);
    setCurrentStoreSettings((prev) => ({
      ...prev,
      posPermissions: updated,
    }));
  };

  const handleSetGrillCategoryState = (turnOff: boolean) => {
    const currentHidden = posPerms.hiddenCategoryIdsForEmployees || [];
    const updatedHidden = turnOff
      ? Array.from(new Set([...currentHidden, 'cat-smash']))
      : currentHidden.filter((id) => id !== 'cat-smash');

    const updated: PosPermissionsConfig = {
      ...posPerms,
      hiddenCategoryIdsForEmployees: updatedHidden,
    };
    setPosPerms(updated);
    setCurrentStoreSettings((prev) => ({
      ...prev,
      posPermissions: updated,
    }));
  };

  const handleShowAllCategoriesForStaff = () => {
    const updated: PosPermissionsConfig = {
      ...posPerms,
      hiddenCategoryIdsForEmployees: [],
    };
    setPosPerms(updated);
    setCurrentStoreSettings((prev) => ({
      ...prev,
      posPermissions: updated,
    }));
  };

  const handleTogglePosPerm = (key: keyof PosPermissionsConfig) => {
    if (typeof posPerms[key] === 'boolean') {
      const updated: PosPermissionsConfig = {
        ...posPerms,
        [key]: !posPerms[key],
      };
      setPosPerms(updated);
      setCurrentStoreSettings((prev) => ({
        ...prev,
        posPermissions: updated,
      }));
    }
  };

  const handleSaveEmployeePermsDirectly = async () => {
    setIsEmployeeSaving(true);
    const current = StorageService.getSettings();
    const merged: StoreSettings = {
      ...current,
      ...currentStoreSettings,
      customerWidgets: {
        ...(current.customerWidgets || {}),
        ...config,
      },
      posPermissions: posPerms,
    };
    await StorageService.saveSettings(merged);
    try {
      await ApiService.updateSettings(merged);
    } catch {}

    if (onSavePosPermissions) {
      await onSavePosPermissions(posPerms);
    }
    if (onSaveStoreSettings) {
      await onSaveStoreSettings(merged);
    }
    isDirtyRef.current = false;
    window.dispatchEvent(new Event('bg_data_updated'));
    setIsEmployeeSaving(false);
    setShowEmployeeSavedToast(true);
    setTimeout(() => setShowEmployeeSavedToast(false), 3000);
    onRefreshData();
  };

  const handleToggle = (key: keyof CustomerWidgetsConfig) => {
    isDirtyRef.current = true;
    setConfig((prev) => {
      const currentVal = prev[key];
      const defaultsTrue: (keyof CustomerWidgetsConfig)[] = [
        'announcementBarEnabled',
        'showLiveKitchenStatus',
        'showDealOfTheDay',
        'showLoyaltyBanner',
        'showQuickHelpBubble',
        'showQualityGuarantee',
        'showCalorieCounters',
        'showSpicinessMeters',
        'showCustomerTicketBar',
        'showFreeDeliveryGoalMeter',
        'showSatisfactionGuarantee',
        'showRiderTrackingHud',
        'showHalalCertificateBadge',
        'showWhatsAppOrderWidget',
        'showSocialProofReviews',
        'showLateNightBadge',
        'showDealCountdownTimer',
        'showFloatingQuickOrderWidget',
        'showChefSpecialPin',
        'showEstimatedPrepTimeBadge',
        'showChefSignatureShowcase',
      ];
      const isCurrentlyActive = currentVal !== undefined ? Boolean(currentVal) : defaultsTrue.includes(key);
      const nextVal = !isCurrentlyActive;
      const nextConfig = {
        ...prev,
        [key]: nextVal,
      };

      // Immediate auto-persistence to ensure toggle changes never fail to save
      try {
        const cur = StorageService.getSettings();
        const merged: StoreSettings = {
          ...cur,
          customerWidgets: {
            ...(cur.customerWidgets || {}),
            ...nextConfig,
          },
        };
        StorageService.saveSettings(merged);
        if (onSaveWidgets) {
          onSaveWidgets(nextConfig);
        }
      } catch (e) {
        console.warn('Auto-save toggle error:', e);
      }

      return nextConfig;
    });
  };

  const handleCleanClutter = () => {
    isDirtyRef.current = true;
    setConfig((prev) => ({
      ...prev,
      topBarDisplayMode: 'unified',
      announcementBarEnabled: true,
      showRushHourAlert: false,
      showGoogleMapsRiderLiveTicker: false,
      showLiveOrderCounter: false,
      showBiteClubPointsTicker: false,
      showLiveKitchenCamNotice: false,
      showNightOwlDealBanner: false,
      showDeliveryZonePill: false,
      showSpecialHoursNotice: false,
      showMonsoonRainAlert: false,
      showLiveVisitorCounter: false,
      showPreviousOrdersWidget: false,
      showFreshBeefGuaranteeCard: false,
      showHalalAccreditationPill: false,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const current = StorageService.getSettings();
    const merged: StoreSettings = {
      ...current,
      ...currentStoreSettings,
      customerWidgets: {
        ...(current.customerWidgets || {}),
        ...config,
      },
      posPermissions: posPerms,
    };
    await StorageService.saveSettings(merged);
    try {
      await ApiService.updateSettings(merged);
    } catch {}

    if (onSaveWidgets) {
      await onSaveWidgets(config);
    }
    if (onSaveStoreSettings) {
      await onSaveStoreSettings(merged);
    }
    if (onSavePosPermissions) {
      await onSavePosPermissions(posPerms);
    }
    isDirtyRef.current = false;
    window.dispatchEvent(new Event('bg_data_updated'));
    setIsSaving(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
    onRefreshData();
  };

  const handleResetDefaults = () => {
    isDirtyRef.current = true;
    setConfig({ ...DEFAULT_CONFIG });
  };

  const activeWidgets = [
    config.announcementBarEnabled,
    config.showChefSignatureShowcase !== false,
    config.showLiveKitchenStatus,
    config.showDealOfTheDay,
    config.showLoyaltyBanner,
    config.showQuickHelpBubble,
    config.showQualityGuarantee,
    config.showCustomerTicketBar !== false,
    config.showFreeDeliveryGoalMeter !== false,
    Boolean(config.showRushHourAlert),
    config.showBiteClubPointsTicker !== false,
    config.showLiveKitchenCamNotice !== false,
    config.showPreviousOrdersWidget !== false,
  ];
  const activeWidgetCount = activeWidgets.filter(Boolean).length;
  const totalWidgetCount = activeWidgets.length;

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/30 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-heading font-black text-white">
                Website HUD &amp; Customer Widgets Manager
              </h2>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                Manager HUD
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Customize the storefront HUD, toggle real-time widgets in the customer area, and set visual promotional banners.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCleanClutter}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-850 text-amber-300 hover:text-white text-xs font-bold rounded-xl border border-neutral-750 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Disable stacked banners and keep only the primary flash deal"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Clean Top Clutter</span>
          </button>

          <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 text-xs text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active: <strong className="text-white font-mono">{activeWidgetCount}/{totalWidgetCount}</strong></span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : showSavedToast ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved to Storefront!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Apply to Website</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showSavedToast && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Website HUD and Customer Widgets successfully saved! Live storefront updated.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Configuration Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: Top Announcement Bar HUD */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  1. Top Announcement Bar &amp; Ticker HUD
                </h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.announcementBarEnabled}
                  onChange={() => handleToggle('announcementBarEnabled')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <p className="text-xs text-neutral-400">
              Displays a prominent banner at the very top of the customer website for flash discounts, vouchers, and urgent news.
            </p>

            {/* Top Bar Layout Mode */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <label className="text-xs font-bold text-white block">Top Bar Display Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    isDirtyRef.current = true;
                    setConfig({ ...config, topBarDisplayMode: 'unified' });
                  }}
                  className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                    (config.topBarDisplayMode || 'unified') === 'unified'
                      ? 'bg-amber-500/15 border-amber-500/60 text-white font-bold ring-1 ring-amber-500/30'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Unified Smart Ticker (Clean)</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">Cycles 1 sleek bar at a time. Zero vertical clutter on screen.</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    isDirtyRef.current = true;
                    setConfig({ ...config, topBarDisplayMode: 'stacked' });
                  }}
                  className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                    config.topBarDisplayMode === 'stacked'
                      ? 'bg-amber-500/15 border-amber-500/60 text-white font-bold ring-1 ring-amber-500/30'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="font-semibold text-neutral-300">Stacked Banners (All Visible)</div>
                  <p className="text-[10px] text-neutral-400 mt-1">Renders each active alert as an individual horizontal bar.</p>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Announcement Ticker Text:
                </label>
                <input
                  type="text"
                  value={config.announcementText}
                  onChange={(e) => setConfig({ ...config, announcementText: e.target.value })}
                  placeholder="e.g. 🔥 Flash Promo: 15% OFF with code CRUNCH15..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Badge Label (Optional):
                  </label>
                  <input
                    type="text"
                    value={config.announcementBadge || ''}
                    onChange={(e) => setConfig({ ...config, announcementBadge: e.target.value })}
                    placeholder="e.g. LIMITED TIME, NEW, FLASH SALE"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Color Theme:
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                    {(['amber', 'emerald', 'crimson', 'indigo', 'dark'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setConfig({ ...config, announcementTheme: t })}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold capitalize border transition-all text-center ${
                          config.announcementTheme === t
                            ? 'border-white text-white bg-neutral-800 ring-2 ring-amber-500/50'
                            : 'border-neutral-800 text-neutral-400 bg-neutral-950 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: Big Chef's Signature Showcase & Hero Banner HUD Customizer */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ChefHat className="w-4 h-4 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    2. Big Chef's Signature Showcase &amp; Hero Banner HUD
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Customize the signature dish showcase, high-res food image, pricing, and hero headline on the storefront homepage.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={config.showChefSignatureShowcase !== false}
                  onChange={() => handleToggle('showChefSignatureShowcase')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Select Directly from Menu Items */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/30 via-neutral-950 to-neutral-950 border border-amber-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                  <span>Feature Item Directly From Store Menu:</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {menuItems.length} items available in menu
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  aria-label="Select menu item for chef signature showcase"
                  onChange={(e) => {
                    const selId = e.target.value;
                    if (!selId) return;
                    const item = menuItems.find((m) => m.id === selId);
                    if (item) {
                      isDirtyRef.current = true;
                      setConfig((prev) => ({
                        ...prev,
                        showChefSignatureShowcase: true,
                        chefSignatureDishTitle: item.name,
                        chefSignatureDishSubtitle: item.description,
                        chefSignaturePrice: `Rs. ${item.price.toLocaleString()}`,
                        chefSignatureBadge: item.isBestseller
                          ? 'BESTSELLER ⭐'
                          : item.isSpicy
                          ? 'SPICY SIGNATURE 🔥'
                          : "CHEF'S SIGNATURE",
                        chefSignatureTagline: 'Featured Dish',
                        chefSignatureChefName: "Head Chef's Special",
                        chefSignatureImageUrl: item.image || prev.chefSignatureImageUrl,
                      }));
                    }
                  }}
                  className="flex-1 bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                  defaultValue=""
                >
                  <option value="" disabled>
                    -- Pick an item from your live menu to showcase --
                  </option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — Rs. {item.price.toLocaleString()} ({item.isBestseller ? 'Bestseller' : 'Available'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Menu Item Preview Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
                {menuItems.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      isDirtyRef.current = true;
                      setConfig((prev) => ({
                        ...prev,
                        showChefSignatureShowcase: true,
                        chefSignatureDishTitle: item.name,
                        chefSignatureDishSubtitle: item.description,
                        chefSignaturePrice: `Rs. ${item.price.toLocaleString()}`,
                        chefSignatureBadge: item.isBestseller
                          ? 'BESTSELLER ⭐'
                          : item.isSpicy
                          ? 'SPICY SIGNATURE 🔥'
                          : "CHEF'S SIGNATURE",
                        chefSignatureTagline: 'Featured Dish',
                        chefSignatureChefName: "Head Chef's Choice",
                        chefSignatureImageUrl: item.image || prev.chefSignatureImageUrl,
                      }));
                    }}
                    className="p-1.5 rounded-lg bg-neutral-900 hover:bg-amber-500/10 border border-neutral-800 hover:border-amber-500/40 text-left shrink-0 flex items-center gap-2 transition-all cursor-pointer group"
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-md object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0 pr-1">
                      <p className="text-[11px] font-bold text-white group-hover:text-amber-400 truncate max-w-[120px]">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-amber-400/90 font-mono">
                        Rs. {item.price.toLocaleString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick 1-Click Signature Presets */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>One-Click Signature Dish Presets:</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      showChefSignatureShowcase: true,
                      chefSignatureDishTitle: 'Double Smash Melt & Fries',
                      chefSignatureDishSubtitle: 'Aged cheddar · caramelized onions · secret relish',
                      chefSignaturePrice: 'Rs. 990',
                      chefSignatureBadge: "CHEF'S SIGNATURE",
                      chefSignatureTagline: 'Starting at',
                      chefSignatureChefName: "Chef Hassan's Signature",
                      chefSignatureImageUrl:
                        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80',
                    })
                  }
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-left text-[11px] text-neutral-200 transition-colors cursor-pointer"
                >
                  <strong className="block text-amber-400">Double Smash Melt</strong>
                  <span className="text-[10px] text-neutral-500">Rs. 990 · Karachi Classic</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      showChefSignatureShowcase: true,
                      chefSignatureDishTitle: 'Nashville Hot Fire Crisp',
                      chefSignatureDishSubtitle: 'Buttermilk dipped fried thigh · spicy oil bath · creamy slaw',
                      chefSignaturePrice: 'Rs. 890',
                      chefSignatureBadge: 'HOT CRUNCH 🔥',
                      chefSignatureTagline: 'Starting at',
                      chefSignatureChefName: 'Head Fryer Master',
                      chefSignatureImageUrl:
                        'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=1000&q=80',
                    })
                  }
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-left text-[11px] text-neutral-200 transition-colors cursor-pointer"
                >
                  <strong className="block text-red-400">Nashville Hot Crisp</strong>
                  <span className="text-[10px] text-neutral-500">Rs. 890 · Fiery Chicken</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      showChefSignatureShowcase: true,
                      chefSignatureDishTitle: 'Animal Loaded Smash Fries',
                      chefSignatureDishSubtitle: 'Chopped smash patties · melted cheese blend · grilled sweet onions',
                      chefSignaturePrice: 'Rs. 750',
                      chefSignatureBadge: 'FAN FAVORITE ⭐',
                      chefSignatureTagline: 'Loaded Box',
                      chefSignatureChefName: 'Street Craving Cut',
                      chefSignatureImageUrl:
                        'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=1000&q=80',
                    })
                  }
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-left text-[11px] text-neutral-200 transition-colors cursor-pointer"
                >
                  <strong className="block text-amber-400">Animal Smash Fries</strong>
                  <span className="text-[10px] text-neutral-500">Rs. 750 · Loaded Box</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      showChefSignatureShowcase: true,
                      chefSignatureDishTitle: 'Truffle Wagyu Smash Royale',
                      chefSignatureDishSubtitle: 'Imported black truffle aioli · Swiss gruyère · potato bun',
                      chefSignaturePrice: 'Rs. 1,450',
                      chefSignatureBadge: 'ROYAL DROP 👑',
                      chefSignatureTagline: 'Premium Cut',
                      chefSignatureChefName: 'Gourmet Reserve',
                      chefSignatureImageUrl:
                        'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1000&q=80',
                    })
                  }
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-left text-[11px] text-neutral-200 transition-colors cursor-pointer"
                >
                  <strong className="block text-amber-300">Truffle Smash Royale</strong>
                  <span className="text-[10px] text-neutral-500">Rs. 1,450 · Premium</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      showChefSignatureShowcase: true,
                      chefSignatureDishTitle: 'Lotus Biscoff Thick Shake',
                      chefSignatureDishSubtitle: 'Belgian speculoos crumble · rich cream · vanilla bean gelato',
                      chefSignaturePrice: 'Rs. 690',
                      chefSignatureBadge: 'ICE COLD 🥤',
                      chefSignatureTagline: 'Thick Pint',
                      chefSignatureChefName: 'Dessert Barista',
                      chefSignatureImageUrl:
                        'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1000&q=80',
                    })
                  }
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-left text-[11px] text-neutral-200 transition-colors cursor-pointer"
                >
                  <strong className="block text-orange-400">Lotus Biscoff Shake</strong>
                  <span className="text-[10px] text-neutral-500">Rs. 690 · Thick Shake</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      showChefSignatureShowcase: true,
                      chefSignatureDishTitle: 'Triple Oklahoma Onion Smash',
                      chefSignatureDishSubtitle: 'Shaved sweet onions smashed into beef · triple cheddar · garlic butter',
                      chefSignaturePrice: 'Rs. 1,290',
                      chefSignatureBadge: 'HEAVYWEIGHT 🏆',
                      chefSignatureTagline: 'Triple Stack',
                      chefSignatureChefName: 'Grill Legend',
                      chefSignatureImageUrl:
                        'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1000&q=80',
                    })
                  }
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-left text-[11px] text-neutral-200 transition-colors cursor-pointer"
                >
                  <strong className="block text-amber-400">Oklahoma Triple</strong>
                  <span className="text-[10px] text-neutral-500">Rs. 1,290 · Heavyweight</span>
                </button>
              </div>
            </div>

            {/* Chef's Signature Dish Inputs */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Signature Dish Title:
                  </label>
                  <input
                    type="text"
                    value={config.chefSignatureDishTitle || ''}
                    onChange={(e) => setConfig({ ...config, chefSignatureDishTitle: e.target.value })}
                    placeholder="e.g. Double Smash Melt & Fries"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Signature Badge Label:
                  </label>
                  <input
                    type="text"
                    value={config.chefSignatureBadge || ''}
                    onChange={(e) => setConfig({ ...config, chefSignatureBadge: e.target.value })}
                    placeholder="e.g. CHEF'S SIGNATURE, BESTSELLER"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Dish Subtitle &amp; Ingredients:
                </label>
                <input
                  type="text"
                  value={config.chefSignatureDishSubtitle || ''}
                  onChange={(e) => setConfig({ ...config, chefSignatureDishSubtitle: e.target.value })}
                  placeholder="e.g. Aged cheddar · caramelized onions · secret relish"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Display Price:
                  </label>
                  <input
                    type="text"
                    value={config.chefSignaturePrice || ''}
                    onChange={(e) => setConfig({ ...config, chefSignaturePrice: e.target.value })}
                    placeholder="e.g. Rs. 990"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Price Tagline:
                  </label>
                  <input
                    type="text"
                    value={config.chefSignatureTagline || ''}
                    onChange={(e) => setConfig({ ...config, chefSignatureTagline: e.target.value })}
                    placeholder="e.g. Starting at, Combo Price"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Chef / Creator Attribution:
                  </label>
                  <input
                    type="text"
                    value={config.chefSignatureChefName || ''}
                    onChange={(e) => setConfig({ ...config, chefSignatureChefName: e.target.value })}
                    placeholder="e.g. Chef Hassan's Signature"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Showcase Image URL with Visual Preview */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <label className="text-xs font-bold text-neutral-300 block">
                  Signature Dish Image URL:
                </label>
                <div className="flex gap-3 items-center">
                  <div className="w-16 h-12 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0">
                    <img
                      src={
                        config.chefSignatureImageUrl ||
                        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80'
                      }
                      alt="Signature Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <input
                    type="text"
                    value={config.chefSignatureImageUrl || ''}
                    onChange={(e) => setConfig({ ...config, chefSignatureImageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Hero Banner Text & Trust Badges Customizer */}
              <div className="pt-3 border-t border-neutral-800 space-y-3">
                <span className="text-xs font-bold text-white block">
                  Storefront Hero Banner Headlines &amp; Call to Actions:
                </span>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Main Hero Headline:</label>
                  <input
                    type="text"
                    value={config.heroHeadline || ''}
                    onChange={(e) => setConfig({ ...config, heroHeadline: e.target.value })}
                    placeholder="e.g. Craving Real Smash Burgers & Loaded Crunch?"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Hero Subheadline &amp; Value Proposition:</label>
                  <textarea
                    rows={2}
                    value={config.heroSubheadline || ''}
                    onChange={(e) => setConfig({ ...config, heroSubheadline: e.target.value })}
                    placeholder="e.g. Crisp lacy beef edges, melted cheddar, Nashville hot fried chicken..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Kicker Badge Text:</label>
                    <input
                      type="text"
                      value={config.heroKickerText || ''}
                      onChange={(e) => setConfig({ ...config, heroKickerText: e.target.value })}
                      placeholder="e.g. Freshly Smashed on Order"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Delivery Cities / Zones:</label>
                    <input
                      type="text"
                      value={config.heroDeliveryCitiesText || ''}
                      onChange={(e) => setConfig({ ...config, heroDeliveryCitiesText: e.target.value })}
                      placeholder="e.g. Karachi Express Hot Delivery"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Primary CTA Button:</label>
                    <input
                      type="text"
                      value={config.heroPrimaryButtonText || ''}
                      onChange={(e) => setConfig({ ...config, heroPrimaryButtonText: e.target.value })}
                      placeholder="e.g. Order Now"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Secondary Deals CTA:</label>
                    <input
                      type="text"
                      value={config.heroSecondaryButtonText || ''}
                      onChange={(e) => setConfig({ ...config, heroSecondaryButtonText: e.target.value })}
                      placeholder="e.g. Midnight & Duo Deals"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Customer Area Widgets Toggle & Customization */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  2. Customer Area Widgets
                </h3>
              </div>
              <span className="text-xs text-neutral-400">Toggle widgets on/off</span>
            </div>

            {/* WIDGET A: Live Kitchen Status Widget */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-bold text-white">
                    Live Kitchen Status &amp; Wait Time HUD
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showLiveKitchenStatus}
                    onChange={() => handleToggle('showLiveKitchenStatus')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
              <p className="text-[11px] text-neutral-400">
                Shows live grill rush indicator, number of active orders cooking, and average kitchen prep time.
              </p>
              {config.showLiveKitchenStatus && (
                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                    Custom Kitchen Broadcast Note:
                  </label>
                  <input
                    type="text"
                    value={config.kitchenStatusCustomText || ''}
                    onChange={(e) => setConfig({ ...config, kitchenStatusCustomText: e.target.value })}
                    placeholder="e.g. Active Grill Station: 3-4 orders sizzling fresh right now • Avg prep time 12-15m"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              )}
            </div>

            {/* WIDGET B: Chef's Deal of the Day Banner */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    Chef's Deal of the Day Spotlight Banner
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showDealOfTheDay}
                    onChange={() => handleToggle('showDealOfTheDay')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
              <p className="text-[11px] text-neutral-400">
                A high-converting promotional spotlight card placed directly under the hero banner.
              </p>

              {config.showDealOfTheDay && (
                <div className="space-y-2.5 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                        Deal Title:
                      </label>
                      <input
                        type="text"
                        value={config.dealTitle}
                        onChange={(e) => setConfig({ ...config, dealTitle: e.target.value })}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                        Badge &amp; Discount Text:
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={config.dealBadge}
                          onChange={(e) => setConfig({ ...config, dealBadge: e.target.value })}
                          placeholder="CHEF'S SPECIAL ⭐"
                          className="w-1/2 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={config.dealDiscountText || ''}
                          onChange={(e) => setConfig({ ...config, dealDiscountText: e.target.value })}
                          placeholder="Save Rs. 350"
                          className="w-1/2 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                      Deal Description:
                    </label>
                    <textarea
                      rows={2}
                      value={config.dealDescription}
                      onChange={(e) => setConfig({ ...config, dealDescription: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                      Link to Menu Item (For 1-click Cart):
                    </label>
                    <select
                      value={config.dealItemId || ''}
                      onChange={(e) => setConfig({ ...config, dealItemId: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    >
                      <option value="">Default Featured Combo</option>
                      {menuItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} — Rs. {item.price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* WIDGET C: Customer VIP Loyalty Banner */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">
                    Bite &amp; Go VIP Loyalty Milestone Banner
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showLoyaltyBanner}
                    onChange={() => handleToggle('showLoyaltyBanner')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {config.showLoyaltyBanner && (
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                      Loyalty Headline:
                    </label>
                    <input
                      type="text"
                      value={config.loyaltyHeadline}
                      onChange={(e) => setConfig({ ...config, loyaltyHeadline: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                      Loyalty Subtext:
                    </label>
                    <input
                      type="text"
                      value={config.loyaltySubtext}
                      onChange={(e) => setConfig({ ...config, loyaltySubtext: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* WIDGET D: Floating Quick Help Bubble */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    Floating Customer Quick Help Bubble
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showQuickHelpBubble}
                    onChange={() => handleToggle('showQuickHelpBubble')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
              <p className="text-[11px] text-neutral-400">
                Puts a round floating widget on bottom-right of customer area for 1-click order tracking, WhatsApp hotline, and support ticket creation.
              </p>
            </div>
          </div>

          {/* SECTION 3: Store Theme & Display Tuning */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Palette className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  3. Store Theme &amp; Product Display Tuning
                </h3>
              </div>
              <span className="text-xs text-neutral-400">HUD Style</span>
            </div>

            {/* Master Theme Presets (White, Dark, Midnight, Custom Themes) */}
            <div className="space-y-3 pb-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-300 block">
                  Active Store Theme Preset (Light, Dark &amp; Custom Themes):
                </label>
                <span className="text-[11px] text-amber-400 font-mono">
                  Current: {THEME_PRESETS[(config.themePreset || 'dark') as ThemePresetId]?.name || 'Classic Dark'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(Object.keys(THEME_PRESETS) as ThemePresetId[]).map((pKey) => {
                  const preset = THEME_PRESETS[pKey];
                  const isSelected = (config.themePreset || 'dark') === pKey;
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => {
                        isDirtyRef.current = true;
                        setConfig({
                          ...config,
                          themePreset: pKey,
                          themeMode: preset.mode,
                        });
                        applyThemeToDocument(pKey);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30 shadow-md'
                          : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-3.5 h-3.5 rounded-full border border-neutral-700 shadow-sm" style={{ backgroundColor: preset.bgHex }} />
                          <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: preset.accentHex }} />
                          <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: preset.cardHex }} />
                        </div>
                        <span className="font-bold text-xs text-white block">{preset.name.split('(')[0]}</span>
                        <span className="text-[10px] text-neutral-400 block line-clamp-1 mt-0.5">{preset.badgeLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  Brand Accent Fine-Tuning:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'amber', label: 'Classic Gold', color: '#f59e0b' },
                    { id: 'crimson', label: 'Smash Red', color: '#ef4444' },
                    { id: 'emerald', label: 'Fresh Green', color: '#10b981' },
                    { id: 'indigo', label: 'Cyber Violet', color: '#6366f1' },
                    { id: 'orange', label: 'Sunset Fire', color: '#f97316' },
                    { id: 'cyan', label: 'Electric Cyan', color: '#06b6d4' },
                  ].map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        isDirtyRef.current = true;
                        setConfig({ ...config, themeAccent: col.id as any });
                        applyThemeToDocument(col.id);
                      }}
                      className={`px-2.5 py-2 rounded-lg text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
                        config.themeAccent === col.id
                          ? 'border-white text-white bg-neutral-850 shadow-md ring-2 ring-white/30'
                          : 'border-neutral-800 text-neutral-400 hover:text-white bg-neutral-950'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                      <span>{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  Layout Density:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, layoutDensity: 'comfortable' })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      config.layoutDensity === 'comfortable'
                        ? 'border-amber-500 text-white bg-amber-500/20'
                        : 'border-neutral-800 text-neutral-400 hover:text-white bg-neutral-950'
                    }`}
                  >
                    Comfortable (Spacious)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, layoutDensity: 'compact' })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      config.layoutDensity === 'compact'
                        ? 'border-amber-500 text-white bg-amber-500/20'
                        : 'border-neutral-800 text-neutral-400 hover:text-white bg-neutral-950'
                    }`}
                  >
                    Compact (Express)
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <input
                  type="checkbox"
                  checked={config.showCalorieCounters}
                  onChange={() => handleToggle('showCalorieCounters')}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
                />
                <span>Display Calorie Counters (kcal) on item cards</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <input
                  type="checkbox"
                  checked={config.showSpicinessMeters}
                  onChange={() => handleToggle('showSpicinessMeters')}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
                />
                <span>Display Spice meters &amp; chili tags on burgers</span>
              </label>
            </div>
          </div>

          {/* SECTION 4: Customer Ticket Bar & Advanced Storefront HUDs */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  4. Support Ticket Bar, Delivery Goal &amp; Operational HUDs
                </h3>
              </div>
              <span className="text-xs text-neutral-400">Advanced HUDs</span>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 text-xs text-neutral-300 cursor-pointer bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                <input
                  type="checkbox"
                  checked={config.showCustomerTicketBar !== false}
                  onChange={() => handleToggle('showCustomerTicketBar')}
                  className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500 shrink-0"
                />
                <div>
                  <span className="font-bold text-white block">
                    Customer Support &amp; Active Ticket Bar
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Displays a real-time status bar on the storefront where customers can view their active issue tickets, 1-click talk back to staff, and send photo attachments.
                  </span>
                </div>
              </label>

              {/* Free Delivery Goal Meter Banner (Screenshot 2: Add Rs. 1350 more...) */}
              <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-3">
                <label className="flex items-start gap-3 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(config.showFreeDeliveryGoalMeter)}
                    onChange={() => handleToggle('showFreeDeliveryGoalMeter')}
                    className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500 shrink-0"
                  />
                  <div>
                    <span className="font-bold text-white block">
                      Free Delivery Progress Goal Meter Banner
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Displays the homepage progress bar: "Add Rs. X more to unlock FREE Express Delivery". (Can be disabled or customized below)
                    </span>
                  </div>
                </label>

                {Boolean(config.showFreeDeliveryGoalMeter) && (
                  <div className="pl-6 space-y-2.5 pt-1 border-t border-neutral-900 animate-in fade-in">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                        Free Delivery Qualifying Threshold (PKR):
                      </label>
                      <input
                        type="number"
                        value={config.freeDeliveryGoalAmount || 1800}
                        onChange={(e) => setConfig({ ...config, freeDeliveryGoalAmount: Number(e.target.value) })}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                        placeholder="1800"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                        Custom Headline Text (Use {'{remaining}'} for dynamic amount):
                      </label>
                      <input
                        type="text"
                        value={config.freeDeliveryGoalCustomText || ''}
                        onChange={(e) => setConfig({ ...config, freeDeliveryGoalCustomText: e.target.value })}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                        placeholder="Add {remaining} more to your bag to unlock FREE Express Delivery!"
                      />
                    </div>
                  </div>
                )}
              </div>

              <label className="flex items-start gap-3 text-xs text-neutral-300 cursor-pointer bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                <input
                  type="checkbox"
                  checked={config.showSatisfactionGuarantee !== false}
                  onChange={() => handleToggle('showSatisfactionGuarantee')}
                  className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500 shrink-0"
                />
                <div>
                  <span className="font-bold text-white block">
                    Halal Certified &amp; Fresh Smash Quality Guarantee HUD
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Displays trust badges (100% Halal prime beef, freshly smashed per order, sealed tamper-proof delivery bags).
                  </span>
                </div>
              </label>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-300 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kitchen Rush Hours &amp; Live Dispatch HUD</span>
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(config.showRushHourAlert)}
                      onChange={() => handleToggle('showRushHourAlert')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                <input
                  type="text"
                  value={config.rushHourText || ''}
                  onChange={(e) => setConfig({ ...config, rushHourText: e.target.value })}
                  placeholder="e.g. Peak Smash Hours: Extra grill chefs on line · 12-15 mins prep"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Rider Tracking HUD, WhatsApp & Social Proof Widgets */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  5. Live Rider Tracking, WhatsApp &amp; Social Proof HUDs
                </h3>
              </div>
              <span className="text-xs text-neutral-400">Conversion Widgets</span>
            </div>

            <div className="space-y-3">
              {/* Live Rider GPS Tracking HUD */}
              <label className="flex items-start gap-3 text-xs text-neutral-300 cursor-pointer bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                <input
                  type="checkbox"
                  checked={config.showRiderTrackingHud !== false}
                  onChange={() => handleToggle('showRiderTrackingHud')}
                  className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500 shrink-0"
                />
                <div>
                  <span className="font-bold text-white block">
                    Floating Live Rider GPS Tracker HUD
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    When an order is on the way, displays a real-time floating delivery status chip on the customer screen with rider name and 1-tap route map.
                  </span>
                </div>
              </label>

              {/* Halal Authority & Food Safety Badge */}
              <label className="flex items-start gap-3 text-xs text-neutral-300 cursor-pointer bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                <input
                  type="checkbox"
                  checked={config.showHalalCertificateBadge !== false}
                  onChange={() => handleToggle('showHalalCertificateBadge')}
                  className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500 shrink-0"
                />
                <div>
                  <span className="font-bold text-white block">
                    100% Hand-Slaughtered Halal &amp; Food Safety Certificate Badge
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Displays official trust badge: Hand-slaughtered beef, food safety authority certified, and zero preservatives.
                  </span>
                </div>
              </label>

              {/* WhatsApp Quick Order Floating Widget */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white block">
                    WhatsApp 1-Click Fast Order Floating Widget
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showWhatsAppOrderWidget !== false}
                      onChange={() => handleToggle('showWhatsAppOrderWidget')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-400 shrink-0">WhatsApp Number:</span>
                  <input
                    type="text"
                    value={config.whatsAppWidgetNumber || '+92 345 9821430'}
                    onChange={(e) => setConfig({ ...config, whatsAppWidgetNumber: e.target.value })}
                    placeholder="+92 345 9821430"
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Social Proof Live Reviews Ticker */}
              <label className="flex items-start gap-3 text-xs text-neutral-300 cursor-pointer bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                <input
                  type="checkbox"
                  checked={config.showSocialProofReviews !== false}
                  onChange={() => handleToggle('showSocialProofReviews')}
                  className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500 shrink-0"
                />
                <div>
                  <span className="font-bold text-white block">
                    Customer Reviews &amp; Social Proof Ticker (⭐ 4.9/5)
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Displays verified buyer rating chips (1,400+ satisfied fast-food lovers across Karachi).
                  </span>
                </div>
              </label>

              {/* Late-Night Kitchen Badge */}
              <label className="flex items-start gap-3 text-xs text-neutral-300 cursor-pointer bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                <input
                  type="checkbox"
                  checked={config.showLateNightBadge !== false}
                  onChange={() => handleToggle('showLateNightBadge')}
                  className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500 shrink-0"
                />
                <div>
                  <span className="font-bold text-white block">
                    Late Night Delivery Badge ("Open Till 3:00 AM")
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Highlights night-owl delivery coverage for late-night cravings in North Nazimabad.
                  </span>
                </div>
              </label>

              {/* Deal Countdown Timer in Announcement Bar */}
              <label className="flex items-start gap-3 text-xs text-neutral-300 cursor-pointer bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                <input
                  type="checkbox"
                  checked={config.showDealCountdownTimer !== false}
                  onChange={() => handleToggle('showDealCountdownTimer')}
                  className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500 shrink-0"
                />
                <div>
                  <span className="font-bold text-white block">
                    Announcement Bar Flash Deal Countdown Timer
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Renders an animated urgency timer badge (e.g., ⚡ Ends in 02:45:18) to drive checkout conversions.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 6: Karachi Dispatch Ticker, Weather & Micro-Widgets */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  6. Karachi Dispatch Ticker, Weather &amp; Micro-Widgets
                </h3>
              </div>
              <span className="text-xs text-neutral-400">Storefront Widgets</span>
            </div>

            <div className="space-y-4">
              {/* Express Delivery Fleet Live Ticker */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      Express Delivery Fleet Live Ticker (Top Bar)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(config.showGoogleMapsRiderLiveTicker)}
                      onChange={() => handleToggle('showGoogleMapsRiderLiveTicker')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Broadcasts active Karachi delivery zones to inform customers of fast dispatch coverage.
                </p>
                {Boolean(config.showGoogleMapsRiderLiveTicker) && (
                  <input
                    type="text"
                    value={config.googleMapsRiderTickerText || ''}
                    onChange={(e) => setConfig({ ...config, googleMapsRiderTickerText: e.target.value })}
                    placeholder="🛵 Express Delivery Fleet Active: Instant Dispatch across North Nazimabad..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                )}
              </div>

              {/* Karachi Monsoon / Rain Road Delay Notice */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">
                      Karachi Rain &amp; Monsoon Road Delay Notice
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(config.showMonsoonRainAlert)}
                      onChange={() => handleToggle('showMonsoonRainAlert')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Enable during heavy rainfall or waterlogged Karachi roads to automatically alert customers that riders are driving with extra safety precautions.
                </p>
                {Boolean(config.showMonsoonRainAlert) && (
                  <input
                    type="text"
                    value={config.monsoonRainText || ''}
                    onChange={(e) => setConfig({ ...config, monsoonRainText: e.target.value })}
                    placeholder="🌧️ Karachi Weather Alert: Delivery riders moving with extra care..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                )}
              </div>

              {/* Live Orders Counter */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">
                      Live Orders Sizzling Today Social Proof Badge
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(config.showLiveOrderCounter)}
                      onChange={() => handleToggle('showLiveOrderCounter')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Builds intense social proof showing live order volume on the main storefront header.
                </p>
                {Boolean(config.showLiveOrderCounter) && (
                  <input
                    type="text"
                    value={config.liveOrderCounterText || ''}
                    onChange={(e) => setConfig({ ...config, liveOrderCounterText: e.target.value })}
                    placeholder="🔥 38 orders prepared fresh today in North Nazimabad"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>

              {/* Average Prep Clock & Chef Special Pin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Real-Time Prep Time Badge</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showEstimatedPrepTimeBadge !== false}
                        onChange={() => handleToggle('showEstimatedPrepTimeBadge')}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-neutral-400">Est. Mins:</span>
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={config.estimatedPrepMinutes || 15}
                      onChange={(e) => setConfig({ ...config, estimatedPrepMinutes: parseInt(e.target.value) || 15 })}
                      className="w-20 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-white text-center"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Chef's Special Pin Badge</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showChefSpecialPin !== false}
                        onChange={() => handleToggle('showChefSpecialPin')}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.chefSpecialCustomText || ''}
                    onChange={(e) => setConfig({ ...config, chefSpecialCustomText: e.target.value })}
                    placeholder="CHEF'S TOP RECOMMENDATION · FRESH DAILY"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>

              {/* Customer Feedback & Glassmorphism Styling */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-3 text-xs text-neutral-300 cursor-pointer bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.showCustomerFeedbackBanner !== false}
                    onChange={() => handleToggle('showCustomerFeedbackBanner')}
                    className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500 shrink-0"
                  />
                  <div>
                    <span className="font-bold text-white block">Customer Review &amp; Feedback HUD</span>
                    <span className="text-[11px] text-neutral-400">Invites customers to submit feedback and ratings.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 text-xs text-neutral-300 cursor-pointer bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.hudCardGlassmorphism !== false}
                    onChange={() => handleToggle('hudCardGlassmorphism')}
                    className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500 shrink-0"
                  />
                  <div>
                    <span className="font-bold text-white block">Frosted Glassmorphism Theme</span>
                    <span className="text-[11px] text-neutral-400">Applies backdrop blur and translucent neon edges.</span>
                  </div>
                </label>
              </div>

              {/* NEW WIDGETS: Live Visitor Demand & Night Owl Deals */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Live Visitor Demand Ticker (Social Proof)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(config.showLiveVisitorCounter)}
                      onChange={() => handleToggle('showLiveVisitorCounter')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <input
                  type="text"
                  value={config.liveVisitorText || ''}
                  onChange={(e) => setConfig({ ...config, liveVisitorText: e.target.value })}
                  placeholder="👥 24 Karachi foodies browsing the menu right now"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Night Owl Midnight Craving Deal Bar</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(config.showNightOwlDealBanner)}
                      onChange={() => handleToggle('showNightOwlDealBanner')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                </div>
                <input
                  type="text"
                  value={config.nightOwlDealText || ''}
                  onChange={(e) => setConfig({ ...config, nightOwlDealText: e.target.value })}
                  placeholder="🌙 Midnight Craving Deal: 15% off all Double Smash Combos after 11 PM! Fresh on the grill until 3 AM."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">30-Min Fast Zone Pill HUD</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(config.showDeliveryZonePill)}
                        onChange={() => handleToggle('showDeliveryZonePill')}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.deliveryZoneText || ''}
                    onChange={(e) => setConfig({ ...config, deliveryZoneText: e.target.value })}
                    placeholder="📍 Fast 30-min express delivery in North Nazimabad Blocks A–W, Hyderi & Buffer Zone"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Extended Hours / Sehri Notice</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(config.showSpecialHoursNotice)}
                        onChange={() => handleToggle('showSpecialHoursNotice')}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.specialHoursNoticeText || ''}
                    onChange={(e) => setConfig({ ...config, specialHoursNoticeText: e.target.value })}
                    placeholder="✨ Special Hours Active: Kitchen taking late orders until 3:30 AM tonight!"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>

              {/* MORE STOREFRONT HUDS: Bite Club, Live Cam, Halal, Beef Guarantee & Previous Orders */}
              <div className="pt-2 border-t border-neutral-800 space-y-3">
                <span className="text-xs font-bold text-white block">
                  Interactive Loyalty, Kitchen Cam, Quality &amp; Account History HUDs:
                </span>

                {/* Bite Club Loyalty Points Ticker */}
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bite Club 2X Points Ticker HUD</span>
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(config.showBiteClubPointsTicker)}
                        onChange={() => handleToggle('showBiteClubPointsTicker')}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.biteClubPointsText || ''}
                    onChange={(e) => setConfig({ ...config, biteClubPointsText: e.target.value })}
                    placeholder="⭐ 2X Loyalty Points Active: Order any Smash Burger today..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                {/* Live Kitchen Griddle Feed Notice */}
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-red-400" />
                      <span>Live Kitchen Griddle Feed Alert</span>
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(config.showLiveKitchenCamNotice)}
                        onChange={() => handleToggle('showLiveKitchenCamNotice')}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.liveKitchenCamText || ''}
                    onChange={(e) => setConfig({ ...config, liveKitchenCamText: e.target.value })}
                    placeholder="🔴 Live Kitchen Griddle Feed: 4 Patties Sizzling on Chrome Flat-Top"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                {/* Previous Orders & Signed-In Account Quick Reorder Banner HUD */}
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                      <span>Customer Previous Orders &amp; Quick Reorder HUD Banner</span>
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(config.showPreviousOrdersWidget)}
                        onChange={() => handleToggle('showPreviousOrdersWidget')}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Displays an interactive banner on the storefront allowing signed-in customers to view their past orders, check order statuses, and 1-click reorder.
                  </p>
                  <input
                    type="text"
                    value={config.previousOrdersWidgetText || ''}
                    onChange={(e) => setConfig({ ...config, previousOrdersWidgetText: e.target.value })}
                    placeholder="📦 Quick Reorder: Check your previous orders & 1-click reorder from your account!"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                {/* Quality Guarantees & Accreditations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 text-xs text-neutral-300 cursor-pointer bg-neutral-950 p-3 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(config.showFreshBeefGuaranteeCard)}
                      onChange={() => handleToggle('showFreshBeefGuaranteeCard')}
                      className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-amber-500 shrink-0"
                    />
                    <div>
                      <span className="font-bold text-white block">Fresh Never-Frozen Beef Card</span>
                      <span className="text-[11px] text-neutral-400">Prime beef ground fresh daily and 400°F sear quality card.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 text-xs text-neutral-300 cursor-pointer bg-neutral-950 p-3 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(config.showHalalAccreditationPill)}
                      onChange={() => handleToggle('showHalalAccreditationPill')}
                      className="mt-0.5 rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500 shrink-0"
                    />
                    <div>
                      <span className="font-bold text-white block">Halal Food Authority Pill</span>
                      <span className="text-[11px] text-neutral-400">Official hand-slaughtered Halal accreditation badge.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 7: Daily Operating Hours & Work Hours Schedule (Everyday Settings) */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  7. Kitchen Operating Hours &amp; Daily Schedule (Everyday Settings)
                </h3>
              </div>
              <span className="text-xs text-amber-400 font-mono font-bold">
                Work Hours Order Protection
              </span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Configure daily operating timings for every day of the week. Customers cannot place orders outside these work hours and will see a clean reopening notice.
            </p>

            <DailyOperatingHoursEditor
              settings={currentStoreSettings}
              onChange={async (patch) => {
                const updated = { ...currentStoreSettings, ...patch };
                setCurrentStoreSettings(updated);
                await StorageService.saveSettings(updated);
                if (onSaveStoreSettings) await onSaveStoreSettings(updated);
                try {
                  await ApiService.updateSettings(updated);
                } catch {}
                if (onRefreshData) onRefreshData();
              }}
            />
          </div>

          {/* ================= SECTION 8: EMPLOYEE PORTAL & STAFF POS HUD CONTROLS ================= */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5">
            <div className="pb-3 border-b border-neutral-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>8. Employee Portal &amp; Staff POS Display HUD</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-bold">
                      STAFF SCREEN
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Control what the employee portal and register screens see — toggle the grill category on/off, hide sold-out items, or lock cashier discounts.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveEmployeePermsDirectly}
                  disabled={isEmployeeSaving}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isEmployeeSaving ? 'Saving...' : 'Apply to Staff Portal'}</span>
                </button>
              </div>
            </div>

            {showEmployeeSavedToast && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Employee Portal display settings updated! Changes take effect immediately on staff POS screens.</span>
              </div>
            )}

            {/* MASTER GRILL CATEGORY CONTROL CARD */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                isGrillCategoryHidden
                  ? 'bg-red-950/30 border-red-500/50 shadow-lg shadow-red-950/20'
                  : 'bg-gradient-to-r from-neutral-950 via-neutral-950 to-amber-950/30 border-amber-500/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isGrillCategoryHidden
                        ? 'bg-neutral-900 border-neutral-700 text-neutral-500'
                        : 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse'
                    }`}
                  >
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white">
                        Grill Category (Smash Patties &amp; Burgers)
                      </h4>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isGrillCategoryHidden
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {isGrillCategoryHidden ? '🚫 TURNED OFF FOR STAFF' : '🔥 ACTIVE & SIZZLING'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      {isGrillCategoryHidden
                        ? 'The grill category is currently DISABLED on employee portal. Line cashiers cannot punch smash burger orders.'
                        : 'The grill category is currently VISIBLE on employee portal. Cashiers can ring up all smash burgers.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSetGrillCategoryState(!isGrillCategoryHidden)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer ${
                      isGrillCategoryHidden
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>
                      {isGrillCategoryHidden ? 'Turn ON Grill Category' : 'Turn OFF Grill Category'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS ROW */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-neutral-400 font-semibold mr-1">Quick Presets:</span>
              <button
                type="button"
                onClick={() => handleSetGrillCategoryState(true)}
                className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white transition-colors"
              >
                🚫 Turn Off Grill Only
              </button>
              <button
                type="button"
                onClick={handleShowAllCategoriesForStaff}
                className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white transition-colors"
              >
                ✨ Show All Categories
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = {
                    ...posPerms,
                    hiddenCategoryIdsForEmployees: ['cat-smash', 'cat-crispy'],
                  };
                  setPosPerms(updated);
                  setCurrentStoreSettings((prev) => ({
                    ...prev,
                    posPermissions: updated,
                  }));
                }}
                className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white transition-colors"
              >
                🌙 Late Night (Fries &amp; Drinks Only)
              </button>
            </div>

            {/* INDIVIDUAL CATEGORY VISIBILITY TOGGLES */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                <span>All Categories Visibility for Employee Screen:</span>
                <span className="text-[11px] font-mono text-neutral-500">
                  {posPerms.hiddenCategoryIdsForEmployees?.length
                    ? `${posPerms.hiddenCategoryIdsForEmployees.length} hidden`
                    : 'All visible'}
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {allCategories.map((cat) => {
                  const isHidden = (posPerms.hiddenCategoryIdsForEmployees || []).includes(cat.id);
                  const isGrill =
                    cat.id === 'cat-smash' ||
                    cat.slug.includes('smash') ||
                    cat.name.toLowerCase().includes('grill') ||
                    cat.name.toLowerCase().includes('smash');
                  const count = menuItems.filter((i) => i.categoryId === cat.id).length;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => handleToggleCategoryVisibility(cat.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                        isHidden
                          ? 'bg-neutral-950/60 border-neutral-850 opacity-60 hover:opacity-100'
                          : isGrill
                          ? 'bg-neutral-950 border-amber-500/50 shadow-sm'
                          : 'bg-neutral-950 border-blue-500/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isHidden
                              ? 'bg-neutral-900 text-neutral-600'
                              : isGrill
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {isGrill ? <Flame className="w-3.5 h-3.5" /> : <Tag className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              isHidden ? 'text-neutral-500 line-through' : 'text-white'
                            }`}
                          >
                            {cat.name}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            {count} items · {isHidden ? 'Hidden from staff' : 'Visible on POS'}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${
                          !isHidden ? (isGrill ? 'bg-amber-500' : 'bg-blue-600') : 'bg-neutral-800'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                            !isHidden ? 'translate-x-3.5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* REGISTER & CASHIER PERMISSIONS IN ADMIN HUD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Hide Out of Stock items */}
              <div
                onClick={() => handleTogglePosPerm('hideOutOfStockItemsForEmployees')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  posPerms.hideOutOfStockItemsForEmployees
                    ? 'bg-neutral-950 border-blue-500/40'
                    : 'bg-neutral-950/60 border-neutral-850 opacity-60'
                }`}
              >
                <div>
                  <h5 className="text-xs font-bold text-white">Hide 86'd Out-of-Stock Items</h5>
                  <p className="text-[10px] text-neutral-400">
                    Removes 0-inventory items completely from employee screen
                  </p>
                </div>
                <div
                  className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${
                    posPerms.hideOutOfStockItemsForEmployees ? 'bg-blue-600' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      posPerms.hideOutOfStockItemsForEmployees ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Allow Staff Discounts */}
              <div
                onClick={() => handleTogglePosPerm('canApplyDiscounts')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  posPerms.canApplyDiscounts
                    ? 'bg-neutral-950 border-blue-500/40'
                    : 'bg-neutral-950/60 border-neutral-850 opacity-60'
                }`}
              >
                <div>
                  <h5 className="text-xs font-bold text-white">Allow Cashier Discounts</h5>
                  <p className="text-[10px] text-neutral-400">
                    Staff can apply 5%, 10%, 15% discount buttons on orders
                  </p>
                </div>
                <div
                  className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${
                    posPerms.canApplyDiscounts ? 'bg-blue-600' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      posPerms.canApplyDiscounts ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Allow Custom Off-Menu Items */}
              <div
                onClick={() => handleTogglePosPerm('allowCustomOrderItems')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  posPerms.allowCustomOrderItems
                    ? 'bg-neutral-950 border-blue-500/40'
                    : 'bg-neutral-950/60 border-neutral-850 opacity-60'
                }`}
              >
                <div>
                  <h5 className="text-xs font-bold text-white">Allow Custom Off-Menu Items</h5>
                  <p className="text-[10px] text-neutral-400">
                    Cashiers can add custom priced items at the counter
                  </p>
                </div>
                <div
                  className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${
                    posPerms.allowCustomOrderItems ? 'bg-blue-600' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      posPerms.allowCustomOrderItems ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Require Manager PIN for Void */}
              <div
                onClick={() => handleTogglePosPerm('requireManagerPinForVoid')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  posPerms.requireManagerPinForVoid
                    ? 'bg-neutral-950 border-amber-500/40'
                    : 'bg-neutral-950/60 border-neutral-850 opacity-60'
                }`}
              >
                <div>
                  <h5 className="text-xs font-bold text-white">Require Supervisor PIN for Void</h5>
                  <p className="text-[10px] text-neutral-400">
                    Prompts for manager PIN before voiding or refunding tickets
                  </p>
                </div>
                <div
                  className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${
                    posPerms.requireManagerPinForVoid ? 'bg-amber-500' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-neutral-950 transition-transform ${
                      posPerms.requireManagerPinForVoid ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Supervisor PIN input */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-xs font-bold text-white">Supervisor Override PIN:</p>
                  <p className="text-[10px] text-neutral-400">Used by shift managers to unlock voided orders &amp; staff overrides</p>
                </div>
              </div>
              <input
                type="text"
                maxLength={6}
                value={posPerms.supervisorPasscode || '1234'}
                onChange={(e) => {
                  const updated = { ...posPerms, supervisorPasscode: e.target.value };
                  setPosPerms(updated);
                  setCurrentStoreSettings((prev) => ({ ...prev, posPermissions: updated }));
                }}
                className="w-24 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-center text-amber-400 font-mono tracking-widest font-bold"
              />
            </div>
          </div>

          {/* Reset & Save Bottom Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-neutral-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save &amp; Apply All HUD Changes</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Mockup Customer Area Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-24 rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('desktop')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    activePreviewTab !== 'employee_pos'
                      ? 'bg-amber-500 text-neutral-950'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white'
                  }`}
                >
                  Customer View
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('employee_pos')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    activePreviewTab === 'employee_pos'
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3 h-3" />
                  <span>Employee POS</span>
                  {isGrillCategoryHidden && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  )}
                </button>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                {activePreviewTab === 'employee_pos' ? 'STAFF SCREEN' : 'REAL-TIME'}
              </span>
            </div>

            {/* Preview Frame */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-inner text-xs space-y-3 p-3">
              {activePreviewTab === 'employee_pos' ? (
                /* EMPLOYEE PORTAL POS LIVE PREVIEW */
                <div className="space-y-3 animate-in fade-in">
                  {/* Top Bar */}
                  <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-850 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                        POS
                      </div>
                      <span className="font-bold text-white text-[11px] truncate">
                        {posPerms.employeePortalTitle || 'Express Cashier POS'}
                      </span>
                    </div>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono shrink-0">
                      REGISTER ONLINE
                    </span>
                  </div>

                  {/* Grill Category Status Banner */}
                  <div
                    className={`p-2.5 rounded-lg border text-[10px] flex items-center justify-between ${
                      isGrillCategoryHidden
                        ? 'bg-red-950/40 border-red-500/50 text-red-300'
                        : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-bold">
                        {isGrillCategoryHidden
                          ? 'GRILL CATEGORY: TURNED OFF FOR STAFF'
                          : 'GRILL CATEGORY: SIZZLING & ACTIVE'}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono uppercase font-bold">
                      {isGrillCategoryHidden ? 'HIDDEN' : 'VISIBLE'}
                    </span>
                  </div>

                  {/* Category Pills Preview */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-neutral-400 font-bold block">
                      Categories Displayed on Staff Terminal:
                    </span>
                    <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
                      {allCategories.map((c) => {
                        const isHidden = (posPerms.hiddenCategoryIdsForEmployees || []).includes(c.id);
                        return (
                          <span
                            key={c.id}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap border ${
                              isHidden
                                ? 'bg-neutral-900/60 text-neutral-600 border-neutral-850 line-through'
                                : 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                            }`}
                          >
                            {c.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sample POS Grid Items */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Item 1: Smash Burger or replacement */}
                    {isGrillCategoryHidden ? (
                      <div className="p-2.5 rounded-lg bg-neutral-900/50 border border-dashed border-red-900/50 flex flex-col items-center justify-center text-center py-5">
                        <Flame className="w-4 h-4 text-neutral-600 mb-1" />
                        <span className="text-[10px] font-bold text-neutral-500">Smash Burgers</span>
                        <span className="text-[8px] text-red-400 mt-0.5">Category Turned Off</span>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1">
                        <div className="h-12 rounded bg-neutral-800 flex items-center justify-center text-[10px] text-amber-400 font-bold">
                          🍔 Double Smash
                        </div>
                        <p className="font-bold text-white text-[10px]">Double Smash Melt</p>
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-amber-400 font-mono font-bold">Rs. 990</span>
                          <span className="text-emerald-400 font-bold">+ RING UP</span>
                        </div>
                      </div>
                    )}

                    {/* Item 2: Fries (Always visible) */}
                    <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1">
                      <div className="h-12 rounded bg-neutral-800 flex items-center justify-center text-[10px] text-amber-400 font-bold">
                        🍟 Animal Fries
                      </div>
                      <p className="font-bold text-white text-[10px]">Loaded Fire Fries</p>
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-amber-400 font-mono font-bold">Rs. 590</span>
                        <span className="text-emerald-400 font-bold">+ RING UP</span>
                      </div>
                    </div>
                  </div>

                  {/* Staff Authorizations Summary */}
                  <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-850 space-y-1 text-[9px]">
                    <span className="font-bold text-neutral-300 block">Cashier Authorizations in Effect:</span>
                    <div className="grid grid-cols-2 gap-1 text-neutral-400">
                      <div>Discounts: {posPerms.canApplyDiscounts ? '✅ Allowed' : '🔒 Locked'}</div>
                      <div>Void PIN: {posPerms.requireManagerPinForVoid ? '🔒 Required' : '🔓 Open'}</div>
                      <div>Out of Stock: {posPerms.hideOutOfStockItemsForEmployees ? '🚫 Hidden' : '👁️ Shown'}</div>
                      <div>Override PIN: <strong className="text-amber-400 font-mono">{posPerms.supervisorPasscode || '1234'}</strong></div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Preview Announcement Ticker HUD */}
                  {config.announcementBarEnabled && (
                    <div
                      className={`p-2 rounded-lg text-[10px] flex items-center justify-between font-bold shadow-sm transition-all ${
                        config.announcementTheme === 'amber'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950'
                          : config.announcementTheme === 'emerald'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-neutral-950'
                          : config.announcementTheme === 'crimson'
                          ? 'bg-gradient-to-r from-red-600 to-red-500 text-white'
                          : config.announcementTheme === 'indigo'
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white'
                          : 'bg-neutral-900 border border-neutral-800 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span className="truncate">{config.announcementText}</span>
                      </div>
                      {config.announcementBadge && (
                        <span className="text-[8.5px] bg-neutral-950/90 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold uppercase ml-2 shrink-0">
                          {config.announcementBadge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Preview Express Rider Fleet Live Ticker */}
                  {config.showGoogleMapsRiderLiveTicker !== false && (
                    <div className="p-1.5 rounded-lg bg-neutral-900/90 border border-emerald-500/30 text-[9.5px] flex items-center justify-between gap-1.5 text-emerald-300">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="flex h-1.5 w-1.5 relative shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate font-medium">{config.googleMapsRiderTickerText || 'Express Dispatch Active'}</span>
                      </div>
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1 py-0.2 rounded font-mono font-bold shrink-0">
                        LIVE
                      </span>
                    </div>
                  )}

              {/* Preview Nav Header */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-850">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-amber-500 text-neutral-950 font-black text-[9px] flex items-center justify-center">
                    BG
                  </div>
                  <span className="font-heading font-black text-white text-xs">Bite &amp; Go</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                  <span>Menu</span>
                  <span>Track Order</span>
                  <span className="bg-amber-500 text-neutral-950 px-2 py-0.5 rounded-full font-bold">
                    Cart (2)
                  </span>
                </div>
              </div>

              {/* Preview Hero Headline & Kicker */}
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-500">
                  <Flame className="w-2.5 h-2.5 fill-amber-500" />
                  <span>{config.heroKickerText || 'Freshly Smashed on Order'}</span>
                  <span className="text-neutral-600">·</span>
                  <span>{config.heroDeliveryCitiesText || 'Karachi Express'}</span>
                </div>
                <h4 className="text-xs font-black text-white leading-tight">
                  {config.heroHeadline || 'Craving Real Smash Burgers & Loaded Crunch?'}
                </h4>
                <p className="text-[10px] text-neutral-400 line-clamp-2">
                  {config.heroSubheadline}
                </p>
              </div>

              {/* Preview Big Chef's Signature Showcase Card */}
              {config.showChefSignatureShowcase !== false && (
                <div className="rounded-xl overflow-hidden border border-amber-500/40 bg-neutral-900 relative shadow-md">
                  <div className="h-28 w-full relative bg-neutral-950">
                    <img
                      src={
                        config.chefSignatureImageUrl ||
                        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80'
                      }
                      alt="Signature"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 p-2 rounded-lg bg-neutral-950/90 backdrop-blur border border-neutral-800 flex items-center justify-between text-[10px]">
                      <div>
                        <div className="flex items-center gap-1">
                          <Award className="w-3 h-3 text-amber-400" />
                          <span className="text-[8px] font-bold uppercase text-amber-400">
                            {config.chefSignatureBadge || "CHEF'S SIGNATURE"}
                          </span>
                        </div>
                        <p className="font-bold text-white text-[11px] leading-tight">
                          {config.chefSignatureDishTitle || 'Double Smash Melt & Fries'}
                        </p>
                        <p className="text-[9px] text-neutral-400 line-clamp-1">
                          {config.chefSignatureDishSubtitle || 'Aged cheddar · caramelized onions'}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="text-[8px] text-neutral-500 block">
                          {config.chefSignatureTagline || 'Starting at'}
                        </span>
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {config.chefSignaturePrice || 'Rs. 990'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Kitchen Status Widget */}
              {config.showLiveKitchenStatus && (
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-850 flex items-center justify-between gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-neutral-200 truncate">
                      {config.kitchenStatusCustomText || 'Active Grill Station: 3-4 orders grilling now'}
                    </span>
                  </div>
                  <span className="text-amber-400 font-mono font-bold shrink-0">~14m</span>
                </div>
              )}

              {/* Preview Deal of the Day Spotlight */}
              {config.showDealOfTheDay && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-neutral-900 to-amber-950/40 border border-amber-500/30 text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="bg-amber-400 text-neutral-950 font-black text-[9px] px-1.5 py-0.2 rounded">
                      {config.dealBadge}
                    </span>
                    <span className="text-amber-400 font-bold">{config.dealDiscountText}</span>
                  </div>
                  <p className="font-bold text-white">{config.dealTitle}</p>
                  <p className="text-neutral-400 line-clamp-1">{config.dealDescription}</p>
                </div>
              )}

              {/* Preview Loyalty Banner */}
              {config.showLoyaltyBanner && (
                <div className="p-2 rounded-lg bg-gradient-to-r from-neutral-900 to-indigo-950/50 border border-indigo-500/20 text-[10px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-semibold text-white truncate">{config.loyaltyHeadline}</span>
                  </div>
                  <span className="text-[9px] text-indigo-300 font-mono">VIP</span>
                </div>
              )}

              {/* Sample Product Cards Preview */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1">
                  <div className="h-14 rounded bg-neutral-800 flex items-center justify-center text-neutral-500 text-[10px]">
                    Smash Burger
                  </div>
                  <p className="font-bold text-white text-[10px]">Double Smash</p>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-amber-400 font-bold">Rs. 990</span>
                    {config.showCalorieCounters && (
                      <span className="text-[9px] text-neutral-500">680 kcal</span>
                    )}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1">
                  <div className="h-14 rounded bg-neutral-800 flex items-center justify-center text-neutral-500 text-[10px]">
                    Animal Fries
                  </div>
                  <p className="font-bold text-white text-[10px]">Loaded Animal</p>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-amber-400 font-bold">Rs. 590</span>
                    {config.showCalorieCounters && (
                      <span className="text-[9px] text-neutral-500">720 kcal</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Floating Help Bubble Preview */}
              {config.showQuickHelpBubble && (
                <div className="flex justify-end pt-1">
                  <span className="px-2.5 py-1 bg-amber-500 text-neutral-950 font-black text-[9px] rounded-full shadow-md flex items-center gap-1">
                    <HelpCircle className="w-2.5 h-2.5 fill-neutral-950" />
                    <span>Quick Help</span>
                  </span>
                </div>
              )}
            </>
          )}
        </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 text-[11px] text-neutral-400 space-y-1">
              <p className="font-semibold text-neutral-300">💡 Instant Synchronization:</p>
              <p>
                Any updates saved here are instantly propagated across all active customer tabs via local storage event bus and server API.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
