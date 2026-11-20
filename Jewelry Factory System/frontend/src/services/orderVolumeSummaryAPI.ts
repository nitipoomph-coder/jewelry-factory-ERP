// Order List (/dashboard/sales-customer-detail) — order lines from VW_Web_SalesDashboard via
// /api/dashboard/sales-orders (same view and filters as Sales Summary / Customer Report).
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { BASE_URL } from './poTrackerAPI';

export interface SalesOrderRow {
  ordWeek: number | null;
  orderNo: string;
  ordLineNo: number | null;
  poNo: string | null;
  po2: string | null;
  ordDate: string | null;
  dueDate: string | null;
  custDate: string | null;
  customerCode: string;
  salesName: string | null;
  shipTo: string | null;
  ordStamp: string | null;
  ordMaker: string | null;
  itemNo: string;
  itemSku: string | null;
  productTypeCode: string;
  custItem: string | null;
  itemType: string | null;
  itemMat: string | null;
  itemSize: string | null;
  itemStone: string | null;
  itemDesc: string | null;
  itemPlate: string | null;
  setType: string | null;
  itemWeight: number;
  orderQty: number;
  shippedQty: number;
  openQty: number;
  itemPrice: number;
  itemAmnt: number;
  shippedAmnt: number;
}

// Filters accepted by /api/dashboard/sales-orders (same meaning as /api/dashboard/customer-summary).
export interface SalesAnalyticsParams {
  years?: string[];
  months?: string[];
  customers?: string[];
  /** Customer codes to leave out (used for the General group) */
  excludeCustomers?: string[];
  types?: string[];
  dateField?: 'ordDate' | 'dueDate';
  startDate?: string;
  endDate?: string;
  wStart?: number;
  wEnd?: number;
}

// Builds the query string for /api/dashboard/sales-orders.
const salesAnalyticsQuery = (params: SalesAnalyticsParams = {}) => {
  const qs = new URLSearchParams();
  if (params.years?.length) qs.set('years', params.years.join(','));
  if (params.months?.length) qs.set('months', params.months.join(','));
  if (params.customers?.length) qs.set('customers', params.customers.join(','));
  if (params.excludeCustomers?.length) qs.set('excludeCustomers', params.excludeCustomers.join(','));
  if (params.types?.length) qs.set('types', params.types.join(','));
  if (params.dateField) qs.set('dateField', params.dateField);
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate) qs.set('endDate', params.endDate);
  if (params.wStart) qs.set('wStart', String(params.wStart));
  if (params.wEnd) qs.set('wEnd', String(params.wEnd));
  return qs;
};

// Order-level rows for Customer Order List drilldown.
export const fetchSalesOrders = async (params: SalesAnalyticsParams = {}): Promise<SalesOrderRow[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-orders?${qs.toString()}`);
  if (!res.ok) throw new Error(`Sales orders API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};
