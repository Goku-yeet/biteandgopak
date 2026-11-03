import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Copy,
  Moon,
  Sun,
  Power,
  RotateCcw,
  Calendar,
  Sliders,
  Check,
} from 'lucide-react';
import { DayOfWeek, DaySchedule, StoreSettings, WeeklyOperatingHours } from '../../types';
import { StorageService } from '../../utils/storage';
import { ApiService } from '../../utils/api';
import {
  DAYS_OF_WEEK,
  DEFAULT_WEEKLY_SCHEDULE,
  formatDaySchedule,
  formatTime12Hour,
  generateOperatingHoursSummary,
  isOvernightShift,
  isStoreOpenNow,
} from '../../utils/operatingHours';

interface DailyOperatingHoursEditorProps {
  settings: StoreSettings;
  onChange: (updatedSettings: Partial<StoreSettings>) => void;
  showSaveButton?: boolean;
  onSave?: () => void;
}

export const DailyOperatingHoursEditor: React.FC<DailyOperatingHoursEditorProps> = ({
  settings,
  onChange,
  showSaveButton = false,
  onSave,
}) => {
  const currentSchedule: WeeklyOperatingHours = settings.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
  
  // Resilient local state for override mode to eliminate lifecycle collision
  const [localOverrideMode, setLocalOverrideMode] = useState<'auto' | 'force_open' | 'force_closed'>(() => {
    try {
      const fromStorage = StorageService.getSettings()?.scheduleOverrideMode;
      if (fromStorage) return fromStorage;
    } catch {}
    return settings.scheduleOverrideMode || 'auto';
  });

  useEffect(() => {
    if (settings.scheduleOverrideMode && settings.scheduleOverrideMode !== localOverrideMode) {
      setLocalOverrideMode(settings.scheduleOverrideMode);
    }
  }, [settings.scheduleOverrideMode]);

  const overrideMode = localOverrideMode;
  const effectiveSettings: StoreSettings = {
    ...settings,
    scheduleOverrideMode: overrideMode,
    isOpen: overrideMode === 'force_closed' ? false : true,
  };
  const openStatus = isStoreOpenNow(effectiveSettings);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSetOverrideMode = async (mode: 'auto' | 'force_open' | 'force_closed') => {
    // 1. Immediately update resilient local state
    setLocalOverrideMode(mode);

    const isOpen = mode === 'force_closed' ? false : true;
    const patch: Partial<StoreSettings> = {
      scheduleOverrideMode: mode,
      isOpen,
    };
    const updated: StoreSettings = {
      ...settings,
      ...patch,
    };

    // 2. Immediately fire onChange for state
    onChange(patch);

    // 2. Immediately save to StorageService (prevents background sync from reverting)
    try {
      await StorageService.saveSettings(updated);
    } catch (e) {
      console.error('Failed to save settings to storage', e);
    }

    // 3. Immediately sync to backend
    try {
      await ApiService.updateSettings(updated);
    } catch {}

    // 4. Fire storage event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bg_data_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    if (mode === 'force_open') {
      showToast('⚡ Master Mode: Force Open ACTIVE (Kept open 24/7 - Saved!)');
    } else if (mode === 'force_closed') {
      showToast('🛑 Master Mode: Force Closed ACTIVE (Orders paused - Saved!)');
    } else {
      showToast('📅 Master Mode: Auto Schedule ACTIVE (Following work hours - Saved!)');
    }

    if (onSave) {
      onSave();
    }
  };

  const updateDaySchedule = (day: DayOfWeek, patch: Partial<DaySchedule>) => {
    const nextSchedule: WeeklyOperatingHours = {
      ...currentSchedule,
      [day]: {
        ...(currentSchedule[day] || { isOpen: true, openTime: '12:00', closeTime: '03:00' }),
        ...patch,
      },
    };

    const newSummary = generateOperatingHoursSummary(nextSchedule);
    const updatedPatch = {
      weeklySchedule: nextSchedule,
      operatingHours: newSummary,
    };
    onChange(updatedPatch);
  };

  const handleCopyDayToAll = (sourceDay: DayOfWeek) => {
    const source = currentSchedule[sourceDay] || { isOpen: true, openTime: '12:00', closeTime: '03:00' };
    const nextSchedule: WeeklyOperatingHours = {} as any;
    DAYS_OF_WEEK.forEach((d) => {
      nextSchedule[d.id] = { ...source };
    });

    const sourceDayLabel = DAYS_OF_WEEK.find((d) => d.id === sourceDay)?.label || 'Selected day';
    const newSummary = generateOperatingHoursSummary(nextSchedule);
    onChange({
      weeklySchedule: nextSchedule,
      operatingHours: newSummary,
    });
    showToast(`Copied ${sourceDayLabel}'s timings (${formatDaySchedule(source)}) to all 7 days!`);
  };

  const applyPreset = (presetName: string) => {
    let nextSchedule: WeeklyOperatingHours;
    if (presetName === 'karachi_late_night') {
      nextSchedule = {
        monday: { isOpen: true, openTime: '12:00', closeTime: '03:00' },
        tuesday: { isOpen: true, openTime: '12:00', closeTime: '03:00' },
        wednesday: { isOpen: true, openTime: '12:00', closeTime: '03:00' },
        thursday: { isOpen: true, openTime: '12:00', closeTime: '03:00' },
        friday: { isOpen: true, openTime: '12:00', closeTime: '03:30' },
        saturday: { isOpen: true, openTime: '12:00', closeTime: '03:30' },
        sunday: { isOpen: true, openTime: '12:00', closeTime: '03:00' },
      };
    } else if (presetName === 'standard_11_12') {
      nextSchedule = {
        monday: { isOpen: true, openTime: '11:00', closeTime: '23:59' },
        tuesday: { isOpen: true, openTime: '11:00', closeTime: '23:59' },
        wednesday: { isOpen: true, openTime: '11:00', closeTime: '23:59' },
        thursday: { isOpen: true, openTime: '11:00', closeTime: '23:59' },
        friday: { isOpen: true, openTime: '11:00', closeTime: '23:59' },
        saturday: { isOpen: true, openTime: '11:00', closeTime: '23:59' },
        sunday: { isOpen: true, openTime: '11:00', closeTime: '23:59' },
      };
    } else if (presetName === 'lunch_to_midnight') {
      nextSchedule = {
        monday: { isOpen: true, openTime: '12:00', closeTime: '00:00' },
        tuesday: { isOpen: true, openTime: '12:00', closeTime: '00:00' },
        wednesday: { isOpen: true, openTime: '12:00', closeTime: '00:00' },
        thursday: { isOpen: true, openTime: '12:00', closeTime: '00:00' },
        friday: { isOpen: true, openTime: '12:00', closeTime: '01:00' },
        saturday: { isOpen: true, openTime: '12:00', closeTime: '01:00' },
        sunday: { isOpen: true, openTime: '12:00', closeTime: '00:00' },
      };
    } else if (presetName === 'always_open') {
      nextSchedule = {
        monday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
        tuesday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
        wednesday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
        thursday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
        friday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
        saturday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
        sunday: { isOpen: true, openTime: '00:00', closeTime: '23:59' },
      };
    } else {
      nextSchedule = DEFAULT_WEEKLY_SCHEDULE;
    }

    const newSummary = generateOperatingHoursSummary(nextSchedule);
    onChange({
      weeklySchedule: nextSchedule,
      operatingHours: newSummary,
    });
    showToast('Applied schedule preset successfully!');
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Real-Time Live Status Pill Card */}
      <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
              openStatus.isOpen
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {openStatus.isOpen ? <Sun className="w-5 h-5 animate-spin-slow" /> : <Moon className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Current Kitchen Status:</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  openStatus.isOpen
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {openStatus.badgeText}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {openStatus.reason}
            </p>
          </div>
        </div>

        <div className="text-right text-xs font-mono text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800">
          <div className="text-white font-bold">{openStatus.currentTimeFormatted}</div>
          <div className="text-[10px] text-neutral-500">{openStatus.currentDayLabel} Today</div>
        </div>
      </div>

      {/* Master Mode Switch (Auto vs Force Open vs Force Closed) */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Master Operations Mode</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Choose whether the kitchen follows the daily schedule automatically or is manually overridden.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleSetOverrideMode('auto')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
              overrideMode === 'auto'
                ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30 text-white'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className={`w-4 h-4 shrink-0 ${overrideMode === 'auto' ? 'text-amber-400' : 'text-neutral-500'}`} />
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>Auto Schedule</span>
                  {overrideMode === 'auto' && (
                    <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[10px] opacity-75">Follows everyday work hours</div>
              </div>
            </div>
            {overrideMode === 'auto' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
          </button>

          <button
            type="button"
            onClick={() => handleSetOverrideMode('force_open')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
              overrideMode === 'force_open'
                ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30 text-emerald-300'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Power className={`w-4 h-4 shrink-0 ${overrideMode === 'force_open' ? 'text-emerald-400' : 'text-neutral-500'}`} />
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>Force Open</span>
                  {overrideMode === 'force_open' && (
                    <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">
                      ACTIVE (24/7)
                    </span>
                  )}
                </div>
                <div className="text-[10px] opacity-75">Accept orders anytime (24/7)</div>
              </div>
            </div>
            {overrideMode === 'force_open' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
          </button>

          <button
            type="button"
            onClick={() => handleSetOverrideMode('force_closed')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
              overrideMode === 'force_closed'
                ? 'border-red-500 bg-red-500/15 ring-2 ring-red-500/30 text-red-300'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className={`w-4 h-4 shrink-0 ${overrideMode === 'force_closed' ? 'text-red-400' : 'text-neutral-500'}`} />
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>Force Closed</span>
                  {overrideMode === 'force_closed' && (
                    <span className="text-[9px] bg-red-500/30 text-red-300 px-1.5 py-0.2 rounded font-mono font-bold">
                      ACTIVE (PAUSED)
                    </span>
                  )}
                </div>
                <div className="text-[10px] opacity-75">Emergency pause all orders</div>
              </div>
            </div>
            {overrideMode === 'force_closed' && <Check className="w-4 h-4 text-red-400 shrink-0" />}
          </button>
        </div>
      </div>

      {/* Quick Schedule Presets */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick Working Hours Presets:</span>
          </span>
          <span className="text-[11px] text-neutral-400">Apply instantly to all 7 days</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset('karachi_late_night')}
            className="px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/40 text-xs font-medium text-neutral-200 hover:text-amber-300 transition-colors cursor-pointer"
          >
            🌙 Karachi Late Night (12 PM – 3 AM / 3:30 AM Weekend)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('lunch_to_midnight')}
            className="px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/40 text-xs font-medium text-neutral-200 hover:text-amber-300 transition-colors cursor-pointer"
          >
            🍔 Lunch to Midnight (12 PM – 12 AM)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('standard_11_12')}
            className="px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/40 text-xs font-medium text-neutral-200 hover:text-amber-300 transition-colors cursor-pointer"
          >
            ☀️ Daytime &amp; Evening (11 AM – 11:59 PM)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('always_open')}
            className="px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 hover:border-emerald-500/40 text-xs font-medium text-neutral-200 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            ⚡ 24/7 All Day &amp; Night
          </button>
        </div>
      </div>

      {/* Everyday Work Hours Schedule (Monday through Sunday) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Day-by-Day Operating Hours</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Set exact opening and closing time for every day. If closing time is early morning (e.g. 03:00), it automatically recognizes the overnight late-night shift.
            </p>
          </div>
          <span className="text-[11px] text-neutral-400 font-mono hidden sm:inline">
            PKT Timezone (UTC+5)
          </span>
        </div>

        <div className="space-y-2.5">
          {DAYS_OF_WEEK.map((day) => {
            const sched = currentSchedule[day.id] || { isOpen: true, openTime: '12:00', closeTime: '03:00' };
            const isToday = openStatus.currentDay === day.id;
            const isOvernight = sched.isOpen && isOvernightShift(sched.openTime, sched.closeTime);

            return (
              <div
                key={day.id}
                className={`p-3 rounded-xl border transition-all ${
                  isToday
                    ? 'bg-neutral-950 border-amber-500/40 shadow-sm'
                    : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-750'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Day Name & Toggle */}
                  <div className="flex items-center gap-3 min-w-[170px]">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sched.isOpen}
                        onChange={(e) => updateDaySchedule(day.id, { isOpen: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${sched.isOpen ? 'text-white' : 'text-neutral-500'}`}>
                          {day.label}
                        </span>
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                            TODAY
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500">
                        {sched.isOpen ? 'Open for orders' : 'Closed all day'}
                      </span>
                    </div>
                  </div>

                  {/* Timing Inputs */}
                  {sched.isOpen ? (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 sm:justify-end">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-neutral-400 text-[11px]">Opens:</span>
                        <input
                          type="time"
                          value={sched.openTime || '12:00'}
                          onChange={(e) => updateDaySchedule(day.id, { openTime: e.target.value })}
                          className="bg-neutral-900 border border-neutral-750 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                        <span className="text-[10px] text-neutral-400">({formatTime12Hour(sched.openTime)})</span>
                      </div>

                      <span className="text-neutral-600 hidden sm:inline">—</span>

                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-neutral-400 text-[11px]">Closes:</span>
                        <input
                          type="time"
                          value={sched.closeTime || '03:00'}
                          onChange={(e) => updateDaySchedule(day.id, { closeTime: e.target.value })}
                          className="bg-neutral-900 border border-neutral-750 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                        <span className="text-[10px] text-neutral-400">({formatTime12Hour(sched.closeTime)})</span>
                      </div>

                      {isOvernight && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold font-mono">
                          🌙 Overnight Shift
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyDayToAll(day.id)}
                        className="p-1 text-neutral-400 hover:text-amber-400 hover:bg-neutral-850 rounded-lg transition-colors"
                        title={`Copy ${day.label}'s hours to all days`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-500 font-medium sm:text-right flex items-center gap-2">
                      <span>No orders accepted on this day</span>
                      <button
                        type="button"
                        onClick={() => updateDaySchedule(day.id, { isOpen: true, openTime: '12:00', closeTime: '03:00' })}
                        className="text-amber-400 hover:underline text-xs"
                      >
                        Enable Day
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer Closed Notice Text */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
        <label className="text-xs font-bold text-white block">
          Custom Closed Notice to Customer (Shown when attempting after-hours order):
        </label>
        <input
          type="text"
          value={settings.orderClosedMessage || ''}
          onChange={(e) => onChange({ orderClosedMessage: e.target.value })}
          placeholder="e.g. Bite & Go kitchen is currently closed for the night. Pre-orders reopen at 12:00 PM!"
          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
        />
        <p className="text-[11px] text-neutral-500">
          Leave blank to use the smart auto-generated message with exact reopening hours.
        </p>
      </div>

      {/* Display Summary */}
      <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
        <span className="text-neutral-400 font-medium">Public Storefront Hours Text:</span>
        <span className="font-bold text-amber-400 font-mono">{settings.operatingHours || '12:00 PM — 03:00 AM (Daily)'}</span>
      </div>

      {showSaveButton && onSave && (
        <button
          type="button"
          onClick={onSave}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Save Store Operating Schedule</span>
        </button>
      )}
    </div>
  );
};
