import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Category,
  MenuItem,
  OrderItem,
  Order,
  StoreSettings,
  CustomerWidgetsConfig,
  PushNotificationMessage,
} from './types';
import { StorageService } from './utils/storage';
import { ApiService } from './utils/api';
import { sounds } from './utils/audio';
import { Header } from './components/storefront/Header';
import { HeroBanner } from './components/storefront/HeroBanner';
import { CategoryTabs } from './components/storefront/CategoryTabs';
import { ProductCard } from './components/storefront/ProductCard';
import { ItemCustomizerModal } from './components/storefront/ItemCustomizerModal';
import { CartDrawer } from './components/storefront/CartDrawer';
import { CheckoutModal } from './components/storefront/CheckoutModal';
import { OrderTrackerModal } from './components/storefront/OrderTrackerModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { KitchenDashboard } from './components/kitchen/KitchenDashboard';
import { PosDashboard } from './components/pos/PosDashboard';
import { MobileUnifiedHUD } from './components/storefront/MobileUnifiedHUD';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { CustomerAuthModal } from './components/customer/CustomerAuthModal';
import { CustomerProfileModal } from './components/customer/CustomerProfileModal';
import { CreateTicketModal } from './components/customer/CreateTicketModal';
import { CustomerTicketBar } from './components/customer/CustomerTicketBar';
import { CustomerTicketChatModal } from './components/customer/CustomerTicketChatModal';
import { applyThemeToDocument } from './utils/theme';
import { isStoreOpenNow } from './utils/operatingHours';
import { PushNotificationBanner } from './components/notifications/PushNotificationBanner';
import { NotificationsModal } from './components/notifications/NotificationsModal';
import { ThemeSelectorModal } from './components/common/ThemeSelectorModal';
import { CustomerSidebarDrawer } from './components/storefront/CustomerSidebarDrawer';
import { CustomerReviewsModal } from './components/customer/CustomerReviewsModal';
import { MobileCustomerDockHUD } from './components/storefront/MobileCustomerDockHUD';
import { DeliveryCoverageCalculatorModal } from './components/storefront/DeliveryCoverageCalculatorModal';
import { UnifiedTopBarHUD } from './components/storefront/UnifiedTopBarHUD';
import { RiderDeliveryHudModal } from './components/rider/RiderDeliveryHudModal';
import { RiderPortal } from './components/rider/RiderPortal';
import {
  AnnouncementBarHUD,
  LiveKitchenStatusWidget,
  DealOfTheDayWidget,
  LoyaltyClubBanner,
  FloatingCustomerHelpBubble,
  FreeDeliveryGoalMeterHUD,
  RushHourAlertHUD,
  SatisfactionGuaranteeHUD,
  GoogleMapsRiderLiveTickerHUD,
  MonsoonRainAlertHUD,
  LiveOrderCounterHUD,
  CustomerFeedbackBannerHUD,
  LiveVisitorCounterHUD,
  NightOwlDealBannerHUD,
  DeliveryZonePillHUD,
  SpecialHoursNoticeHUD,
  BiteClubPointsTickerHUD,
  LiveKitchenCamNoticeHUD,
  FreshBeefGuaranteeCardHUD,
  HalalAccreditationPillHUD,
} from './components/storefront/CustomerWidgets';
import { AuthUser, CustomerUser, CustomerTicket } from './types';
import {
  Sparkles,
  Phone,
  Clock,
  MapPin,
  ShieldCheck,
  Flame,
  LayoutDashboard,
  Bike,
  ChefHat,
  Lock,
  Drumstick,
  Zap,
  Sandwich,
  CupSoda,
  UtensilsCrossed,
  ArrowRight,
  ChevronRight,
  Palette,
  Ticket,
} from 'lucide-react';

export default function App() {
  // Navigation View: Storefront vs Admin vs Kitchen vs POS vs Dedicated Rider HUD
  const [currentView, setCurrentView] = useState<'storefront' | 'admin' | 'kitchen' | 'pos' | 'rider'>('storefront');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(ApiService.getStoredUser());

  // Customer Account & Support Tickets State
  const [activeCustomer, setActiveCustomer] = useState<CustomerUser | null>(StorageService.getActiveCustomer());
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [isCustomerProfileOpen, setIsCustomerProfileOpen] = useState(false);
  const [isRiderHudOpen, setIsRiderHudOpen] = useState(false);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [activeChatTicket, setActiveChatTicket] = useState<CustomerTicket | null>(null);
  const [ticketOrderId, setTicketOrderId] = useState<string | undefined>(undefined);
  const [tickets, setTickets] = useState<CustomerTicket[]>(StorageService.getTickets());

  // Core Data
  const [categories, setCategories] = useState<Category[]>(() => StorageService.getCategories());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => StorageService.getMenuItems());
  const [orders, setOrders] = useState<Order[]>(() => StorageService.getOrders());
  const [settings, setSettings] = useState<StoreSettings>(() => StorageService.getSettings());
  const [notifications, setNotifications] = useState<PushNotificationMessage[]>(() => StorageService.getNotifications());

  // Cart State
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');

  // Filter & Search
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [loginInitialRole, setLoginInitialRole] = useState<'admin' | 'kitchen' | 'pos' | 'rider'>('admin');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [isDeliveryCalculatorOpen, setIsDeliveryCalculatorOpen] = useState(false);

  // Customer 1-Click Logout
  const handleCustomerLogout = () => {
    StorageService.customerSignOut();
    setActiveCustomer(null);
    sounds.playChime();
    loadData();
  };

  // Active tracked order (strictly initialized from local customer session)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => StorageService.getActiveOrderId());

  const handleOpenAdmin = async () => {
    const check = await ApiService.verifyAuth();
    if (check.authenticated && check.user?.role === 'admin') {
      setCurrentUser(check.user);
      setCurrentView('admin');
    } else {
      setLoginInitialRole('admin');
      setIsAdminLoginOpen(true);
    }
  };

  const handleOpenKitchen = async () => {
    const check = await ApiService.verifyAuth();
    if (check.authenticated && check.user?.role === 'kitchen') {
      setCurrentUser(check.user);
      setCurrentView('kitchen');
    } else {
      setLoginInitialRole('kitchen');
      setIsAdminLoginOpen(true);
    }
  };

  const handleOpenPos = async () => {
    const check = await ApiService.verifyAuth();
    if (
      check.authenticated &&
      (check.user?.role === 'pos' || check.user?.role === 'admin' || check.user?.role === 'kitchen')
    ) {
      setCurrentUser(check.user);
      setCurrentView('pos');
    } else {
      setLoginInitialRole('pos');
      setIsAdminLoginOpen(true);
    }
  };

  const handleOpenRider = async () => {
    const check = await ApiService.verifyAuth();
    if (check.authenticated && (check.user?.role === 'rider' || check.user?.role === 'admin')) {
      setCurrentUser(check.user);
      setCurrentView('rider');
    } else {
      setLoginInitialRole('rider');
      setIsAdminLoginOpen(true);
    }
  };

  const handleOpenStaff = async () => {
    const check = await ApiService.verifyAuth();
    if (check.authenticated && check.user) {
      setCurrentUser(check.user);
      if (check.user.role === 'admin') setCurrentView('admin');
      else if (check.user.role === 'kitchen') setCurrentView('kitchen');
      else if (check.user.role === 'rider') setCurrentView('rider');
      else setCurrentView('pos');
    } else {
      setLoginInitialRole('pos');
      setIsAdminLoginOpen(true);
    }
  };

  // Anti-Bypass Security Guard: Prevents DevTools / F12 / console state tampering from unauthorized access
  useEffect(() => {
    if (currentView !== 'storefront') {
      const token = ApiService.getStoredToken();
      const user = ApiService.getStoredUser();
      if (!token || !user) {
        setCurrentView('storefront');
        setLoginInitialRole(
          currentView === 'pos'
            ? 'pos'
            : currentView === 'kitchen'
            ? 'kitchen'
            : currentView === 'rider'
            ? 'rider'
            : 'admin'
        );
        setIsAdminLoginOpen(true);
        return;
      }

      // Check role authorization
      if (currentView === 'admin' && user.role !== 'admin') {
        setCurrentView('storefront');
        setIsAdminLoginOpen(true);
      } else if (
        currentView === 'kitchen' &&
        user.role !== 'kitchen' &&
        user.role !== 'admin'
      ) {
        setCurrentView('storefront');
        setIsAdminLoginOpen(true);
      } else if (
        currentView === 'pos' &&
        user.role !== 'pos' &&
        user.role !== 'employee' &&
        user.role !== 'admin' &&
        user.role !== 'kitchen'
      ) {
        setCurrentView('storefront');
        setIsAdminLoginOpen(true);
      } else if (
        currentView === 'rider' &&
        user.role !== 'rider' &&
        user.role !== 'admin'
      ) {
        setCurrentView('storefront');
        setIsAdminLoginOpen(true);
      }
    }
  }, [currentView]);

  // Refresh all data from StorageService
  const loadData = () => {
    setCategories(StorageService.getCategories());
    setMenuItems(StorageService.getMenuItems());
    const loadedOrders = StorageService.getOrders();
    setOrders(loadedOrders);
    const freshSettings = StorageService.getSettings();
    setSettings(freshSettings);
    applyThemeToDocument(
      freshSettings.customerWidgets?.themePreset || freshSettings.customerWidgets?.themeAccent || 'dark'
    );
    setNotifications(StorageService.getNotifications());
    setActiveCustomer(StorageService.getActiveCustomer());
    const loadedTickets = StorageService.getTickets();
    setTickets(loadedTickets);

    // If customer activeChatTicket has been closed by employee/admin, immediately remove it from view
    setActiveChatTicket((prev) => {
      if (!prev) return null;
      const fresh = loadedTickets.find((t) => t.id === prev.id);
      if (!fresh || fresh.status === 'closed') return null;
      return fresh;
    });

    const activeId = StorageService.getActiveOrderId();
    if (activeId) {
      const ord = loadedOrders.find((o) => o.id === activeId);
      if (
        ord &&
        (ord.source === 'pos' ||
          ord.orderType === 'dine_in' ||
          ord.orderType === 'pos_takeaway' ||
          ord.orderType === 'pos_counter')
      ) {
        StorageService.setActiveOrderId(null);
        setActiveOrderId(null);
      } else {
        setActiveOrderId(activeId);
      }
    } else {
      setActiveOrderId(null);
    }
  };

  // HUD Manager & Store Settings Persistence Handlers
  const handleSaveSettings = async (updatedSettings: StoreSettings) => {
    setSettings(updatedSettings);
    const themeTarget =
      updatedSettings.customerWidgets?.themePreset ||
      updatedSettings.customerWidgets?.themeAccent ||
      'dark';
    applyThemeToDocument(themeTarget);

    await StorageService.saveSettings(updatedSettings);
    loadData();
  };

  const handleSaveWidgets = async (updatedConfig: CustomerWidgetsConfig) => {
    const current = StorageService.getSettings();
    const merged: StoreSettings = {
      ...current,
      customerWidgets: {
        ...(current.customerWidgets || {}),
        ...updatedConfig,
      },
    };
    setSettings(merged);
    const themeTarget =
      updatedConfig.themePreset ||
      updatedConfig.themeAccent ||
      merged.customerWidgets?.themePreset ||
      'dark';
    applyThemeToDocument(themeTarget);

    await StorageService.saveSettings(merged);
    loadData();
  };

  // Reactively apply theme whenever settings change
  useEffect(() => {
    applyThemeToDocument(
      settings.customerWidgets?.themePreset || settings.customerWidgets?.themeAccent || 'dark'
    );
  }, [
    settings.customerWidgets?.themePreset,
    settings.customerWidgets?.themeAccent,
    settings.customerWidgets?.themeMode,
  ]);

  useEffect(() => {
    loadData();

    // Check URL route or hash for staff entry (e.g. /#admin, /#kitchen, /#pos, /#rider)
    const checkRoute = () => {
      const rawHash = (window.location.hash || '').toLowerCase().replace(/^[#\/]+/, '');
      const rawPath = (window.location.pathname || '').toLowerCase().replace(/^\/+/, '');
      const key = rawHash || rawPath;

      if (['admin', 'manager', 'hud'].includes(key)) {
        handleOpenAdmin();
      } else if (['kitchen', 'kds', 'chef', 'orders-kitchen'].includes(key)) {
        handleOpenKitchen();
      } else if (['pos', 'cashier', 'counter'].includes(key)) {
        handleOpenPos();
      } else if (['staff', 'employee'].includes(key)) {
        handleOpenStaff();
      } else if (['rider', 'delivery', 'driver', 'fleet', 'rider-hud'].includes(key)) {
        handleOpenRider();
      }
    };
    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);

    // Listen for custom real-time storage events & periodic background sync
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('bg_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    const syncInterval = setInterval(handleUpdate, 12000);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('bg_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, []);

  // Cart Handlers
  const handleAddToCart = (orderItem: OrderItem) => {
    setCartItems((prev) => [...prev, orderItem]);
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(index);
      return;
    }
    setCartItems((prev) => {
      const next = [...prev];
      const singlePrice = next[index].price;
      next[index] = {
        ...next[index],
        quantity: newQty,
        itemTotal: singlePrice * newQty,
      };
      return next;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.itemTotal, 0);

  // Order Placement
  const handleOrderPlaced = (newOrder: Order) => {
    sounds.unlockAudioContext();
    sounds.playKitchenOrderBeep();
    const created = StorageService.createOrder(newOrder);
    setCartItems([]);
    setActiveOrderId(created.id);
    setIsTrackerOpen(true);
    // Broadcast order placement event so POS terminal beeps and prepares ticket immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bg_new_web_order', { detail: created }));
    }
    loadData();
  };

  // Find active customer order (strictly customer's own online order, NEVER an in-store POS/cashier order or arbitrary orders[0])
  const activeOrder = useMemo(() => {
    // 1. If explicit customer activeOrderId exists and matches an online order
    if (activeOrderId) {
      const found = orders.find(
        (o) =>
          o.id === activeOrderId &&
          o.source !== 'pos' &&
          o.orderType !== 'dine_in' &&
          o.orderType !== 'pos_takeaway' &&
          o.orderType !== 'pos_counter'
      );
      if (found) return found;
    }
    // 2. If logged in customer, look for their latest active online order
    if (activeCustomer) {
      const customerOnlineOrder = orders.find(
        (o) =>
          o.source !== 'pos' &&
          o.orderType !== 'dine_in' &&
          o.orderType !== 'pos_takeaway' &&
          o.orderType !== 'pos_counter' &&
          ((activeCustomer.phone && o.customerPhone === activeCustomer.phone) ||
            (activeCustomer.email && o.customerEmail === activeCustomer.email)) &&
          o.status !== 'delivered' &&
          o.status !== 'cancelled'
      );
      if (customerOnlineOrder) return customerOnlineOrder;
    }
    // No active online order for this customer device. POS cashier orders are never shown to storefront customers!
    return null;
  }, [orders, activeOrderId, activeCustomer]);

  // Unread notifications count
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Operating Hours Status
  const openStatus = isStoreOpenNow(settings);

  // Category counts
  const itemsCountByCat: Record<string, number> = {};
  menuItems.forEach((item) => {
    itemsCountByCat[item.categoryId] = (itemsCountByCat[item.categoryId] || 0) + 1;
  });

  const categoryIconMap: Record<string, React.ReactNode> = {
    Flame: <Flame className="w-5 h-5" />,
    Drumstick: <Drumstick className="w-5 h-5" />,
    Zap: <Zap className="w-5 h-5" />,
    Sandwich: <Sandwich className="w-5 h-5" />,
    Sparkles: <Sparkles className="w-5 h-5" />,
    CupSoda: <CupSoda className="w-5 h-5" />,
  };

  // Filtered menu items
  const filteredItems = menuItems.filter((item) => {
    if (selectedCategoryId !== 'all' && item.categoryId !== selectedCategoryId) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.categoryId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const returnToStorefront = () => {
    setCurrentView('storefront');
    if (typeof window !== 'undefined') {
      if (window.location.hash) {
        window.history.pushState(null, '', window.location.pathname);
      }
      if (
        window.location.pathname === '/admin' ||
        window.location.pathname === '/staff' ||
        window.location.pathname === '/kitchen' ||
        window.location.pathname === '/pos' ||
        window.location.pathname === '/rider' ||
        window.location.pathname === '/delivery'
      ) {
        window.history.pushState(null, '', '/');
      }
    }
  };

  // If in Admin view, render AdminDashboard
  if (currentView === 'admin') {
    return (
      <AdminDashboard
        onBackToStore={returnToStorefront}
        onLogout={() => {
          ApiService.clearToken();
          setCurrentUser(null);
          returnToStorefront();
        }}
        categories={categories}
        menuItems={menuItems}
        orders={orders}
        settings={settings}
        onRefreshData={loadData}
        onSaveSettings={handleSaveSettings}
        onSaveWidgets={handleSaveWidgets}
        onSwitchPortal={(view) => setCurrentView(view)}
      />
    );
  }

  // If in Kitchen view, render unified infused PosDashboard with initialTab='kitchen'
  if (currentView === 'kitchen') {
    return (
      <PosDashboard
        categories={categories}
        menuItems={menuItems}
        orders={orders}
        settings={settings}
        cashierName={currentUser?.name || 'Head Chef & Station'}
        initialTab="kitchen"
        onBackToStore={returnToStorefront}
        onLogout={() => {
          ApiService.clearToken();
          setCurrentUser(null);
          returnToStorefront();
        }}
        onRefreshData={loadData}
        onToggleStock={async (itemId) => {
          try {
            await ApiService.toggleItemStock(itemId);
          } catch {
            StorageService.toggleItemAvailability(itemId);
          }
          loadData();
        }}
      />
    );
  }

  // If in POS view, render PosDashboard
  if (currentView === 'pos') {
    return (
      <PosDashboard
        categories={categories}
        menuItems={menuItems}
        orders={orders}
        settings={settings}
        cashierName={currentUser?.name || 'Counter Cashier'}
        initialTab="pos"
        onBackToStore={returnToStorefront}
        onLogout={() => {
          ApiService.clearToken();
          setCurrentUser(null);
          returnToStorefront();
        }}
        onRefreshData={loadData}
        onToggleStock={async (itemId) => {
          try {
            await ApiService.toggleItemStock(itemId);
          } catch {
            StorageService.toggleItemAvailability(itemId);
          }
          loadData();
        }}
      />
    );
  }

  // If in Rider view, render dedicated standalone RiderPortal (isolated from POS and kitchen)
  if (currentView === 'rider') {
    return (
      <RiderPortal
        orders={orders}
        settings={settings}
        onRefreshData={loadData}
        onBackToStore={returnToStorefront}
      />
    );
  }

  return (
    <div
      data-theme={settings.customerWidgets?.themePreset || settings.customerWidgets?.themeAccent || 'dark'}
      data-theme-mode={settings.customerWidgets?.themeMode || 'dark'}
      className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950 pb-20 sm:pb-0"
    >
      {/* Mobile Unified Smart HUD (clean compact ticker on mobile to eliminate vertical banner clutter) */}
      <MobileUnifiedHUD
        config={settings.customerWidgets}
        orders={orders}
        cartTotal={cartTotal}
        freeDeliveryThreshold={settings.freeDeliveryThreshold || 1500}
        onOpenPreviousOrders={() => setIsCustomerProfileOpen(true)}
      />

      {/* Desktop Unified Smart Announcement & Alert HUD (clean rotating single bar, zero vertical clutter) */}
      <UnifiedTopBarHUD config={settings.customerWidgets} />

      {/* Kitchen Closed Outside Work Hours Notice Banner */}
      {!openStatus.isOpen && (
        <div className="bg-red-950/80 border-y border-red-500/40 px-4 py-2 text-xs text-red-200">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="font-bold text-red-300">Kitchen Closed Outside Work Hours:</span>
              <span className="text-neutral-300">{openStatus.reason}</span>
            </div>
            {openStatus.nextOpenText && (
              <span className="text-[11px] font-mono text-amber-300 font-bold bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                ⏰ Reopening: {openStatus.nextOpenText}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Storefront Top Navigation */}
      <Header
        cartCount={cartItems.reduce((sum, i) => sum + i.quantity, 0)}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracker={() => setIsTrackerOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenCustomerAuth={() => setIsCustomerAuthOpen(true)}
        onOpenCustomerProfile={() => setIsCustomerProfileOpen(true)}
        onLogoutCustomer={handleCustomerLogout}
        onOpenAdmin={handleOpenAdmin}
        onOpenKitchen={handleOpenKitchen}
        onOpenPos={handleOpenPos}
        onOpenRiderPortal={() => setCurrentView('rider')}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenReviews={() => setIsReviewsModalOpen(true)}
        onOpenDeliveryCalculator={() => setIsDeliveryCalculatorOpen(true)}
        activeCustomer={activeCustomer}
        activeOrder={activeOrder}
        unreadNotificationsCount={unreadNotificationsCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Storefront Support Ticket Bar (Live status & 1-click talk back) */}
      {settings.customerWidgets?.showCustomerTicketBar !== false && (
        <CustomerTicketBar
          tickets={tickets}
          activeCustomer={activeCustomer}
          orders={orders}
          onOpenTicketChat={(t) => setActiveChatTicket(t)}
          onOpenCreateTicket={() => {
            if (activeOrderId) {
              setTicketOrderId(activeOrderId);
              setIsCreateTicketOpen(true);
            } else {
              setIsTrackerOpen(true);
            }
          }}
        />
      )}

      {/* Free Delivery Goal Meter HUD */}
      <FreeDeliveryGoalMeterHUD
        config={settings.customerWidgets}
        cartTotal={cartTotal}
        freeDeliveryThreshold={settings.freeDeliveryThreshold || 1500}
      />

      {/* Live Kitchen Status & Guarantee HUD Widgets (Hidden on mobile to keep mobile HUD ultra-compact) */}
      <div className="hidden sm:block">
        <LiveKitchenStatusWidget config={settings.customerWidgets} orders={orders} />
        <SatisfactionGuaranteeHUD config={settings.customerWidgets} />
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <HeroBanner
          config={settings.customerWidgets}
          onExploreMenu={() => {
            setSelectedCategoryId('all');
            document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenDeals={() => {
            setSelectedCategoryId('cat-combos');
            document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Customer Area Interactive Widgets: Deal of the Day & Loyalty Club */}
        <DealOfTheDayWidget
          config={settings.customerWidgets}
          menuItems={menuItems}
          onSelectDealItem={(item) => setCustomizingItem(item)}
        />
        <LoyaltyClubBanner config={settings.customerWidgets} />

        {/* Menu Section */}
        <section id="menu-section" className="py-6 scroll-mt-48">
          {/* Category Filter Tabs */}
          <CategoryTabs
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            itemsCountByCat={itemsCountByCat}
          />

          {/* Product Cards Container */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
            {selectedCategoryId === 'all' ? (
              // FULL MENU: Show everything organized category-wise
              <div className="space-y-16">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-800/80">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-heading font-black text-white flex items-center gap-2">
                      <span>Full Menu</span>
                      <span className="text-xs font-mono font-normal text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        Category Wise
                      </span>
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">
                      Explore our full selection arranged by category. Click any category tab or quick filter to view specific items.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-neutral-400 tabular-nums self-start sm:self-auto">
                    {filteredItems.length} {filteredItems.length === 1 ? 'item total' : 'items total'}
                  </span>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="py-20 text-center text-neutral-500">
                    <p className="text-sm font-semibold text-neutral-300">
                      No items match "{searchQuery}"
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Try clearing your search query or reset to view all categories.
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-4 px-4 py-2 bg-neutral-800 text-white rounded-lg text-xs font-semibold hover:bg-neutral-700 transition-colors"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  [...categories]
                    .sort((a, b) => a.order - b.order)
                    .map((cat) => {
                      const catItems = menuItems
                        .filter((item) => item.categoryId === cat.id)
                        .filter((item) => {
                          if (!searchQuery.trim()) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            item.name.toLowerCase().includes(q) ||
                            item.description.toLowerCase().includes(q) ||
                            item.categoryId.toLowerCase().includes(q)
                          );
                        })
                        .sort((a, b) => a.order - b.order);

                      if (catItems.length === 0) return null;

                      return (
                        <div
                          key={cat.id}
                          id={`category-section-${cat.id}`}
                          className="scroll-mt-60 pt-2"
                        >
                          {/* Category Section Header */}
                          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 mb-6 border-b border-neutral-800">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                                {categoryIconMap[cat.iconName] || <Flame className="w-5 h-5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2.5">
                                  <h3 className="text-lg sm:text-xl font-heading font-black text-white">
                                    {cat.name}
                                  </h3>
                                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
                                    {catItems.length} {catItems.length === 1 ? 'item' : 'items'}
                                  </span>
                                </div>
                                {cat.description && (
                                  <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                                    {cat.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedCategoryId(cat.id);
                                document
                                  .getElementById('menu-section')
                                  ?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors self-start sm:self-auto group"
                            >
                              <span>Only show {cat.name}</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>

                          {/* Category Items Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
                            {catItems.map((item) => (
                              <ProductCard
                                key={item.id}
                                item={item}
                                onOpenCustomizer={(it) => setCustomizingItem(it)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            ) : (
              // SPECIFIC CATEGORY SELECTED: Only show specific items for this category
              <div>
                {/* Active Category Header with Back to Full Menu button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 mb-8">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                      {categoryIconMap[
                        categories.find((c) => c.id === selectedCategoryId)?.iconName || 'Flame'
                      ] || <Flame className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-heading font-black text-white">
                          {categories.find((c) => c.id === selectedCategoryId)?.name || 'Category'}
                        </h2>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                          Filtered View
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        {categories.find((c) => c.id === selectedCategoryId)?.description ||
                          'Freshly prepared fast-food items crafted for this category.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-neutral-400 tabular-nums">
                      {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                    </span>
                    <button
                      onClick={() => setSelectedCategoryId('all')}
                      className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/50 text-neutral-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
                      <span>View Full Menu</span>
                    </button>
                  </div>
                </div>

                {/* Specific Category Product Cards Grid */}
                {filteredItems.length === 0 ? (
                  <div className="py-20 text-center text-neutral-500">
                    <p className="text-sm font-semibold text-neutral-300">
                      No items match in{' '}
                      {categories.find((c) => c.id === selectedCategoryId)?.name || 'this category'}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Try clearing search filters or return to the full menu.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategoryId('all');
                      }}
                      className="mt-4 px-4 py-2 bg-neutral-800 text-white rounded-lg text-xs font-semibold hover:bg-neutral-700 transition-colors"
                    >
                      Return to Full Menu
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
                    {filteredItems.map((item) => (
                      <ProductCard
                        key={item.id}
                        item={item}
                        onOpenCustomizer={(it) => setCustomizingItem(it)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Bite & Go Pakistani Story & Quality Promise */}
        <section className="bg-neutral-900 border-t border-b border-neutral-800 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Flame className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Smashed Fresh on Order</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  We use 100% pure beef smashed on scorching-hot chrome flat tops for maximum caramelization, deep savory crusts, and unparalleled juiciness.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">EasyPaisa Instant Verification</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Zero delays. Upload your payment screenshot with Trx ID directly at checkout. Our cashiers verify and dispatch your food without telephone friction.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Bike className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Live Push Tracking</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Watch your meal move from the grill station to the delivery bike in real time. Get notified as soon as your rider reaches your street.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-950 border-t border-neutral-800/80 py-12 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center font-heading font-black text-neutral-950 text-sm">
                  B
                </div>
                <span className="font-heading font-black text-base text-white">Bite &amp; Go</span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Pakistan's premium fast-food experience. Fresh smashed patties, Nashville fiery chicken &amp; loaded fries.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Kitchen Timings</h4>
              <p className="text-neutral-400">{settings.operatingHours}</p>
              <p className="text-neutral-500 mt-1">Open 7 Days a week</p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Customer Support</h4>
              <p className="text-neutral-400">
                WhatsApp / Call:{' '}
                <a
                  href="tel:+923012945576"
                  className="text-amber-400 font-bold hover:underline"
                >
                  +923012945576
                </a>
              </p>
              <p className="text-neutral-500 mt-1">Karachi Express Delivery (Exclusively Serving Karachi)</p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Express Delivery &amp; Timings</h4>
              <p className="text-neutral-400 leading-relaxed text-xs">
                Piping-hot smash burgers and crispy fried chicken delivered in thermal insulated bags.<br />
                <span className="text-amber-400/90 font-medium">Fresh on Flame</span>: Prepared fresh on high-heat flat top upon order placement.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between text-neutral-500 text-[11px] gap-4">
            <p>© {new Date().getFullYear()} Bite &amp; Go Express PK. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>EasyPaisa &amp; JazzCash Verified</span>
              <span aria-hidden="true">·</span>
              <span>Halal Certified</span>
              <span aria-hidden="true">·</span>
              <span>Express Hot Delivery</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Admin / Kitchen / POS Login Modal (Triggered by /admin, /kitchen, /pos, or staff portal) */}
      {isAdminLoginOpen && (
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          initialRole={loginInitialRole}
          onClose={() => {
            setIsAdminLoginOpen(false);
          }}
          onAuthenticated={(user) => {
            setIsAdminLoginOpen(false);
            setCurrentUser(user);
            if (user.role === 'admin') {
              setCurrentView('admin');
            } else if (user.role === 'kitchen') {
              setCurrentView('kitchen');
            } else if (user.role === 'pos' || (user.role as any) === 'employee') {
              setCurrentView('pos');
            } else if (user.role === 'rider') {
              setCurrentView('rider');
            } else {
              setCurrentView('storefront');
            }
          }}
        />
      )}

      {/* Floating Push Notification Banner Toast */}
      <PushNotificationBanner
        notifications={notifications}
        onDismiss={(id) => StorageService.markNotificationAsRead(id)}
        onOpenTracker={(orderId) => {
          setActiveOrderId(orderId);
          setIsTrackerOpen(true);
        }}
      />

      {/* Notifications Drawer Modal */}
      {isNotificationsOpen && (
        <NotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={notifications}
          onOpenTracker={(orderId) => {
            setActiveOrderId(orderId);
            setIsNotificationsOpen(false);
            setIsTrackerOpen(true);
          }}
          onMarkAllRead={() => StorageService.markNotificationsRead()}
        />
      )}

      {/* Item Customizer Modal */}
      {customizingItem && (
        <ItemCustomizerModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        orderType={orderType}
        onToggleOrderType={setOrderType}
        freeDeliveryThreshold={settings.freeDeliveryThreshold}
        deliveryFeeRate={settings.deliveryFee}
        settings={settings}
      />

      {/* Checkout Modal with EasyPaisa Transfer & Receipt Upload */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onBackToCart={() => {
            setIsCheckoutOpen(false);
            setIsCartOpen(true);
          }}
          items={cartItems}
          orderType={orderType}
          settings={settings}
          activeCustomer={activeCustomer}
          onOpenCustomerAuth={() => {
            setIsCheckoutOpen(false);
            setIsCustomerAuthOpen(true);
          }}
          onOrderPlaced={handleOrderPlaced}
        />
      )}

      {/* Customer Live Order Tracking Modal */}
      {isTrackerOpen && (
        <OrderTrackerModal
          isOpen={isTrackerOpen}
          onClose={() => setIsTrackerOpen(false)}
          activeOrder={activeOrder}
          onSelectOrder={(ord) => setActiveOrderId(ord.id)}
          allOrders={orders}
          menuItems={menuItems}
          onOpenCreateTicket={(orderId) => {
            setTicketOrderId(orderId);
            setIsCreateTicketOpen(true);
          }}
          onOpenReviews={() => setIsReviewsModalOpen(true)}
          onOrderCancelled={loadData}
          onOrderUpdated={loadData}
        />
      )}

      {/* Customer Authentication Modal (Email & Password Login & Register) */}
      {isCustomerAuthOpen && (
        <CustomerAuthModal
          isOpen={isCustomerAuthOpen}
          onClose={() => setIsCustomerAuthOpen(false)}
          onSuccess={(user) => {
            setActiveCustomer(user);
            loadData();
          }}
        />
      )}

      {/* Customer Profile, Saved Address & Support Tickets Modal */}
      {isCustomerProfileOpen && activeCustomer && (
        <CustomerProfileModal
          isOpen={isCustomerProfileOpen}
          onClose={() => setIsCustomerProfileOpen(false)}
          customer={activeCustomer}
          onLogout={handleCustomerLogout}
          onOpenCreateTicket={(orderId) => {
            if (orderId) {
              setTicketOrderId(orderId);
              setIsCreateTicketOpen(true);
            } else {
              const activeId = StorageService.getActiveOrderId();
              if (activeId) {
                setTicketOrderId(activeId);
                setIsCreateTicketOpen(true);
              } else {
                setIsTrackerOpen(true);
              }
            }
          }}
          onOpenTicketChat={(t) => setActiveChatTicket(t)}
          onOpenReviews={(orderId) => {
            if (orderId) setActiveOrderId(orderId);
            setIsReviewsModalOpen(true);
          }}
          tickets={tickets}
          orders={orders}
        />
      )}

      {/* Customer Support Ticket Creation Modal for Order Issues */}
      {isCreateTicketOpen && (
        <CreateTicketModal
          isOpen={isCreateTicketOpen}
          onClose={() => {
            setIsCreateTicketOpen(false);
            setTicketOrderId(undefined);
          }}
          preselectedOrderId={ticketOrderId}
          orders={orders}
          activeCustomer={activeCustomer}
          onTicketCreated={(newTicket) => {
            loadData();
            setActiveChatTicket(newTicket);
          }}
        />
      )}

      {/* Customer Ticket Chat & Talk Back Modal (Enabled for active tickets; for closed tickets shows closed notice and Request Reopen option) */}
      {activeChatTicket && (
        <CustomerTicketChatModal
          isOpen={Boolean(activeChatTicket)}
          onClose={() => setActiveChatTicket(null)}
          ticket={activeChatTicket}
          onTicketUpdated={(updated) => {
            setActiveChatTicket(updated);
            loadData();
          }}
        />
      )}

      {/* Floating Customer Quick Care Bubble Widget (Desktop Only to keep Mobile ultra-clean) */}
      <div className="hidden sm:block">
        <FloatingCustomerHelpBubble
          config={settings.customerWidgets}
          settings={settings}
          onOpenTracker={() => setIsTrackerOpen(true)}
          onOpenCreateTicket={() => {
            if (activeOrderId) {
              setTicketOrderId(activeOrderId);
              setIsCreateTicketOpen(true);
            } else {
              setIsTrackerOpen(true);
            }
          }}
          onOpenTicketChat={(t) => {
            setActiveChatTicket(t);
          }}
          activeTicket={
            StorageService.getCustomerTickets(activeCustomer, orders).find(
              (t) => t.status === 'open' || t.status === 'investigating'
            ) || null
          }
        />
      </div>

      {/* Mobile Ultra-Compact Customer Dock HUD (Menu Sidebar, Track, Reviews, Account, Bag) */}
      <MobileCustomerDockHUD
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenTracker={() => setIsTrackerOpen(true)}
        onOpenReviews={() => setIsReviewsModalOpen(true)}
        onOpenAccount={() => {
          if (activeCustomer) setIsCustomerProfileOpen(true);
          else setIsCustomerAuthOpen(true);
        }}
        onOpenCart={() => setIsCartOpen(true)}
        activeOrder={activeOrder}
        activeCustomer={activeCustomer}
        cartCount={cartItems.reduce((sum, i) => sum + i.quantity, 0)}
        cartTotal={cartTotal}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Customer Sidebar Drawer (Opened via 3-button Menu trigger on Mobile & Header) */}
      <CustomerSidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeCustomer={activeCustomer}
        activeOrder={activeOrder}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenOrders={() => {
          if (activeCustomer) setIsCustomerProfileOpen(true);
          else setIsCustomerAuthOpen(true);
        }}
        onOpenAccount={() => {
          if (activeCustomer) setIsCustomerProfileOpen(true);
          else setIsCustomerAuthOpen(true);
        }}
        onOpenTracker={() => setIsTrackerOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenReviews={() => setIsReviewsModalOpen(true)}
        onOpenTickets={() => {
          const activeId = StorageService.getActiveOrderId();
          if (activeId) {
            setTicketOrderId(activeId);
            setIsCreateTicketOpen(true);
          } else if (orders.length > 0) {
            setTicketOrderId(orders[0].id);
            setIsCreateTicketOpen(true);
          } else {
            setIsTrackerOpen(true);
          }
        }}
        onOpenCustomerAuth={() => setIsCustomerAuthOpen(true)}
        onOpenAdmin={handleOpenAdmin}
        onOpenPos={handleOpenPos}
        onOpenKitchen={handleOpenKitchen}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        onLogoutCustomer={handleCustomerLogout}
      />


      {/* Customer Reviews & Ratings Modal (Separate Area from Tickets) */}
      <CustomerReviewsModal
        isOpen={isReviewsModalOpen}
        onClose={() => setIsReviewsModalOpen(false)}
        menuItems={menuItems}
        orders={orders}
        activeCustomer={activeCustomer}
        activeOrderId={activeOrderId}
      />

      {/* Dedicated Rider Delivery HUD Modal */}
      <RiderDeliveryHudModal
        isOpen={isRiderHudOpen}
        onClose={() => setIsRiderHudOpen(false)}
        orders={orders}
        onRefreshData={loadData}
      />

      {/* Theme Selector Modal */}
      {isThemeModalOpen && (
        <ThemeSelectorModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
          currentTheme={settings.customerWidgets?.themePreset || 'dark'}
          onSelectTheme={async (newThemeId) => {
            const current = StorageService.getSettings();
            const updated: StoreSettings = {
              ...current,
              customerWidgets: {
                ...(current.customerWidgets || {}),
                themePreset: newThemeId,
                themeAccent: newThemeId,
              } as any,
            };
            setSettings(updated);
            applyThemeToDocument(newThemeId);
            await StorageService.saveSettings(updated);
            loadData();
          }}
        />
      )}

      {/* Floating Theme Switcher Quick Button (Desktop Only to eliminate mobile clutter) */}
      <div className="hidden sm:block fixed bottom-24 left-5 z-40">
        <button
          type="button"
          onClick={() => setIsThemeModalOpen(true)}
          className="p-3 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/50 text-neutral-300 hover:text-amber-400 rounded-full shadow-xl backdrop-blur-md transition-all active:scale-95 group cursor-pointer"
          title="Switch Theme (White, Dark, Midnight, Custom)"
        >
          <Palette className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    </div>
  );
}
