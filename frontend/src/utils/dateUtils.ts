/**
 * Utility functions for local date manipulations, days calculation, and Thai date formatting.
 */

/**
 * Safely parse YYYY-MM-DD string into a local Date object without timezone offset issues.
 */
export const parseLocalDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Format local Date object to YYYY-MM-DD string.
 */
export const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Calculate total days between startDate and endDate inclusive (e.g. Aug 20 to Aug 21 = 2 days).
 */
export const calculateDaysBetween = (startDateStr: string, endDateStr: string): number => {
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  if (!start || !end) return 1;
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};

/**
 * Calculate end date given a start date and number of days (inclusive).
 */
export const calculateEndDateFromDays = (startDateStr: string, days: number): string => {
  const start = parseLocalDate(startDateStr);
  if (!start || isNaN(days) || days < 1) return startDateStr;
  const end = new Date(start);
  end.setDate(start.getDate() + (days - 1));
  return formatLocalDate(end);
};

/**
 * Format start and end date range into official Thai standard format.
 * Examples:
 * - "วันที่ 20 สิงหาคม 2569" (1 day)
 * - "ระหว่างวันที่ 20 - 22 สิงหาคม 2569" (same month)
 * - "ระหว่างวันที่ 28 สิงหาคม - 2 กันยายน 2569" (different month, same year)
 * - "ระหว่างวันที่ 28 ธันวาคม 2568 - 2 มกราคม 2569" (different year)
 */
export const formatThaiDateRange = (startDateStr: string, endDateStr?: string, daysCount?: number): string => {
  const start = parseLocalDate(startDateStr);
  if (!start) return 'ตลอดระยะเวลาโครงการ';

  const TH_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  let end = parseLocalDate(endDateStr || '');
  if (!end && daysCount && daysCount > 1) {
    end = new Date(start);
    end.setDate(start.getDate() + (daysCount - 1));
  }
  if (!end) {
    end = start;
  }

  const sDay = start.getDate();
  const sMonth = TH_MONTHS[start.getMonth()];
  const sYear = start.getFullYear() + 543;

  const eDay = end.getDate();
  const eMonth = TH_MONTHS[end.getMonth()];
  const eYear = end.getFullYear() + 543;

  if (start.getTime() === end.getTime() || (!endDateStr && (!daysCount || daysCount <= 1))) {
    return `วันที่ ${sDay} ${sMonth} ${sYear}`;
  }

  if (sYear === eYear && sMonth === eMonth) {
    return `ระหว่างวันที่ ${sDay} - ${eDay} ${sMonth} ${sYear}`;
  } else if (sYear === eYear) {
    return `ระหว่างวันที่ ${sDay} ${sMonth} - ${eDay} ${eMonth} ${sYear}`;
  } else {
    return `ระหว่างวันที่ ${sDay} ${sMonth} ${sYear} - ${eDay} ${eMonth} ${eYear}`;
  }
};

/**
 * Get array of Thai day descriptions for each individual day (used in tables and Excel exports).
 * Example: ["วันพฤหัสบดีที่ 20 สิงหาคม 2569", "วันศุกร์ที่ 21 สิงหาคม 2569", ...]
 */
export const getThaiDayDates = (startDateStr: string, daysCount: number): string[] => {
  const daysOfWeek = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const datesList: string[] = [];
  const baseDate = parseLocalDate(startDateStr);

  if (baseDate && !isNaN(baseDate.getTime())) {
    for (let i = 0; i < daysCount; i++) {
      const targetDate = new Date(baseDate);
      targetDate.setDate(baseDate.getDate() + i);

      const dayName = daysOfWeek[targetDate.getDay()];
      const dayNum = targetDate.getDate();
      const monthName = months[targetDate.getMonth()];
      const yearTh = targetDate.getFullYear() + 543;

      datesList.push(`${dayName}ที่ ${dayNum} ${monthName} ${yearTh}`);
    }
  } else {
    for (let i = 1; i <= daysCount; i++) {
      datesList.push(`วันปฏิบัติการวันที่ ${i}`);
    }
  }
  return datesList;
};
