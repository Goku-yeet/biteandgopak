import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bike,
  PhoneCall,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Clock,
  Banknote,
  ShieldCheck,
  RefreshCw,
  Search,
  MessageCircle,
  ArrowLeft,
  ChevronDown,
  Package,
  AlertCircle,
  Check,
  User,
  DollarSign,
  TrendingUp,
  Camera,
  Upload,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { Order, DeliveryRider, StoreSettings } from '../../types';
import { StorageService } from '../../utils/storage';
import { ApiService } from '../../utils/api';
import { sounds } from '../../utils/audio';
import { generateOrderMapsLinks } from '../../data/karachiAreas';

interface RiderPortalProps {
  orders: Order[];
  settings: StoreSettings;
  onRefreshData: () => void;
  onBackToStore: () => void;
}

export const RiderPortal: React.FC<RiderPortalProps> = ({
  orders,
  settings,
  onRefreshData,
  onBackToStore,
}) => {
  // Fleet riders from store settings
  const fleetRiders: DeliveryRider[] = useMemo(() => {
    return StorageService.getDeliveryRiders();
  }, [settings]);

  // Selected active rider identity (persisted in localStorage for convenience)
  const [selectedRiderId, setSelectedRiderId] = useState<string>(() => {
    return localStorage.getItem('bg_active_rider_id') || 'all';
  });

  const handleSelectRider = (riderId: string) => {
    setSelectedRiderId(riderId);
    localStorage.setItem('bg_active_rider_id', riderId);
  };

  const activeRider = useMemo(() => {
    if (selectedRiderId === 'all') return null;
    return fleetRiders.find((r) => r.id === selectedRiderId || r.name === selectedRiderId) || null;
  }, [fleetRiders, selectedRiderId]);

  // Tab: active deliveries vs completed today
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Delivery confirmation modal state
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [deliveryProofPhoto, setDeliveryProofPhoto] = useState<string | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [inspectingProofOrder, setInspectingProofOrder] = useState<Order | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter only delivery orders
  const allDeliveryOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.orderType === 'delivery' ||
        (o.orderType as string) === 'pos_delivery' ||
        Boolean(o.deliveryAddress)
    );
  }, [orders]);

  // Filter by active rider if selected
  const riderFilteredOrders = useMemo(() => {
    if (selectedRiderId === 'all') return allDeliveryOrders;
    return allDeliveryOrders.filter((o) => {
      if (!o.driver) return true; // Show unassigned to any rider so they can grab/deliver
      return (
        (o.driver as any).id === selectedRiderId ||
        o.driver.name === selectedRiderId ||
        (activeRider && o.driver.name === activeRider.name)
      );
    });
  }, [allDeliveryOrders, selectedRiderId, activeRider]);

  // Active vs Completed
  const activeOrders = useMemo(() => {
    return riderFilteredOrders.filter(
      (o) => o.status !== 'delivered' && o.status !== 'cancelled'
    );
  }, [riderFilteredOrders]);

  const completedTodayOrders = useMemo(() => {
    const today = new Date().toDateString();
    return riderFilteredOrders.filter(
      (o) => o.status === 'delivered' && new Date(o.createdAt).toDateString() === today
    );
  }, [riderFilteredOrders]);

  // Shift & Earnings Financial Split for Rider
  const financialShift = useMemo(() => {
    // Delivery fees earned by this rider today
    const totalDeliveryFeesEarned = completedTodayOrders.reduce(
      (sum, o) => sum + (o.deliveryFee || 150),
      0
    );

    // COD Cash collected in hand from completed orders
    const codCompletedOrders = completedTodayOrders.filter((o) => {
      const pm = o.payment?.method || (o as any).paymentMethod;
      return pm === 'cod' || pm === 'pos_cash' || !pm;
    });

    const totalCodCashInHand = codCompletedOrders.reduce((sum, o) => sum + o.total, 0);

    // Net cash to turn in to manager (Cash in hand minus rider's delivery fee earnings)
    const netCashToTurnIn = Math.max(0, totalCodCashInHand - totalDeliveryFeesEarned);

    // Online prepaid orders (EasyPaisa)
    const onlineCompletedOrders = completedTodayOrders.filter((o) => {
      const pm = o.payment?.method || (o as any).paymentMethod;
      return pm === 'easypaisa' || pm === 'jazzcash' || (pm as string) === 'online';
    });

    return {
      totalDeliveryFeesEarned,
      totalCodCashInHand,
      netCashToTurnIn,
      codCompletedCount: codCompletedOrders.length,
      onlineCompletedCount: onlineCompletedOrders.length,
    };
  }, [completedTodayOrders]);

  // Search filtered view
  const displayOrders = useMemo(() => {
    const baseList = activeTab === 'active' ? activeOrders : completedTodayOrders;
    if (!searchQuery.trim()) return baseList;
    const q = searchQuery.toLowerCase().trim();
    return baseList.filter((o) => {
      const matchesId = o.id.toLowerCase().includes(q);
      const matchesName = (o.customerName || '').toLowerCase().includes(q);
      const matchesPhone = (o.customerPhone || '').toLowerCase().includes(q);
      const matchesAddress = (o.deliveryAddress || '').toLowerCase().includes(q);
      const matchesArea = (o.area || (o as any).deliveryArea || '').toLowerCase().includes(q);
      return matchesId || matchesName || matchesPhone || matchesAddress || matchesArea;
    });
  }, [activeTab, activeOrders, completedTodayOrders, searchQuery]);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    sounds.unlockAudioContext();
    await onRefreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Handle Doorstep Delivery Photo Capture & Compression
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingPhoto(true);
    setPhotoError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 850;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);

            // Watermark timestamp and Bite & Go logo in lower bar
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fillRect(0, height - 34, width, 34);
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText('BITE & GO • PROOF OF DELIVERY', 12, height - 12);
            ctx.fillStyle = '#ffffff';
            ctx.font = '11px monospace';
            const timeStr = new Date().toLocaleString('en-PK', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            ctx.fillText(timeStr, width - 180, height - 12);

            const compressed = canvas.toDataURL('image/jpeg', 0.72);
            setDeliveryProofPhoto(compressed);
            sounds.playSuccess();
          }
        } catch (err) {
          console.error('Error compressing image:', err);
          setPhotoError('Failed to process image. Please try again.');
        } finally {
          setIsCompressingPhoto(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Reliable "Mark As Delivered" Execution with Mandatory Doorstep Proof Photo
  const executeMarkDelivered = async (order: Order) => {
    // Enforce photo requirement
    if (!deliveryProofPhoto) {
      setPhotoError('📸 Please take a doorstep proof photo of the package before confirming delivery.');
      return;
    }

    setIsSubmitting(true);
    sounds.unlockAudioContext();

    try {
      const riderName = activeRider?.name || order.driver?.name || 'Fleet Delivery Rider';
      const customNote = `Order handed over to customer with doorstep photo proof and confirmed DELIVERED by ${riderName}.`;

      // 1. Unconditionally update local storage first with proof photo
      StorageService.updateOrderStatus(order.id, 'delivered', customNote, deliveryProofPhoto, riderName);

      // 2. Sync to backend API
      try {
        await ApiService.updateOrderStatus(order.id, 'delivered', customNote);
      } catch (apiErr) {
        console.warn('API update status fallback:', apiErr);
      }

      // 3. Audio & Toast feedback
      sounds.playSuccess();
      setSuccessToast(`Order ${order.id} marked DELIVERED with photo proof!`);
      setConfirmOrder(null);
      setDeliveryProofPhoto(null);
      setPhotoError(null);

      // 4. Refresh data across state
      onRefreshData();

      setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to mark order delivered:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate WhatsApp Shift Settlement Message
  const getWhatsAppSettlementUrl = () => {
    const riderLabel = activeRider ? `${activeRider.name} (${activeRider.vehiclePlate})` : 'Delivery Fleet Rider';
    const text = `🛵 *BITE & GO — RIDER SHIFT SETTLEMENT REPORT*
━━━━━━━━━━━━━━━━━━
👤 *Rider:* ${riderLabel}
📅 *Date:* ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
📦 *Completed Deliveries:* ${completedTodayOrders.length} trips
━━━━━━━━━━━━━━━━━━
🛵 *Delivery Fees Earned (My Payout):* Rs. ${financialShift.totalDeliveryFeesEarned.toLocaleString()}
💵 *COD Cash Collected (In Hand):* Rs. ${financialShift.totalCodCashInHand.toLocaleString()}
━━━━━━━━━━━━━━━━━━
💰 *NET CASH TO DEPOSIT TO STORE:* Rs. ${financialShift.netCashToTurnIn.toLocaleString()}

_Generated via Bite & Go Rider Portal_`;

    const storeWhatsApp = settings.whatsappNumber || settings.contactPhone || '923012945576';
    const cleanNumber = storeWhatsApp.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950">
      {/* ================= TOP RIDER HEADER ================= */}
      <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 shadow-xl px-3 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-neutral-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Bike className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white font-heading">
                  BITE &amp; GO RIDER PORTAL
                </h1>
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>DISPATCH LIVE</span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Dedicated driver console • Zero kitchen/pos access • 1-tap phone, maps &amp; delivery confirm
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
              title="Refresh Deliveries"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onBackToStore}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Store</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= SUCCESS CELEBRATION TOAST ================= */}
      {successToast && (
        <div className="bg-emerald-500 text-neutral-950 px-4 py-2.5 text-xs font-black flex items-center justify-between shadow-2xl animate-in slide-in-from-top-2 z-50 shrink-0">
          <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-neutral-950 shrink-0" />
              <span className="text-sm font-bold">{successToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-neutral-950 font-black rounded-lg cursor-pointer text-[11px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ================= MAIN RIDER CONTENT ================= */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* Rider Identity Selector & Shift Bar */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Active Rider Profile:
              </span>
              <select
                value={selectedRiderId}
                onChange={(e) => handleSelectRider(e.target.value)}
                className="bg-neutral-950 border border-neutral-700 text-xs font-bold text-amber-400 rounded-xl px-3 py-1.5 focus:border-amber-500 focus:outline-none"
              >
                <option value="all">🛵 All Fleet Deliveries (Any Rider)</option>
                {fleetRiders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.vehiclePlate}) {r.phone ? `· ${r.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* WhatsApp Settlement Shortcut */}
            {completedTodayOrders.length > 0 && (
              <a
                href={getWhatsAppSettlementUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Send WhatsApp Settlement to Manager</span>
              </a>
            )}
          </div>

          {/* ================= RIDER REVENUE & CASH SPLIT HUD ================= */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-neutral-800">
            {/* Delivery Earnings */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/15 to-neutral-950 border border-amber-500/30">
              <span className="text-[10px] uppercase font-bold text-amber-400/90 block">
                Rider Delivery Payout
              </span>
              <p className="text-lg font-black font-mono text-amber-300 mt-0.5">
                Rs. {financialShift.totalDeliveryFeesEarned.toLocaleString()}
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                {completedTodayOrders.length} trips completed today
              </p>
            </div>

            {/* COD Cash in Hand */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/15 to-neutral-950 border border-blue-500/30">
              <span className="text-[10px] uppercase font-bold text-blue-400/90 block">
                COD Cash In Hand
              </span>
              <p className="text-lg font-black font-mono text-blue-300 mt-0.5">
                Rs. {financialShift.totalCodCashInHand.toLocaleString()}
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                {financialShift.codCompletedCount} COD deliveries
              </p>
            </div>

            {/* Net Cash to Hand In */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/15 to-neutral-950 border border-emerald-500/30">
              <span className="text-[10px] uppercase font-bold text-emerald-400/90 block">
                Net Cash to Hand In
              </span>
              <p className="text-lg font-black font-mono text-emerald-300 mt-0.5">
                Rs. {financialShift.netCashToTurnIn.toLocaleString()}
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                COD Cash minus Rider Payout
              </p>
            </div>

            {/* Active Trips Remaining */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Active Deliveries
              </span>
              <p className="text-lg font-black font-mono text-white mt-0.5">
                {activeOrders.length}
              </p>
              <p className="text-[10px] text-amber-400 mt-0.5">
                {activeOrders.length === 0 ? 'All caught up! 🎉' : 'Needs delivery'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-neutral-900 rounded-2xl border border-neutral-800">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Active Trips</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-neutral-900/60">
                {activeOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'completed'
                  ? 'bg-emerald-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Delivered Today</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-neutral-900/60">
                {completedTodayOrders.length}
              </span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search #BG-..., customer phone, area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white rounded-xl pl-8 pr-3 py-2 focus:border-amber-500 focus:outline-none placeholder-neutral-500"
            />
          </div>
        </div>

        {/* ================= ORDER CARDS LIST ================= */}
        {displayOrders.length === 0 ? (
          <div className="text-center py-16 px-4 bg-neutral-900 rounded-3xl border border-neutral-800 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-500">
              <Bike className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">
              {activeTab === 'active'
                ? 'No Active Deliveries at the Moment'
                : 'No Orders Completed Yet Today'}
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              {activeTab === 'active'
                ? 'All delivery orders have been completed and handed over! New delivery orders will appear here automatically.'
                : 'Delivered orders will appear here once you press Mark as Delivered.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayOrders.map((order) => {
              const pm = order.payment?.method || (order as any).paymentMethod;
              const isCOD = pm === 'cod' || pm === 'pos_cash' || !pm;
              const isEasyPaisa = pm === 'easypaisa' || pm === 'jazzcash' || (pm as string) === 'online';
              const mapsUrl = generateOrderMapsLinks(order).navUrl;
              const elapsedMins = Math.floor(
                (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60)
              );

              return (
                <div
                  key={order.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-xl ${
                    order.status === 'delivered'
                      ? 'bg-neutral-900/60 border-neutral-800'
                      : 'bg-neutral-900 border-amber-500/40 hover:border-amber-500 shadow-amber-500/5'
                  }`}
                >
                  {/* Top Bar: Order ID, Status, Elapsed Time, Delivery Fee */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-lg font-black text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-xl border border-amber-500/30">
                        {order.id}
                      </span>
                      <span
                        className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          order.status === 'delivered'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {order.status === 'delivered' ? '✅ DELIVERED' : `🛵 ${order.status.replace('_', ' ').toUpperCase()}`}
                      </span>
                      <span className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Placed {elapsedMins}m ago</span>
                      </span>
                    </div>

                    {/* Delivery Charge Earned Pill */}
                    <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 px-3 py-1 rounded-xl text-xs font-mono">
                      <Bike className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-neutral-400">Rider Fee:</span>
                      <strong className="text-amber-300">Rs. {(order.deliveryFee || 150).toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Customer, Phone, Address & Navigation Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3">
                    {/* Left: Customer & Address */}
                    <div className="space-y-2.5">
                      {/* Customer Row with 1-Tap Call Button */}
                      <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                            Customer
                          </span>
                          <h4 className="text-sm font-bold text-white">
                            {order.customerName || 'Valued Customer'}
                          </h4>
                          <span className="text-xs text-neutral-400 font-mono">
                            {order.customerPhone}
                          </span>
                        </div>

                        {order.customerPhone && (
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                            title="Call customer directly"
                          >
                            <PhoneCall className="w-4 h-4" />
                            <span>Call Now</span>
                          </a>
                        )}
                      </div>

                      {/* Address Row with 1-Tap Google Maps Button */}
                      <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-xs font-bold text-white block">
                                {order.area || (order as any).deliveryArea || 'Karachi Destination'}
                              </span>
                              <span className="text-neutral-300 text-xs leading-relaxed block mt-0.5">
                                {order.deliveryAddress || 'Address on file'}
                              </span>
                            </div>
                          </div>

                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 shadow-md shadow-blue-600/30"
                            title="Open direct Google Maps GPS directions"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open Maps</span>
                          </a>
                        </div>

                        {/* Customer Instructions / Delivery Notes */}
                        {(order.customerNotes || order.notes) && (
                          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
                            <strong>Note:</strong> {order.customerNotes || order.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Payment Amount & Food Items */}
                    <div className="space-y-2.5 flex flex-col justify-between">
                      {/* Big Payment Alert Banner */}
                      <div
                        className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                          isCOD
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isCOD ? (
                            <Banknote className="w-6 h-6 text-amber-400 shrink-0" />
                          ) : (
                            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                          )}
                          <div>
                            <span className="text-[10px] uppercase font-black tracking-wider block">
                              {isCOD ? '💵 Cash on Delivery (COD)' : '✅ Paid Online (EasyPaisa)'}
                            </span>
                            <span className="text-xs font-bold">
                              {isCOD
                                ? 'COLLECT EXACT CASH FROM CUSTOMER'
                                : 'ALREADY PAID • COLLECT RS. 0'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                            {isCOD ? 'To Collect' : 'Order Total'}
                          </span>
                          <span className="text-lg font-black font-mono text-white tabular-nums">
                            Rs. {order.total.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Items Summary */}
                      <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                          Packed Food Items ({order.items?.length || 0})
                        </span>
                        <div className="space-y-1 text-xs text-neutral-300 max-h-24 overflow-y-auto pr-1">
                          {order.items?.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[11px]">
                              <span>
                                <strong className="text-amber-400">{it.quantity}x</strong> {it.name}
                              </span>
                              <span className="text-neutral-500 font-mono">
                                Rs. {it.itemTotal.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ================= BOTTOM ACTION BAR ================= */}
                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      {order.deliveryProofPhoto && (
                        <button
                          type="button"
                          onClick={() => setInspectingProofOrder(order)}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="View doorstep delivery proof photo taken by rider"
                        >
                          <Camera className="w-3.5 h-3.5 text-purple-400" />
                          <span>📸 View Proof of Delivery</span>
                        </button>
                      )}
                    </div>

                    {order.status !== 'delivered' && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmOrder(order);
                          setDeliveryProofPhoto(null);
                          setPhotoError(null);
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-neutral-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        <span>MARK AS DELIVERED</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Hidden File Input for Camera Proof Capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* ================= CONFIRMATION MODAL WITH MANDATORY DOORSTEP PHOTO ================= */}
      {confirmOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">
                Confirm Delivery Handover?
              </h3>
              <p className="text-xs text-neutral-400">
                Are you at customer doorstep and handing over order{' '}
                <strong className="text-amber-400 font-mono">{confirmOrder.id}</strong> to{' '}
                <strong className="text-white">{confirmOrder.customerName}</strong>?
              </p>
            </div>

            {/* Payment reminder in modal */}
            {(() => {
              const pm = confirmOrder.payment?.method || (confirmOrder as any).paymentMethod;
              const isCOD = pm === 'cod' || pm === 'pos_cash' || !pm;
              return (
                <div
                  className={`p-3 rounded-2xl border text-xs text-center ${
                    isCOD
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                  }`}
                >
                  {isCOD ? (
                    <span>
                      💵 Collect <strong>Rs. {confirmOrder.total.toLocaleString()}</strong> in cash from customer before handing over food!
                    </span>
                  ) : (
                    <span>
                      ✅ <strong>Already Paid Online</strong> • Do not collect any cash.
                    </span>
                  )}
                </div>
              );
            })()}

            {/* MANDATORY DOORSTEP PHOTO CAPTURE ZONE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>Doorstep Photo Proof (Required)</span>
                </label>
                <span className="text-[10px] text-amber-400 font-mono">
                  {deliveryProofPhoto ? 'Ready' : 'Mandatory'}
                </span>
              </div>

              {!deliveryProofPhoto ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-amber-500/50 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-2xl flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 group-hover:scale-110 transition-transform flex items-center justify-center text-amber-400 shadow-md">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isCompressingPhoto ? 'Processing Camera Photo...' : '📸 Take Delivery Photo'}
                    </span>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">
                      Snap photo of food package at door or with customer
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-neutral-950 shadow-lg">
                  <img
                    src={deliveryProofPhoto}
                    alt="Doorstep Delivery Proof"
                    className="w-full h-44 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-neutral-900/90 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold border border-neutral-700 shadow-md flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-amber-400" />
                    <span>Retake Photo</span>
                  </button>
                  <div className="p-2 bg-emerald-950/90 border-t border-emerald-500/30 flex items-center justify-between text-[11px] text-emerald-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Doorstep Proof Captured</span>
                    </span>
                    <span className="font-mono text-[10px] text-neutral-400">Time-stamped</span>
                  </div>
                </div>
              )}

              {photoError && (
                <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{photoError}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmOrder(null);
                  setDeliveryProofPhoto(null);
                  setPhotoError(null);
                }}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => executeMarkDelivered(confirmOrder)}
                disabled={isSubmitting || !deliveryProofPhoto || isCompressingPhoto}
                className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                  deliveryProofPhoto && !isSubmitting
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/25 active:scale-95'
                    : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>{deliveryProofPhoto ? 'Yes, Delivered' : 'Take Photo First'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= INSPECT PROOF OF DELIVERY PHOTO MODAL ================= */}
      {inspectingProofOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Proof of Delivery • Order {inspectingProofOrder.id}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Handover confirmed to {inspectingProofOrder.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingProofOrder(null)}
                className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inspectingProofOrder.deliveryProofPhoto ? (
              <div className="space-y-3">
                <img
                  src={inspectingProofOrder.deliveryProofPhoto}
                  alt="Proof of Delivery"
                  className="w-full max-h-[60vh] object-contain rounded-2xl border border-neutral-800 bg-neutral-950"
                />

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Delivery Destination:</span>
                    <span className="text-white font-medium">{inspectingProofOrder.deliveryAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Confirmed Rider:</span>
                    <span className="text-amber-400 font-bold">
                      {inspectingProofOrder.deliveredByRider || inspectingProofOrder.driver?.name || 'Delivery Fleet'}
                    </span>
                  </div>
                  {inspectingProofOrder.deliveredAt && (
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-neutral-400">Timestamp:</span>
                      <span className="text-neutral-300">
                        {new Date(inspectingProofOrder.deliveredAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 text-center py-6">
                No photo recorded for this delivery.
              </p>
            )}

            <button
              type="button"
              onClick={() => setInspectingProofOrder(null)}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-750 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
