import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number to Indonesian Rupiah currency format
 * e.g. 30000 -> "Rp 30.000"
 */
export function formatIDR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(absAmount);

  return `${isNegative ? '-Rp ' : 'Rp '}${formatted}`;
}

/**
 * Convert string input with commas or dots into raw number
 */
export function parseIDRInput(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9-]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert monthly bill into weekly allocation
 */
export function convertMonthlyToWeekly(monthlyAmount: number, roundToNearestThousand = true): number {
  if (!monthlyAmount || monthlyAmount <= 0) return 0;
  const weeklyRaw = monthlyAmount / 4;
  if (!roundToNearestThousand) {
    return Math.round(weeklyRaw);
  }
  return Math.ceil(weeklyRaw / 1000) * 1000;
}

/**
 * Format date to Indonesian localized string
 */
export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Get date string for today YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface WeekOption {
  startDate: string;
  endDate: string;
  label: string;
  shortLabel: string;
  relativeLabel: string;
  isCurrentWeek: boolean;
  offset: number;
}

/**
 * Calculate weekly period info for a given offset from current week (Monday to Sunday)
 */
export function getWeekOptionByOffset(offset = 0, baseDate = new Date()): WeekOption {
  const current = new Date(baseDate);
  const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday
  const distanceToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) + offset * 7;

  const monday = new Date(current);
  monday.setDate(current.getDate() + distanceToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const startMonth = monthNames[monday.getMonth()];
  const endMonth = monthNames[sunday.getMonth()];
  const year = sunday.getFullYear();

  const label = startMonth === endMonth
    ? `${startDay} - ${endDay} ${startMonth} ${year}`
    : `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;

  const shortLabel = startMonth === endMonth
    ? `${startDay} - ${endDay} ${startMonth}`
    : `${startDay} ${startMonth} - ${endDay} ${endMonth}`;

  let relativeLabel = 'Pekan Ini';
  if (offset === -1) relativeLabel = 'Pekan Lalu';
  else if (offset < -1) relativeLabel = `${Math.abs(offset)} Pekan Lalu`;
  else if (offset === 1) relativeLabel = 'Pekan Depan';
  else if (offset > 1) relativeLabel = `${offset} Pekan Depan`;

  return {
    startDate: format(monday),
    endDate: format(sunday),
    label,
    shortLabel,
    relativeLabel,
    isCurrentWeek: offset === 0,
    offset,
  };
}

/**
 * Generate list of week options for the filter dropdown
 */
export function getWeekOptionsList(pastCount = 8, futureCount = 2): WeekOption[] {
  const list: WeekOption[] = [];
  for (let offset = futureCount; offset >= -pastCount; offset--) {
    list.push(getWeekOptionByOffset(offset));
  }
  return list;
}

/**
 * Calculate the current weekly period (Monday to Sunday)
 */
export function getCurrentWeekPeriod(date = new Date()): {
  startDate: string;
  endDate: string;
  label: string;
} {
  const currentWeek = getWeekOptionByOffset(0, date);
  return {
    startDate: currentWeek.startDate,
    endDate: currentWeek.endDate,
    label: currentWeek.label,
  };
}
