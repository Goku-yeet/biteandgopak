import React, { useState, useRef, useEffect } from 'react';
import {
  Order,
  OrderStatus,
  CustomerTicket,
  StoreSettings,
  MenuItem,
  DEFAULT_KITCHEN_PERMISSIONS,
  KitchenPermissionsConfig,
} from '../../types';
import { ApiService } from '../../utils/api';
import { StorageService } from '../../utils/storage';
import { sounds } from '../../utils/audio';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Flame,
  Bike,
  LogOut,
  ArrowLeft,
  Volume2,
  RefreshCw,
  X,
  Timer,
  Utensils,
  MessageSquare,
  RotateCcw,
  Lock,
  Ticket,
  PackageCheck,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Phone,
} from 'lucide-react';

interface KitchenDashboardProps {
  orders: Order[];
  onBackToStore: () => void;
  onLogout: () => void;
  onRefreshData: () => void;
  chefName?: string;
  settings?: StoreSettings;
  menuItems?: MenuItem[];
  onToggleStock?: (itemId: string, inStock: boolean) => void;
}

export const KitchenDashboard: React.FC<KitchenDashboardProps> = ({
  orders,
  onBackToStore,
  onLogout,
  onRefreshData,
  chefName = 'Head Chef & Grill Station',
  settings,
  menuItems = [],
  onToggleStock,
}) => {
  const perms: KitchenPermissionsConfig = settings?.kitchenPermissions || DEFAULT_KITCHEN_PERMISSIONS;

  const [filter, setFilter] = useState<'all' | 'new' | 'cooking' | 'ready' | 'issues'>('all');

  // Modals state
  const [delayingOrder, setDelayingOrder] = useState<Order | null>(null);
  const [decliningOrder, setDecliningOrder] = useState<Order | null>(null);

  const [delayMinutes, setDelayMinutes] = useState<number>(10);
  const [delayReason, setDelayReason] = useState<string>('Grill Station Rush - High Order Volume');

  const [declineReason, setDeclineReason] = useState<string>('Kitchen at Maximum Peak Capacity');
  const [customDeclineReason, setCustomDeclineReason] = useState<string>('');
  const [supervisorPasscode, setSupervisorPasscode] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string>('');
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  const [tickets, setTickets] = useState<CustomerTicket[]>(StorageService.getTickets());
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Incoming order beep when new order arrives with status 'received' (only after initial load)
  const prevReceivedOrdersCount = useRef(orders.filter((o) => o.status === 'received').length);
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      prevReceivedOrdersCount.current = orders.filter((o) => o.status === 'received').length;
      return;
    }
    const curReceived = orders.filter((o) => o.status === 'received').length;
    if (curReceived > prevReceivedOrdersCount.current) {
      sounds.playKitchenOrderBeep();
    }
    prevReceivedOrdersCount.current = curReceived;
    setTickets(StorageService.getTickets());
  }, [orders]);

  // Filter orders relevant to kitchen
  const kitchenOrders = orders.filter((o) => {
    if (filter === 'new') return o.status === 'received' || o.status === 'confirmed';
    if (filter === 'cooking') return o.status === 'preparing';
    if (filter === 'ready') return o.status === 'on_the_way' || o.status === 'delivered';
    return o.status !== 'cancelled';
  });

  const newOrdersCount = orders.filter((o) => o.status === 'received' || o.status === 'confirmed').length;
  const cookingOrdersCount = orders.filter((o) => o.status === 'preparing').length;

  // Kitchen Actions
  const handleAcceptOrder = async (order: Order, minutes = 20) => {
    setIsActionLoading(true);
    try {
      await ApiService.kitchenAcceptOrder(order.id, minutes);
    } catch {
      // Local fallback
    }
    StorageService.updateOrderStatus(order.id, 'preparing', `Accepted by Kitchen. Grilling started (${minutes}m ETA).`);
    sounds.playChime();
    setIsActionLoading(false);
    onRefreshData();
  };

  const handleConfirmDelay = async () => {
    if (!delayingOrder) return;
    setIsActionLoading(true);
    try {
      await ApiService.kitchenDelayOrder(delayingOrder.id, delayMinutes, delayReason);
    } catch {
      // Fallback
    }
    StorageService.adjustOrderTimer(
      delayingOrder.id,
      (delayingOrder.estimatedMinutes || 20) + delayMinutes,
      delayReason
    );
    setIsActionLoading(false);
    setDelayingOrder(null);
    onRefreshData();
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return 'N/A';
    if (perms.canViewCustomerPhone) return phone;
    return phone.length > 5 ? `${phone.slice(0, 4)}-***-${phone.slice(-2)}` : '***-***-***';
  };

  const handleConfirmDecline = async () => {
    if (!decliningOrder) return;
    if (perms.requireSupervisorPasscodeForDecline) {
      const expectedPasscode = perms.supervisorPasscode || '1234';
      if (supervisorPasscode.trim() !== expectedPasscode.trim()) {
        setPasscodeError('Incorrect supervisor passcode. Contact shift manager.');
        return;
      }
    }
    setPasscodeError('');
    const finalReason = customDeclineReason.trim() || declineReason;
    setIsActionLoading(true);
    try {
      await ApiService.kitchenDeclineOrder(decliningOrder.id, finalReason);
    } catch {
      // Fallback
    }
    StorageService.declineOrder(decliningOrder.id, finalReason);

    // Automatically resolve any open customer cancellation tickets for this order
    const relatedTickets = tickets.filter(
      (t) => t.orderId === decliningOrder.id && t.issueType === 'order_decline_request' && t.status !== 'resolved'
    );
    for (const t of relatedTickets) {
      StorageService.updateTicketStatus(
        t.id,
        'resolved',
        `Order #${decliningOrder.id} cancelled by kitchen: ${finalReason}`
      );
    }
    setTickets(StorageService.getTickets());

    setIsActionLoading(false);
    setDecliningOrder(null);
    setSupervisorPasscode('');
    onRefreshData();
  };

  const handleMarkReady = async (order: Order) => {
    setIsActionLoading(true);
    try {
      await ApiService.kitchenReadyOrder(order.id);
    } catch {
      // Fallback
    }
    StorageService.updateOrderStatus(order.id, 'on_the_way', 'Food cooked, packed in hot thermal bag & dispatched with rider.');
    sounds.playSuccess();
    setIsActionLoading(false);
    onRefreshData();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Kitchen Top Bar */}
      <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onBackToStore}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 border border-neutral-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Store</span>
              </button>

              <div className="h-4 w-px bg-neutral-800" />

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>Kitchen Display Station (KDS)</span>
                    <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                      GRILL &amp; FRYER
                    </span>
                  </h1>
                  <p className="text-[11px] text-neutral-400">{chefName}</p>
                </div>
              </div>
            </div>

            {/* Top Quick Status & Sign Out */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Permissions indicator */}
              <div
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300"
                title="Kitchen operations permissions controlled via Admin Portal > Kitchen Permissions"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono text-emerald-400 font-bold">KDS Perms</span>
                <span className="text-neutral-500">·</span>
                <span className="text-neutral-400 font-medium">
                  {perms.canAcceptOrders ? 'Accept: OK' : 'Accept: Locked'}
                </span>
              </div>

              {/* Quick Station Stock Toggle (86'd items) */}
              {perms.canToggleStockFromKitchen ? (
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-amber-400 hover:text-amber-300 text-xs font-semibold transition-colors"
                  title="Toggle menu items In Stock / 86'd Out of Stock directly from grill"
                >
                  <PackageCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Station Stock (86'd)</span>
                  <span className="sm:hidden">Stock</span>
                </button>
              ) : (
                <div
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900/60 border border-neutral-850 text-neutral-500 text-xs cursor-not-allowed"
                  title="Stock toggle locked by Admin in Kitchen Permissions"
                >
                  <Lock className="w-3 h-3 text-neutral-600" />
                  <span className="hidden sm:inline text-[11px]">Stock: Admin Locked</span>
                </div>
              )}

              <button
                onClick={() => {
                  sounds.unlockAudioContext();
                  sounds.playKitchenOrderBeep();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-amber-400 hover:text-amber-300 text-xs font-semibold transition-colors"
                title="Test High-Priority Kitchen Order Beeper (Buzzer sound)"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Test Alert Buzzer</span>
              </button>

              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white border border-neutral-800 rounded-lg text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-neutral-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* New Orders Attention Alert Banner */}
          {orders.some((o) => o.status === 'received') && (
            <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 px-4 py-2 text-white flex items-center justify-between rounded-xl my-2 mx-1 shadow-lg animate-pulse">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  🔔 {orders.filter((o) => o.status === 'received').length} New Order Waiting for Kitchen Fire!
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.unlockAudioContext();
                    sounds.playKitchenOrderBeep();
                  }}
                  className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-900 text-amber-400 font-mono text-[11px] font-bold rounded-lg border border-amber-400/30 transition-colors"
                >
                  🔊 Buzz Again
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('new')}
                  className="px-3 py-1 bg-white hover:bg-neutral-100 text-neutral-950 text-xs font-extrabold rounded-lg transition-colors"
                >
                  View Queue
                </button>
              </div>
            </div>
          )}

          {/* Low Packaging & Buns Depletion Warning for Chef */}
          {(() => {
            const lowPackaging = StorageService.getIngredients().filter(
              (ing) => (ing.category === 'packaging' || ing.category === 'bakery') && ing.currentStock <= ing.lowStockThreshold
            );
            if (lowPackaging.length === 0) return null;
            return (
              <div className="bg-amber-950/70 border border-amber-500/40 px-3.5 py-2 rounded-xl my-1.5 mx-1 flex items-center justify-between text-xs text-amber-200 gap-2">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="font-bold text-amber-400 flex items-center gap-1 shrink-0 text-[11px]">
                    ⚠️ Low Packaging / Bun Alert:
                  </span>
                  {lowPackaging.map((p) => (
                    <span
                      key={p.id}
                      className="px-2 py-0.5 rounded-md bg-neutral-900 border border-amber-500/30 text-[11px] font-mono shrink-0"
                    >
                      {p.name}: <strong className="text-red-400">{p.currentStock} {p.unit}</strong> left
                    </span>
                  ))}
                </div>
                {perms.canToggleStockFromKitchen && (
                  <button
                    type="button"
                    onClick={() => setIsStockModalOpen(true)}
                    className="px-2 py-0.5 text-[10.5px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/30 shrink-0 ml-2 cursor-pointer"
                  >
                    Station Stock
                  </button>
                )}
              </div>
            );
          })()}

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 border-t border-neutral-900">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              All Kitchen Orders ({orders.filter((o) => o.status !== 'cancelled').length})
            </button>

            <button
              onClick={() => setFilter('new')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                filter === 'new'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>New Tickets ({newOrdersCount})</span>
            </button>

            <button
              onClick={() => setFilter('cooking')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                filter === 'cooking'
                  ? 'bg-red-500 text-white'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>On The Grill ({cookingOrdersCount})</span>
            </button>

            <button
              onClick={() => setFilter('ready')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filter === 'ready'
                  ? 'bg-emerald-500 text-neutral-950'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              Cooked / Dispatched
            </button>

            <button
              onClick={() => setFilter('issues')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                filter === 'issues'
                  ? 'bg-amber-500 text-neutral-950 font-black'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Customer Issue Tickets ({tickets.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Kitchen Grid or Issues Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {filter === 'issues' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span>Customer Support Issues &amp; Remake Tickets</span>
                </h2>
                <p className="text-xs text-neutral-400">
                  Kitchen staff can review complaints, remake meals, and reopen closed tickets directly.
                </p>
              </div>
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                {tickets.filter((t) => t.status === 'open').length} Open Issues
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400 text-xs">{t.id}</span>
                      <span className="text-xs text-neutral-400">·</span>
                      <span className="text-xs text-neutral-200">Order #{t.orderId}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        t.status === 'open'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : t.status === 'resolved'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-white capitalize block">
                      Issue: {t.issueType.replace('_', ' ')}
                    </span>
                    <p className="text-xs text-neutral-300 mt-1 bg-neutral-950 p-2.5 rounded-xl border border-neutral-850">
                      "{t.message}"
                    </p>
                    <span className="text-[11px] text-neutral-400 mt-1 block">
                      Customer: {t.customerName} ({formatPhone(t.customerPhone)})
                    </span>
                  </div>

                  {t.adminReply && (
                    <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 p-2 rounded-lg">
                      <strong>Staff Response:</strong> {t.adminReply}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-850">
                    {t.status === 'closed' ? (
                      perms.canReopenTickets ? (
                        <button
                          type="button"
                          onClick={() => {
                            StorageService.updateTicketStatus(
                              t.id,
                              'open',
                              'Reopened by kitchen employee to remake item.'
                            );
                            setTickets(StorageService.getTickets());
                            sounds.playSuccess();
                          }}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
                          title="Reopen closed ticket so customer can track updates"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Re-open Ticket (Staff Action)</span>
                        </button>
                      ) : (
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-500 text-xs"
                          title="Ticket re-opening restricted by Admin in Kitchen Permissions"
                        >
                          <Lock className="w-3 h-3 text-neutral-500" />
                          <span>Reopening Restricted</span>
                        </div>
                      )
                    ) : perms.canManageTickets ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            StorageService.updateTicketStatus(
                              t.id,
                              'resolved',
                              'Kitchen remade fresh items and dispatched with priority rider.'
                            );
                            setTickets(StorageService.getTickets());
                            sounds.playSuccess();
                          }}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Resolve &amp; Remake</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            StorageService.updateTicketStatus(
                              t.id,
                              'closed',
                              'Closed by kitchen operations.'
                            );
                            setTickets(StorageService.getTickets());
                          }}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Close</span>
                        </button>
                      </>
                    ) : (
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-500 text-xs"
                        title="Ticket resolving restricted to Managers in Kitchen Permissions"
                      >
                        <Lock className="w-3 h-3 text-neutral-500" />
                        <span>Ticket Actions Restricted</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {tickets.length === 0 && (
                <div className="col-span-full py-16 text-center bg-neutral-900 rounded-3xl border border-neutral-800">
                  <Ticket className="w-12 h-12 text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white">No active customer tickets</p>
                  <p className="text-xs text-neutral-500">All orders are running smoothly.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {kitchenOrders.map((order) => {
            const isNew = order.status === 'received' || order.status === 'confirmed';
            const isCooking = order.status === 'preparing';
            const isReady = order.status === 'on_the_way' || order.status === 'delivered';

            return (
              <div
                key={order.id}
                className={`rounded-2xl border flex flex-col justify-between overflow-hidden shadow-lg transition-all ${
                  isNew
                    ? 'bg-neutral-900 border-amber-500/60 ring-2 ring-amber-500/20'
                    : isCooking
                    ? 'bg-neutral-900 border-red-500/50'
                    : 'bg-neutral-900/60 border-neutral-800'
                }`}
              >
                {/* Order Card Header */}
                <div
                  className={`p-4 border-b flex items-center justify-between ${
                    isNew
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : isCooking
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-base font-extrabold text-white">
                      {order.id}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        isNew
                          ? 'bg-amber-400 text-neutral-950'
                          : isCooking
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {order.status === 'preparing' ? 'Cooking Now' : order.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {Math.max(1, Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000))}m ago
                    </span>
                  </div>
                </div>

                {/* Customer Cancellation Request Ticket Alert if any */}
                {(() => {
                  const linkedCancel = tickets.find(
                    (t) => t.orderId === order.id && t.issueType === 'order_decline_request' && t.status !== 'resolved'
                  );
                  if (!linkedCancel) return null;
                  return (
                    <div className="p-3 mx-3 mt-3 rounded-xl bg-red-950/80 border border-red-500 text-xs text-white space-y-1.5 animate-pulse">
                      <div className="flex items-center justify-between text-red-300 font-bold">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          <span>Customer Decline Request (#{linkedCancel.id})</span>
                        </span>
                        <span className="bg-red-500 text-white text-[9px] font-mono px-1.5 py-0.2 rounded font-bold">HOLD GRILL</span>
                      </div>
                      <p className="text-neutral-200 text-[11px]">Reason: "{linkedCancel.message}"</p>
                      <button
                        type="button"
                        onClick={() => {
                          setDecliningOrder(order);
                          setDeclineReason(`Customer cancellation approved: ${linkedCancel.message}`);
                        }}
                        className="mt-1 px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Confirm Decline &amp; Cancel</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Items & Portion Specifications for Cook */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                  <div className="space-y-3 divide-y divide-neutral-800/80">
                    {order.items.map((it, idx) => (
                      <div key={idx} className={idx > 0 ? 'pt-2.5' : ''}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-heading font-black text-white text-sm sm:text-base">
                            {it.quantity}x {it.name}
                          </span>
                        </div>

                        {/* Portion / Variant */}
                        {it.selectedVariant && (
                          <div className="text-xs font-semibold text-amber-400 mt-0.5">
                            Portion: {it.selectedVariant}
                          </div>
                        )}

                        {/* Spice Level Callout */}
                        {it.selectedSpiciness && (
                          <div className="text-xs font-bold text-red-400 flex items-center gap-1 mt-0.5">
                            <Flame className="w-3.5 h-3.5" />
                            <span>Spice: {it.selectedSpiciness}</span>
                          </div>
                        )}

                        {/* Add-ons */}
                        {it.selectedAddons && it.selectedAddons.length > 0 && (
                          <div className="text-xs text-neutral-300 mt-0.5 font-medium">
                            + {it.selectedAddons.map((a) => a.name).join(', ')}
                          </div>
                        )}

                        {/* Special Cook Instructions Callout */}
                        {it.specialInstructions && (
                          <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                            ⚠️ Cook Note: "{it.specialInstructions}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {order.customerNotes && (
                    <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 italic">
                      Customer Note: "{order.customerNotes}"
                    </div>
                  )}

                  {/* Estimated prep timer & Order Price */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
                    <span className="text-neutral-400 flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-amber-400" />
                      ETA:
                      <span className="font-mono font-bold text-amber-400 ml-1">
                        {order.estimatedMinutes}m
                      </span>
                    </span>

                    {perms.canViewOrderPrices ? (
                      <span className="font-mono font-bold text-white bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded">
                        Rs. {order.total.toLocaleString()}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] text-neutral-500 font-mono italic bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-850"
                        title="Order pricing hidden by Admin in Kitchen Permissions"
                      >
                        Price Hidden
                      </span>
                    )}
                  </div>
                </div>

                {/* Rider Assignment & Quick Call Info for Delivery Orders */}
                {(order.orderType === 'delivery' || (!order.orderType && order.deliveryAddress)) && (
                  <div className="px-4 py-2.5 bg-neutral-900/90 border-t border-neutral-800/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 font-medium flex items-center gap-1.5">
                        <Bike className="w-3.5 h-3.5 text-amber-400" />
                        <span>Delivery Rider:</span>
                      </span>
                      {order.driver ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Assigned
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          Unassigned
                        </span>
                      )}
                    </div>

                    {order.driver && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-white text-xs truncate">{order.driver.name}</p>
                          <p className="text-[10px] text-neutral-400 font-mono truncate">{order.driver.vehiclePlate || 'Motorbike'}</p>
                        </div>
                        <a
                          href={`tel:${order.driver.phone}`}
                          className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                          title="Call rider for delivery timings"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                      </div>
                    )}

                    {/* Rider Selector pre-configured by Admin */}
                    <div className="flex items-center gap-2">
                      <select
                        value={order.driver?.name || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          const availableRiders = settings?.deliveryRiders || StorageService.getSettings().deliveryRiders || [];
                          const chosen = availableRiders.find((r) => r.name === val) || null;
                          try {
                            StorageService.assignRiderToOrder(order.id, chosen);
                            await ApiService.assignRider(order.id, chosen);
                          } catch (err) {
                            console.error('Failed to assign rider:', err);
                          }
                          onRefreshData();
                        }}
                        className="flex-1 bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="">{order.driver ? 'Change Delivery Rider...' : 'Assign Delivery Rider...'}</option>
                        {(settings?.deliveryRiders || StorageService.getSettings().deliveryRiders || []).map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name} ({r.phone}) - {r.isActive ? 'Active' : 'Off-duty'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Kitchen Action Bar */}
                <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex flex-col gap-2">
                  {/* If New Order: Accept or Decline */}
                  {isNew && (
                    <div className="grid grid-cols-2 gap-2">
                      {perms.canAcceptOrders ? (
                        <button
                          onClick={() => handleAcceptOrder(order, 20)}
                          disabled={isActionLoading}
                          className="py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 transition-all cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5 fill-neutral-950" />
                          <span>Accept &amp; Fire Grill</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="py-2.5 bg-neutral-900 text-neutral-500 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed border border-neutral-800"
                          title="Order accepting restricted by Admin in Kitchen Permissions"
                        >
                          <Lock className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Accept (Restricted)</span>
                        </button>
                      )}

                      {perms.canDeclineOrders ? (
                        <button
                          onClick={() => {
                            setDecliningOrder(order);
                            setSupervisorPasscode('');
                            setPasscodeError('');
                          }}
                          disabled={isActionLoading}
                          className="py-2.5 bg-neutral-850 hover:bg-red-950/80 hover:text-red-300 text-neutral-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline Order</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="py-2.5 bg-neutral-900 text-neutral-500 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed border border-neutral-800"
                          title="Order declining restricted by Admin in Kitchen Permissions"
                        >
                          <Lock className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Decline (Restricted)</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* If Currently Cooking: Delay, Mark Ready or Decline */}
                  {isCooking && (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-2">
                        {perms.canMarkReady ? (
                          <button
                            onClick={() => handleMarkReady(order)}
                            disabled={isActionLoading}
                            className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Ready &amp; Pack</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="py-2.5 bg-neutral-900 text-neutral-500 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed border border-neutral-800"
                            title="Marking ready restricted by Admin in Kitchen Permissions"
                          >
                            <Lock className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Ready (Restricted)</span>
                          </button>
                        )}

                        {perms.canDelayOrders ? (
                          <button
                            onClick={() => setDelayingOrder(order)}
                            disabled={isActionLoading}
                            className="py-2.5 bg-neutral-850 hover:bg-neutral-800 text-amber-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-neutral-800 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Delay (+Time)</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="py-2.5 bg-neutral-900 text-neutral-500 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed border border-neutral-800"
                            title="Delaying orders restricted by Admin in Kitchen Permissions"
                          >
                            <Lock className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Delay (Restricted)</span>
                          </button>
                        )}
                      </div>

                      {perms.canDeclineOrders && (
                        <div className="flex items-center justify-between pt-1 border-t border-neutral-850">
                          <span className="text-[10px] text-neutral-500 font-mono">Grilling on station</span>
                          <button
                            type="button"
                            onClick={() => {
                              setDecliningOrder(order);
                              setDeclineReason('Out of Fresh Smash Beef Patties');
                              setCustomDeclineReason('');
                              setSupervisorPasscode('');
                              setPasscodeError('');
                            }}
                            disabled={isActionLoading}
                            className="px-2.5 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/60 border border-red-900/50 rounded-lg flex items-center gap-1 font-bold cursor-pointer transition-colors"
                            title="Decline order while cooking with reason"
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                            <span>Decline During Cooking</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* If Ready / Dispatched */}
                  {isReady && (
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="flex-1 w-full p-2 text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5 bg-emerald-500/10 rounded-lg">
                        <Bike className="w-4 h-4" />
                        <span>Order Ready / Dispatched</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          StorageService.updateOrderStatus(order.id, 'delivered', 'Order completed & served by kitchen.');
                          sounds.playSuccess();
                          onRefreshData();
                        }}
                        className="w-full sm:w-auto px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow cursor-pointer transition-colors active:scale-95 shrink-0"
                        title="Mark Completed & Served"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed &amp; Served</span>
                      </button>
                    </div>
                  )}

                  {/* If Already Delivered */}
                  {order.status === 'delivered' && (
                    <div className="flex items-center justify-between p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>✓ Completed &amp; Served</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          StorageService.updateOrderStatus(order.id, 'preparing', 'Kitchen reopened order for remake.');
                          sounds.playChime();
                          onRefreshData();
                        }}
                        className="px-2.5 py-1 text-xs bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-white rounded-lg border border-neutral-800 transition-colors cursor-pointer"
                        title="Reopen order if customer requested modifications"
                      >
                        Reopen Order
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {kitchenOrders.length === 0 && (
            <div className="col-span-full py-20 text-center text-neutral-500 space-y-2">
              <ChefHat className="w-12 h-12 mx-auto opacity-30 text-amber-500" />
              <p className="text-sm font-bold text-white">No active orders in this view</p>
              <p className="text-xs text-neutral-400">
                New incoming orders will pop up here with real-time sound chimes.
              </p>
            </div>
          )}
        </div>
        )}
      </main>

      {/* Delay Order Modal */}
      {delayingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Delay Order {delayingOrder.id}
                </h3>
              </div>
              <button
                onClick={() => setDelayingOrder(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Select delay duration. Customer will receive a live push alert with the updated ETA.
            </p>

            {/* Quick minute buttons */}
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-2">
                Select Delay Time:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDelayMinutes(mins)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      delayMinutes === mins
                        ? 'bg-amber-500 text-neutral-950 border-amber-500'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    +{mins} Mins
                  </button>
                ))}
              </div>
            </div>

            {/* Delay Reason selection */}
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-2">
                Reason for Delay:
              </label>
              <select
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="Grill Station Rush - High Order Volume">
                  Grill Station Rush - High Order Volume
                </option>
                <option value="Fresh Beef Patty Preparation in Progress">
                  Fresh Beef Patty Preparation in Progress
                </option>
                <option value="Loaded Fries Fryer Station Queue">
                  Loaded Fries Fryer Station Queue
                </option>
                <option value="Peak Rush Hour - Prioritizing Hot Freshness">
                  Peak Rush Hour - Prioritizing Hot Freshness
                </option>
              </select>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setDelayingOrder(null)}
                className="px-3 py-2 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelay}
                disabled={isActionLoading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl"
              >
                Notify Customer (+{delayMinutes}m)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Order Modal */}
      {decliningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">
                  Decline Order {decliningOrder.id}
                </h3>
              </div>
              <button
                onClick={() => setDecliningOrder(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Declining will cancel this order and send a direct cancellation notice to the customer.
            </p>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-2">
                Select Reason:
              </label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white mb-2"
              >
                <option value="Kitchen at Maximum Peak Capacity">
                  Kitchen at Maximum Peak Capacity
                </option>
                <option value="Out of Fresh Smash Beef Patties">
                  Out of Fresh Smash Beef Patties
                </option>
                <option value="Out of Brioche Buns / Key Ingredients">
                  Out of Brioche Buns / Key Ingredients
                </option>
                <option value="Delivery Address Out of Kitchen Range">
                  Delivery Address Out of Kitchen Range
                </option>
                <option value="Other">Other / Custom Reason</option>
              </select>

              {declineReason === 'Other' && (
                <input
                  type="text"
                  placeholder="Type specific decline reason..."
                  value={customDeclineReason}
                  onChange={(e) => setCustomDeclineReason(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              )}
            </div>

            {/* Supervisor Passcode Requirement */}
            {perms.requireSupervisorPasscodeForDecline && (
              <div className="p-3 bg-neutral-950 rounded-xl border border-red-900/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-red-300">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-red-400" />
                    <span>Supervisor Passcode Required</span>
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">Shift Security</span>
                </div>
                <input
                  type="password"
                  maxLength={8}
                  placeholder="Enter supervisor PIN (default 1234)..."
                  value={supervisorPasscode}
                  onChange={(e) => {
                    setSupervisorPasscode(e.target.value);
                    setPasscodeError('');
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white tracking-widest font-mono"
                />
                {passcodeError && (
                  <p className="text-[11px] text-red-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {passcodeError}
                  </p>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setDecliningOrder(null)}
                className="px-3 py-2 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDecline}
                disabled={isActionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STATION STOCK (86'D ITEMS) MODAL ================= */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Grill Station Stock Management</span>
                    <span className="text-[10px] font-mono bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">
                      86'd Controls
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Instantly 86 items when ingredients run out. Customers will see Sold Out live.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover bg-neutral-900 border border-neutral-800"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.name}</h4>
                      <p className="text-[11px] text-neutral-400">
                        Rs. {item.price.toLocaleString()} · {item.isAvailable ? 'In Stock' : '86’d (Sold Out)'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onToggleStock) {
                        onToggleStock(item.id, !item.isAvailable);
                      }
                      sounds.playChime();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      item.isAvailable
                        ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30'
                    }`}
                  >
                    {item.isAvailable ? '✓ In Stock' : '✕ Sold Out (86’d)'}
                  </button>
                </div>
              ))}

              {menuItems.length === 0 && (
                <p className="text-center py-8 text-neutral-500 text-xs">No menu items found.</p>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span>Changes reflect instantly on storefront</span>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
