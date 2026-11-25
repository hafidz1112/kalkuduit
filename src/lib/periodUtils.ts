export function convertMonthlyToWeekly(monthlyAmount: number, roundToNearestThousand = true): number {
  if (!monthlyAmount || monthlyAmount <= 0) return 0;
  const weeklyRaw = monthlyAmount / 4;
  if (!roundToNearestThousand) {
    return Math.round(weeklyRaw);
  }
  return Math.ceil(weeklyRaw / 1000) * 1000;
}

export function convertWeeklyToMonthly(weeklyAmount: number): number {
  if (!weeklyAmount || weeklyAmount <= 0) return 0;
  return weeklyAmount * 4;
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

export function getWeekOptionByOffset(offset = 0, baseDate = new Date()): WeekOption {
  const current = new Date(baseDate);
  const dayOfWeek = current.getDay();
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
