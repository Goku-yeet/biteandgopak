import React, { useState } from 'react';
import { CustomerUser, CustomerTicket, Order } from '../../types';
import { StorageService } from '../../utils/storage';
import { KARACHI_DELIVERY_AREAS } from '../../data/karachiAreas';
import {
  X,
  User,
  Ticket,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  Plus,
  Save,
  MessageSquare,
  ShoppingBag,
  RotateCcw,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Bike,
  Search,
  Star,
  PhoneCall,
} from 'lucide-react';

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerUser | null;
  onLogout: () => void;
  onOpenCreateTicket: (orderId?: string) => void;
  onOpenTicketChat?: (ticket: CustomerTicket) => void;
  onTrackOrder?: (orderId: string) => void;
  onReorder?: (order: Order) => void;
  onOpenReviews?: (orderId?: string) => void;
  tickets: CustomerTicket[];
  orders: Order[];
  initialTab?: 'orders' | 'tickets' | 'profile';
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  isOpen,
  onClose,
  customer,
  onLogout,
  onOpenCreateTicket,
  onOpenTicketChat,
  onTrackOrder,
  onReorder,
  onOpenReviews,
  tickets,
  orders,
  initialTab = 'orders',
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'tickets' | 'profile'>(initialTab);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Profile edit state
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.defaultAddress || '');
  const [area, setArea] = useState(customer?.defaultArea || KARACHI_DELIVERY_AREAS[0]?.name || 'North Nazimabad - Block I (Branch Location)');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [reorderSuccessId, setReorderSuccessId] = useState<string | null>(null);

  React.useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setAddress(customer.defaultAddress || '');
      setArea(customer.defaultArea || 'DHA Phase 6, Karachi');
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  // Filter previous orders for this logged in customer account
  const myOrders = orders.filter((o) => {
    const emailMatch =
      Boolean(customer.email && o.customerEmail && o.customerEmail.toLowerCase().trim() === customer.email.toLowerCase().trim());
    const phoneClean = customer.phone.replace(/[^0-9]/g, '');
    const orderPhoneClean = (o.customerPhone || '').replace(/[^0-9]/g, '');
    const phoneMatch = Boolean(phoneClean && orderPhoneClean && (phoneClean === orderPhoneClean || orderPhoneClean.endsWith(phoneClean) || phoneClean.endsWith(orderPhoneClean)));
    const nameMatch = Boolean(customer.name && o.customerName && o.customerName.toLowerCase().trim() === customer.name.toLowerCase().trim());
    return emailMatch || phoneMatch || nameMatch;
  });

  // Filter previous orders by status and search query
  const filteredOrders = myOrders.filter((o) => {
    if (orderStatusFilter === 'active' && (o.status === 'delivered' || o.status === 'cancelled')) return false;
    if (orderStatusFilter === 'delivered' && o.status !== 'delivered') return false;
    if (orderStatusFilter === 'cancelled' && o.status !== 'cancelled') return false;

    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase().trim();
      const matchId = o.id.toLowerCase().includes(q);
      const matchItem = o.items.some((i) => i.name.toLowerCase().includes(q));
      const matchArea = (o.area || '').toLowerCase().includes(q);
      return matchId || matchItem || matchArea;
    }
    return true;
  });

  const totalSpent = myOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // Tickets for this customer (including past closed tickets so customer can request to reopen if needed)
  const myTickets = StorageService.getAllCustomerTickets(customer, orders);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.updateCustomerProfile({
      name: name.trim(),
      phone: phone.trim(),
      defaultAddress: address.trim(),
      defaultArea: area,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const getOrderStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'received':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">Received</span>;
      case 'confirmed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">Confirmed</span>;
      case 'preparing':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/15 text-orange-400 border border-orange-500/30">Grilling / Prep</span>;
      case 'on_the_way':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30">Out for Delivery</span>;
      case 'delivered':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Delivered</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/15 text-red-400 border border-red-500/30">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-800 text-neutral-400">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6 flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* User Card Header */}
        <div className="flex items-center gap-3.5 mb-4 pb-3.5 border-b border-neutral-800 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-heading font-black text-lg shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="truncate">{customer.name}</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold shrink-0">
                Verified Account
              </span>
            </h3>
            <p className="text-xs text-neutral-400 truncate">{customer.email} · {customer.phone}</p>
          </div>
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            title="Sign Out of Customer Account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Tab switchers: Orders, Support Tickets, Profile */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800 mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="truncate">Orders ({myOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span className="truncate">Tickets ({myTickets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">Address</span>
          </button>
        </div>

        {/* Tab 1: Previous Orders */}
        {activeTab === 'orders' && (
          <div className="space-y-3 overflow-y-auto flex-1 pr-1">
            {/* Header & Account Stats */}
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Previous Order History</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    All deliveries placed under {customer.email}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block">Total Spend</span>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    Rs. {totalSpent.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Order Search Input */}
              {myOrders.length > 0 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search by order #, item name, or area..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                  {orderSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOrderSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Status Filter Chips */}
              {myOrders.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      orderStatusFilter === 'all'
                        ? 'bg-amber-500 text-neutral-950'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    All ({myOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('active')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      orderStatusFilter === 'active'
                        ? 'bg-amber-500 text-neutral-950'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Active ({myOrders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('delivered')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      orderStatusFilter === 'delivered'
                        ? 'bg-emerald-500 text-neutral-950'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Delivered ({myOrders.filter((o) => o.status === 'delivered').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('cancelled')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      orderStatusFilter === 'cancelled'
                        ? 'bg-red-500 text-white'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Cancelled ({myOrders.filter((o) => o.status === 'cancelled').length})
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const orderDate = new Date(order.createdAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const orderTime = new Date(order.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5 text-xs hover:border-neutral-700 transition-colors"
                  >
                    {/* Order Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400">{order.id}</span>
                        <span className="text-neutral-500 text-[11px]">{orderDate} at {orderTime}</span>
                      </div>
                      {getOrderStatusBadge(order.status)}
                    </div>

                    {/* Items List */}
                    <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800/80 space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-neutral-300 text-xs">
                          <span className="truncate pr-2">
                            <strong className="text-amber-400 font-mono">{item.quantity}x</strong> {item.name}
                          </span>
                          <span className="font-mono text-neutral-400 shrink-0">
                            Rs. {((item.price || 0) * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Order Financials & Delivery Info */}
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/60">
                      <div>
                        <span>Payment: </span>
                        <strong className="text-neutral-200 capitalize">
                          {order.payment?.method === 'easypaisa'
                            ? 'EasyPaisa'
                            : order.payment?.method === 'jazzcash'
                            ? 'JazzCash'
                            : 'Cash on Delivery'}
                        </strong>
                        {order.area && <span className="text-neutral-500"> · {order.area}</span>}
                      </div>
                      <div className="font-mono text-sm font-bold text-white">
                        Rs. {order.total.toLocaleString()}
                      </div>
                    </div>

                    {/* Assigned Delivery Rider Info & Direct Call Button */}
                    {order.driver && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-xs text-purple-300">
                        <div className="flex items-center gap-2">
                          <Bike className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="text-[11px]">
                            Rider: <strong className="text-white">{order.driver.name}</strong> ({order.driver.vehiclePlate})
                          </span>
                        </div>
                        <a
                          href={`tel:${order.driver.phone}`}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow"
                          title="Call rider for delivery updates"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Call Rider</span>
                        </a>
                      </div>
                    )}

                    {/* Quick Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                      {/* Track Live Order (if active) */}
                      {onTrackOrder && order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => onTrackOrder(order.id)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Bike className="w-3 h-3" />
                          <span>Track Live</span>
                        </button>
                      )}

                      {/* 1-Click Reorder */}
                      {onReorder && (
                        <button
                          type="button"
                          onClick={() => {
                            onReorder(order);
                            setReorderSuccessId(order.id);
                            setTimeout(() => setReorderSuccessId(null), 2500);
                          }}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-semibold rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="Add these exact items back into cart"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span>{reorderSuccessId === order.id ? 'Added to Bag!' : 'Reorder'}</span>
                        </button>
                      )}

                      {/* Report Issue / Ticket */}
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenCreateTicket(order.id);
                        }}
                        className="px-2.5 py-1 text-neutral-400 hover:text-amber-400 border border-neutral-800 hover:border-amber-500/30 rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        title="Open a support ticket for this order"
                      >
                        <Ticket className="w-3 h-3" />
                        <span>Issue?</span>
                      </button>

                      {/* Customer Review Button (Placed right next to Issue? button as requested) */}
                      {onOpenReviews && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenReviews(order.id);
                          }}
                          className="px-2.5 py-1 text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          title="Review items and dishes from this order"
                        >
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>Review</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {myOrders.length === 0 && (
                <div className="py-12 text-center text-neutral-500 space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto opacity-30 text-amber-400" />
                  <p className="text-sm font-bold text-white">No Previous Orders Found</p>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    You haven't placed an order yet under {customer.email}. Explore our menu to place your first smash order!
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>Browse Menu</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {myOrders.length > 0 && filteredOrders.length === 0 && (
                <div className="py-8 text-center text-neutral-500 space-y-2">
                  <Search className="w-8 h-8 mx-auto opacity-30 text-amber-400" />
                  <p className="text-xs font-bold text-neutral-300">No matching orders found</p>
                  <p className="text-[11px] text-neutral-400">
                    Try clearing your search query "{orderSearchQuery}" or resetting filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderSearchQuery('');
                      setOrderStatusFilter('all');
                    }}
                    className="px-3 py-1 bg-neutral-800 text-neutral-200 text-xs rounded-lg hover:text-white cursor-pointer"
                  >
                    Reset Filter
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300">My Order Issue Tickets</span>
              <span className="text-[11px] text-neutral-400">
                To report an issue, tap "Issue?" on any placed order in your Orders tab.
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
              {myTickets.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">{t.id}</span>
                      <span className="text-neutral-500 font-mono">({t.orderId})</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        t.status === 'resolved'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : t.status === 'investigating'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : t.status === 'closed'
                          ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {t.status === 'closed' ? 'Closed by Staff' : t.status}
                    </span>
                  </div>

                  <p className="text-neutral-300">{t.message}</p>

                  {t.adminReply && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] space-y-0.5">
                      <p className="font-semibold flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-amber-400" />
                        <span>Store Manager Resolution:</span>
                      </p>
                      <p className="text-neutral-300">{t.adminReply}</p>
                    </div>
                  )}

                  <div className="text-[10px] text-neutral-500 flex items-center justify-between pt-1.5 border-t border-neutral-900">
                    <span className="capitalize">{t.issueType.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      {onOpenTicketChat && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenTicketChat(t);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-semibold transition-colors ${
                            t.status === 'closed'
                              ? 'bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-amber-400'
                              : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400'
                          }`}
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>{t.status === 'closed' ? 'View / Reopen Request' : `Talk Back (${t.messages?.length || 1})`}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {myTickets.length === 0 && (
                <div className="py-8 text-center text-neutral-500 space-y-2">
                  <Ticket className="w-8 h-8 mx-auto opacity-30 text-amber-400" />
                  <p className="text-xs">No support tickets created yet.</p>
                  <p className="text-[11px] text-neutral-500">
                    If anything is ever missing or late, open a ticket anytime!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-3">
            {saveSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Profile &amp; Default Address Saved!</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Email (Account)</label>
                <input
                  type="email"
                  disabled
                  value={customer.email}
                  className="w-full bg-neutral-950/60 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-400 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Contact Phone</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Default Delivery Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House, Street, Area..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">Delivery City &amp; Area</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                {KARACHI_DELIVERY_AREAS.filter((a) => {
                  const disabled = (StorageService.getSettings()?.disabledDeliveryAreas || []);
                  return !disabled.some(
                    (d) => d.toLowerCase().trim() === a.name.toLowerCase().trim() || a.name.toLowerCase().includes(d.toLowerCase().trim())
                  );
                }).map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Profile &amp; Address</span>
            </button>

            <div className="pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Account</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
