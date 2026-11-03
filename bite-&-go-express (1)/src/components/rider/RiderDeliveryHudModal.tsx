import React, { useState, useMemo, useRef } from 'react';
import { Order, DeliveryRider } from '../../types';
import { StorageService } from '../../utils/storage';
import { ApiService } from '../../utils/api';
import { sounds } from '../../utils/audio';
import { generateOrderMapsLinks } from '../../data/karachiAreas';
import {
  Bike,
  PhoneCall,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Clock,
  Banknote,
  ShieldCheck,
  Search,
  Filter,
  X,
  Volume2,
  Sparkles,
  ArrowRight,
  UserCheck,
  Camera,
} from 'lucide-react';

interface RiderDeliveryHudModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onRefreshData: () => void;
}

export const RiderDeliveryHudModal: React.FC<RiderDeliveryHudModalProps> = ({
  isOpen,
  onClose,
  orders,
  onRefreshData,
}) => {
  const [selectedRiderFilter, setSelectedRiderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'active' | 'delivered'>('active');
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [deliveredSuccessToast, setDeliveredSuccessToast] = useState<string | null>(null);
  const [inspectingProofOrder, setInspectingProofOrder] = useState<Order | null>(null);

  // Delivery riders configured in system
  const availableRiders: DeliveryRider[] = useMemo(() => {
    return StorageService.getDeliveryRiders();
  }, [orders]);

  // All delivery orders
  const deliveryOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.orderType === 'delivery' ||
        (o.orderType as string) === 'pos_delivery' ||
        Boolean(o.deliveryAddress)
    );
  }, [orders]);

  // Filtered orders based on active vs delivered, rider assignment, and search
  const filteredOrders = useMemo(() => {
    return deliveryOrders.filter((o) => {
      // Status filter
      if (viewFilter === 'active') {
        if (o.status === 'delivered' || o.status === 'cancelled') return false;
      } else {
        if (o.status !== 'delivered') return false;
      }

      // Rider filter
      if (selectedRiderFilter !== 'all') {
        if ((o.driver as any)?.id !== selectedRiderFilter && o.driver?.name !== selectedRiderFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = o.id.toLowerCase().includes(q);
        const matchesName = (o.customerName || '').toLowerCase().includes(q);
        const matchesPhone = (o.customerPhone || '').toLowerCase().includes(q);
        const matchesAddress = (o.deliveryAddress || '').toLowerCase().includes(q);
        const matchesArea = (o.area || (o as any).deliveryArea || '').toLowerCase().includes(q);
        return matchesId || matchesName || matchesPhone || matchesAddress || matchesArea;
      }

      return true;
    });
  }, [deliveryOrders, viewFilter, selectedRiderFilter, searchQuery]);

  // Active delivery count
  const activeDeliveryCount = useMemo(() => {
    return deliveryOrders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;
  }, [deliveryOrders]);

  // Total delivered today count
  const deliveredTodayCount = useMemo(() => {
    return deliveryOrders.filter((o) => o.status === 'delivered').length;
  }, [deliveryOrders]);

  // Total cash to collect on active orders
  const cashToCollect = useMemo(() => {
    return filteredOrders
      .filter((o) => {
        const pm = o.payment?.method || (o as any).paymentMethod;
        return o.status !== 'delivered' && (pm === 'cod' || pm === 'pos_cash' || !pm);
      })
      .reduce((sum, o) => sum + o.total, 0);
  }, [filteredOrders]);

  // Exclusive Rider Action: ONLY "MARK AS DELIVERED"
  const handleMarkAsDelivered = async (order: Order) => {
    setDeliveringId(order.id);
    sounds.unlockAudioContext();

    try {
      const riderName = order.driver?.name || 'Rider';
      const customNote = `Order handed over to customer and marked DELIVERED by rider ${riderName}.`;

      // 1. Unconditionally update local storage first
      StorageService.updateOrderStatus(order.id, 'delivered', customNote);

      // 2. Sync to server
      try {
        await ApiService.updateOrderStatus(order.id, 'delivered', customNote);
      } catch (err) {
        console.warn('API sync warning:', err);
      }

      sounds.playSuccess();
      setDeliveredSuccessToast(`Order ${order.id} marked DELIVERED! Handover confirmed.`);
      onRefreshData();

      setTimeout(() => {
        setDeliveredSuccessToast(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to mark delivered:', err);
    } finally {
      setDeliveringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-neutral-950/90 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Top Header HUD */}
        <div className="p-4 sm:p-5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-neutral-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Bike className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white font-heading">
                  RIDER DELIVERY HUD
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>RIDER DISPATCH LIVE</span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                1-tap phone calls, Google Maps directions, and delivery handover confirmation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 transition-colors cursor-pointer"
            title="Close Rider HUD"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Toast for Delivered Action */}
        {deliveredSuccessToast && (
          <div className="px-4 py-2.5 bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{deliveredSuccessToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeliveredSuccessToast(null)}
              className="text-white/80 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter and Control Bar */}
        <div className="p-3 sm:p-4 bg-neutral-950/80 border-b border-neutral-800 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            
            {/* View Switcher: Active Deliveries vs Delivered */}
            <div className="flex items-center p-1 bg-neutral-900 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setViewFilter('active')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewFilter === 'active'
                    ? 'bg-amber-500 text-neutral-950 shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Active Deliveries ({activeDeliveryCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewFilter('delivered')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewFilter === 'delivered'
                    ? 'bg-emerald-500 text-neutral-950 shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Delivered Today ({deliveredTodayCount})</span>
              </button>
            </div>

            {/* Rider Selector Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-400 hidden md:inline">Rider:</span>
              <select
                value={selectedRiderFilter}
                onChange={(e) => setSelectedRiderFilter(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 text-xs text-white rounded-xl px-3 py-1.5 focus:border-amber-500 focus:outline-none"
              >
                <option value="all">🛵 All Riders Fleet</option>
                {availableRiders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.vehiclePlate})
                  </option>
                ))}
              </select>

              {/* Cash To Collect Pill (if viewing active) */}
              {viewFilter === 'active' && cashToCollect > 0 && (
                <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 whitespace-nowrap">
                  <Banknote className="w-3.5 h-3.5 text-amber-400" />
                  <span>COD Cash to Collect: <strong>Rs. {cashToCollect.toLocaleString()}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by order #, customer name, phone, or delivery area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-neutral-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Orders List Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5">
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 space-y-2">
              <Bike className="w-12 h-12 mx-auto opacity-30 text-amber-400" />
              <p className="text-sm font-bold text-white">
                {viewFilter === 'active' ? 'No Active Delivery Orders' : 'No Delivered Orders Found'}
              </p>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                {viewFilter === 'active'
                  ? 'All delivery orders have been completed and handed over, or no new delivery orders are assigned yet.'
                  : 'Delivered orders will appear here once riders confirm the delivery handover.'}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const pm = order.payment?.method || (order as any).paymentMethod;
              const isCOD = pm === 'cod' || pm === 'pos_cash' || !pm;
              const isEasyPaisa = pm === 'easypaisa' || (pm as string) === 'online';
              const mapsUrl = generateOrderMapsLinks(order).navUrl;

              const orderElapsedMins = Math.floor(
                (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60)
              );

              return (
                <div
                  key={order.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    order.status === 'delivered'
                      ? 'bg-neutral-950/70 border-neutral-800'
                      : 'bg-neutral-950 border-amber-500/30 hover:border-amber-500/60 shadow-lg'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-850 gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-black font-mono text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                        {order.id}
                      </span>
                      <span
                        className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-md font-mono ${
                          order.status === 'delivered'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : order.status === 'on_the_way'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {order.status === 'on_the_way' ? '🛵 OUT FOR DELIVERY' : order.status}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-500" />
                        <span>Placed {orderElapsedMins}m ago</span>
                      </span>
                    </div>

                    {/* Assigned Rider Indicator */}
                    {order.driver && (
                      <div className="flex items-center gap-1.5 text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-xl">
                        <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Rider: <strong>{order.driver.name}</strong> ({order.driver.vehiclePlate})</span>
                      </div>
                    )}
                  </div>

                  {/* Customer Information & Quick Action Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3.5">
                    
                    {/* Left: Customer & Address */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-neutral-500 block">Customer</span>
                          <h4 className="text-sm font-bold text-white">{order.customerName || 'Valued Customer'}</h4>
                        </div>
                        {order.customerPhone && (
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                            title="Call customer directly on phone"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call {order.customerPhone}</span>
                          </a>
                        )}
                      </div>

                      {/* Full Delivery Address */}
                      <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5 text-xs text-neutral-200">
                            <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-white block">
                                {order.area || (order as any).deliveryArea || 'Karachi Destination'}
                              </span>
                              <span className="text-neutral-300 text-[11px] leading-relaxed">
                                {order.deliveryAddress || 'Address on file'}
                              </span>
                            </div>
                          </div>
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 shadow-sm"
                            title="Open direct Google Maps directions"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Navigate</span>
                          </a>
                        </div>
                      </div>

                      {/* Customer Notes / Gate / Landmark */}
                      {(order.notes || order.customerNotes) && (
                        <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                          <strong>Landmark / Note:</strong> {order.notes || order.customerNotes}
                        </div>
                      )}
                    </div>

                    {/* Right: Payment Details & Items Summary */}
                    <div className="space-y-2 flex flex-col justify-between">
                      {/* Payment Collection Banner */}
                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          isCOD
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isCOD ? (
                            <Banknote className="w-5 h-5 text-amber-400 shrink-0" />
                          ) : (
                            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                          )}
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider block">
                              {isCOD ? '💵 Cash on Delivery (COD)' : '✅ Paid Online (EasyPaisa)'}
                            </span>
                            <span className="text-xs font-semibold">
                              {isCOD
                                ? 'COLLECT THIS EXACT AMOUNT IN CASH'
                                : 'ALREADY PAID • DO NOT COLLECT CASH'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 block uppercase">Total</span>
                          <span
                            className={`font-mono text-base font-black ${
                              isCOD ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            Rs. {order.total.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Dishes summary */}
                      <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                          Order Contents:
                        </span>
                        <div className="space-y-0.5">
                          {order.items?.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-neutral-300">
                              <span>
                                <strong className="text-amber-400 font-mono">{it.quantity}x</strong> {it.name}
                                {it.selectedVariant ? ` (${it.selectedVariant})` : ''}
                              </span>
                              <span className="font-mono text-[11px] text-neutral-500">
                                Rs. {(it.itemTotal || it.price * it.quantity).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer */}
                  <div className="pt-3 border-t border-neutral-850 flex items-center justify-between flex-wrap gap-2">
                    <div className="text-xs text-neutral-400 flex items-center gap-2">
                      {order.deliveryProofPhoto && (
                        <button
                          type="button"
                          onClick={() => setInspectingProofOrder(order)}
                          className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-purple-400" />
                          <span>📸 View Proof Photo</span>
                        </button>
                      )}
                      {order.status === 'delivered' ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Delivery Confirmed &amp; Completed</span>
                        </span>
                      ) : (
                        <span>Ensure food package is handed over before marking delivered.</span>
                      )}
                    </div>

                    {order.status !== 'delivered' && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsDelivered(order)}
                        disabled={deliveringId === order.id}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{deliveringId === order.id ? 'Confirming...' : '✅ MARK AS DELIVERED'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Inspect Proof Photo Modal */}
        {inspectingProofOrder && inspectingProofOrder.deliveryProofPhoto && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-bold text-white">
                    Delivery Proof • Order #{inspectingProofOrder.id}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingProofOrder(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <img
                src={inspectingProofOrder.deliveryProofPhoto}
                alt="Delivery Proof"
                className="w-full max-h-[60vh] object-contain rounded-xl border border-neutral-800 bg-neutral-950"
              />

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Customer:</span>
                  <span className="text-white font-bold">{inspectingProofOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Address:</span>
                  <span className="text-neutral-300">{inspectingProofOrder.deliveryAddress}</span>
                </div>
                {inspectingProofOrder.deliveredAt && (
                  <div className="flex justify-between text-neutral-400 text-[11px] font-mono">
                    <span>Delivered At:</span>
                    <span>{new Date(inspectingProofOrder.deliveredAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setInspectingProofOrder(null)}
                className="w-full py-2 bg-neutral-800 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
