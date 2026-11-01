import { fetchWithAuth } from '../utils/fetchWithAuth';
import { BASE_URL } from './poTrackerAPI';

export type SalesMetric = 'amount' | 'qty';
export type SalesDateView = 'order' | 'ship' | 'orddate' | 'duedate' | 'custdate' | 'ordmonth' | 'shipmonth';

export interface SalesCustomerGroupPoint {
  salesName?: string;
  customerCode: string;
  customerName: string;
  year: number;
  month: number;
  orderCount: number;
  qty: number;
  shippedQty: number;
  amount: number;
}

export interface SalesMonthlyPoint {
  year: number;
  month: number;
  orderCount: number;
  qty: number;
  shippedQty: number;
  gapQty: number;
  amount?: number;
  shippedAmount?: number;
  avgQtyPerOrder: number;
  avgAmountPerOrder?: number;
}

export interface SalesRiskPoint {
  year: number;
  month: number;
  custCode: string;
  wipQty: number;
  wipAmount: number;
  overdueQty: number;
  overdueAmount: number;
}

export interface DeliveryRiskBucket {
  bucket: string;
  orderCount: number;
  lineCount: number;
  totalQty: number;
  shippedQty: number;
  openQty: number;
  totalAmount: number;
  shippedAmount: number;
  openAmount: number;
}

export interface DepartmentBacklogItem {
  department: string;
  orderCount: number;
  lineCount: number;
  openQty: number;
  openAmount: number;
}

export interface CustomerBacklogItem {
  custCode: string;
  orderCount: number;
  totalQty: number;
  shippedQty: number;
  openQty: number;
  totalAmount: number;
  overdueQty: number;
  due15Qty: number;
}

export interface DeliveryOutlookResponse {
  buckets: DeliveryRiskBucket[];
  departments: DepartmentBacklogItem[];
  customers: CustomerBacklogItem[];
}

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

export interface TopItemRow {
  itemNo: string;
  itemDesc: string | null;
  itemType: string;
  itemTypeName: string;
  productTypeCode?: string;
  qty: number;
  shippedQty: number;
  amount: number;
  orderCount: number;
  avgPrice: number;
  primaryCustomerCode?: string;
  primaryCustomerName?: string;
}

// Shared filters for Customer Trends boxes and tables.
export interface SalesAnalyticsParams {
  years?: string[];
  months?: string[];
  customers?: string[];
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

// Builds the query string used by every Customer Trends endpoint.
const salesAnalyticsQuery = (params: SalesAnalyticsParams = {}) => {
  const qs = new URLSearchParams();
  if (params.years?.length) qs.set('years', params.years.join(','));
  if (params.months?.length) qs.set('months', params.months.join(','));
  if (params.customers?.length) qs.set('customers', params.customers.join(','));
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

// Delivery Outlook & Department Bottlenecks API
export const fetchSalesDeliveryOutlook = async (params: SalesAnalyticsParams = {}): Promise<DeliveryOutlookResponse> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-delivery-outlook?${qs.toString()}`);
  if (!res.ok) throw new Error(`Sales delivery outlook API error: ${res.status}`);
  const json = await res.json();
  return json.data || { buckets: [], departments: [], customers: [] };
};

// KPI and customer group rows for Customer Sales Overview.
export const fetchSalesCustomerGroups = async (params: SalesAnalyticsParams = {}): Promise<SalesCustomerGroupPoint[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-customer-groups?${qs.toString()}`);
  if (!res.ok) throw new Error(`Sales customer groups API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

export const fetchSalesMonthlyAnalytics = async (params: SalesAnalyticsParams = {}): Promise<SalesMonthlyPoint[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-monthly-analytics?${qs.toString()}`);
  if (!res.ok) throw new Error(`Sales monthly analytics API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

export const fetchSalesRiskAnalytics = async (params: SalesAnalyticsParams = {}): Promise<SalesRiskPoint[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-risk-analytics?${qs.toString()}`);
  if (!res.ok) throw new Error(`Sales risk analytics API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

// Order-level rows for Customer Order List drilldown.
export const fetchSalesOrders = async (params: SalesAnalyticsParams = {}): Promise<SalesOrderRow[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-orders?${qs.toString()}`);
  if (!res.ok) throw new Error(`Sales orders API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

// Top 30 Items table for Customer Sales Overview.
export const fetchTopItems = async (params: SalesAnalyticsParams & { metric?: SalesMetric; limit?: number } = {}): Promise<TopItemRow[]> => {
  const qs = salesAnalyticsQuery(params);
  if (params.metric) qs.set('metric', params.metric);
  if (params.limit) qs.set('limit', String(params.limit));
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/top-items?${qs.toString()}`);
  if (!res.ok) throw new Error(`Top items API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

export interface SalesWeeklyPoint {
  year: number;
  week: number;
  orderCount: number;
  qty: number;
  shippedQty: number;
  gapQty: number;
  amount: number;
  shippedAmount: number;
}

export const fetchSalesWeeklyAnalytics = async (params: SalesAnalyticsParams = {}): Promise<SalesWeeklyPoint[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-weekly-analytics?${qs.toString()}`);
  if (!res.ok) throw new Error(`Sales weekly analytics API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

export interface SalesDueOutlookPoint {
  year: number;
  month: number;
  dueQty: number;
  shippedQty: number;
  openQty: number;
  dueAmount: number;
  shippedAmount: number;
  openAmount: number;
  overdueOrders: number;
  dueSoonOrders: number;
}

export const fetchSalesDueOutlook = async (params: SalesAnalyticsParams = {}): Promise<SalesDueOutlookPoint[]> => {
  const qs = salesAnalyticsQuery(params);
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-due-outlook?${qs.toString()}`);
  if (!res.ok) throw new Error(`Sales due outlook API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};
