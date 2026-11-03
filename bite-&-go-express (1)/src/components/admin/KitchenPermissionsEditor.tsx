import React, { useState } from 'react';
import { KitchenPermissionsConfig, DEFAULT_KITCHEN_PERMISSIONS, StoreSettings } from '../../types';
import {
  ChefHat,
  ShieldCheck,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Clock,
  Flame,
  Bike,
  XCircle,
  Eye,
  EyeOff,
  Phone,
  DollarSign,
  PackageCheck,
  Ticket,
  Sliders,
  Check,
} from 'lucide-react';

interface KitchenPermissionsEditorProps {
  settings: StoreSettings;
  onSavePermissions: (updatedPerms: KitchenPermissionsConfig) => Promise<void>;
  onRefreshData?: () => void;
}

export const KitchenPermissionsEditor: React.FC<KitchenPermissionsEditorProps> = ({
  settings,
  onSavePermissions,
  onRefreshData,
}) => {
  const [perms, setPerms] = useState<KitchenPermissionsConfig>(
    settings.kitchenPermissions || DEFAULT_KITCHEN_PERMISSIONS
  );
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const handleToggle = (key: keyof KitchenPermissionsConfig) => {
    if (typeof perms[key] === 'boolean') {
      setPerms((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

  const applyPreset = (preset: 'master' | 'standard' | 'kds_only') => {
    if (preset === 'master') {
      setPerms({
        canAcceptOrders: true,
        canMarkReady: true,
        canDelayOrders: true,
        canDeclineOrders: true,
        canManageTickets: true,
        canReopenTickets: true,
        canViewCustomerPhone: true,
        canViewOrderPrices: true,
        canToggleStockFromKitchen: true,
        requireSupervisorPasscodeForDecline: false,
        supervisorPasscode: perms.supervisorPasscode || '1234',
      });
    } else if (preset === 'standard') {
      setPerms({
        canAcceptOrders: true,
        canMarkReady: true,
        canDelayOrders: true,
        canDeclineOrders: true,
        canManageTickets: true,
        canReopenTickets: false,
        canViewCustomerPhone: false,
        canViewOrderPrices: true,
        canToggleStockFromKitchen: true,
        requireSupervisorPasscodeForDecline: true,
        supervisorPasscode: perms.supervisorPasscode || '1234',
      });
    } else if (preset === 'kds_only') {
      setPerms({
        canAcceptOrders: false,
        canMarkReady: true,
        canDelayOrders: false,
        canDeclineOrders: false,
        canManageTickets: false,
        canReopenTickets: false,
        canViewCustomerPhone: false,
        canViewOrderPrices: false,
        canToggleStockFromKitchen: false,
        requireSupervisorPasscodeForDecline: true,
        supervisorPasscode: perms.supervisorPasscode || '1234',
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSavePermissions(perms);
    setIsSaving(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
    if (onRefreshData) onRefreshData();
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset kitchen permissions to standard defaults?')) {
      setPerms(DEFAULT_KITCHEN_PERMISSIONS);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-red-950/30 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-heading font-black text-white">
                Kitchen Portal Permissions &amp; Staff Governance
              </h2>
              <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                KDS Security
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Configure fine-grained actions and security rules for kitchen line cooks, grill stations, and dispatch operators.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-500/20 active:scale-95 transition-all cursor-pointer"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : savedToast ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved &amp; Enforced!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Kitchen Permissions</span>
              </>
            )}
          </button>
        </div>
      </div>

      {savedToast && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Kitchen portal permissions successfully saved! The kitchen tablet/display now strictly enforces these rules.</span>
        </div>
      )}

      {/* Preset Profiles Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Apply Role Preset:</span>
          </span>
          <span className="text-[11px] text-neutral-500">1-click standard templates</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => applyPreset('master')}
            className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-amber-500/40 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <strong className="text-xs text-white group-hover:text-amber-400">👑 Full Master Chef</strong>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">Unrestricted</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Kitchen staff can accept, delay, mark ready, decline orders, remake meals, and toggle ingredient stock without supervisor PIN.
            </p>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('standard')}
            className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-red-500/40 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <strong className="text-xs text-white group-hover:text-red-400">🍳 Standard Line Cook</strong>
              <span className="text-[9px] bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded font-mono">Recommended</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Can cook and mark ready. Requires Supervisor PIN to decline orders. Customer phone masked and reopening tickets restricted.
            </p>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('kds_only')}
            className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-blue-500/40 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1">
              <strong className="text-xs text-white group-hover:text-blue-400">📺 KDS Display Monitor</strong>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-mono">View Only</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Mounted screen mode. Can only mark dishes ready for dispatch. Cannot delay, decline, view prices, or manage complaints.
            </p>
          </button>
        </div>
      </div>

      {/* Permissions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Permission 1: Accept Orders */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Accept Orders &amp; Start Grilling</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Allows kitchen operators to accept new received tickets and start the griddle cooking timer.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={perms.canAcceptOrders}
              onChange={() => handleToggle('canAcceptOrders')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Permission 2: Mark Ready */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Mark Cooked &amp; Dispatch to Rider</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Allows kitchen staff to mark packed orders ready and hand over insulated bags to express delivery riders.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={perms.canMarkReady}
              onChange={() => handleToggle('canMarkReady')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* Permission 3: Delay Orders */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Adjust Timers &amp; Add Delay Minutes</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Allows kitchen to add preparation time (+10m, +15m) and notify customer during unexpected order rushes.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={perms.canDelayOrders}
              onChange={() => handleToggle('canDelayOrders')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        {/* Permission 4: Decline Orders */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
              <XCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Decline &amp; Cancel Orders</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Allows kitchen to cancel an order due to out of stock beef patties, brioche buns, or peak capacity.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={perms.canDeclineOrders}
              onChange={() => handleToggle('canDeclineOrders')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
          </label>
        </div>

        {/* Permission 5: Supervisor Passcode Protection */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Require Supervisor PIN to Decline</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                When enabled, kitchen line cooks cannot decline an order unless an authorized supervisor enters the PIN.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={perms.requireSupervisorPasscodeForDecline}
              onChange={() => handleToggle('requireSupervisorPasscodeForDecline')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
          </label>
        </div>

        {/* Permission 6: Customer Issue Tickets & Remakes */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Customer Support Tickets &amp; Remakes</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Permits kitchen staff to view customer complaints, investigate food quality issues, and trigger fresh remakes.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={perms.canManageTickets}
              onChange={() => handleToggle('canManageTickets')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Permission 7: Re-open Closed Tickets */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 shrink-0 mt-0.5">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Re-open Closed Tickets</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Allows kitchen staff to reopen tickets that were closed by employees or administrators.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={perms.canReopenTickets}
              onChange={() => handleToggle('canReopenTickets')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Permission 8: Customer Phone Privacy */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">View Full Customer Phone Numbers</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                If disabled, customer phone numbers are masked (e.g. 0321-***-8172) on tickets for privacy compliance.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={perms.canViewCustomerPhone}
              onChange={() => handleToggle('canViewCustomerPhone')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        {/* Permission 9: View Order Financials */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Display Order Prices &amp; PKR Totals</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                If disabled, prices are hidden on kitchen cards so cooks focus purely on food prep without revenue figures.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={perms.canViewOrderPrices}
              onChange={() => handleToggle('canViewOrderPrices')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* Permission 10: Toggle Stock from Kitchen */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Quick 86 / Stock Station Access</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Allows kitchen staff to mark dishes or ingredients out of stock directly from the KDS when ingredients run low.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={perms.canToggleStockFromKitchen}
              onChange={() => handleToggle('canToggleStockFromKitchen')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
      </div>

      {/* Supervisor Passcode Setting Box */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">
              Supervisor Authorization Passcode (PIN Code)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded">
            Manager Override
          </span>
        </div>

        <p className="text-xs text-neutral-400">
          This PIN is required when kitchen staff attempt authorized order declines or emergency cancellations if supervisor protection is turned on.
        </p>

        <div className="flex items-center gap-3 max-w-sm">
          <div className="relative flex-1">
            <input
              type={showPasscode ? 'text' : 'password'}
              maxLength={12}
              value={perms.supervisorPasscode}
              onChange={(e) => setPerms({ ...perms, supervisorPasscode: e.target.value })}
              placeholder="e.g. 1234"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono tracking-widest focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={() => setShowPasscode(!showPasscode)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
            >
              {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setPerms({ ...perms, supervisorPasscode: '1234' })}
            className="px-3 py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold border border-neutral-800 transition-colors cursor-pointer"
          >
            Set 1234
          </button>
        </div>
      </div>

      {/* Bottom Save & Reset Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-neutral-800 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Defaults</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save &amp; Enforce Kitchen Permissions</span>
        </button>
      </div>
    </div>
  );
};
