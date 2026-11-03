import React, { useState } from 'react';
import { PosPermissionsConfig, DEFAULT_POS_PERMISSIONS, StoreSettings, Category } from '../../types';
import {
  CreditCard,
  ShieldCheck,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  Flame,
  Sliders,
  DollarSign,
  Receipt,
  UtensilsCrossed,
  Layers,
  XCircle,
  Tag,
} from 'lucide-react';

interface PosEmployeePermissionsEditorProps {
  settings: StoreSettings;
  categories: Category[];
  onSavePermissions: (updatedPerms: PosPermissionsConfig) => Promise<void> | void;
  onRefreshData?: () => void;
}

export const PosEmployeePermissionsEditor: React.FC<PosEmployeePermissionsEditorProps> = ({
  settings,
  categories,
  onSavePermissions,
  onRefreshData,
}) => {
  const [perms, setPerms] = useState<PosPermissionsConfig>({
    ...DEFAULT_POS_PERMISSIONS,
    ...(settings.posPermissions || {}),
  });

  const [showPasscode, setShowPasscode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const handleToggle = (key: keyof PosPermissionsConfig) => {
    if (typeof perms[key] === 'boolean') {
      setPerms((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

  // Toggle hiding a category in employee portal (e.g. turning off grill category)
  const handleToggleCategoryVisibility = (catId: string) => {
    setPerms((prev) => {
      const currentHidden = prev.hiddenCategoryIdsForEmployees || [];
      const isHidden = currentHidden.includes(catId);
      const updatedHidden = isHidden
        ? currentHidden.filter((id) => id !== catId)
        : [...currentHidden, catId];

      return {
        ...prev,
        hiddenCategoryIdsForEmployees: updatedHidden,
      };
    });
  };

  const isGrillCategoryHidden = (perms.hiddenCategoryIdsForEmployees || []).includes('cat-smash');

  const handleSetGrillCategoryState = (turnOff: boolean) => {
    setPerms((prev) => {
      const currentHidden = prev.hiddenCategoryIdsForEmployees || [];
      const updatedHidden = turnOff
        ? Array.from(new Set([...currentHidden, 'cat-smash']))
        : currentHidden.filter((id) => id !== 'cat-smash');
      return {
        ...prev,
        hiddenCategoryIdsForEmployees: updatedHidden,
      };
    });
  };

  const handleShowAllCategories = () => {
    setPerms((prev) => ({
      ...prev,
      hiddenCategoryIdsForEmployees: [],
    }));
  };

  const applyPreset = (preset: 'standard' | 'strict' | 'kiosk') => {
    if (preset === 'standard') {
      setPerms({
        ...perms,
        canApplyDiscounts: true,
        canCustomPrice: true,
        canVoidOrders: true,
        canViewReports: true,
        canOpenCashDrawer: true,
        requireManagerPinForVoid: true,
        requireManagerPinForDiscount: false,
        allowSplitBill: true,
        allowCustomOrderItems: true,
        hiddenCategoryIdsForEmployees: [],
        hideOutOfStockItemsForEmployees: false,
      });
    } else if (preset === 'strict') {
      setPerms({
        ...perms,
        canApplyDiscounts: false,
        canCustomPrice: false,
        canVoidOrders: false,
        canViewReports: false,
        canOpenCashDrawer: false,
        requireManagerPinForVoid: true,
        requireManagerPinForDiscount: true,
        allowSplitBill: false,
        allowCustomOrderItems: false,
        hideOutOfStockItemsForEmployees: true,
      });
    } else if (preset === 'kiosk') {
      setPerms({
        ...perms,
        canApplyDiscounts: false,
        canCustomPrice: false,
        canVoidOrders: false,
        canViewReports: false,
        canOpenCashDrawer: false,
        requireManagerPinForVoid: true,
        allowSplitBill: false,
        allowCustomOrderItems: false,
        hideOutOfStockItemsForEmployees: true,
        hiddenCategoryIdsForEmployees: [],
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSavePermissions(perms);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
      if (onRefreshData) onRefreshData();
    } catch {
      alert('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset POS & Employee permissions to default settings?')) {
      setPerms(DEFAULT_POS_PERMISSIONS);
    }
  };

  const hiddenCount = perms.hiddenCategoryIdsForEmployees?.length || 0;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-blue-950/30 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-black text-white flex items-center gap-2">
              <span>Employee Portal &amp; POS Screen Customizer</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-bold">
                MANAGER HUD
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Control exactly what the employee portal sees, including turning off the grill category, hiding out of stock items, and locking cashier discounts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save POS Perms'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {savedToast && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Employee portal permissions saved successfully! Changes apply immediately.</span>
        </div>
      )}

      {/* Quick Role Presets */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>Quick Role Presets</span>
          </h4>
          <p className="text-[11px] text-neutral-400">
            Apply preconfigured authorization profiles for cashiers and counter workers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset('standard')}
            className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 text-xs font-semibold transition-colors"
          >
            Standard Cashier
          </button>
          <button
            type="button"
            onClick={() => applyPreset('strict')}
            className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 text-xs font-semibold transition-colors"
          >
            Strict (Manager PINs)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('kiosk')}
            className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 text-xs font-semibold transition-colors"
          >
            Self-Kiosk
          </button>
        </div>
      </div>

      {/* ================= SECTION 1: CATEGORY VISIBILITY CONTROLS ================= */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                1. Category Visibility in Employee Portal
              </h3>
              <p className="text-[11px] text-neutral-400">
                Turn specific menu categories on or off for employee screens (e.g. turn off Grill Category or Desserts).
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold bg-neutral-950 border border-neutral-800 px-2.5 py-1 rounded-lg text-neutral-300">
            {hiddenCount > 0 ? `⚠️ ${hiddenCount} Categories Hidden` : 'All Categories Visible'}
          </span>
        </div>

        {/* MASTER GRILL CATEGORY CONTROL CARD */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isGrillCategoryHidden
              ? 'bg-red-950/30 border-red-500/50 shadow-lg shadow-red-950/20'
              : 'bg-gradient-to-r from-neutral-950 via-neutral-950 to-blue-950/30 border-blue-500/40'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  isGrillCategoryHidden
                    ? 'bg-neutral-900 border-neutral-700 text-neutral-500'
                    : 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                }`}
              >
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-white">
                    Grill Category (Smash Patties &amp; Flat-Top Grill)
                  </h4>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isGrillCategoryHidden
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {isGrillCategoryHidden ? '🚫 TURNED OFF FOR STAFF' : '🔥 ACTIVE & SIZZLING'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  {isGrillCategoryHidden
                    ? 'The grill category is currently DISABLED on employee portal. Line cashiers cannot punch smash burger orders.'
                    : 'The grill category is currently VISIBLE on employee portal. Cashiers can ring up all smash burgers.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSetGrillCategoryState(!isGrillCategoryHidden)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer ${
                  isGrillCategoryHidden
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>
                  {isGrillCategoryHidden ? 'Turn ON Grill Category' : 'Turn OFF Grill Category'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* QUICK PRESET BUTTONS */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-neutral-400 font-semibold mr-1">Quick Presets:</span>
          <button
            type="button"
            onClick={() => handleSetGrillCategoryState(true)}
            className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white transition-colors"
          >
            🚫 Turn Off Grill Only
          </button>
          <button
            type="button"
            onClick={handleShowAllCategories}
            className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white transition-colors"
          >
            ✨ Show All Categories
          </button>
          <button
            type="button"
            onClick={() => {
              setPerms((prev) => ({
                ...prev,
                hiddenCategoryIdsForEmployees: ['cat-smash', 'cat-crispy'],
              }));
            }}
            className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white transition-colors"
          >
            🌙 Late Night (Fries &amp; Drinks Only)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const isHidden = perms.hiddenCategoryIdsForEmployees?.includes(cat.id);
            const isGrillCategory = cat.id === 'cat-smash' || cat.slug.includes('smash') || cat.name.toLowerCase().includes('grill') || cat.name.toLowerCase().includes('smash');

            return (
              <div
                key={cat.id}
                onClick={() => handleToggleCategoryVisibility(cat.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  isHidden
                    ? 'bg-neutral-950/60 border-neutral-850 opacity-60 hover:opacity-100'
                    : 'bg-neutral-950 border-blue-500/40 shadow-sm hover:border-blue-500'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isHidden
                        ? 'bg-neutral-900 text-neutral-600'
                        : isGrillCategory
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {isGrillCategory ? <Flame className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${isHidden ? 'text-neutral-500 line-through' : 'text-white'}`}>
                      {cat.name}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      {isHidden ? 'Turned OFF for staff' : 'Visible on POS'}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                    !isHidden ? 'bg-blue-600' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      !isHidden ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= SECTION 2: OPERATIONAL AUTHORIZATIONS ================= */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="pb-3 border-b border-neutral-800 flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-sm font-bold text-white">2. Cashier &amp; Register Authorizations</h3>
            <p className="text-[11px] text-neutral-400">
              Control permissions for discounts, order voids, custom off-menu pricing, and reports.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Can Apply Discounts */}
          <div
            onClick={() => handleToggle('canApplyDiscounts')}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
              perms.canApplyDiscounts
                ? 'bg-neutral-950 border-blue-500/40'
                : 'bg-neutral-950/60 border-neutral-850 opacity-60'
            }`}
          >
            <div>
              <h4 className="text-xs font-bold text-white">Allow Cashier Discounts</h4>
              <p className="text-[11px] text-neutral-400">
                Staff can apply 5%, 10%, 15% discount buttons on the active ticket.
              </p>
            </div>
            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${perms.canApplyDiscounts ? 'bg-blue-600' : 'bg-neutral-800'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${perms.canApplyDiscounts ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* Can Void Orders */}
          <div
            onClick={() => handleToggle('canVoidOrders')}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
              perms.canVoidOrders
                ? 'bg-neutral-950 border-blue-500/40'
                : 'bg-neutral-950/60 border-neutral-850 opacity-60'
            }`}
          >
            <div>
              <h4 className="text-xs font-bold text-white">Allow Voiding Active Tickets</h4>
              <p className="text-[11px] text-neutral-400">
                Staff can clear or cancel open tickets before checkout.
              </p>
            </div>
            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${perms.canVoidOrders ? 'bg-blue-600' : 'bg-neutral-800'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${perms.canVoidOrders ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* Require Manager PIN for Void */}
          <div
            onClick={() => handleToggle('requireManagerPinForVoid')}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
              perms.requireManagerPinForVoid
                ? 'bg-neutral-950 border-amber-500/40'
                : 'bg-neutral-950/60 border-neutral-850 opacity-60'
            }`}
          >
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Require Supervisor PIN for Void</span>
              </h4>
              <p className="text-[11px] text-neutral-400">
                Prompts for 4-digit manager passcode before voiding any ticket.
              </p>
            </div>
            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${perms.requireManagerPinForVoid ? 'bg-amber-500' : 'bg-neutral-800'}`}>
              <div className={`w-4 h-4 rounded-full bg-neutral-950 transition-transform ${perms.requireManagerPinForVoid ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* Allow Custom Off-Menu Items */}
          <div
            onClick={() => handleToggle('allowCustomOrderItems')}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
              perms.allowCustomOrderItems
                ? 'bg-neutral-950 border-blue-500/40'
                : 'bg-neutral-950/60 border-neutral-850 opacity-60'
            }`}
          >
            <div>
              <h4 className="text-xs font-bold text-white">Allow Custom Off-Menu Items</h4>
              <p className="text-[11px] text-neutral-400">
                Cashiers can add off-menu items with custom rupee pricing.
              </p>
            </div>
            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${perms.allowCustomOrderItems ? 'bg-blue-600' : 'bg-neutral-800'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${perms.allowCustomOrderItems ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* Hide Out of Stock from POS */}
          <div
            onClick={() => handleToggle('hideOutOfStockItemsForEmployees')}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
              perms.hideOutOfStockItemsForEmployees
                ? 'bg-neutral-950 border-blue-500/40'
                : 'bg-neutral-950/60 border-neutral-850 opacity-60'
            }`}
          >
            <div>
              <h4 className="text-xs font-bold text-white">Hide 86'd Out of Stock Items</h4>
              <p className="text-[11px] text-neutral-400">
                Completely removes 0-inventory items from cashier grid view.
              </p>
            </div>
            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${perms.hideOutOfStockItemsForEmployees ? 'bg-blue-600' : 'bg-neutral-800'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${perms.hideOutOfStockItemsForEmployees ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>

          {/* Can View Shift Reports */}
          <div
            onClick={() => handleToggle('canViewReports')}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
              perms.canViewReports
                ? 'bg-neutral-950 border-blue-500/40'
                : 'bg-neutral-950/60 border-neutral-850 opacity-60'
            }`}
          >
            <div>
              <h4 className="text-xs font-bold text-white">Allow Daily Z-Report &amp; Register Summary</h4>
              <p className="text-[11px] text-neutral-400">
                Staff can view cash drawer balance and print end-of-shift Z-Report.
              </p>
            </div>
            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${perms.canViewReports ? 'bg-blue-600' : 'bg-neutral-800'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${perms.canViewReports ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 3: SUPERVISOR PIN & TAX SETTINGS ================= */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="pb-3 border-b border-neutral-800 flex items-center gap-2.5">
          <KeyRound className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-white">3. Shift Supervisor Passcode &amp; Tax</h3>
            <p className="text-[11px] text-neutral-400">
              Passcode used by shift managers to authorize discounts and order voids on the register.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Supervisor Passcode Field */}
          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">
              Supervisor Passcode (PIN):
            </label>
            <div className="relative">
              <input
                type={showPasscode ? 'text' : 'password'}
                maxLength={8}
                value={perms.supervisorPasscode || '1234'}
                onChange={(e) => setPerms({ ...perms, supervisorPasscode: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="text-[10px] text-neutral-500 mt-0.5 block">Standard default is 1234</span>
          </div>

          {/* Sales Tax Rate */}
          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">
              Sindh Sales Tax (SST %):
            </label>
            <input
              type="number"
              min={0}
              max={25}
              value={perms.defaultTaxRatePercent || 0}
              onChange={(e) => setPerms({ ...perms, defaultTaxRatePercent: parseFloat(e.target.value) || 0 })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
            <span className="text-[10px] text-neutral-500 mt-0.5 block">0% if tax is included in menu price</span>
          </div>

          {/* Custom Portal Title */}
          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">
              Employee Portal Title:
            </label>
            <input
              type="text"
              value={perms.employeePortalTitle || 'Express Cashier POS'}
              onChange={(e) => setPerms({ ...perms, employeePortalTitle: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
            />
            <span className="text-[10px] text-neutral-500 mt-0.5 block">Header branding for cash register</span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save POS & Employee Permissions'}</span>
        </button>
      </div>
    </div>
  );
};
