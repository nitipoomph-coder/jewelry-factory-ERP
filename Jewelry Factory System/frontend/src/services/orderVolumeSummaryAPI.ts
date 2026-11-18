// Order List (/dashboard/sales-customer-detail) — order lines from VW_Web_OrderTrends via /api/dashboard/sales-orders.
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { BASE_URL } from './poTrackerAPI';

export type SalesDateView = 'order' | 'ship' | 'orddate' | 'duedate' | 'custdate' | 'ordmonth' | 'shipmonth';

export interface SalesOrderRow {
  ordWeek?: number | string | null;
  orderNo: string;
  poNo: string | null;
  po2: string | null;
  ordDate: string | null;
  dueDate: string | null;
  custDate: string | null;
  customerCode: string;
  customerName?: string;
  salesName?: string | null;
  ordKind?: string | null;
  metal?: string | null;
  shipTo: string | null;
  ordStamp?: string | null;
  ordMaker?: string | null;
  itemNo: string;
  itemSku?: string;
  itemType?: string;
  productTypeCode?: string;
  custItem?: string | null;
  itemMat?: string | null;
  itemSize?: string | null;
  itemStone?: string | null;
  itemDesc?: string | null;
  itemPlate?: string | null;
  setType?: string | null;
  orderQty: number;
  shippedQty: number;
  openQty: number;
  itemPrice?: number;
  itemAmnt?: number;
  shippedAmnt?: number;
  daysToCustDue?: number;
  dueRiskBucket?: string;
  currentDepartment?: string;
  ordStatus?: string | null;
  closeStatus?: string | null;
}

// Filters accepted by /api/dashboard/sales-orders.
export interface SalesAnalyticsParams {
  years?: string[];
  months?: string[];
  customers?: string[];
  /** Customer codes to leave out (used for the General group) */
  excludeCustomers?: string[];
  types?: string[];
  dateView?: SalesDateView;
  dateField?: 'ordDate' | 'dueDate';
  startDate?: string;
  endDate?: string;
  wStart?: number;
  wEnd?: number;
  bucket?: string;
  department?: string;
}

// Builds the query string for /api/dashboard/sales-orders.
const salesAnalyticsQuery = (params: SalesAnalyticsParams = {}) => {
  const qs = new URLSearchParams();
  if (params.years?.length) qs.set('years', params.years.join(','));
  if (params.months?.length) qs.set('months', params.months.join(','));
  if (params.customers?.length) qs.set('customers', params.customers.join(','));
  if (params.excludeCustomers?.length) qs.set('excludeCustomers', params.excludeCustomers.join(','));
  if (params.types?.length) qs.set('types', params.types.join(','));
  if (params.dateView) qs.set('dateView', params.dateView);
  if (params.dateField) qs.set('dateField', params.dateField);
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate) qs.set('endDate', params.endDate);
  if (params.wStart) qs.set('wStart', String(params.wStart));
  if (params.wEnd) qs.set('wEnd', String(params.wEnd));
  if (params.bucket) qs.set('bucket', params.bucket);
  if (params.department) qs.set('department', params.department);
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
