import React, { useState, useMemo } from 'react';
import { CustomerUser, Order, CustomerCrmProfile, StoreSettings } from '../../types';
import { StorageService } from '../../utils/storage';
import {
  Users,
  Search,
  Filter,
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  Crown,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Eye,
  X,
  Clock,
  CheckCircle2,
  Receipt,
  FileText,
  UserCheck,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';

interface UserDatabaseTabProps {
  orders: Order[];
  settings: StoreSettings;
  onRefreshData?: () => void;
}

export const UserDatabaseTab: React.FC<UserDatabaseTabProps> = ({
  orders,
  settings,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'vip' | 'regular' | 'new' | 'registered'>('all');
  const [sortBy, setSortBy] = useState<'spent' | 'orders' | 'recent' | 'name'>('spent');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerCrmProfile | null>(null);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');
  const [crmNoteInput, setCrmNoteInput] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Aggregate registered accounts and guest order records into CustomerCrmProfile list
  const customerProfiles = useMemo(() => {
    const registeredUsers: CustomerUser[] = StorageService.getCustomerUsers();
    const customerMap = new Map<string, CustomerCrmProfile>();

    // 1. Initialize profiles from registered accounts
    registeredUsers.forEach((user) => {
      const key = (user.phone || user.email || user.name).trim().toLowerCase();
      customerMap.set(key, {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        primaryAddress: user.defaultAddress,
        primaryArea: user.defaultArea,
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        firstOrderDate: user.createdAt,
        lastOrderDate: user.createdAt,
        customerTier: 'new',
        isRegisteredAccount: true,
        orders: [],
      });
    });

    // 2. Associate every past order with its customer profile (matching by phone or email or name)
    orders.forEach((order) => {
      const phoneKey = order.customerPhone ? order.customerPhone.trim().toLowerCase() : '';
      const emailKey = order.customerEmail ? order.customerEmail.trim().toLowerCase() : '';
      const nameKey = order.customerName ? order.customerName.trim().toLowerCase() : '';

      const matchKey = phoneKey || emailKey || nameKey;
      if (!matchKey) return;

      let profile = customerMap.get(phoneKey) || (emailKey ? customerMap.get(emailKey) : undefined) || customerMap.get(nameKey);

      if (!profile) {
        profile = {
          id: `crm-${matchKey.replace(/[^a-z0-9]/g, '')}`,
          name: order.customerName || 'Guest Customer',
          phone: order.customerPhone || '',
          email: order.customerEmail,
          primaryAddress: order.deliveryAddress,
          primaryArea: order.area,
          totalOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0,
          firstOrderDate: order.createdAt,
          lastOrderDate: order.createdAt,
          customerTier: 'new',
          isRegisteredAccount: false,
          orders: [],
        };
        customerMap.set(matchKey, profile);
      }

      // Add order
      profile.orders.push(order);
      profile.totalOrders += 1;
      profile.totalSpent += (order.total || 0);

      // Update dates
      if (new Date(order.createdAt) < new Date(profile.firstOrderDate)) {
        profile.firstOrderDate = order.createdAt;
      }
      if (new Date(order.createdAt) > new Date(profile.lastOrderDate)) {
        profile.lastOrderDate = order.createdAt;
        if (order.deliveryAddress) profile.primaryAddress = order.deliveryAddress;
        if (order.area) profile.primaryArea = order.area;
      }
    });

    // 3. Compute AOV, favorite dishes, and customer tiers
    const list = Array.from(customerMap.values()).map((p) => {
      const aov = p.totalOrders > 0 ? Math.round(p.totalSpent / p.totalOrders) : 0;
      
      // Determine Customer Tier
      let tier: 'vip' | 'regular' | 'new' | 'guest' = 'new';
      if (p.totalSpent >= 6000 || p.totalOrders >= 5) {
        tier = 'vip';
      } else if (p.totalOrders >= 2 || p.totalSpent >= 2500) {
        tier = 'regular';
      } else if (p.isRegisteredAccount) {
        tier = 'new';
      } else {
        tier = 'guest';
      }

      // Compute favorite items
      const dishCountMap: Record<string, number> = {};
      p.orders.forEach((ord) => {
        ord.items.forEach((it) => {
          dishCountMap[it.name] = (dishCountMap[it.name] || 0) + it.quantity;
        });
      });
      const favoriteItems = Object.entries(dishCountMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return {
        ...p,
        averageOrderValue: aov,
        customerTier: tier,
        favoriteItems,
      };
    });

    return list;
  }, [orders]);

  // Location-wise orders aggregation & analytics across all areas
  const areaBreakdown = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number; customers: Set<string> }> = {};

    orders.forEach((ord) => {
      const area = (ord.area || ord.deliveryAddress || 'North Nazimabad').trim();
      if (!map[area]) {
        map[area] = { name: area, count: 0, revenue: 0, customers: new Set() };
      }
      map[area].count += 1;
      map[area].revenue += ord.total || 0;
      const custKey = (ord.customerPhone || ord.customerEmail || ord.customerName || '').toLowerCase().trim();
      if (custKey) {
        map[area].customers.add(custKey);
      }
    });

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [orders]);

  // Filtered and Sorted Profiles
  const filteredProfiles = useMemo(() => {
    return customerProfiles
      .filter((p) => {
        // Area / Location filter
        if (selectedAreaFilter !== 'all') {
          const areaQuery = selectedAreaFilter.toLowerCase();
          const primaryAreaMatch = p.primaryArea?.toLowerCase().includes(areaQuery);
          const orderAreaMatch = p.orders.some(
            (o) =>
              (o.area && o.area.toLowerCase().includes(areaQuery)) ||
              (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(areaQuery))
          );
          if (!primaryAreaMatch && !orderAreaMatch) return false;
        }

        // Tier filter
        if (tierFilter === 'vip' && p.customerTier !== 'vip') return false;
        if (tierFilter === 'regular' && p.customerTier !== 'regular') return false;
        if (tierFilter === 'new' && p.customerTier !== 'new') return false;
        if (tierFilter === 'registered' && !p.isRegisteredAccount) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchPhone = p.phone.toLowerCase().includes(q);
          const matchEmail = p.email ? p.email.toLowerCase().includes(q) : false;
          const matchAddress = p.primaryAddress ? p.primaryAddress.toLowerCase().includes(q) : false;
          const matchArea = p.primaryArea ? p.primaryArea.toLowerCase().includes(q) : false;
          return matchName || matchPhone || matchEmail || matchAddress || matchArea;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'spent') return b.totalSpent - a.totalSpent;
        if (sortBy === 'orders') return b.totalOrders - a.totalOrders;
        if (sortBy === 'recent') return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
        return a.name.localeCompare(b.name);
      });
  }, [customerProfiles, selectedAreaFilter, tierFilter, sortBy, searchQuery]);

  // Active Area Metrics
  const currentAreaStats = useMemo(() => {
    if (selectedAreaFilter === 'all') {
      const rev = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      return {
        label: 'All Karachi Areas',
        totalOrders: orders.length,
        totalRevenue: rev,
        customerCount: customerProfiles.length,
        aov: orders.length > 0 ? Math.round(rev / orders.length) : 0,
      };
    }
    const matchingOrders = orders.filter((o) => {
      const a = (o.area || o.deliveryAddress || '').toLowerCase();
      return a.includes(selectedAreaFilter.toLowerCase());
    });
    const uniqueCust = new Set(
      matchingOrders
        .map((o) => (o.customerPhone || o.customerEmail || o.customerName || '').toLowerCase().trim())
        .filter(Boolean)
    );
    const rev = matchingOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    return {
      label: selectedAreaFilter,
      totalOrders: matchingOrders.length,
      totalRevenue: rev,
      customerCount: uniqueCust.size,
      aov: matchingOrders.length > 0 ? Math.round(rev / matchingOrders.length) : 0,
    };
  }, [orders, customerProfiles, selectedAreaFilter]);

  // Overall CRM metrics
  const totalCustomers = customerProfiles.length;
  const vipCount = customerProfiles.filter((p) => p.customerTier === 'vip').length;
  const totalLtv = customerProfiles.reduce((sum, p) => sum + p.totalSpent, 0);
  const avgOrdersPerCustomer = totalCustomers > 0 ? (orders.length / totalCustomers).toFixed(1) : '0';

  const handleOpenCustomerDetail = (profile: CustomerCrmProfile) => {
    setSelectedCustomer(profile);
    setCrmNoteInput(profile.notes || '');
    setIsEditingNote(false);
  };

  const handleSaveCrmNote = () => {
    if (!selectedCustomer) return;
    const updated = { ...selectedCustomer, notes: crmNoteInput };
    setSelectedCustomer(updated);
    setIsEditingNote(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header Strip */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-heading font-black text-white">
                Customer &amp; User Database
              </h2>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                CRM Directory
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Explore everyone's previous order history, total spending, contact information, favorite dishes, and delivery addresses in Karachi.
            </p>
          </div>
        </div>

        {/* Quick Summary Pill Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-right">
            <span className="text-[10px] text-neutral-400 block">Total Customers</span>
            <span className="text-sm font-black font-mono text-white">{totalCustomers}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-right">
            <span className="text-[10px] text-amber-400 block flex items-center justify-end gap-1">
              <Crown className="w-3 h-3 text-amber-400" />
              VIP Loyalists
            </span>
            <span className="text-sm font-black font-mono text-amber-400">{vipCount}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-right">
            <span className="text-[10px] text-emerald-400 block">Total Customer Spend</span>
            <span className="text-sm font-black font-mono text-emerald-400">Rs. {totalLtv.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Location-Wise Order Volume & Delivery Area Filter HUD */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Location-Wise Order Volume &amp; Area Filter</span>
                <span className="text-[10px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.2 rounded-full font-bold uppercase">
                  Karachi Central &amp; North
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Filter customer accounts and analyze order density across specific Karachi neighborhoods.
              </p>
            </div>
          </div>

          {/* Area Dropdown Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-[11px] text-neutral-400 font-medium whitespace-nowrap">Area Filter:</label>
            <select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="bg-neutral-950 border border-neutral-750 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none transition-colors"
            >
              <option value="all">📍 All Karachi Areas ({orders.length} orders)</option>
              {areaBreakdown.map((ab) => (
                <option key={ab.name} value={ab.name}>
                  {ab.name} — {ab.count} orders (Rs. {ab.revenue.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Area Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedAreaFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedAreaFilter === 'all'
                ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <span>All Karachi</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedAreaFilter === 'all' ? 'bg-neutral-950 text-amber-400' : 'bg-neutral-900 text-neutral-400'}`}>
              {orders.length}
            </span>
          </button>

          {/* Top Presets */}
          {[
            { label: 'North Nazimabad', query: 'North Nazimabad' },
            { label: 'Buffer Zone', query: 'Buffer Zone' },
            { label: 'Shadman Town', query: 'Shadman' },
            { label: 'Federal B Area', query: 'Federal B Area' },
            { label: 'Gulshan-e-Iqbal', query: 'Gulshan' },
            { label: 'Nazimabad', query: 'Nazimabad' },
          ].map((preset) => {
            const count = orders.filter((o) => (o.area || o.deliveryAddress || '').toLowerCase().includes(preset.query.toLowerCase())).length;
            const isSelected = selectedAreaFilter.toLowerCase() === preset.query.toLowerCase();
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSelectedAreaFilter(isSelected ? 'all' : preset.query)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
                    : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <span>{preset.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-neutral-950 text-amber-400' : 'bg-neutral-900 text-neutral-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Area Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-neutral-800/80">
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850">
            <span className="text-[10.5px] text-neutral-400 block">Orders ({currentAreaStats.label})</span>
            <span className="text-xl font-black font-mono text-white mt-0.5 block">
              {currentAreaStats.totalOrders}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850">
            <span className="text-[10.5px] text-emerald-400 block">Area Revenue</span>
            <span className="text-xl font-black font-mono text-emerald-400 mt-0.5 block">
              Rs. {currentAreaStats.totalRevenue.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850">
            <span className="text-[10.5px] text-amber-400 block">Unique Customers</span>
            <span className="text-xl font-black font-mono text-amber-400 mt-0.5 block">
              {currentAreaStats.customerCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850">
            <span className="text-[10.5px] text-blue-400 block">Average Ticket (AOV)</span>
            <span className="text-xl font-black font-mono text-blue-400 mt-0.5 block">
              Rs. {currentAreaStats.aov.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, phone, email, area, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Tier Filters & Sort dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 font-bold">
            <button
              type="button"
              onClick={() => setTierFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                tierFilter === 'all' ? 'bg-amber-500 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              All ({customerProfiles.length})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('vip')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                tierFilter === 'vip' ? 'bg-amber-500 text-neutral-950 font-black' : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <Crown className="w-3 h-3" />
              <span>VIP ({vipCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('regular')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                tierFilter === 'regular' ? 'bg-amber-500 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Regulars
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('registered')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                tierFilter === 'registered' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>Accounts</span>
            </button>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1.5 rounded-xl border border-neutral-800 text-neutral-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="spent">Sort by Highest Spend</option>
              <option value="orders">Sort by Most Orders</option>
              <option value="recent">Sort by Most Recent</option>
              <option value="name">Sort by Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Contact &amp; Location</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4 text-right">Total Spent</th>
                <th className="py-3 px-4 text-right">Avg Basket</th>
                <th className="py-3 px-4">Last Order</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredProfiles.map((customer) => {
                const initials = customer.name
                  .split(' ')
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'BG';

                return (
                  <tr
                    key={customer.id}
                    onClick={() => handleOpenCustomerDetail(customer)}
                    className="hover:bg-neutral-850/60 transition-colors cursor-pointer group"
                  >
                    {/* Name & Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold font-mono text-xs shrink-0 ${
                            customer.customerTier === 'vip'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                              : customer.isRegisteredAccount
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                          }`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
                              {customer.name}
                            </span>
                            {customer.customerTier === 'vip' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5" />
                                VIP
                              </span>
                            )}
                            {customer.isRegisteredAccount && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                Registered
                              </span>
                            )}
                          </div>
                          {customer.email && (
                            <span className="text-[11px] text-neutral-400 block truncate max-w-[200px]">
                              {customer.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact & Location */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-neutral-200 font-mono">
                          <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{customer.phone || 'No phone'}</span>
                        </div>
                        {customer.primaryArea && (
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 truncate max-w-[220px]">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">{customer.primaryArea}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Total Orders */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-sm text-white px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800">
                        {customer.totalOrders}
                      </span>
                    </td>

                    {/* Total Spent */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        Rs. {customer.totalSpent.toLocaleString()}
                      </span>
                    </td>

                    {/* Average Basket */}
                    <td className="py-3.5 px-4 text-right font-mono text-neutral-300">
                      Rs. {customer.averageOrderValue.toLocaleString()}
                    </td>

                    {/* Last Order Date */}
                    <td className="py-3.5 px-4 text-neutral-400 font-mono text-[11px]">
                      {new Date(customer.lastOrderDate).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCustomerDetail(customer);
                        }}
                        className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-amber-400 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Orders</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-neutral-500 space-y-2">
                    <Users className="w-10 h-10 mx-auto opacity-30 text-amber-400" />
                    <p className="text-sm font-bold text-white">No customers found</p>
                    <p className="text-xs text-neutral-400">Try adjusting your search query or filter chip.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= CUSTOMER PROFILE & FULL ORDER HISTORY MODAL ================= */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header Strip */}
            <div className="p-5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold font-mono text-base ${
                    selectedCustomer.customerTier === 'vip'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                      : 'bg-neutral-800 text-white'
                  }`}
                >
                  {selectedCustomer.name
                    .split(' ')
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'BG'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{selectedCustomer.name}</h3>
                    {selectedCustomer.customerTier === 'vip' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        VIP CUSTOMER
                      </span>
                    )}
                    {selectedCustomer.isRegisteredAccount && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Registered Member
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Customer ID: <span className="font-mono text-neutral-300">{selectedCustomer.id}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedCustomer.phone && (
                  <a
                    href={`https://wa.me/${selectedCustomer.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Top Stats Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Total Orders</span>
                  <span className="text-lg font-black font-mono text-white">{selectedCustomer.totalOrders}</span>
                  <span className="text-[10px] text-neutral-500 block">lifetime orders</span>
                </div>
                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-emerald-400 block uppercase font-bold">Total Spend</span>
                  <span className="text-lg font-black font-mono text-emerald-400">Rs. {selectedCustomer.totalSpent.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-500 block">gross revenue</span>
                </div>
                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-amber-400 block uppercase font-bold">Avg Order Value</span>
                  <span className="text-lg font-black font-mono text-amber-400">Rs. {selectedCustomer.averageOrderValue.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-500 block">per basket</span>
                </div>
                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-blue-400 block uppercase font-bold">First Order</span>
                  <span className="text-xs font-bold font-mono text-neutral-200">
                    {new Date(selectedCustomer.firstOrderDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-[10px] text-neutral-500 block">customer tenure</span>
                </div>
              </div>

              {/* Contact & Primary Delivery Destination */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Primary Delivery Destination &amp; Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <span className="text-neutral-500 text-[10px] block">Address:</span>
                    <p className="font-bold text-white flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{selectedCustomer.primaryAddress || 'No address saved'}</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-neutral-500 text-[10px] block">Delivery Area / Zone:</span>
                    <p className="font-bold text-amber-400">
                      {selectedCustomer.primaryArea || 'Karachi'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Favorite Dishes */}
              {selectedCustomer.favoriteItems && selectedCustomer.favoriteItems.length > 0 && (
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Most Frequent Cravings &amp; Favorite Dishes
                  </h4>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedCustomer.favoriteItems.map((fav) => (
                      <div
                        key={fav.name}
                        className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2"
                      >
                        <span className="font-bold text-white">{fav.name}</span>
                        <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded">
                          {fav.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Order History Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    <span>Complete Order History ({selectedCustomer.orders.length} orders)</span>
                  </h4>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    All-Time Orders
                  </span>
                </div>

                <div className="space-y-2.5">
                  {selectedCustomer.orders
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm">{ord.id}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                                ord.status === 'delivered'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : ord.status === 'cancelled'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {ord.status.replace('_', ' ')}
                            </span>
                            <span className="text-neutral-500 font-mono text-[11px]">
                              {new Date(ord.createdAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-black text-sm text-amber-400">
                              Rs. {ord.total.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-neutral-500 uppercase block font-mono">
                              {ord.payment?.method}
                            </span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-850 space-y-1">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span className="text-neutral-200">
                                <strong className="text-amber-400">{it.quantity}x</strong> {it.name}
                                {it.selectedVariant ? ` (${it.selectedVariant})` : ''}
                              </span>
                              <span className="font-mono text-neutral-400">Rs. {it.itemTotal.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        {/* Delivery Address & Area */}
                        {ord.deliveryAddress && (
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 pt-1">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">{ord.deliveryAddress}</span>
                            {ord.area && <span className="text-amber-400 font-bold">· {ord.area}</span>}
                          </div>
                        )}
                      </div>
                    ))}

                  {selectedCustomer.orders.length === 0 && (
                    <div className="py-10 text-center text-neutral-500 text-xs">
                      No order records found for this registered account yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500">
                Customer profile synced with local POS database
              </span>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
