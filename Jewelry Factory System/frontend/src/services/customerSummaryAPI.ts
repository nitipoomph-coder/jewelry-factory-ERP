import { fetchWithAuth } from '../utils/fetchWithAuth';
import { BASE_URL } from './poTrackerAPI';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface CustomerTopItemSummary {
  topItem?: string;
  topItemQty?: number | string;
  productType?: string;
}

export interface CustomerSummaryRecord {
  id: string;
  name?: string;
  monthly?: Record<string, Record<string, number | string>>;
  monthlyQty?: Record<string, Record<string, number | string>>;
  topItemsByYear?: Record<string, CustomerTopItemSummary>;
  topItemsByYearByType?: Record<string, Record<string, CustomerTopItemSummary>>;
  topItem?: string;
  topItemQty?: number | string;
}

// Customer Summary data for Customer Dashboard and Top Orders first load.
interface FetchCustomerSummaryParams {
  years: string[];
  months?: string[];
  startDate?: string;
  endDate?: string;
  wStart?: number;
  wEnd?: number;
  dateField?: 'ordDate' | 'dueDate';
}

// Customer Summary data for Customer Dashboard and Top Orders first load.
export const fetchCustomerSummary = async (params: FetchCustomerSummaryParams): Promise<CustomerSummaryRecord[]> => {
  const yearsParam = params.years.join(',');
  let url = `${BASE_URL}/dashboard/customer-summary?years=${yearsParam}`;
  // Period/month filter changes the DB summary, so it is sent to the API.
  if (params.months && params.months.length > 0) {
    const monthsParam = params.months
      .map(m => {
        const n = Number(m);
        if (!isNaN(n) && n >= 1 && n <= 12) return n;
        return MONTHS.indexOf(m) + 1;
      })
      .filter(n => n >= 1 && n <= 12)
      .join(',');
    if (monthsParam) {
      url += `&months=${monthsParam}`;
    }
  }
  if (params.startDate && params.endDate) {
    url += `&startDate=${params.startDate}&endDate=${params.endDate}`;
  }
  if (params.wStart && params.wEnd) {
    url += `&wStart=${params.wStart}&wEnd=${params.wEnd}`;
  }
  if (params.dateField) {
    url += `&dateField=${params.dateField}`;
  }
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error(`Customer summary API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};
