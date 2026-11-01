export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthRange(start: number, end: number): number[] {
  const result: number[] = [];
  if (start <= end) {
    for (let i = start; i <= end; i++) result.push(i);
  } else {
    for (let i = start; i <= 12; i++) result.push(i);
    for (let i = 1; i <= end; i++) result.push(i);
  }
  return result;
}

export function monthRangeLabel(start: number, end: number): string {
  if (start === 1 && end === 12) return 'Full Year';
  if (start === end) return MONTHS[start - 1];
  return `${MONTHS[start - 1]}-${MONTHS[end - 1]}`;
}

/**
 * Calculates the default compare year based on a selected base year.
 * 
 * Analysis of 3 previous versions:
 * 1. `useCustomerDashboardLayout`: Always hardcoded to `availableYears[1]`. Flaw: Doesn't adapt if user selects an older base year.
 * 2. `useTopOrdersGalleryData`: Uses `years[baseIdx + 1]`, but wraps around to `years[0]` if baseYear is the oldest year. Flaw: Comparing oldest year to newest year is visually confusing.
 * 3. `useTopOrdersAnalyticsData`: Uses `years[baseIdx + 1]`, but if baseYear is the oldest, falls back to `years[baseIdx - 1]` (the closest newer year).
 * 
 * Selected Logic (Version 3 with safety checks):
 * - If there are less than 2 years, we can't compare. Return empty string (or years[0] if forced).
 * - Find the index of baseYear.
 * - Normally, return `years[baseIdx + 1]` (the chronologically previous year, assuming descending sort).
 * - If baseYear is the oldest (last in array), fallback to `years[baseIdx - 1]` (the next closest year available).
 */
export function getDefaultCompareYear(baseYear: string, years: string[]): string {
  if (!years || years.length === 0) return '';
  if (years.length === 1) return years[0];
  
  // Ensure we are working with a descending sorted array
  const sortedDesc = [...years].sort((a, b) => Number(b) - Number(a));
  
  const baseIdx = sortedDesc.indexOf(baseYear);
  
  // If baseYear is not in the array, find the first year that is older than baseYear
  if (baseIdx === -1) {
    const older = sortedDesc.find(y => Number(y) < Number(baseYear));
    if (older) return older;
    
    // If no older year exists, return the oldest available year (which is the last element)
    return sortedDesc[sortedDesc.length - 1];
  }
  
  // If baseYear is the oldest available (last element), fallback to the closest newer year
  if (baseIdx === sortedDesc.length - 1) {
    return sortedDesc[baseIdx - 1];
  }
  
  // Otherwise, compare with the immediate older year
  return sortedDesc[baseIdx + 1];
}

export function parseListParam(value: string | null): string[] {
  if (!value) return [];
  const normalized = String(value).trim();
  if (!normalized) return [];
  return normalized.split(',').map(s => s.trim()).filter(Boolean);
}

export function parseMonths(value: string | null): string[] {
  return parseListParam(value).map(item => {
    const numeric = Number(item);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return String(numeric);
    const mIdx = MONTHS.findIndex(m => m.toLowerCase() === item.toLowerCase());
    return mIdx !== -1 ? String(mIdx + 1) : '';
  }).filter(Boolean);
}
