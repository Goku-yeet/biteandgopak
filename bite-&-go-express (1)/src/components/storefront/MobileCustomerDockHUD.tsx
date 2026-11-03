import React from 'react';
import {
  Menu,
  Bike,
  Star,
  User,
  ShoppingBag,
  Bell,
  RotateCcw,
} from 'lucide-react';
import { Order, CustomerUser } from '../../types';

interface MobileCustomerDockHUDProps {
  onOpenSidebar: () => void;
  onOpenTracker: () => void;
  onOpenReviews: () => void;
  onOpenAccount: () => void;
  onOpenCart: () => void;
  activeOrder: Order | null;
  activeCustomer: CustomerUser | null;
  cartCount: number;
  cartTotal: number;
  unreadNotificationsCount?: number;
}

export const MobileCustomerDockHUD: React.FC<MobileCustomerDockHUDProps> = ({
  onOpenSidebar,
  onOpenTracker,
  onOpenReviews,
  onOpenAccount,
  onOpenCart,
  activeOrder,
  activeCustomer,
  cartCount,
  cartTotal,
  unreadNotificationsCount = 0,
}) => {
  const isOrderActive =
    activeOrder &&
    activeOrder.status !== 'delivered' &&
    activeOrder.status !== 'cancelled';

  return (
    <div className="sm:hidden fixed bottom-3 inset-x-3 z-40 max-w-sm mx-auto pointer-events-none">
      <nav
        aria-label="Mobile Customer Dock"
        className="pointer-events-auto bg-neutral-950/95 backdrop-blur-xl border border-neutral-800/90 rounded-2xl px-2 py-1.5 shadow-2xl shadow-black/80 flex items-center justify-between gap-1"
      >
        {/* 1. Sidebar Menu Trigger (Three buttons / 3 lines menu icon) */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="relative flex-1 py-1 px-1 rounded-xl flex flex-col items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-900/60 transition-colors active:scale-95 cursor-pointer"
          title="Open Customer Sidebar (Previous Orders, Account, Tracking & Notifications)"
        >
          <div className="relative">
            <Menu className="w-4 h-4 stroke-[2.4]" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-neutral-950" />
            )}
          </div>
          <span className="text-[9.5px] font-bold mt-0.5 tracking-tight text-amber-400/90">Sidebar</span>
        </button>

        {/* 2. Live Order Tracking */}
        <button
          type="button"
          onClick={onOpenTracker}
          className={`relative flex-1 py-1 px-1 rounded-xl flex flex-col items-center justify-center transition-colors active:scale-95 cursor-pointer ${
            isOrderActive
              ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
          title="Track Live Karachi Rider & Order"
        >
          <div className="relative">
            <Bike className="w-4 h-4" />
            {isOrderActive && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            )}
          </div>
          <span className="text-[9.5px] font-bold mt-0.5 tracking-tight">
            {isOrderActive ? 'Tracking' : 'Track'}
          </span>
        </button>

        {/* 3. Customer Reviews (Separate from Tickets) */}
        <button
          type="button"
          onClick={onOpenReviews}
          className="relative flex-1 py-1 px-1 rounded-xl flex flex-col items-center justify-center text-neutral-400 hover:text-amber-400 hover:bg-neutral-900/60 transition-colors active:scale-95 cursor-pointer"
          title="Customer Reviews & Ratings (Separate from Support Tickets)"
        >
          <Star className="w-4 h-4 fill-amber-400/20 text-amber-400" />
          <span className="text-[9.5px] font-bold mt-0.5 tracking-tight flex items-center gap-0.5">
            <span>Reviews</span>
          </span>
        </button>

        {/* 4. Customer Account / Profile */}
        <button
          type="button"
          onClick={onOpenAccount}
          className="relative flex-1 py-1 px-1 rounded-xl flex flex-col items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-900/60 transition-colors active:scale-95 cursor-pointer"
          title={activeCustomer ? 'My Account & Previous Orders' : 'Sign In'}
        >
          <User className="w-4 h-4" />
          <span className="text-[9.5px] font-bold mt-0.5 tracking-tight truncate max-w-[50px]">
            {activeCustomer ? activeCustomer.name.split(' ')[0] : 'Sign In'}
          </span>
        </button>

        {/* 5. Cart / Bag Pill Button */}
        <button
          type="button"
          onClick={onOpenCart}
          className="py-1 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
          title="Open Cart & Checkout"
        >
          <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="text-[11px] font-mono">
            {cartCount > 0 ? `${cartCount} · Rs. ${cartTotal.toLocaleString()}` : 'Bag'}
          </span>
        </button>
      </nav>
    </div>
  );
};
