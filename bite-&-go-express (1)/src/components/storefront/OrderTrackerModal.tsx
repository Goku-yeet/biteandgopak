import React, { useState } from 'react';
import { Order, OrderStatus, MenuItem, OrderItem } from '../../types';
import {
  X,
  Bike,
  CheckCircle2,
  Clock,
  ChefHat,
  Home,
  ShieldCheck,
  AlertTriangle,
  Phone,
  Bell,
  Search,
  Sparkles,
  ExternalLink,
  Ticket,
  AlertOctagon,
  XCircle,
  Copy,
  Check,
  Star,
  Edit2,
  Plus,
  Minus,
  Trash2,
  Save,
  MapPin,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { StorageService } from '../../utils/storage';
import { ApiService } from '../../utils/api';
import { getAreaCoordinates } from '../../data/karachiAreas';

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrder: Order | null;
  onSelectOrder: (order: Order) => void;
  allOrders: Order[];
  menuItems?: MenuItem[];
  onOpenCreateTicket?: (orderId?: string) => void;
  onOpenReviews?: () => void;
  onOrderCancelled?: () => void;
  onOrderUpdated?: (order: Order) => void;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  isOpen,
  onClose,
  activeOrder,
  onSelectOrder,
  allOrders,
  menuItems = [],
  onOpenCreateTicket,
  onOpenReviews,
  onOrderCancelled,
  onOrderUpdated,
}) => {
  const [searchId, setSearchId] = useState('');
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [customerCancelReason, setCustomerCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [tickets, setTickets] = useState(StorageService.getTickets());
  const [notificationGranted, setNotificationGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [copiedMapLink, setCopiedMapLink] = useState(false);

  // Live Order Editing State (when customer changes their mind)
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editSpecialInstructions, setEditSpecialInstructions] = useState('');
  const [editSelectedMenuItemId, setEditSelectedMenuItemId] = useState('');
  const [editToast, setEditToast] = useState<string | null>(null);

  // Exclusive Rating States for Ordered Items
  const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
  const [itemComments, setItemComments] = useState<Record<string, string>>({});
  const [ratedDishNames, setRatedDishNames] = useState<string[]>([]);
  const [ratingToast, setRatingToast] = useState<string | null>(null);

  // Load existing reviews for this order
  React.useEffect(() => {
    if (activeOrder) {
      const orderReviews = StorageService.getReviewsForOrder(activeOrder.id);
      const ratedNames = orderReviews
        .filter((r) => Boolean(r.dishName))
        .map((r) => (r.dishName as string).toLowerCase().trim());
      setRatedDishNames(ratedNames);

      const initialRatings: Record<string, number> = {};
      const initialComments: Record<string, string> = {};
      orderReviews.forEach((r) => {
        if (r.dishName) {
          initialRatings[r.dishName] = r.rating;
          initialComments[r.dishName] = r.comment;
        }
      });
      setItemRatings(initialRatings);
      setItemComments(initialComments);
    }
  }, [activeOrder?.id]);

  const handleRateOrderedItem = (item: OrderItem, starCount: number, commentStr: string) => {
    if (!activeOrder) return;
    try {
      StorageService.addReview({
        orderId: activeOrder.id,
        dishName: item.name,
        rating: starCount,
        comment: commentStr.trim() || 'Delicious meal from Bite & Go!',
        customerName: activeOrder.customerName || 'Verified Diner',
        customerCity: activeOrder.area || 'Karachi',
        verified: true,
      });
      setRatedDishNames((prev) => [...prev, item.name.toLowerCase().trim()]);
      setRatingToast(`⭐ Rated "${item.name}" ${starCount}/5 stars! Verified buyer review saved.`);
      setTimeout(() => setRatingToast(null), 4000);
    } catch (err: any) {
      setRatingToast(err.message || 'Error saving rating.');
      setTimeout(() => setRatingToast(null), 4000);
    }
  };

  // 3-Minute Preparation Cutoff Rule: Order editing locked when preparation begins
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTimestamp(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const orderCreatedMs = activeOrder ? new Date(activeOrder.createdAt).getTime() : 0;
  const orderAgeSeconds = Math.max(0, Math.floor((currentTimestamp - orderCreatedMs) / 1000));
  const PREP_CUTOFF_SECONDS = 180; // 3 minutes cutoff
  const secondsUntilPrepLock = Math.max(0, PREP_CUTOFF_SECONDS - orderAgeSeconds);
  const isOrderLockedForPrep = Boolean(
    activeOrder &&
    (activeOrder.status === 'preparing' ||
      activeOrder.status === 'on_the_way' ||
      activeOrder.status === 'delivered' ||
      orderAgeSeconds >= PREP_CUTOFF_SECONDS)
  );

  if (!isOpen) return null;

  const activeOrderCancellationTicket = activeOrder
    ? tickets.find(
        (t) => t.orderId === activeOrder.id && t.issueType === 'order_decline_request' && t.status !== 'closed'
      )
    : null;

  const handleCustomerCancel = async () => {
    if (!activeOrder) return;
    const reason = customerCancelReason.trim() || 'Customer requested order cancellation';
    setIsCancelling(true);

    // Create official cancellation request ticket for manager review
    const ticket = StorageService.createTicket({
      orderId: activeOrder.id,
      customerName: activeOrder.customerName,
      customerEmail: 'customer@biteandgo.pk',
      customerPhone: activeOrder.customerPhone,
      issueType: 'order_decline_request',
      message: reason,
    });

    // Record request note on order history timeline
    const allCurrentOrders = StorageService.getOrders();
    const currentOrd = allCurrentOrders.find((o) => o.id === activeOrder.id);
    if (currentOrd) {
      currentOrd.statusHistory.push({
        status: currentOrd.status,
        timestamp: new Date().toISOString(),
        note: `Cancellation requested by customer (${ticket.id}): ${reason}. Waiting for store manager to resolve.`,
      });
      StorageService.saveOrders(allCurrentOrders);
    }

    setTickets(StorageService.getTickets());
    setIsCancelling(false);
    setShowCancelPrompt(false);
    setCustomerCancelReason('');
    if (onOrderCancelled) onOrderCancelled();
  };

  const handleStartEditOrder = (order: Order) => {
    const ageSec = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000);
    if (order.status === 'preparing' || order.status === 'on_the_way' || order.status === 'delivered' || ageSec >= 180) {
      setEditToast('🔒 Modifications are locked: Kitchen preparation has commenced (cutoff: 3 minutes after placing).');
      setTimeout(() => setEditToast(null), 5000);
      return;
    }
    setIsEditingOrder(true);
    setShowCancelPrompt(false);
    setEditItems(order.items.map((it) => ({ ...it })));
    setEditCustomerName(order.customerName || '');
    setEditCustomerPhone(order.customerPhone || '');
    setEditDeliveryAddress(order.deliveryAddress || '');
    setEditArea(order.area || '');
    setEditSpecialInstructions(order.specialInstructions || order.notes || '');
  };

  const handleAdjustItemQty = (index: number, delta: number) => {
    setEditItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };
      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      const prevQty = target.quantity;
      target.quantity = newQty;
      const baseUnitPrice = target.price || Math.round(target.itemTotal / prevQty);
      const addonsTotal = (target.selectedAddons || []).reduce((s, a) => s + (a.price || 0), 0);
      target.itemTotal = (baseUnitPrice + addonsTotal) * target.quantity;
      copy[index] = target;
      return copy;
    });
  };

  const handleAddExtraMenuItem = (menuItemId: string) => {
    if (!menuItemId) return;
    const item = menuItems.find((m) => m.id === menuItemId);
    if (!item) return;

    setEditItems((prev) => [
      ...prev,
      {
        id: `edit-item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        selectedAddons: [],
        itemTotal: item.price,
      },
    ]);
    setEditSelectedMenuItemId('');
  };

  const handleSaveLiveOrder = () => {
    if (!activeOrder) return;
    if (editItems.length === 0) {
      alert('Order must contain at least 1 menu item.');
      return;
    }

    const newSubtotal = editItems.reduce((sum, it) => sum + (it.itemTotal || 0), 0);
    const newTotal = Math.max(0, newSubtotal + (activeOrder.deliveryFee || 0) - (activeOrder.discount || 0));

    const updatedOrder: Order = {
      ...activeOrder,
      items: editItems,
      customerName: editCustomerName.trim() || activeOrder.customerName,
      customerPhone: editCustomerPhone.trim() || activeOrder.customerPhone,
      deliveryAddress: editDeliveryAddress.trim() || activeOrder.deliveryAddress,
      area: editArea.trim() || activeOrder.area,
      specialInstructions: editSpecialInstructions.trim() || undefined,
      notes: editSpecialInstructions.trim() || undefined,
      subtotal: newSubtotal,
      total: newTotal,
    };

    const saved = StorageService.updateLiveOrder(updatedOrder);
    if (saved) {
      onSelectOrder(saved);
      if (onOrderUpdated) onOrderUpdated(saved);
      setIsEditingOrder(false);
      setEditToast(`Live Order #${saved.id} was successfully updated! Kitchen and rider notified.`);
      setTimeout(() => setEditToast(null), 5000);
    }
  };

  const handleRequestPush = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        setNotificationGranted(true);
        StorageService.sendNotification({
          orderId: activeOrder?.id || '#BG-LIVE',
          title: 'Push Notifications Active 🔔',
          body: "You'll receive live status updates for your Bite & Go orders!",
          type: 'promo',
        });
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.trim().toUpperCase();
    const found = allOrders.find(
      (o) => o.id.toUpperCase() === query || o.id.replace('#', '').toUpperCase() === query || o.customerPhone.includes(query)
    );
    if (found) {
      onSelectOrder(found);
      setSearchId('');
    }
  };

  // Status mapping
  const steps: Array<{ status: OrderStatus; label: string; icon: React.ReactNode }> = [
    { status: 'received', label: 'Order Received', icon: <Clock className="w-4 h-4" /> },
    { status: 'confirmed', label: 'Confirmed & Paid', icon: <ShieldCheck className="w-4 h-4" /> },
    { status: 'preparing', label: 'Kitchen Grill', icon: <ChefHat className="w-4 h-4" /> },
    { status: 'on_the_way', label: 'Rider on Route', icon: <Bike className="w-4 h-4" /> },
    { status: 'delivered', label: 'Delivered', icon: <Home className="w-4 h-4" /> },
  ];

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'received': return 0;
      case 'confirmed': return 1;
      case 'preparing': return 2;
      case 'on_the_way': return 3;
      case 'delivered': return 4;
      default: return 0;
    }
  };

  const currentStepIdx = activeOrder ? getStepIndex(activeOrder.status) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Live Order Tracker</h2>
                {activeOrder && (
                  <span className="font-mono text-xs font-bold text-amber-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                    {activeOrder.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">Real-time status updates &amp; rider ETA</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Order bar */}
        <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Track by Order # (e.g. #BG-7421) or Phone..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Lookup
            </button>
          </form>

          {/* Web Push Notification Opt-in */}
          {!notificationGranted ? (
            <button
              onClick={handleRequestPush}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium rounded-lg transition-colors shrink-0"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Enable Push Alerts</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 shrink-0 font-medium">
              <Bell className="w-3.5 h-3.5" />
              <span>Push Active</span>
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {!activeOrder ? (
            <div className="text-center py-12 text-neutral-400 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-neutral-800 mx-auto flex items-center justify-center text-neutral-500">
                <Bike className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">No Active Order Selected</p>
              <p className="text-xs text-neutral-500">
                Enter your order ID above or select from your recent orders below.
              </p>

              {allOrders.length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-800 max-w-sm mx-auto space-y-2">
                  <p className="text-xs font-bold text-neutral-400 text-left">Recent Orders:</p>
                  {allOrders.slice(0, 3).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => onSelectOrder(o)}
                      className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 flex items-center justify-between text-left transition-colors"
                    >
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-400">{o.id}</span>
                        <span className="text-xs text-neutral-400 ml-2">({o.customerName})</span>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-300">
                        Rs. {o.total.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ETA & Status Banner or Decline Banner */}
              {activeOrder.status === 'cancelled' ? (
                <div className="p-5 rounded-2xl bg-red-950/40 border border-red-800/80 text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                        Order Declined
                      </span>
                      <span className="text-xs text-neutral-400 capitalize">
                        {activeOrder.orderType}
                      </span>
                    </div>
                    <div className="text-xl font-heading font-black text-white flex items-center gap-2">
                      <AlertOctagon className="w-5 h-5 text-red-400 shrink-0" />
                      <span>Order Declined by Store</span>
                    </div>
                    <div className="p-3 rounded-xl bg-red-950/80 border border-red-800/60 mt-2">
                      <p className="text-xs font-semibold text-red-300">Reason Provided:</p>
                      <p className="text-xs text-white mt-0.5">
                        {activeOrder.declineReason || 'Restaurant unable to process this order at this time.'}
                      </p>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      If you sent an EasyPaisa payment, our cashier will issue a full refund or you can report an issue below.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-right shrink-0">
                    <span className="text-xs text-neutral-400 block font-mono">Total Billed:</span>
                    <span className="font-mono font-bold text-white text-base">Rs. {activeOrder.total.toLocaleString()}</span>
                    <span className="block text-[11px] text-red-400 font-mono uppercase mt-0.5">{activeOrder.payment.method}</span>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-neutral-900 to-neutral-900 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                        {activeOrder.status === 'delivered' ? 'Order Complete' : 'Estimated Arrival'}
                      </span>
                      <span className="text-xs text-neutral-500">·</span>
                      <span className="text-xs text-neutral-400 capitalize">
                        {activeOrder.orderType}
                      </span>
                      {activeOrder.distanceKm && (
                        <>
                          <span className="text-xs text-neutral-500">·</span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            ~{activeOrder.distanceKm} km
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-2xl font-heading font-black text-white mt-1">
                      {activeOrder.status === 'delivered'
                        ? 'Delivered to Doorstep 🎉'
                        : activeOrder.status === 'on_the_way'
                        ? `${activeOrder.estimatedMinutes || 15} Minutes Remaining`
                        : activeOrder.status === 'preparing'
                        ? `Cooking on Grill (~${activeOrder.estimatedMinutes || 20} mins)`
                        : `Verifying with Kitchen (~${activeOrder.estimatedMinutes || 25} mins)`}
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Destination: {activeOrder.deliveryAddress}, {activeOrder.area}
                    </p>
                  </div>

                  {/* Payment Badge */}
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-right">
                    <div className="flex items-center gap-1.5 text-xs font-bold justify-end">
                      {activeOrder.payment.verified ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Payment Verified</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400 font-semibold">Verifying Payment</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-neutral-400 mt-1 uppercase">
                      {activeOrder.payment.method} · Rs. {activeOrder.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Cancellation Request Ticket Status or Request Button */}
              {activeOrderCancellationTicket ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white">
                        Cancellation Request Ticket: <span className="font-mono text-amber-400">{activeOrderCancellationTicket.id}</span>
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        activeOrderCancellationTicket.status === 'open'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : activeOrderCancellationTicket.status === 'investigating'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {activeOrderCancellationTicket.status}
                    </span>
                  </div>

                  <p className="text-neutral-300">
                    Your request to decline/cancel this order has been submitted. Reason:{' '}
                    <strong className="text-white">"{activeOrderCancellationTicket.message}"</strong>
                  </p>

                  {activeOrderCancellationTicket.status === 'open' ? (
                    <p className="text-[11px] text-amber-400 font-medium">
                      ⏳ Pending Manager Resolution: The store manager has been notified and will resolve this ticket shortly.
                    </p>
                  ) : (
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                      <p className="font-bold text-emerald-400 text-[11px] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Manager Resolution:</span>
                      </p>
                      <p className="text-neutral-200">
                        {activeOrderCancellationTicket.adminReply || 'Ticket resolved by store staff.'}
                      </p>
                    </div>
                  )}
                </div>
              ) : activeOrder.status !== 'delivered' && activeOrder.status !== 'cancelled' ? (
                <div className="space-y-3">
                  {/* Status Banner when updated */}
                  {editToast && (
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{editToast}</span>
                    </div>
                  )}

                  {!isEditingOrder && !showCancelPrompt && (
                    isOrderLockedForPrep ? (
                      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-neutral-950/90 border border-neutral-800 shadow-md">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                            <Lock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-white">Order Locked for Kitchen Preparation</p>
                              <span className="text-[9.5px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-mono font-bold border border-red-500/30">
                                PREP IN PROGRESS
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400">
                              Chefs have begun grilling your ticket. Dish edits are automatically locked 3 minutes after placement.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 rounded-xl bg-neutral-800 text-neutral-500 font-bold text-xs flex items-center gap-1.5 cursor-not-allowed opacity-70"
                            title="Editing is disabled because kitchen preparation has started (cutoff: 3 minutes)"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Editing Disabled</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCancelPrompt(true)}
                            className="text-xs text-red-400 hover:text-red-300 hover:underline px-2 py-1 font-medium cursor-pointer"
                          >
                            Cancel Request
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-blue-950/30 via-neutral-900 to-amber-950/20 border border-blue-500/30 shadow-md">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                            <Edit2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-white">Need to adjust your live order?</p>
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 animate-pulse">
                                <span>⏱️</span>
                                <span>{Math.floor(secondsUntilPrepLock / 60)}m {secondsUntilPrepLock % 60}s left to edit</span>
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400">
                              Add extra dishes, change quantities, or edit notes before preparation begins.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditOrder(activeOrder)}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Adjust Live Order</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCancelPrompt(true)}
                            className="text-xs text-red-400 hover:text-red-300 hover:underline px-2 py-1 font-medium cursor-pointer"
                          >
                            Cancel Order
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  {/* LIVE ORDER ADJUSTMENT FORM (when customer changes mind) */}
                  {isEditingOrder && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-blue-500/40 shadow-xl space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                        <div className="flex items-center gap-2">
                          <Edit2 className="w-4 h-4 text-blue-400" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Modify Live Order #{activeOrder.id}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditingOrder(false)}
                          className="text-neutral-400 hover:text-white p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Items Editor */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-neutral-300 block">Ordered Dishes:</span>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {editItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-white truncate">{item.name}</p>
                                <p className="text-[10px] text-neutral-400 font-mono">Rs. {item.price.toLocaleString()} each</p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1.5 bg-neutral-900 px-2 py-1 rounded-lg border border-neutral-800">
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustItemQty(idx, -1)}
                                    className="text-neutral-400 hover:text-white p-0.5 cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="font-mono font-bold text-white px-1">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustItemQty(idx, 1)}
                                    className="text-neutral-400 hover:text-white p-0.5 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <span className="font-mono font-bold text-amber-400 w-20 text-right">
                                  Rs. {item.itemTotal.toLocaleString()}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleAdjustItemQty(idx, -item.quantity)}
                                  className="p-1 text-neutral-500 hover:text-red-400 cursor-pointer"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Extra Menu Item */}
                        {menuItems.length > 0 && (
                          <div className="pt-1">
                            <select
                              value={editSelectedMenuItemId}
                              onChange={(e) => {
                                if (e.target.value) handleAddExtraMenuItem(e.target.value);
                              }}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs cursor-pointer"
                            >
                              <option value="">+ Add Extra Dish from Menu...</option>
                              {menuItems
                                .filter((m) => m.isAvailable)
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} — Rs. {m.price}
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Customer Details & Delivery Destination */}
                      <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                        <span className="font-bold text-amber-400 uppercase text-[10px] block">
                          Delivery Destination &amp; Contact:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-neutral-400 block mb-0.5">Your Name:</label>
                            <input
                              type="text"
                              value={editCustomerName}
                              onChange={(e) => setEditCustomerName(e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-neutral-400 block mb-0.5">Phone Number:</label>
                            <input
                              type="text"
                              value={editCustomerPhone}
                              onChange={(e) => setEditCustomerPhone(e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-neutral-400 block mb-0.5">Delivery Address:</label>
                            <input
                              type="text"
                              value={editDeliveryAddress}
                              onChange={(e) => setEditDeliveryAddress(e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-neutral-400 block mb-0.5">Karachi Area / Sector:</label>
                            <input
                              type="text"
                              value={editArea}
                              onChange={(e) => setEditArea(e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-0.5">
                            Special Cooking Instructions / Drop-off Notes:
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Extra napkins, please do not ring doorbell, gate code 402"
                            value={editSpecialInstructions}
                            onChange={(e) => setEditSpecialInstructions(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>
                      </div>

                      {/* Recalculation Footer & Save */}
                      <div className="pt-2 border-t border-neutral-800 flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <span className="text-[10px] text-neutral-400 uppercase font-bold block">Updated Order Total:</span>
                          <span className="text-base font-black font-mono text-emerald-400">
                            Rs.{' '}
                            {Math.max(
                              0,
                              editItems.reduce((sum, it) => sum + (it.itemTotal || 0), 0) +
                                (activeOrder.deliveryFee || 0) -
                                (activeOrder.discount || 0)
                            ).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingOrder(false)}
                            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveLiveOrder}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/25 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Save &amp; Update Order</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!showCancelPrompt ? null : (
                    <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                          <AlertOctagon className="w-4 h-4 text-red-400" />
                          <span>Request Order Cancellation (Creates Staff Ticket)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowCancelPrompt(false)}
                          className="text-neutral-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-[11px] text-neutral-300">
                        Submitting this form creates an official support ticket. The store manager will review your reason and resolve the cancellation.
                      </p>

                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-neutral-300 block">
                          Select or type reason for declining this order:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            'Placed by mistake / duplicate order',
                            'Entered wrong delivery address or phone',
                            'Estimated delivery time is too long',
                            'Selected wrong burgers / spicy level',
                            'Emergency / change of plans',
                          ].map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => setCustomerCancelReason(chip)}
                              className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors ${
                                customerCancelReason === chip
                                  ? 'bg-red-500/20 text-red-300 border-red-500/50'
                                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                              }`}
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Or type specific reason (e.g. Please cancel and refund EasyPaisa)..."
                          value={customerCancelReason}
                          onChange={(e) => setCustomerCancelReason(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowCancelPrompt(false)}
                          className="px-3 py-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold"
                        >
                          Keep Order
                        </button>
                        <button
                          type="button"
                          onClick={handleCustomerCancel}
                          disabled={isCancelling}
                          className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>{isCancelling ? 'Creating Ticket...' : 'Submit Cancellation Ticket'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Multi-Stage Visual Pipeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">
                  Live Preparation Pipeline
                </h4>

                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute top-4 left-6 right-6 h-1 bg-neutral-800 -z-0">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{
                        width: `${(currentStepIdx / (steps.length - 1)) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Steps */}
                  <div className="grid grid-cols-5 gap-1 relative z-10">
                    {steps.map((st, idx) => {
                      const isCompleted = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;

                      return (
                        <div key={st.status} className="flex flex-col items-center text-center">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                              isCompleted
                                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                                : 'bg-neutral-850 text-neutral-500 border border-neutral-800'
                            } ${isCurrent ? 'ring-4 ring-amber-500/20 scale-110' : ''}`}
                          >
                            {st.icon}
                          </div>
                          <span
                            className={`text-[11px] font-semibold mt-2.5 transition-colors line-clamp-1 ${
                              isCurrent
                                ? 'text-amber-400 font-bold'
                                : isCompleted
                                ? 'text-white'
                                : 'text-neutral-500'
                            }`}
                          >
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* EXCLUSIVE ITEM-BY-ITEM RATING (Only for dishes this diner actually ordered) */}
              {activeOrder.status === 'delivered' && (
                <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-neutral-900 to-neutral-950 p-4 sm:p-5 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                          <span>Rate the Dishes You Received</span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                            ✓ Verified Diners Only
                          </span>
                        </h4>
                        <p className="text-[11px] text-neutral-400">
                          Share genuine feedback on flavor, crispiness, and crust for the items in Order #{activeOrder.id}.
                        </p>
                      </div>
                    </div>
                  </div>

                  {ratingToast && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{ratingToast}</span>
                    </div>
                  )}

                  {/* Ordered Items List - Diners can ONLY rate these dishes */}
                  <div className="space-y-3">
                    {activeOrder.items.map((item, idx) => {
                      const isRated = ratedDishNames.includes(item.name.toLowerCase().trim());
                      const currentRating = itemRatings[item.name] || 5;
                      const currentComment = itemComments[item.name] || '';

                      return (
                        <div
                          key={item.id || idx}
                          className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                            isRated
                              ? 'bg-neutral-950/70 border-emerald-500/30'
                              : 'bg-neutral-950 border-neutral-800 hover:border-amber-500/40'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs sm:text-sm">
                                  {item.quantity}x {item.name}
                                </span>
                                {item.selectedVariant && (
                                  <span className="text-[11px] text-neutral-400">({item.selectedVariant})</span>
                                )}
                                {isRated && (
                                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                    ✓ Rated
                                  </span>
                                )}
                              </div>
                              {item.selectedSpiciness && (
                                <p className="text-[11px] text-red-400/90 mt-0.5">· {item.selectedSpiciness}</p>
                              )}
                            </div>

                            {/* Star Rating Buttons */}
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => {
                                    setItemRatings((prev) => ({ ...prev, [item.name]: star }));
                                  }}
                                  className="p-1 hover:scale-125 transition-transform cursor-pointer"
                                  title={`Rate ${star} Stars`}
                                >
                                  <Star
                                    className={`w-5 h-5 ${
                                      star <= currentRating
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-neutral-700'
                                    }`}
                                  />
                                </button>
                              ))}
                              <span className="font-mono text-xs font-bold text-amber-400 ml-1.5 tabular-nums">
                                {currentRating}.0
                              </span>
                            </div>
                          </div>

                          {/* Quick Sentiment Chips & Review Comment */}
                          <div className="mt-2.5 pt-2.5 border-t border-neutral-850 space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {['Crispy Crust 🔥', 'Juicy Melt 🧀', 'Perfect Seasoning 🌶️', 'Soft Brioche 🍞', 'Piping Hot ⚡'].map(
                                (chip) => (
                                  <button
                                    key={chip}
                                    type="button"
                                    onClick={() => {
                                      const existing = itemComments[item.name] || '';
                                      const updated = existing ? `${existing} ${chip}` : chip;
                                      setItemComments((prev) => ({ ...prev, [item.name]: updated }));
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                                  >
                                    +{chip}
                                  </button>
                                )
                              )}
                            </div>

                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder={`Share quick feedback for ${item.name}...`}
                                value={currentComment}
                                onChange={(e) =>
                                  setItemComments((prev) => ({ ...prev, [item.name]: e.target.value }))
                                }
                                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleRateOrderedItem(item, currentRating, currentComment)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-sm ${
                                  isRated
                                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                                    : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20'
                                }`}
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>{isRated ? 'Update Rating' : 'Submit Rating'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live Express Rider & Dispatch Progress Tracker (Native fast view without external maps) */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-amber-500" />
                    <span>Express Dispatch &amp; Route Progress</span>
                  </span>
                  <span className="font-mono text-emerald-400 text-[11px] font-bold">
                    {activeOrder.status === 'on_the_way'
                      ? '🛵 Rider On Route'
                      : activeOrder.status === 'delivered'
                      ? '✓ Delivered'
                      : activeOrder.status === 'preparing'
                      ? '🍳 Fresh Cooking on Grill'
                      : '🏢 Order Queued at Kitchen'}
                  </span>
                </div>

                {/* Visual Route Corridor */}
                <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-white font-bold">Bite &amp; Go Kitchen</span>
                      <span className="text-[10px] text-neutral-500">(North Nazimabad)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-white font-bold">{activeOrder.area || 'Customer Area'}</span>
                    </div>
                  </div>

                  {/* Dynamic Progress Track */}
                  <div className="relative pt-1 pb-1">
                    <div className="h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-700"
                        style={{
                          width:
                            activeOrder.status === 'delivered'
                              ? '100%'
                              : activeOrder.status === 'on_the_way'
                              ? `${Math.max(35, activeOrder.driver?.progressPercent || 65)}%`
                              : activeOrder.status === 'preparing'
                              ? '25%'
                              : '10%',
                        }}
                      />
                    </div>
                    {/* Rider Marker */}
                    {activeOrder.status === 'on_the_way' && (
                      <div
                        className="absolute top-0 -translate-x-1/2 -mt-1 text-xs"
                        style={{
                          left: `${Math.max(35, activeOrder.driver?.progressPercent || 65)}%`,
                        }}
                      >
                        <span className="inline-block bg-amber-500 text-neutral-950 font-black text-[9px] px-1.5 py-0.2 rounded-full shadow-md animate-bounce">
                          🛵 Rider En Route
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span>Hot Insulated Thermal Bag Sealed</span>
                    <span className="text-amber-400 font-bold font-mono">
                      ETA: ~{activeOrder.estimatedMinutes || 25} mins
                    </span>
                  </div>
                </div>

                {/* Rider Details (if assigned) */}
                {activeOrder.driver && (
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-amber-400">
                        <Bike className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{activeOrder.driver.name}</p>
                        <p className="text-[11px] font-mono text-neutral-400">
                          {activeOrder.driver.vehiclePlate}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`tel:${activeOrder.driver.phone}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Rider</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Order Summary & Items List */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Itemized Order Receipt
                </h4>
                <div className="divide-y divide-neutral-900 text-xs">
                  {activeOrder.items.map((it) => (
                    <div key={it.id} className="py-2.5 flex items-start justify-between">
                      <div>
                        <span className="font-bold text-white">
                          {it.quantity}x {it.name}
                        </span>
                        {it.selectedVariant && (
                          <span className="text-neutral-400 ml-1.5">({it.selectedVariant})</span>
                        )}
                        {it.selectedSpiciness && (
                          <span className="text-red-400/90 ml-1.5">· {it.selectedSpiciness}</span>
                        )}
                        {it.selectedAddons.length > 0 && (
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            + {it.selectedAddons.map((a) => a.name).join(', ')}
                          </p>
                        )}
                        {(it.notes || (it as any).specialInstructions) && (
                          <p className="text-[11px] text-amber-400 font-medium italic mt-0.5">
                            Note: "{it.notes || (it as any).specialInstructions}"
                          </p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-neutral-200 tabular-nums">
                        Rs. {it.itemTotal.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {(activeOrder.notes || activeOrder.customerNotes) && (
                  <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">
                      📝 Your Order Notes &amp; Special Instructions:
                    </span>
                    <p className="text-neutral-200 italic">
                      "{activeOrder.notes || activeOrder.customerNotes}"
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-800 flex justify-between text-xs font-bold text-white">
                  <span>Grand Total</span>
                  <span className="font-mono text-amber-400 text-sm tabular-nums">
                    Rs. {activeOrder.total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Status Log History */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Timeline History
                </h4>
                <div className="space-y-2">
                  {activeOrder.statusHistory.map((h, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-850 flex items-start gap-3 text-xs"
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-neutral-200 font-medium">{h.note}</p>
                        <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                          {new Date(h.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Actions: Order Assistance & Issue Reporting (Rating removed from live tracker per request) */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Live Order Support &amp; Assistance</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Need live dispatch assistance or need to report an issue with this order?
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenCreateTicket) onOpenCreateTicket(activeOrder.id);
                    }}
                    className="px-3.5 py-2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Report Issue / Support</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
