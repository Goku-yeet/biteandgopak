import React from 'react';
import { CustomerUser, Order } from '../../types';
import {
  X,
  ShoppingBag,
  User,
  Bike,
  Bell,
  Star,
  Ticket,
  ShieldCheck,
  CreditCard,
  ChefHat,
  Palette,
  LogOut,
  ChevronRight,
  MapPin,
  Flame,
  Phone,
} from 'lucide-react';

interface CustomerSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeCustomer: CustomerUser | null;
  activeOrder: Order | null;
  unreadNotificationsCount: number;
  onOpenOrders: () => void;
  onOpenAccount: () => void;
  onOpenTracker: () => void;
  onOpenNotifications: () => void;
  onOpenReviews: () => void;
  onOpenTickets?: () => void;
  onOpenCustomerAuth: () => void;
  onOpenAdmin?: () => void;
  onOpenPos?: () => void;
  onOpenKitchen?: () => void;
  onOpenThemeModal?: () => void;
  onOpenDeliveryCalculator?: () => void;
  onLogoutCustomer?: () => void;
}

export const CustomerSidebarDrawer: React.FC<CustomerSidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeCustomer,
  activeOrder,
  unreadNotificationsCount,
  onOpenOrders,
  onOpenAccount,
  onOpenTracker,
  onOpenNotifications,
  onOpenReviews,
  onOpenTickets,
  onOpenCustomerAuth,
  onOpenAdmin,
  onOpenPos,
  onOpenKitchen,
  onOpenThemeModal,
  onOpenDeliveryCalculator,
  onLogoutCustomer,
}) => {
  if (!isOpen) return null;

  const hasLiveOrder =
    activeOrder && activeOrder.status !== 'delivered' && activeOrder.status !== 'cancelled';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm transition-opacity animate-in fade-in"
      />

      {/* Slide-out Sidebar Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-neutral-900 border-l border-neutral-800 text-neutral-100 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/90 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-neutral-950 font-black text-sm flex items-center justify-center font-heading shadow-md shadow-amber-500/20 shrink-0">
                {activeCustomer ? activeCustomer.name.charAt(0).toUpperCase() : 'BG'}
              </div>
              <div className="min-w-0">
                {activeCustomer ? (
                  <>
                    <h3 className="text-sm font-bold text-white truncate">{activeCustomer.name}</h3>
                    <p className="text-[11px] text-neutral-400 truncate">{activeCustomer.email}</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-bold text-white">Welcome Guest</h3>
                    <p className="text-[11px] text-neutral-400">Bite &amp; Go Customer Hub</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {activeCustomer && onLogoutCustomer && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogoutCustomer();
                  }}
                  className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Sign Out of Customer Account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Logout</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-white rounded-xl bg-neutral-900 border border-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Guest Sign-In / Register Callout if not logged in */}
          {!activeCustomer && (
            <div className="p-3.5 mx-4 mt-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl flex items-center justify-between gap-2">
              <div className="text-xs">
                <span className="font-bold text-amber-400 block">Sign In for Rewards</span>
                <span className="text-[11px] text-neutral-400">Save addresses &amp; 1-click reorder</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCustomerAuth();
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-sm whitespace-nowrap cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Active Order Card if Live */}
          {hasLiveOrder && (
            <div
              onClick={() => {
                onClose();
                onOpenTracker();
              }}
              className="mx-4 mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold font-mono text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>ACTIVE ORDER {activeOrder.id}</span>
                </span>
                <span className="text-[10px] text-amber-300 capitalize font-bold">{activeOrder.status}</span>
              </div>
              <p className="text-xs text-white font-medium truncate">
                {activeOrder.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
              </p>
              <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Bike className="w-3.5 h-3.5 text-amber-400" />
                <span>Tap to track live rider on map</span>
              </p>
            </div>
          )}

          {/* Main Action Hub List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 px-2 pt-1">
              Customer Services
            </div>

            {/* 1. Previous Orders */}
            <button
              type="button"
              onClick={() => {
                onClose();
                if (activeCustomer) onOpenOrders();
                else onOpenCustomerAuth();
              }}
              className="w-full p-3 rounded-2xl bg-neutral-950 border border-neutral-850 hover:border-neutral-750 hover:bg-neutral-850/80 transition-all flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                    Previous Orders
                  </h4>
                  <p className="text-[10px] text-neutral-400">Order history, receipts &amp; 1-click reorder</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </button>

            {/* 2. My Account / Profile */}
            <button
              type="button"
              onClick={() => {
                onClose();
                if (activeCustomer) onOpenAccount();
                else onOpenCustomerAuth();
              }}
              className="w-full p-3 rounded-2xl bg-neutral-950 border border-neutral-850 hover:border-neutral-750 hover:bg-neutral-850/80 transition-all flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                    My Account &amp; Profile
                  </h4>
                  <p className="text-[10px] text-neutral-400">Addresses, phone, loyalty points</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </button>

            {/* 3. Live Order Tracking */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTracker();
              }}
              className="w-full p-3 rounded-2xl bg-neutral-950 border border-neutral-850 hover:border-neutral-750 hover:bg-neutral-850/80 transition-all flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                      Live Order Tracking
                    </h4>
                    {hasLiveOrder && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-400">Real-time GPS rider &amp; kitchen status</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </button>

            {/* 4. Notifications */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNotifications();
              }}
              className="w-full p-3 rounded-2xl bg-neutral-950 border border-neutral-850 hover:border-neutral-750 hover:bg-neutral-850/80 transition-all flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                      Store Notifications
                    </h4>
                    {unreadNotificationsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-neutral-950 font-bold text-[9px] font-mono">
                        {unreadNotificationsCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-400">Order alerts, vouchers &amp; rain updates</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </button>

            {/* Delivery Coverage & Free Delivery Calculator */}
            {onOpenDeliveryCalculator && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDeliveryCalculator();
                }}
                className="w-full p-3 rounded-2xl bg-neutral-950 border border-neutral-850 hover:border-amber-500/50 hover:bg-neutral-850/80 transition-all flex items-center justify-between text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                        Delivery Coverage &amp; Rates
                      </h4>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold font-mono">
                        FREE Calc
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400">All Karachi areas, ETAs &amp; free delivery rules</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
              </button>
            )}

            {/* 5. Customer Reviews (Separate from Tickets) */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReviews();
              }}
              className="w-full p-3 rounded-2xl bg-neutral-950 border border-neutral-850 hover:border-neutral-750 hover:bg-neutral-850/80 transition-all flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                      Customer Reviews &amp; Ratings
                    </h4>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold font-mono">
                      ⭐ 4.9
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400">Read verified foodie reviews &amp; rate dishes</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </button>

            {/* 6. Support Tickets (Only on Placed Orders) */}
            {onOpenTickets && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTickets();
                }}
                className="w-full p-3 rounded-2xl bg-neutral-950 border border-neutral-850 hover:border-neutral-750 hover:bg-neutral-850/80 transition-all flex items-center justify-between text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">
                      Order Issue Tickets
                    </h4>
                    <p className="text-[10px] text-neutral-400">Report missing item or track ticket</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
              </button>
            )}


            {/* Quick Kitchen Helpline */}
            <div className="pt-2">
              <a
                href="tel:+923012945576"
                className="w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span>Call Helpline: +923012945576</span>
                </div>
                <span className="text-[10px] bg-amber-500 text-neutral-950 px-1.5 py-0.5 rounded font-black">
                  CALL
                </span>
              </a>
            </div>
          </div>

          {/* Footer Bottom Strip */}
          <div className="p-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs">
            {onOpenThemeModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenThemeModal();
                }}
                className="flex items-center gap-1.5 text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Theme</span>
              </button>
            )}

            {activeCustomer && onLogoutCustomer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogoutCustomer();
                }}
                className="flex items-center gap-1.5 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer ml-auto"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
