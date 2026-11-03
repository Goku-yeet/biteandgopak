import React, { useState, useMemo, useEffect } from 'react';
import { StoreSettings } from '../../types';
import { StorageService } from '../../utils/storage';
import { ApiService } from '../../utils/api';
import { sounds } from '../../utils/audio';
import { KARACHI_DELIVERY_AREAS, calculateDeliveryFeeFromDistance } from '../../data/karachiAreas';
import {
  MapPin,
  Calculator,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Search,
  Save,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Compass,
} from 'lucide-react';

interface DeliveryRatesSettingsSectionProps {
  settings: StoreSettings;
  onSave?: (updated: StoreSettings) => Promise<void> | void;
  onRefreshData?: () => void;
}

export const DeliveryRatesSettingsSection: React.FC<DeliveryRatesSettingsSectionProps> = ({
  settings,
  onSave,
  onRefreshData,
}) => {
  // Local form state with safe defaults
  const [baseFeeInput, setBaseFeeInput] = useState<string>(
    String(settings.baseDeliveryFee !== undefined ? settings.baseDeliveryFee : (settings.deliveryFee ?? 0))
  );
  const [ratePerKmInput, setRatePerKmInput] = useState<string>(
    String(settings.deliveryRatePerKm !== undefined ? settings.deliveryRatePerKm : 50)
  );
  const [radiusKmInput, setRadiusKmInput] = useState<string>(
    String(settings.deliveryRadiusKm !== undefined ? settings.deliveryRadiusKm : 10)
  );
  const [freeThresholdInput, setFreeThresholdInput] = useState<string>(
    String(settings.freeDeliveryThreshold !== undefined ? settings.freeDeliveryThreshold : 1800)
  );
  const [freeRadiusInput, setFreeRadiusInput] = useState<string>(
    String(settings.freeDeliveryRadiusKm !== undefined ? settings.freeDeliveryRadiusKm : 0.5)
  );
  const [freeMode, setFreeMode] = useState<StoreSettings['freeDeliveryMode']>(
    settings.freeDeliveryMode || 'threshold_or_selected_areas'
  );
  const [freeAreas, setFreeAreas] = useState<string[]>(
    settings.freeDeliveryAreas && settings.freeDeliveryAreas.length > 0
      ? settings.freeDeliveryAreas
      : [
          'North Nazimabad - Block I (Branch Location)',
          'North Nazimabad - Blocks A, B, C & D (KDA Officers)',
          'North Nazimabad - Blocks E, F, G & H (Five Star Chowrangi)',
          'North Nazimabad - Blocks J, K, L, M & N (Hyderi Market)',
          'North Nazimabad - Blocks P, Q, R, S, T, U & W',
          'Buffer Zone - Sectors 15-A1, 15-A2 & 15-B',
        ]
  );

  const [disabledAreas, setDisabledAreas] = useState<string[]>(
    settings.disabledDeliveryAreas || []
  );

  // Sync when prop updates
  useEffect(() => {
    setBaseFeeInput(String(settings.baseDeliveryFee !== undefined ? settings.baseDeliveryFee : (settings.deliveryFee ?? 0)));
    setRatePerKmInput(String(settings.deliveryRatePerKm !== undefined ? settings.deliveryRatePerKm : 50));
    setRadiusKmInput(String(settings.deliveryRadiusKm !== undefined ? settings.deliveryRadiusKm : 10));
    setFreeThresholdInput(String(settings.freeDeliveryThreshold !== undefined ? settings.freeDeliveryThreshold : 1800));
    setFreeRadiusInput(String(settings.freeDeliveryRadiusKm !== undefined ? settings.freeDeliveryRadiusKm : 0.5));
    if (settings.freeDeliveryMode) setFreeMode(settings.freeDeliveryMode);
    if (settings.freeDeliveryAreas) setFreeAreas(settings.freeDeliveryAreas);
    if (settings.disabledDeliveryAreas) setDisabledAreas(settings.disabledDeliveryAreas);
  }, [settings]);

  // Area search filter
  const [areaSearch, setAreaSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Parsed numeric values for safe calculation
  const parsedBaseFee = Math.max(0, parseFloat(baseFeeInput) || 0);
  const parsedRatePerKm = Math.max(0, parseFloat(ratePerKmInput) || 0);
  const parsedMaxRadius = Math.max(1, parseFloat(radiusKmInput) || 10);
  const parsedFreeThreshold = Math.max(0, parseFloat(freeThresholdInput) || 0);
  const parsedFreeRadius = Math.max(0, parseFloat(freeRadiusInput) || 0);

  // Simulator state: default to North Nazimabad Block I (0.5km)
  const defaultArea = KARACHI_DELIVERY_AREAS[0]?.name || 'North Nazimabad - Block I (Branch Location)';
  const [simArea, setSimArea] = useState<string>(defaultArea);
  const [simDistance, setSimDistance] = useState<number>(0.5);
  const [simSubtotal, setSimSubtotal] = useState<number>(1500);

  // Handle dropdown change: synchronize area & distance in lockstep
  const handleSelectSimArea = (areaName: string) => {
    setSimArea(areaName);
    const matched = KARACHI_DELIVERY_AREAS.find((a) => a.name === areaName);
    if (matched) {
      setSimDistance(matched.distanceKm);
    }
  };

  // Handle distance slider change: automatically sync closest Karachi area
  const handleDistanceChange = (newDist: number) => {
    setSimDistance(newDist);
    let closestArea = KARACHI_DELIVERY_AREAS[0];
    let minDiff = Math.abs(closestArea.distanceKm - newDist);
    for (const a of KARACHI_DELIVERY_AREAS) {
      const diff = Math.abs(a.distanceKm - newDist);
      if (diff < minDiff) {
        minDiff = diff;
        closestArea = a;
      }
    }
    if (closestArea) {
      setSimArea(closestArea.name);
    }
  };

  // Handle Quick Test preset chip click: update BOTH distance and area
  const handleQuickTest = (chip: { label: string; areaName: string; d: number }) => {
    setSimArea(chip.areaName);
    setSimDistance(chip.d);
  };

  // Check if simulated area or distance is free under current policy
  const calculation = useMemo(() => {
    const isExceeded = simDistance > parsedMaxRadius;
    const distanceCharge = Math.round(simDistance * parsedRatePerKm);
    const customAreaFee = settings.customAreaDeliveryFees?.[simArea];
    const rawDeliveryFee = typeof customAreaFee === 'number' ? customAreaFee : (parsedBaseFee + distanceCharge);

    // Check if current simulated area is explicitly in free delivery list
    const isAreaExplicitlyFree = freeAreas.some((a) => {
      const cleanA = a.toLowerCase().trim();
      const cleanSim = simArea.toLowerCase().trim();
      return cleanA === cleanSim || cleanA.includes(cleanSim) || cleanSim.includes(cleanA);
    });

    // Check if within free local radius
    const isWithinFreeRadius = parsedFreeRadius > 0 && simDistance <= parsedFreeRadius;

    // Check if subtotal reached free delivery threshold
    const isCartThresholdMet = parsedFreeThreshold > 0 && simSubtotal >= parsedFreeThreshold;

    let isFree = false;
    let freeReason = '';

    // If exceeded coverage, delivery cannot be made or is out-of-bounds
    if (isExceeded) {
      isFree = false;
      freeReason = `Outside Service Coverage (${simDistance} km > ${parsedMaxRadius} km)`;
    } else if (freeMode === 'all_areas') {
      isFree = true;
      freeReason = 'All Areas 100% Free Policy';
    } else if (freeMode === 'selected_areas_only') {
      if (isAreaExplicitlyFree) {
        isFree = true;
        freeReason = `Selected Free Area: ${simArea}`;
      } else if (isWithinFreeRadius) {
        isFree = true;
        freeReason = `Within Local Free Radius (≤ ${parsedFreeRadius} km)`;
      }
    } else if (freeMode === 'threshold_only') {
      if (isCartThresholdMet) {
        isFree = true;
        freeReason = `Cart Subtotal (Rs. ${simSubtotal.toLocaleString()}) ≥ Rs. ${parsedFreeThreshold.toLocaleString()}`;
      }
    } else {
      // threshold_or_selected_areas (Default mode)
      if (isCartThresholdMet) {
        isFree = true;
        freeReason = `Cart Subtotal (Rs. ${simSubtotal.toLocaleString()}) ≥ Free Minimum (Rs. ${parsedFreeThreshold.toLocaleString()})`;
      } else if (isAreaExplicitlyFree) {
        isFree = true;
        freeReason = `Selected Free Delivery Area: ${simArea}`;
      } else if (isWithinFreeRadius) {
        isFree = true;
        freeReason = `Within Local Free Radius (≤ ${parsedFreeRadius} km)`;
      }
    }

    const effectiveFee = isExceeded ? rawDeliveryFee : isFree ? 0 : rawDeliveryFee;

    return {
      isExceeded,
      distanceCharge,
      rawDeliveryFee,
      effectiveFee,
      isFree,
      freeReason,
      isAreaExplicitlyFree,
      isWithinFreeRadius,
      isCartThresholdMet,
      customAreaFee,
    };
  }, [
    simDistance,
    simSubtotal,
    simArea,
    parsedBaseFee,
    parsedRatePerKm,
    parsedMaxRadius,
    parsedFreeThreshold,
    parsedFreeRadius,
    freeMode,
    freeAreas,
    settings.customAreaDeliveryFees,
  ]);

  // Toggle area in free delivery list
  const toggleArea = (areaName: string) => {
    const isSelected = freeAreas.some(
      (a) => a.toLowerCase().trim() === areaName.toLowerCase().trim()
    );
    const updatedFree = isSelected
      ? freeAreas.filter((a) => a.toLowerCase().trim() !== areaName.toLowerCase().trim())
      : [...freeAreas, areaName];
    setFreeAreas(updatedFree);
    persistDeliverySettings({ freeDeliveryAreas: updatedFree });
  };

  const persistDeliverySettings = async (partial: Partial<StoreSettings>) => {
    const current = StorageService.getSettings();
    const updatedSettings: StoreSettings = {
      ...current,
      ...settings,
      baseDeliveryFee: parsedBaseFee,
      deliveryFee: parsedBaseFee,
      deliveryRatePerKm: parsedRatePerKm,
      deliveryRadiusKm: parsedMaxRadius,
      freeDeliveryThreshold: parsedFreeThreshold,
      freeDeliveryRadiusKm: parsedFreeRadius,
      freeDeliveryMode: freeMode,
      freeDeliveryAreas: freeAreas,
      disabledDeliveryAreas: disabledAreas,
      ...partial,
    };
    try {
      await StorageService.saveSettings(updatedSettings);
      try {
        await ApiService.updateSettings(updatedSettings);
      } catch {}
      if (onSave) {
        await onSave(updatedSettings);
      }
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.warn('Failed to auto-persist delivery settings', e);
    }
  };

  // Quick Preset area selectors
  const selectAllNorthNazimabad = () => {
    const nnAreas = KARACHI_DELIVERY_AREAS.filter(
      (a) =>
        a.name.toLowerCase().includes('north nazimabad') ||
        a.name.toLowerCase().includes('buffer zone') ||
        a.name.toLowerCase().includes('shadman')
    ).map((a) => a.name);

    const merged = Array.from(new Set([...freeAreas, ...nnAreas]));
    setFreeAreas(merged);
    persistDeliverySettings({ freeDeliveryAreas: merged });
  };

  const clearAllFreeAreas = () => {
    setFreeAreas([]);
    persistDeliverySettings({ freeDeliveryAreas: [] });
  };

  // Toggle disabling specific delivery area
  const toggleDisableArea = (areaName: string) => {
    const isCurrentlyDisabled = disabledAreas.some(
      (a) => a.toLowerCase().trim() === areaName.toLowerCase().trim()
    );
    const updatedDisabled = isCurrentlyDisabled
      ? disabledAreas.filter((a) => a.toLowerCase().trim() !== areaName.toLowerCase().trim())
      : [...disabledAreas, areaName];
    setDisabledAreas(updatedDisabled);
    persistDeliverySettings({ disabledDeliveryAreas: updatedDisabled });
    sounds.playChime();
    setSaveSuccessMsg(
      isCurrentlyDisabled
        ? `Re-enabled deliveries to ${areaName}`
        : `Paused deliveries to ${areaName}`
    );
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleDisableOutsideRadius = () => {
    const farAreas = KARACHI_DELIVERY_AREAS.filter((a) => a.distanceKm > parsedMaxRadius).map((a) => a.name);
    const merged = Array.from(new Set([...disabledAreas, ...farAreas]));
    setDisabledAreas(merged);
    persistDeliverySettings({ disabledDeliveryAreas: merged });
    sounds.playSuccess();
    setSaveSuccessMsg(`Paused all areas outside ${parsedMaxRadius}km radius.`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleEnableAllAreas = () => {
    setDisabledAreas([]);
    persistDeliverySettings({ disabledDeliveryAreas: [] });
    sounds.playSuccess();
    setSaveSuccessMsg(`All ${KARACHI_DELIVERY_AREAS.length} delivery areas are active!`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    const updatedSettings: StoreSettings = {
      ...settings,
      baseDeliveryFee: parsedBaseFee,
      deliveryFee: parsedBaseFee,
      deliveryRatePerKm: parsedRatePerKm,
      deliveryRadiusKm: parsedMaxRadius,
      freeDeliveryThreshold: parsedFreeThreshold,
      freeDeliveryRadiusKm: parsedFreeRadius,
      freeDeliveryMode: freeMode,
      freeDeliveryAreas: freeAreas,
      disabledDeliveryAreas: disabledAreas,
    };

    try {
      await StorageService.saveSettings(updatedSettings);
      try {
        await ApiService.updateSettings(updatedSettings);
      } catch {}
      if (onSave) {
        await onSave(updatedSettings);
      }
      sounds.playSuccess();
      setSaveSuccessMsg('Delivery rates & free zone policies saved successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.error('Failed to save delivery settings', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered areas for selection
  const filteredKarachiAreas = useMemo(() => {
    if (!areaSearch.trim()) return KARACHI_DELIVERY_AREAS;
    const q = areaSearch.toLowerCase();
    return KARACHI_DELIVERY_AREAS.filter(
      (a) => a.name.toLowerCase().includes(q) || String(a.distanceKm).includes(q)
    );
  }, [areaSearch]);

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2 animate-in slide-in-from-top">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 1. Main Delivery Rates & Branch Location Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4 shadow-xl">
        {/* Header with Save Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-850">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Branch Location &amp; Distance Delivery Rates</span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Formula: <span className="text-amber-300 font-mono">Base Fee + (Distance × Rate/KM)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-bold">
              Coverage: {parsedMaxRadius} km Radius
            </span>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 stroke-[3]" />
              <span>{isSaving ? 'Saving...' : 'Save Rates'}</span>
            </button>
          </div>
        </div>

        {/* Branch Location Badge */}
        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-start gap-3 text-xs">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <p className="font-bold text-white text-xs">Bite &amp; Go Express Kitchen Branch:</p>
            <p className="text-neutral-200 font-mono text-[11px]">
              Block-I, North Nazimabad, Karachi, Pakistan
            </p>
            <p className="text-[10.5px] text-neutral-400">
              Serving North Nazimabad, Hyderi, Buffer Zone, Shadman, F.B. Area, Nazimabad, North Karachi, Liaquatabad, and Gulshan-e-Iqbal.
            </p>
          </div>
        </div>

        {/* Rate Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-neutral-300 block mb-1 font-semibold text-[11px]">
              Base Delivery Fee (PKR)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="10"
                value={baseFeeInput}
                onChange={(e) => setBaseFeeInput(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
              />
              <span className="absolute right-3 top-2 text-[10px] text-neutral-500 pointer-events-none">PKR</span>
            </div>
            <span className="text-[10px] text-neutral-400 mt-1 block">Flat starting charge</span>
          </div>

          <div>
            <label className="text-neutral-300 block mb-1 font-semibold text-[11px]">
              Charge Per KM (PKR/km)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="5"
                value={ratePerKmInput}
                onChange={(e) => setRatePerKmInput(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
              />
              <span className="absolute right-3 top-2 text-[10px] text-neutral-500 pointer-events-none">PKR/km</span>
            </div>
            <span className="text-[10px] text-neutral-400 mt-1 block">Added for each km</span>
          </div>

          <div>
            <label className="text-neutral-300 block mb-1 font-semibold text-[11px]">
              Delivery Radius (KM)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="30"
                step="1"
                value={radiusKmInput}
                onChange={(e) => setRadiusKmInput(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
              />
              <span className="absolute right-3 top-2 text-[10px] text-neutral-500 pointer-events-none">KM</span>
            </div>
            <span className="text-[10px] text-neutral-400 mt-1 block">Max store radius</span>
          </div>

          <div>
            <label className="text-neutral-300 block mb-1 font-semibold text-[11px]">
              Free Delivery Above
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="100"
                value={freeThresholdInput}
                onChange={(e) => setFreeThresholdInput(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
              />
              <span className="absolute right-3 top-2 text-[10px] text-neutral-500 pointer-events-none">PKR</span>
            </div>
            <span className="text-[10px] text-neutral-400 mt-1 block">Cart threshold in PKR</span>
          </div>
        </div>

        {/* 2. Free Delivery Zones & Local Radius Policy */}
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Free Delivery Zones &amp; Local Radius Policy</span>
            </span>
            <span className="text-[11px] text-neutral-400">Configure areas for 100% Free Deliveries</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-neutral-300 block mb-1 font-semibold text-[11px]">
                Free Local Radius (KM)
              </label>
              <input
                type="number"
                min="0"
                max="15"
                step="0.5"
                value={freeRadiusInput}
                onChange={(e) => setFreeRadiusInput(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Addresses within this radius get FREE delivery regardless of cart subtotal
              </span>
            </div>

            <div>
              <label className="text-neutral-300 block mb-1 font-semibold text-[11px]">
                Free Delivery Policy Mode
              </label>
              <select
                value={freeMode}
                onChange={(e) => setFreeMode(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
              >
                <option value="threshold_or_selected_areas">
                  ✓ Free if Cart Subtotal Reached OR in Selected Areas / Radius
                </option>
                <option value="selected_areas_only">
                  📍 Free in Selected Areas / Radius ONLY (No Cart Minimum)
                </option>
                <option value="threshold_only">
                  💰 Free on Cart Subtotal Minimum ONLY
                </option>
                <option value="all_areas">
                  🎉 100% Free Delivery All Over Karachi
                </option>
              </select>
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Configure how free delivery rules are evaluated on checkout
              </span>
            </div>
          </div>

          {/* Area Chips for Free Delivery with Search & Select All presets */}
          <div className="space-y-2 pt-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <label className="text-neutral-300 text-xs font-semibold flex items-center gap-1.5">
                <span>Select Specific Areas for Automatic Free Delivery:</span>
                <span className="text-amber-400 font-mono font-bold">
                  {freeAreas.length} Areas Free
                </span>
              </label>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={selectAllNorthNazimabad}
                  className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white text-[10px] font-semibold transition-colors cursor-pointer"
                >
                  + Add North Nazimabad
                </button>
                <button
                  type="button"
                  onClick={clearAllFreeAreas}
                  className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-red-300 text-[10px] font-semibold transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Quick Filter Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search area (e.g. Block I, Hyderi, Buffer Zone, Gulshan)..."
                value={areaSearch}
                onChange={(e) => setAreaSearch(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              {areaSearch && (
                <button
                  type="button"
                  onClick={() => setAreaSearch('')}
                  className="absolute right-2.5 top-2 text-neutral-500 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Area Pills Container */}
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2.5 bg-neutral-950 rounded-xl border border-neutral-850">
              {filteredKarachiAreas.map((area) => {
                const isSelected = freeAreas.some(
                  (a) => a.toLowerCase().trim() === area.name.toLowerCase().trim()
                );
                return (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => toggleArea(area.name)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border flex items-center gap-1 active:scale-95 ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold shadow-xs'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3 text-amber-400 stroke-[3]" /> : <span className="text-neutral-500">+</span>}
                    <span>{area.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      (~{area.distanceKm}km)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Area Delivery Coverage Toggles (Enable / Disable Specific Areas) */}
          <div className="pt-3 border-t border-neutral-850 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>Karachi Delivery Area Enable / Disable Controls</span>
                </span>
                <p className="text-[11px] text-neutral-400">
                  Pause deliveries to specific locations (e.g. wet roads, far zones). Customers cannot choose disabled areas at checkout.
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleDisableOutsideRadius}
                  className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-amber-300 font-semibold cursor-pointer"
                >
                  Pause &gt; {parsedMaxRadius}km
                </button>
                <button
                  type="button"
                  onClick={handleEnableAllAreas}
                  className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-emerald-400 font-semibold cursor-pointer"
                >
                  Enable All ({KARACHI_DELIVERY_AREAS.length})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto p-2.5 bg-neutral-950 rounded-xl border border-neutral-850">
              {filteredKarachiAreas.map((area) => {
                const isDisabled = disabledAreas.some(
                  (a) => a.toLowerCase().trim() === area.name.toLowerCase().trim()
                );
                return (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => toggleDisableArea(area.name)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border flex items-center gap-1 active:scale-95 ${
                      isDisabled
                        ? 'bg-red-950/70 text-red-300 border-red-500/40 line-through decoration-red-400 font-bold'
                        : 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50'
                    }`}
                    title={isDisabled ? `Click to RE-ENABLE delivery to ${area.name}` : `Click to DISABLE / PAUSE delivery to ${area.name}`}
                  >
                    <span>{isDisabled ? '🚫' : '✅'}</span>
                    <span>{area.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      (~{area.distanceKm}km)
                    </span>
                  </button>
                );
              })}
            </div>
            {disabledAreas.length > 0 && (
              <div className="text-[11px] text-red-400 flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>{disabledAreas.length}</strong> area(s) currently paused from delivery parameters.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Interactive Live Delivery Calculator Simulator (Two-Way Synced & Reactive) */}
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Live Delivery Calculator Simulator</span>
            </span>
            <span className="text-[11px] text-neutral-400">Test pricing in real-time</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Simulated Area Select */}
            <div>
              <div className="flex justify-between text-neutral-300 mb-1">
                <span className="font-semibold text-[11px]">Simulated Area:</span>
              </div>
              <select
                value={simArea}
                onChange={(e) => handleSelectSimArea(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {KARACHI_DELIVERY_AREAS.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name} (~{a.distanceKm}km)
                  </option>
                ))}
              </select>
            </div>

            {/* Simulated Distance Slider */}
            <div>
              <div className="flex justify-between text-neutral-300 mb-1">
                <span className="font-semibold text-[11px]">Simulated Distance:</span>
                <span className="font-mono font-bold text-amber-400">{simDistance} km</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="25"
                step="0.5"
                value={simDistance}
                onChange={(e) => handleDistanceChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Cart Subtotal Input */}
            <div>
              <div className="flex justify-between text-neutral-300 mb-1">
                <span className="font-semibold text-[11px]">Cart Subtotal (PKR):</span>
                <span className="font-mono font-bold text-white">Rs. {simSubtotal.toLocaleString()}</span>
              </div>
              <input
                type="number"
                step="100"
                min="0"
                value={simSubtotal}
                onChange={(e) => setSimSubtotal(Math.max(0, Number(e.target.value) || 0))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Calculated Simulator Outcome Banner */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-neutral-400 font-medium">Breakdown:</span>
                <span className="font-mono font-semibold text-neutral-200">
                  Rs. {parsedBaseFee} (Base) + ({simDistance}km × Rs. {parsedRatePerKm} = Rs. {calculation.distanceCharge})
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                    calculation.isExceeded
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {calculation.isExceeded
                    ? `⚠️ Exceeds ${parsedMaxRadius} km Max Radius`
                    : `✓ Within ${parsedMaxRadius} km Radius`}
                </span>

                {calculation.isFree ? (
                  <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    🎉 Free Delivery Unlocked ({calculation.freeReason})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10.5px] font-medium text-neutral-400 bg-neutral-900 border border-neutral-800">
                    Standard Distance Delivery Fee
                  </span>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-850 w-full sm:w-auto">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                Total Calculated Fee:
              </span>
              <span className="font-mono font-black text-lg text-amber-400">
                {calculation.effectiveFee === 0 ? 'FREE (Rs. 0)' : `Rs. ${calculation.effectiveFee.toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Quick Preset Buttons (Accurately syncs Area & Distance together) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-neutral-400 font-medium">Quick Test:</span>
            {[
              { label: 'Block-I (0.5km)', areaName: 'North Nazimabad - Block I (Branch Location)', d: 0.5 },
              { label: 'Hyderi (2.2km)', areaName: 'North Nazimabad - Blocks J, K, L, M & N (Hyderi Market)', d: 2.2 },
              { label: 'Buffer Zone (3.2km)', areaName: 'Buffer Zone - Sectors 15-A1, 15-A2 & 15-B', d: 3.2 },
              { label: 'F.B. Area (4.8km)', areaName: 'Federal B. Area - Water Pump, Block 14, 16 & Ancholi', d: 4.8 },
              { label: 'Gulshan 13-D (7.5km)', areaName: 'Gulshan-e-Iqbal - Block 13-D, 13-A & Hassan Square', d: 7.5 },
              { label: 'Clifton (17.5km)', areaName: 'Clifton - Block 2, 4, 5 & Sea View', d: 17.5 },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleQuickTest(chip)}
                className={`px-2.5 py-1 rounded-lg border transition-all text-xs font-semibold cursor-pointer active:scale-95 ${
                  simArea === chip.areaName
                    ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold'
                    : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
