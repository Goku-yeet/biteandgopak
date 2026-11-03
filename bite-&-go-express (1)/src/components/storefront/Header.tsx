import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Bike,
  Bell,
  User,
  ShieldCheck,
  ChefHat,
  LayoutDashboard,
  MapPin,
  Palette,
  CreditCard,
  Menu,
  X,
  Sparkles,
  Star,
  LogOut,
} from 'lucide-react';
import { Order, CustomerUser } from '../../types';

interface HeaderProps {
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenTracker: () => void;
  onOpenNotifications: () => void;
  onOpenCustomerAuth: () => void;
  onOpenCustomerProfile: () => void;
  onLogoutCustomer?: () => void;
  onOpenOrders?: () => void;
  onOpenAdmin?: () => void;
  onOpenKitchen?: () => void;
  onOpenPos?: () => void;
  onOpenRiderPortal?: () => void;
  onOpenThemeModal?: () => void;
  onOpenSidebar?: () => void;
  onOpenReviews?: () => void;
  onOpenDeliveryCalculator?: () => void;
  activeCustomer: CustomerUser | null;
  activeOrder: Order | null;
  unreadNotificationsCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  cartTotal,
  onOpenCart,
  onOpenTracker,
  onOpenNotifications,
  onOpenCustomerAuth,
  onOpenCustomerProfile,
  onLogoutCustomer,
  onOpenOrders,
  onOpenAdmin,
  onOpenKitchen,
  onOpenPos,
  onOpenRiderPortal,
  onOpenThemeModal,
  onOpenSidebar,
  onOpenReviews,
  onOpenDeliveryCalculator,
  activeCustomer,
  activeOrder,
  unreadNotificationsCount,
  searchQuery,
  onSearchChange,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <header id="storefront-header" className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 transition-all">
      {/* Mobile active order quick indicator */}
      {activeOrder && activeOrder.status !== 'delivered' && activeOrder.status !== 'cancelled' && (
        <div className="bg-neutral-900 border-b border-amber-500/20 px-3 sm:px-6 py-1.5 text-xs text-neutral-300 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Active Order #{activeOrder.id} ({activeOrder.status})</span>
          </div>
          <button
            type="button"
            onClick={onOpenTracker}
            className="text-[11px] bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
          >
            Track Order
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Zone 1: Logo & Wordmark */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none"
              title="Bite & Go Express"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
                <span className="font-heading font-black text-xl sm:text-2xl text-neutral-950">B</span>
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-black text-xl sm:text-2xl tracking-tight text-white leading-none">
                  Bite &amp; Go
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-amber-500 font-semibold mt-0.5">
                  Express Kitchen
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Desktop Search */}
          <div className="hidden md:flex items-center gap-6 flex-1 max-w-lg mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search smash burgers, crispy chicken, loaded fries..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-full pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition-all"
              />
            </div>
          </div>

          {/* Zone 3: Desktop Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Live Order Tracker (Pulsing if active order is on the way) */}
            {activeOrder && activeOrder.status !== 'delivered' && activeOrder.status !== 'cancelled' && (
              <button
                onClick={onOpenTracker}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 animate-pulse transition-all cursor-pointer whitespace-nowrap"
                title="Track your live order"
              >
                <Bike className="w-4 h-4 text-amber-500" />
                <span className="hidden xl:inline">Order Live</span>
              </button>
            )}

            {/* Quick Customer Profile greeting & 1-click Log Out if logged in */}
            {activeCustomer && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenCustomerProfile}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 text-neutral-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  title={`Logged in as ${activeCustomer.name} (View Profile)`}
                >
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">
                    {activeCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[75px] truncate hidden xl:inline">{activeCustomer.name.split(' ')[0]}</span>
                </button>
                {onLogoutCustomer && (
                  <button
                    onClick={onLogoutCustomer}
                    className="flex items-center gap-1 px-2 py-1.5 bg-neutral-900 hover:bg-red-500/10 border border-neutral-800 hover:border-red-500/40 text-neutral-400 hover:text-red-400 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    title="Sign Out of Customer Account"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline text-[11px]">Logout</span>
                  </button>
                )}
              </div>
            )}

            {/* Clean Desktop Sidebar Menu Trigger */}
            {onOpenSidebar && (
              <button
                type="button"
                onClick={onOpenSidebar}
                className="flex items-center gap-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-750 hover:border-amber-500/40 text-neutral-100 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer group"
                title="Open Sidebar Menu (Previous Orders, Account, Tracking, Reviews & Support)"
              >
                <div className="relative">
                  <Menu className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform stroke-[2.5]" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-neutral-950 animate-pulse" />
                  )}
                </div>
                <span>Menu</span>
              </button>
            )}

            {/* Desktop Cart Button */}
            <button
              onClick={onOpenCart}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-3.5 py-2 rounded-lg shadow-md shadow-amber-500/20 active:scale-95 transition-all whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
              <span className="text-xs">Bag</span>
              {cartCount > 0 && (
                <span className="bg-neutral-950 text-amber-400 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md tabular-nums">
                  {cartCount} · Rs. {cartTotal.toLocaleString()}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Right Action Bar: Search, Bag, and Menu */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
              title="Search menu"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenCart}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-3 py-2 rounded-lg shadow-md active:scale-95 transition-all text-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{cartCount}</span>
              {cartTotal > 0 && (
                <span className="hidden xs:inline font-mono text-[11px]">· {cartTotal}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenSidebar) {
                  onOpenSidebar();
                } else {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }
              }}
              className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
              title="Open Customer Hub & Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Search Input Drawer */}
        {isMobileSearchOpen && (
          <div className="sm:hidden pb-3 pt-1 animate-in slide-in-from-top-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search burgers, chicken, fries..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu Drawer Sheet */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-neutral-800 bg-neutral-950 p-4 space-y-3 animate-in fade-in">
          {/* Customer Profile Row */}
          {activeCustomer ? (
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-neutral-950 font-bold flex items-center justify-center text-xs">
                  {activeCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{activeCustomer.name}</h4>
                  <p className="text-[11px] text-neutral-400 truncate max-w-[180px]">{activeCustomer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenCustomerProfile();
                  }}
                  className="text-xs text-amber-400 font-bold px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                >
                  Profile
                </button>
                {onLogoutCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onLogoutCustomer();
                    }}
                    className="text-xs text-red-400 font-bold px-2 py-1 rounded bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                    title="Log Out"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Exit</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenCustomerAuth();
              }}
              className="w-full py-2.5 bg-neutral-900 border border-neutral-800 hover:border-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4 text-amber-400" />
              <span>Customer Sign In / Register</span>
            </button>
          )}

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (onOpenOrders) onOpenOrders();
                else if (activeCustomer) onOpenCustomerProfile();
                else onOpenCustomerAuth();
              }}
              className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-left hover:border-amber-500/50 transition-colors flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white block text-xs">Previous Orders</span>
                <span className="text-[10px] text-neutral-400">Order history &amp; reorder</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenTracker();
              }}
              className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-left hover:border-amber-500/50 transition-colors flex items-center gap-2"
            >
              <Bike className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white block text-xs">Track Order</span>
                <span className="text-[10px] text-neutral-400">Live GPS &amp; rider ETA</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenNotifications();
              }}
              className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-left hover:border-amber-500/50 transition-colors flex items-center gap-2"
            >
              <Bell className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white block text-xs">Notifications</span>
                <span className="text-[10px] text-neutral-400">
                  {unreadNotificationsCount > 0 ? `${unreadNotificationsCount} unread` : 'Status alerts'}
                </span>
              </div>
            </button>

            {onOpenThemeModal && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenThemeModal();
                }}
                className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-left hover:border-amber-500/50 transition-colors flex items-center gap-2"
              >
                <Palette className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-white block text-xs">Theme Preset</span>
                  <span className="text-[10px] text-neutral-400">White / Dark / Spice</span>
                </div>
              </button>
            )}
          </div>

          {/* Staff & Employee Portals Section */}
          <div className="pt-2 border-t border-neutral-850 space-y-1.5">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-500 block px-1">
              Staff &amp; Operation Portals
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {onOpenPos && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenPos();
                  }}
                  className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-xs flex flex-col items-center gap-1 text-center"
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[11px]">Employee POS</span>
                </button>
              )}

              {onOpenKitchen && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenKitchen();
                  }}
                  className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-xs flex flex-col items-center gap-1 text-center"
                >
                  <ChefHat className="w-4 h-4" />
                  <span className="text-[11px]">Kitchen KDS</span>
                </button>
              )}

              {onOpenAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAdmin();
                  }}
                  className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex flex-col items-center gap-1 text-center"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[11px]">Manager HUD</span>
                </button>
              )}

              {onOpenRiderPortal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenRiderPortal();
                  }}
                  className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex flex-col items-center gap-1 text-center"
                >
                  <Bike className="w-4 h-4" />
                  <span className="text-[11px]">Rider HUD</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
