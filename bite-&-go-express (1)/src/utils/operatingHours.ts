import { DayOfWeek, DaySchedule, StoreSettings, WeeklyOperatingHours } from '../types/index';

export const DAYS_OF_WEEK: { id: DayOfWeek; label: string; short: string }[] = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
];

export const DEFAULT_WEEKLY_SCHEDULE: WeeklyOperatingHours = {
  monday: { isOpen: true, openTime: '12:00', closeTime: '04:00' },
  tuesday: { isOpen: true, openTime: '12:00', closeTime: '04:00' },
  wednesday: { isOpen: true, openTime: '12:00', closeTime: '04:00' },
  thursday: { isOpen: true, openTime: '12:00', closeTime: '04:00' },
  friday: { isOpen: true, openTime: '12:00', closeTime: '04:30' },
  saturday: { isOpen: true, openTime: '12:00', closeTime: '04:30' },
  sunday: { isOpen: true, openTime: '12:00', closeTime: '04:30' },
};

/**
 * Convert 24-hour "HH:mm" to 12-hour "hh:mm AM/PM"
 */
export function formatTime12Hour(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24 || '12:00 PM';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 becomes 12
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mm} ${ampm}`;
}

/**
 * Formats a single day's schedule into readable string
 */
export function formatDaySchedule(day?: DaySchedule): string {
  if (!day || !day.isOpen) return 'Closed All Day';
  const open = formatTime12Hour(day.openTime);
  const close = formatTime12Hour(day.closeTime);
  const isOvernight = isOvernightShift(day.openTime, day.closeTime);
  return `${open} — ${close}${isOvernight ? ' (Next Morning)' : ''}`;
}

/**
 * Returns true if the shift crosses midnight (e.g. 12:00 to 03:00)
 */
export function isOvernightShift(openTime: string, closeTime: string): boolean {
  const [oh, om] = (openTime || '12:00').split(':').map((x) => parseInt(x, 10) || 0);
  const [ch, cm] = (closeTime || '03:00').split(':').map((x) => parseInt(x, 10) || 0);
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;
  return closeMins <= openMins;
}

/**
 * Converts JS Date day index (0 = Sunday, 1 = Monday...) to DayOfWeek
 */
export function getDayOfWeekFromDate(date: Date): DayOfWeek {
  const map: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return map[date.getDay()];
}

/**
 * Gets previous day of the week
 */
export function getPreviousDay(day: DayOfWeek): DayOfWeek {
  const order: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const idx = order.indexOf(day);
  return order[(idx + 6) % 7];
}

/**
 * Gets next day of the week
 */
export function getNextDay(day: DayOfWeek): DayOfWeek {
  const order: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const idx = order.indexOf(day);
  return order[(idx + 1) % 7];
}

export interface StoreOpenStatus {
  isOpen: boolean;
  statusText: string;
  badgeText: string;
  reason: string;
  currentDay: DayOfWeek;
  currentDayLabel: string;
  currentTimeFormatted: string;
  todayHoursText: string;
  nextOpenText?: string;
  isOvernightActive?: boolean;
}

/**
 * Check whether the store is open right now based on settings and weekly schedule.
 * Accurately supports overnight shifts (e.g., 12 PM - 3 AM).
 */
export function isStoreOpenNow(settings?: Partial<StoreSettings>, checkDate?: Date): StoreOpenStatus {
  const now = checkDate || new Date();
  const currentDay = getDayOfWeekFromDate(now);
  const currentDayInfo = DAYS_OF_WEEK.find((d) => d.id === currentDay)!;
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMins = currentHours * 60 + currentMinutes;
  const currentTimeFormatted = formatTime12Hour(`${currentHours}:${currentMinutes}`);

  // 1. Check Master Override Mode
  const overrideMode = settings?.scheduleOverrideMode || 'auto';
  if (overrideMode === 'force_open') {
    return {
      isOpen: true,
      statusText: 'Open (Manager Manual Override)',
      badgeText: 'OPEN (OVERRIDE)',
      reason: 'Manager has explicitly set the store to Force Open mode.',
      currentDay,
      currentDayLabel: currentDayInfo.label,
      currentTimeFormatted,
      todayHoursText: 'Manual 24/7 Override Active',
    };
  }

  if (overrideMode === 'force_closed' || settings?.isOpen === false) {
    return {
      isOpen: false,
      statusText: 'Store Closed by Management',
      badgeText: 'CLOSED',
      reason: settings?.orderClosedMessage || 'The kitchen is currently closed by restaurant management. Please check back later.',
      currentDay,
      currentDayLabel: currentDayInfo.label,
      currentTimeFormatted,
      todayHoursText: 'Kitchen Temporarily Closed',
      nextOpenText: 'Awaiting management reopening',
    };
  }

  // 2. Check Weekly Schedule
  const schedule: WeeklyOperatingHours = settings?.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
  const todaySchedule = schedule[currentDay] || { isOpen: true, openTime: '12:00', closeTime: '03:00' };
  const prevDay = getPreviousDay(currentDay);
  const prevDaySchedule = schedule[prevDay] || { isOpen: true, openTime: '12:00', closeTime: '03:00' };

  // Parse today's times
  const [tOpenH, tOpenM] = (todaySchedule.openTime || '12:00').split(':').map((x) => parseInt(x, 10) || 0);
  const [tCloseH, tCloseM] = (todaySchedule.closeTime || '03:00').split(':').map((x) => parseInt(x, 10) || 0);
  const todayOpenMins = tOpenH * 60 + tOpenM;
  const todayCloseMins = tCloseH * 60 + tCloseM;
  const todayIsOvernight = todayCloseMins <= todayOpenMins;

  // Parse yesterday's times
  const [pOpenH, pOpenM] = (prevDaySchedule.openTime || '12:00').split(':').map((x) => parseInt(x, 10) || 0);
  const [pCloseH, pCloseM] = (prevDaySchedule.closeTime || '03:00').split(':').map((x) => parseInt(x, 10) || 0);
  const prevOpenMins = pOpenH * 60 + pOpenM;
  const prevCloseMins = pCloseH * 60 + pCloseM;
  const prevIsOvernight = prevCloseMins <= prevOpenMins;

  // Case A: Are we in yesterday's late-night overnight tail?
  // (e.g. today is 01:30 AM, yesterday was overnight closing at 03:00 AM)
  if (prevDaySchedule.isOpen && prevIsOvernight && currentTotalMins < prevCloseMins) {
    const prevDayInfo = DAYS_OF_WEEK.find((d) => d.id === prevDay)!;
    return {
      isOpen: true,
      statusText: 'Open for Late-Night Orders',
      badgeText: 'LATE NIGHT OPEN',
      reason: `Serving late night orders (${prevDayInfo.label} night shift closing at ${formatTime12Hour(prevDaySchedule.closeTime)}).`,
      currentDay,
      currentDayLabel: currentDayInfo.label,
      currentTimeFormatted,
      todayHoursText: formatDaySchedule(todaySchedule),
      isOvernightActive: true,
    };
  }

  // Case B: Is today scheduled open?
  if (!todaySchedule.isOpen) {
    // Find next open day
    let nextDay = getNextDay(currentDay);
    let nextDaySchedule = schedule[nextDay];
    let daysAhead = 1;
    while (!nextDaySchedule?.isOpen && daysAhead < 7) {
      nextDay = getNextDay(nextDay);
      nextDaySchedule = schedule[nextDay];
      daysAhead++;
    }
    const nextDayInfo = DAYS_OF_WEEK.find((d) => d.id === nextDay)!;
    const nextOpenStr = nextDaySchedule?.isOpen
      ? `${nextDayInfo.label} at ${formatTime12Hour(nextDaySchedule.openTime)}`
      : 'Special announcement';

    return {
      isOpen: false,
      statusText: `Closed Today (${currentDayInfo.label})`,
      badgeText: 'CLOSED TODAY',
      reason: settings?.orderClosedMessage || `Kitchen is closed on ${currentDayInfo.label}s for maintenance & prep.`,
      currentDay,
      currentDayLabel: currentDayInfo.label,
      currentTimeFormatted,
      todayHoursText: 'Closed All Day',
      nextOpenText: nextOpenStr,
    };
  }

  // Case C: Today is open, check whether current time is within today's shift
  let isCurrentlyWithinToday = false;
  if (!todayIsOvernight) {
    // Standard daytime shift (e.g. 10:00 to 22:00)
    isCurrentlyWithinToday = currentTotalMins >= todayOpenMins && currentTotalMins < todayCloseMins;
  } else {
    // Overnight shift starting today (e.g. 12:00 PM to midnight and beyond)
    isCurrentlyWithinToday = currentTotalMins >= todayOpenMins;
  }

  if (isCurrentlyWithinToday) {
    return {
      isOpen: true,
      statusText: 'Kitchen is Sizzling Open',
      badgeText: 'OPEN NOW',
      reason: `Kitchen open until ${formatTime12Hour(todaySchedule.closeTime)}.`,
      currentDay,
      currentDayLabel: currentDayInfo.label,
      currentTimeFormatted,
      todayHoursText: formatDaySchedule(todaySchedule),
    };
  }

  // Store is closed right now. Determine when it opens next.
  let nextOpenText = '';
  if (currentTotalMins < todayOpenMins) {
    // Will open later today
    nextOpenText = `Today at ${formatTime12Hour(todaySchedule.openTime)}`;
  } else {
    // Has closed for today, check tomorrow
    const nextDay = getNextDay(currentDay);
    const nextDaySchedule = schedule[nextDay];
    const nextDayInfo = DAYS_OF_WEEK.find((d) => d.id === nextDay)!;
    if (nextDaySchedule?.isOpen) {
      nextOpenText = `Tomorrow (${nextDayInfo.label}) at ${formatTime12Hour(nextDaySchedule.openTime)}`;
    } else {
      nextOpenText = `${nextDayInfo.label} (Closed)`;
    }
  }

  return {
    isOpen: false,
    statusText: 'Kitchen Closed Outside Operating Hours',
    badgeText: 'CLOSED',
    reason: settings?.orderClosedMessage || `Orders cannot be placed outside operating hours. Today's hours: ${formatDaySchedule(todaySchedule)}.`,
    currentDay,
    currentDayLabel: currentDayInfo.label,
    currentTimeFormatted,
    todayHoursText: formatDaySchedule(todaySchedule),
    nextOpenText,
  };
}

/**
 * Builds a clean summary string across all 7 days for display in footer or headers
 */
export function generateOperatingHoursSummary(schedule?: WeeklyOperatingHours): string {
  if (!schedule) return '12:00 PM — 04:00 AM Daily (Weekends till 04:30 AM)';

  const allSame = DAYS_OF_WEEK.every((d) => {
    const s = schedule[d.id];
    const m = schedule.monday;
    return s?.isOpen === m?.isOpen && s?.openTime === m?.openTime && s?.closeTime === m?.closeTime;
  });

  if (allSame) {
    if (!schedule.monday?.isOpen) return 'Temporarily Closed';
    return `${formatTime12Hour(schedule.monday.openTime)} — ${formatTime12Hour(schedule.monday.closeTime)} (Daily)`;
  }

  const weekdaysSame = ['monday', 'tuesday', 'wednesday', 'thursday'].every((d) => {
    const s = schedule[d as DayOfWeek];
    const m = schedule.monday;
    return s?.isOpen === m?.isOpen && s?.openTime === m?.openTime && s?.closeTime === m?.closeTime;
  });

  const weekendsSame = ['friday', 'saturday', 'sunday'].every((d) => {
    const s = schedule[d as DayOfWeek];
    const f = schedule.friday;
    return s?.isOpen === f?.isOpen && s?.openTime === f?.openTime && s?.closeTime === f?.closeTime;
  });

  if (weekdaysSame && weekendsSame && schedule.monday?.isOpen && schedule.friday?.isOpen) {
    return `Mon-Thu: ${formatTime12Hour(schedule.monday.openTime)}–${formatTime12Hour(schedule.monday.closeTime)} • Fri-Sun: ${formatTime12Hour(schedule.friday.openTime)}–${formatTime12Hour(schedule.friday.closeTime)}`;
  }

  return '12:00 PM — 04:00 AM (Check daily schedule)';
}
