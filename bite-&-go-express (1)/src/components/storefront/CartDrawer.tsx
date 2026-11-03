import React from 'react';
import { OrderItem, StoreSettings } from '../../types';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, ArrowLeft, Bike, Store, Sparkles, Moon, Clock, Tag, MapPin } from 'lucide-react';
import { isStoreOpenNow } from '../../utils/operatingHours';
import { checkKarachiFreeDeliveryEligibility } from '../../data/karachiAreas';
import { StorageService } from '../../utils/storage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[];
  onUpdateQuantity: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
  onCheckout: () => void;
  orderType: 'delivery' | 'pickup';
  onToggleOrderType: (type: 'delivery' | 'pickup') => void;
  freeDeliveryThreshold: number;
  deliveryFeeRate: number;
  settings?: StoreSettings;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  orderType,
  onToggleOrderType,
  freeDeliveryThreshold,
  deliveryFeeRate,
  settings,
}) => {
  const openStatus = isStoreOpenNow(settings);
  // ESC key handler to close cart
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeCustomer = StorageService.getActiveCustomer();
  const subtotal = items.reduce((sum, i) => sum + i.itemTotal, 0);

  // Accurate Karachi Free Delivery calculation
  const customerArea = activeCustomer?.defaultArea || '';
  const deliveryEval = checkKarachiFreeDeliveryEligibility({
    areaName: customerArea,
    subtotal,
    settings,
    orderType,
  });

  const deliveryFee = orderType === 'pickup' ? 0 : deliveryEval.effectiveFee;
  const total = subtotal + deliveryFee;
  const effectiveFreeThreshold = settings?.freeDeliveryThreshold || freeDeliveryThreshold || 1800;
  const amountNeededForFree = Math.max(0, effectiveFreeThreshold - subtotal);
  const freeDeliveryProgress = Math.min(100, (subtotal / effectiveFreeThreshold) * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-neutral-900 border-l border-neutral-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Your Order Bag</h2>
                <p className="text-xs text-neutral-400">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {items.length > 0 && openStatus.isOpen && (
                <button
                  type="button"
                  onClick={onCheckout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  title="Proceed to checkout immediately without scrolling down"
                >
                  <span>Checkout</span>
                  <span className="font-mono bg-neutral-950/20 px-1 py-0.2 rounded text-[11px]">
                    Rs. {total.toLocaleString()}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-750 transition-colors"
                title="Return to store homepage"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                aria-label="Close cart"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Delivery or Pickup Toggle */}
          <div className="p-4 bg-neutral-950 border-b border-neutral-800">
            <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-900 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => onToggleOrderType('delivery')}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  orderType === 'delivery'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Express Delivery</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleOrderType('pickup')}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                  orderType === 'pickup'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Self Pickup</span>
              </button>
            </div>

            {/* Free Delivery Bar & Local Karachi Zone Status */}
            {orderType === 'delivery' && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {deliveryEval.isFree ? (
                      <span className="text-emerald-400 font-semibold">
                        🎉 Free Delivery Active: {deliveryEval.reason || 'Local Karachi Zone'}
                      </span>
                    ) : amountNeededForFree > 0 ? (
                      <span>
                        Add <strong className="text-amber-400">Rs. {amountNeededForFree.toLocaleString()}</strong> for Free Delivery
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">🎉 Free Delivery Unlocked!</span>
                    )}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-400">
                    {deliveryEval.isFree ? '100%' : `${Math.round(freeDeliveryProgress)}%`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-850 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      deliveryEval.isFree
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-300 w-full'
                        : 'bg-gradient-to-r from-amber-500 to-amber-300'
                    }`}
                    style={{ width: deliveryEval.isFree ? '100%' : `${freeDeliveryProgress}%` }}
                  />
                </div>
                {!deliveryEval.isFree && (
                  <p className="text-[10px] text-neutral-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Free on all orders in North Nazimabad &amp; Buffer Zone (selected at checkout)</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 flex items-center justify-center text-neutral-500">
                  <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                </div>
                <p className="text-sm font-semibold text-white">Your bag is currently empty</p>
                <p className="text-xs text-neutral-500 max-w-xs">
                  Discover our smash burgers, hot Nashville tenders and artisanal shakes to start your order.
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 px-4 py-2 bg-amber-500 text-neutral-950 font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors"
                >
                  Explore Menu
                </button>
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-white">{item.name}</h4>
                      {item.selectedVariant && (
                        <p className="text-[11px] text-amber-400/90 font-medium">
                          Size: {item.selectedVariant}
                        </p>
                      )}
                      {item.selectedSpiciness && (
                        <p className="text-[11px] text-red-400/90 font-medium">
                          Spice: {item.selectedSpiciness}
                        </p>
                      )}
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <p className="text-[11px] text-neutral-400 line-clamp-1">
                          + {item.selectedAddons.map((a) => a.name).join(', ')}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-[11px] text-neutral-500 italic mt-0.5">
                          Note: "{item.specialInstructions}"
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => onRemoveItem(index)}
                      className="p-1 rounded text-neutral-500 hover:text-red-400 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                    <span className="font-mono text-xs font-bold text-neutral-200 tabular-nums">
                      Rs. {item.itemTotal.toLocaleString()}
                    </span>

                    <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-md p-0.5">
                      <button
                        onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-xs font-bold text-white px-1.5 tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing & Checkout Footer */}
          {items.length > 0 && (
            <div className="p-5 bg-neutral-950 border-t border-neutral-800 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-white tabular-nums">
                    Rs. {subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>{orderType === 'delivery' ? 'Delivery Fee' : 'Pickup Fee'}</span>
                  <span className="font-mono tabular-nums">
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-400 font-semibold">FREE</span>
                    ) : (
                      <span className="text-white">Rs. {deliveryFee.toLocaleString()}</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-neutral-800">
                  <span>Grand Total</span>
                  <span className="font-mono text-amber-400 text-base tabular-nums">
                    Rs. {total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Promo Code Notification */}
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] text-amber-200">
                    Promo codes (e.g. <strong className="text-amber-400">BITEGO</strong>, <strong className="text-amber-400">NIGHTOWL</strong>, <strong className="text-amber-400">FLASH15</strong>) can be applied at checkout.
                  </span>
                </div>
              </div>

              {/* Store Closed Warning if outside work hours */}
              {!openStatus.isOpen && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/30 text-red-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-300">
                    <Moon className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Kitchen Closed (After Work Hours)</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-snug">
                    {openStatus.reason}
                  </p>
                  {openStatus.nextOpenText && (
                    <div className="pt-0.5 flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                      <Clock className="w-3 h-3" />
                      <span>Reopening: {openStatus.nextOpenText}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {openStatus.isOpen ? (
                  <button
                    onClick={onCheckout}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-3.5 px-4 rounded-xl text-sm shadow-xl shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-center gap-2 bg-neutral-900 border border-neutral-800 text-neutral-400 font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm cursor-not-allowed opacity-75"
                    title={openStatus.reason}
                  >
                    <Moon className="w-4 h-4 text-neutral-500" />
                    <span>Kitchen Closed ({openStatus.nextOpenText ? `Reopens ${openStatus.nextOpenText}` : 'Outside Hours'})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-transparent hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Continue Browsing Menu</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
