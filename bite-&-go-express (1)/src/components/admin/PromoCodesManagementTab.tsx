import React, { useState } from 'react';
import { PromoCode } from '../../types';
import { StorageService } from '../../utils/storage';
import { ApiService } from '../../utils/api';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  Calendar,
  Moon,
  Sparkles,
  Percent,
  Banknote,
  Users,
  Copy,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface PromoCodesManagementTabProps {
  onRefreshData?: () => void;
}

export const PromoCodesManagementTab: React.FC<PromoCodesManagementTabProps> = ({ onRefreshData }) => {
  const [promos, setPromos] = useState<PromoCode[]>(() => StorageService.getPromoCodes());
  const [isEditing, setIsEditing] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(200);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | undefined>(undefined);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(1000);
  const [hasUsageLimit, setHasUsageLimit] = useState(false);
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [hasDateRange, setHasDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timeWindowEnabled, setTimeWindowEnabled] = useState(false);
  const [validStartHour, setValidStartHour] = useState<number>(23); // 11 PM
  const [validEndHour, setValidEndHour] = useState<number>(4); // 4 AM
  const [daysFilterEnabled, setDaysFilterEnabled] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 5, 6]); // Fri, Sat, Sun
  const [isActive, setIsActive] = useState(true);
  const [requireLogin, setRequireLogin] = useState(false);
  const [singleUsePerCustomer, setSingleUsePerCustomer] = useState(false);
  const [showPromoAtCheckout, setShowPromoAtCheckout] = useState<boolean>(() => {
    try {
      const s = StorageService.getSettings();
      return s.showPromoCodeAtCheckout !== false;
    } catch {
      return true;
    }
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleCheckoutVisibility = async () => {
    const nextVal = !showPromoAtCheckout;
    setShowPromoAtCheckout(nextVal);
    const currentSettings = StorageService.getSettings();
    const updated = {
      ...currentSettings,
      showPromoCodeAtCheckout: nextVal,
    };
    await StorageService.saveSettings(updated);
    try {
      await ApiService.updateSettings(updated);
    } catch {}
    showToast(`Promo code input is now ${nextVal ? 'VISIBLE' : 'HIDDEN'} at checkout.`);
    if (onRefreshData) onRefreshData();
  };

  const handleOpenNew = () => {
    setEditingPromoId(null);
    setCode('');
    setTitle('');
    setDescription('');
    setDiscountType('fixed');
    setDiscountValue(200);
    setMaxDiscountAmount(undefined);
    setMinOrderAmount(1000);
    setHasUsageLimit(false);
    setUsageLimit(100);
    setHasDateRange(false);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setTimeWindowEnabled(false);
    setValidStartHour(23);
    setValidEndHour(4);
    setDaysFilterEnabled(false);
    setSelectedDays([0, 5, 6]);
    setIsActive(true);
    setRequireLogin(false);
    setSingleUsePerCustomer(false);
    setIsEditing(true);
  };

  const handleOpenEdit = (p: PromoCode) => {
    setEditingPromoId(p.id);
    setCode(p.code);
    setTitle(p.title);
    setDescription(p.description);
    setDiscountType(p.discountType);
    setDiscountValue(p.discountValue);
    setMaxDiscountAmount(p.maxDiscountAmount);
    setMinOrderAmount(p.minOrderAmount);
    setHasUsageLimit(typeof p.usageLimit === 'number');
    setUsageLimit(p.usageLimit || 100);
    setHasDateRange(!!(p.startDate || p.endDate));
    setStartDate(p.startDate || '');
    setEndDate(p.endDate || '');
    setTimeWindowEnabled(!!p.timeWindowEnabled);
    setValidStartHour(typeof p.validStartHour === 'number' ? p.validStartHour : 23);
    setValidEndHour(typeof p.validEndHour === 'number' ? p.validEndHour : 4);
    setDaysFilterEnabled(!!(p.validDaysOfWeek && p.validDaysOfWeek.length > 0));
    setSelectedDays(p.validDaysOfWeek || [0, 5, 6]);
    setIsActive(p.isActive);
    setRequireLogin(!!p.requireLogin);
    setSingleUsePerCustomer(!!p.singleUsePerCustomer);
    setIsEditing(true);
  };

  const handleToggleDay = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const handleSavePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      showToast('Please enter a promo code');
      return;
    }
    const cleanCode = code.trim().toUpperCase();

    const promoPayload: Omit<PromoCode, 'id' | 'timesUsed' | 'createdAt'> = {
      code: cleanCode,
      title: title.trim() || `${cleanCode} Voucher`,
      description: description.trim() || `${discountType === 'fixed' ? `Rs. ${discountValue}` : `${discountValue}%`} off on orders above Rs. ${minOrderAmount.toLocaleString()}`,
      discountType,
      discountValue,
      maxDiscountAmount: discountType === 'percentage' && maxDiscountAmount ? maxDiscountAmount : undefined,
      minOrderAmount,
      usageLimit: hasUsageLimit ? usageLimit : undefined,
      startDate: hasDateRange && startDate ? startDate : undefined,
      endDate: hasDateRange && endDate ? endDate : undefined,
      timeWindowEnabled,
      validStartHour: timeWindowEnabled ? validStartHour : undefined,
      validEndHour: timeWindowEnabled ? validEndHour : undefined,
      validDaysOfWeek: daysFilterEnabled && selectedDays.length > 0 ? selectedDays : undefined,
      isActive,
      requireLogin,
      singleUsePerCustomer,
    };

    if (editingPromoId) {
      StorageService.updatePromoCode(editingPromoId, promoPayload);
      showToast(`Promo code "${cleanCode}" updated successfully!`);
    } else {
      StorageService.createPromoCode(promoPayload);
      showToast(`Promo code "${cleanCode}" created and active on checkout!`);
    }

    setPromos(StorageService.getPromoCodes());
    setIsEditing(false);
    if (onRefreshData) onRefreshData();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this promo code?')) {
      StorageService.deletePromoCode(id);
      setPromos(StorageService.getPromoCodes());
      showToast('Promo code deleted.');
      if (onRefreshData) onRefreshData();
    }
  };

  const handleToggleActive = (p: PromoCode) => {
    StorageService.updatePromoCode(p.id, { isActive: !p.isActive });
    setPromos(StorageService.getPromoCodes());
    showToast(`Promo code "${p.code}" is now ${!p.isActive ? 'Active' : 'Disabled'}.`);
    if (onRefreshData) onRefreshData();
  };

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:00 ${ampm}`;
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-neutral-900 to-neutral-950 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-black text-white flex items-center gap-2">
                <span>Smart Promo Code &amp; Discount Engine</span>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  CHECKOUT INTEGRATED
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Create promotional discount codes for checkout with redemption limits, date validity (for few days), and time-of-day windows (Late Night 11 PM–4 AM, Lunch, or Weekends).
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Promo Code</span>
        </button>
      </div>

      {/* Checkout Display Visibility Banner */}
      <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${showPromoAtCheckout ? 'bg-amber-500/15 text-amber-400' : 'bg-neutral-850 text-neutral-500'}`}>
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span>Show Promo Code Box at Checkout</span>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${showPromoAtCheckout ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-red-500/15 text-red-400 border border-red-500/25'}`}>
                {showPromoAtCheckout ? 'VISIBLE AT CHECKOUT' : 'HIDDEN FROM CHECKOUT'}
              </span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {showPromoAtCheckout
                ? 'Customers can enter promotional vouchers and discounts on the storefront checkout modal.'
                : 'The promo code input box is completely hidden from customers on the checkout modal.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleCheckoutVisibility}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer shrink-0 ${
            showPromoAtCheckout
              ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
          }`}
        >
          {showPromoAtCheckout ? 'Visible (Click to Hide)' : 'Hidden (Click to Show)'}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-neutral-400 text-[11px] block">Active Promo Codes</span>
          <span className="text-2xl font-black text-emerald-400 tabular-nums">
            {promos.filter((p) => p.isActive).length}
          </span>
          <span className="text-[10px] text-neutral-400 block mt-0.5">Ready for checkout</span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-neutral-400 text-[11px] block">Total Redemptions</span>
          <span className="text-2xl font-black text-amber-400 tabular-nums">
            {promos.reduce((acc, p) => acc + (p.timesUsed || 0), 0)}
          </span>
          <span className="text-[10px] text-neutral-400 block mt-0.5">Orders with voucher</span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-neutral-400 text-[11px] block">Night Only Promos</span>
          <span className="text-2xl font-black text-purple-400 tabular-nums">
            {promos.filter((p) => p.timeWindowEnabled).length}
          </span>
          <span className="text-[10px] text-purple-300 block mt-0.5">11:00 PM — 04:00 AM</span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-neutral-400 text-[11px] block">Limited-Time Promos</span>
          <span className="text-2xl font-black text-blue-400 tabular-nums">
            {promos.filter((p) => p.startDate || p.endDate || p.usageLimit).length}
          </span>
          <span className="text-[10px] text-neutral-400 block mt-0.5">Date / Usage Capped</span>
        </div>
      </div>

      {/* Promos Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promos.map((p) => {
          const isLimitReached = typeof p.usageLimit === 'number' && p.timesUsed >= p.usageLimit;
          const today = new Date().toISOString().slice(0, 10);
          const isExpired = p.endDate && today > p.endDate;

          return (
            <div
              key={p.id}
              className={`p-4 rounded-2xl bg-neutral-950 border flex flex-col justify-between transition-all ${
                p.isActive && !isExpired && !isLimitReached
                  ? 'border-neutral-800 hover:border-amber-500/40 shadow-sm'
                  : 'border-neutral-900 opacity-60'
              }`}
            >
              <div className="space-y-3">
                {/* Header Code & Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-400 font-mono font-black text-sm tracking-wider">
                        {p.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          !p.isActive
                            ? 'bg-neutral-800 text-neutral-400'
                            : isExpired
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : isLimitReached
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {!p.isActive
                          ? 'Disabled'
                          : isExpired
                          ? 'Expired'
                          : isLimitReached
                          ? 'Limit Reached'
                          : 'Active'}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-white mt-2">{p.title}</h3>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-base font-black text-emerald-400">
                      {p.discountType === 'fixed' ? `Rs. ${p.discountValue}` : `${p.discountValue}% OFF`}
                    </span>
                    {p.maxDiscountAmount && (
                      <span className="text-[10px] text-neutral-400 block font-mono">
                        Up to Rs. {p.maxDiscountAmount}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">{p.description}</p>

                {/* Rules & Eligibility Conditions */}
                <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-850 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-400">Min Order:</span>
                    <strong className="text-white font-mono">Rs. {p.minOrderAmount.toLocaleString()}</strong>
                  </div>

                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-400">Redemptions:</span>
                    <span className="font-mono">
                      <strong className="text-amber-400">{p.timesUsed}</strong>
                      {typeof p.usageLimit === 'number' ? ` / ${p.usageLimit} max` : ' (Unlimited)'}
                    </span>
                  </div>

                  {/* Night Window */}
                  {p.timeWindowEnabled && typeof p.validStartHour === 'number' && typeof p.validEndHour === 'number' && (
                    <div className="flex items-center justify-between text-purple-300 pt-1 border-t border-neutral-800">
                      <span className="flex items-center gap-1">
                        <Moon className="w-3 h-3 text-purple-400" />
                        <span>Night Window:</span>
                      </span>
                      <strong className="font-mono text-[10.5px]">
                        {formatHour(p.validStartHour)} — {formatHour(p.validEndHour)}
                      </strong>
                    </div>
                  )}

                  {/* Date Range */}
                  {(p.startDate || p.endDate) && (
                    <div className="flex items-center justify-between text-blue-300 pt-1 border-t border-neutral-800">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-400" />
                        <span>Valid Dates:</span>
                      </span>
                      <span className="font-mono text-[10.5px]">
                        {p.startDate ? p.startDate.slice(5) : 'Start'} &rarr; {p.endDate ? p.endDate.slice(5) : 'Ongoing'}
                      </span>
                    </div>
                  )}

                  {/* Days of week */}
                  {p.validDaysOfWeek && p.validDaysOfWeek.length > 0 && (
                    <div className="flex items-center justify-between text-neutral-300 pt-1 border-t border-neutral-800">
                      <span className="text-neutral-400">Active Days:</span>
                      <div className="flex items-center gap-1">
                        {p.validDaysOfWeek.map((d) => (
                          <span
                            key={d}
                            className="px-1.5 py-0.2 rounded bg-neutral-800 text-[9px] font-mono text-amber-400 font-bold"
                          >
                            {dayLabels[d]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Account Login & Single Use Restrictions */}
                  {(p.requireLogin || p.singleUsePerCustomer) && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-800 flex-wrap">
                      {p.requireLogin && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-[10px] text-blue-300 font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Login Required</span>
                        </span>
                      )}
                      {p.singleUsePerCustomer && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-300 font-semibold">
                          <Users className="w-3 h-3" />
                          <span>1 Use Per Customer</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 mt-3 border-t border-neutral-900 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(p)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                    p.isActive
                      ? 'border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900'
                      : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  }`}
                >
                  {p.isActive ? 'Deactivate' : 'Activate Code'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(p)}
                    className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
                    title="Edit Promo Code"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
                    title="Delete Promo Code"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT PROMO CODE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 text-xs max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-500">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingPromoId ? 'Edit Promo Code' : 'Create New Promo Code'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Set discount type, limits, night hours, and date validity.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                    Promo Code (Uppercase) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BITEGO or NIGHTOWL"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-amber-400 font-mono font-bold tracking-wider"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                    Display Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Late Night Fast-Food Cravings"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  Customer Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Get 20% off all orders above Rs. 1,200 between 11 PM and 4 AM."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                  Discount Configuration
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                      Discount Type
                    </label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full bg-neutral-900 border border-neutral-750 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="fixed">Fixed PKR (Rs. Off)</option>
                      <option value="percentage">Percentage (% Off)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                      {discountType === 'fixed' ? 'Discount Amount (Rs.)' : 'Discount Percentage (%)'} *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={discountType === 'percentage' ? 100 : 10000}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-neutral-900 border border-neutral-750 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                      Minimum Order (PKR) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-neutral-900 border border-neutral-750 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                {discountType === 'percentage' && (
                  <div>
                    <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                      Maximum Discount Cap in PKR (Optional)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 400 (leave blank for uncapped percentage)"
                      value={maxDiscountAmount ?? ''}
                      onChange={(e) =>
                        setMaxDiscountAmount(e.target.value ? parseInt(e.target.value, 10) : undefined)
                      }
                      className="w-full bg-neutral-900 border border-neutral-750 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                )}
              </div>

              {/* ================= TIME WINDOW (NIGHT HOURS) ================= */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                    <Moon className="w-3.5 h-3.5" />
                    <span>Time Window Restriction ("make it available at night etc.")</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={timeWindowEnabled}
                    onChange={(e) => setTimeWindowEnabled(e.target.checked)}
                    className="w-4 h-4 accent-purple-500 cursor-pointer"
                  />
                </div>

                {timeWindowEnabled && (
                  <div className="pt-2 border-t border-neutral-900 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setValidStartHour(23);
                          setValidEndHour(4);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold hover:bg-purple-500/25 cursor-pointer"
                      >
                        🌙 Preset: Late Night (11:00 PM — 04:00 AM)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setValidStartHour(12);
                          setValidEndHour(16);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-[10px] font-bold hover:bg-neutral-800 cursor-pointer"
                      >
                        ☀️ Preset: Lunch Rush (12 PM — 4 PM)
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[10.5px] text-neutral-400 block mb-1">Start Hour</label>
                        <select
                          value={validStartHour}
                          onChange={(e) => setValidStartHour(parseInt(e.target.value, 10))}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-white text-xs"
                        >
                          {Array.from({ length: 24 }).map((_, h) => (
                            <option key={h} value={h}>
                              {formatHour(h)} ({h}:00)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10.5px] text-neutral-400 block mb-1">End Hour</label>
                        <select
                          value={validEndHour}
                          onChange={(e) => setValidEndHour(parseInt(e.target.value, 10))}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-white text-xs"
                        >
                          {Array.from({ length: 24 }).map((_, h) => (
                            <option key={h} value={h}>
                              {formatHour(h)} ({h}:00)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ================= DATE LIMITS ("PROMO FOR FEW DAYS") ================= */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Date Limits ("put promo for few days")</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasDateRange}
                    onChange={(e) => setHasDateRange(e.target.checked)}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                </div>

                {hasDateRange && (
                  <div className="grid grid-cols-2 gap-3 pt-1 animate-in fade-in">
                    <div>
                      <label className="text-[10.5px] text-neutral-400 block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] text-neutral-400 block mb-1">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ================= USAGE LIMITS ================= */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Users className="w-3.5 h-3.5" />
                    <span>Total Redemption Usage Limit</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasUsageLimit}
                    onChange={(e) => setHasUsageLimit(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {hasUsageLimit && (
                  <div className="pt-1 animate-in fade-in">
                    <label className="text-[10.5px] text-neutral-400 block mb-1">
                      Max Total Customer Uses
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                    />
                  </div>
                )}
              </div>

              {/* ================= DAYS OF WEEK FILTER ================= */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Days of Week Restrictions (e.g. Weekends Only)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={daysFilterEnabled}
                    onChange={(e) => setDaysFilterEnabled(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                {daysFilterEnabled && (
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap animate-in fade-in">
                    {dayLabels.map((name, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleDay(idx)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedDays.includes(idx)
                            ? 'bg-amber-500 text-neutral-950 shadow-sm'
                            : 'bg-neutral-900 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Account & Single-Use Rules */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                  Customer Eligibility &amp; Abuse Prevention
                </span>

                {/* Require Login */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>Require Website Login</span>
                    </span>
                    <span className="text-[11px] text-neutral-400 block">
                      Only customers logged into an account can use this promo. Guest checkout is blocked.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireLogin}
                    onChange={(e) => setRequireLogin(e.target.checked)}
                    className="w-4 h-4 accent-blue-500 cursor-pointer shrink-0"
                  />
                </div>

                {/* Single Use Per Customer */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-900">
                  <div>
                    <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>Single Use Per Customer (Everyone Uses Once)</span>
                    </span>
                    <span className="text-[11px] text-neutral-400 block">
                      Each customer can only redeem this promo code once. Block repeat uses by same phone/email.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={singleUsePerCustomer}
                    onChange={(e) => setSingleUsePerCustomer(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer shrink-0"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div>
                  <span className="text-xs font-bold text-white block">Active on Checkout</span>
                  <span className="text-[11px] text-neutral-400">
                    Customers can type or select this voucher code on checkout.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{editingPromoId ? 'Save Changes' : 'Create Promo Code'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
