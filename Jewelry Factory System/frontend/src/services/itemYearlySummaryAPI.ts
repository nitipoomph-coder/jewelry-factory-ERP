import { fetchWithAuth } from '../utils/fetchWithAuth';
import { BASE_URL } from './poTrackerAPI';

export interface TrendTotals {
  qty: number;
  value: number;
  orderCount: number;
  lineCount: number;
}

export interface YearTrendRow extends TrendTotals {
  year: number;
  hasData: boolean;
  status: 'base' | 'ok' | 'new' | 'no_data';
  yoyQtyPct: number | null;
  yoyValuePct: number | null;
}

export interface ItemYearlySummaryItem {
  styleNo: string;
  normalizedStyleNo: string;
  combined: TrendTotals;
  data: YearTrendRow[];
}

export interface ItemsYearlySummaryResponse {
  ok: boolean;
  years: number[];
  data: ItemYearlySummaryItem[];
}

export interface ItemCustomerYearlySummaryPair {
  customerCode: string;
  styleNo: string;
}

export interface ItemCustomerYearlySummaryItem extends ItemYearlySummaryItem {
  customerCode: string;
  normalizedCustomerCode: string;
}

export interface ItemCustomerYearlySummaryResponse {
  ok: boolean;
  years: number[];
  data: ItemCustomerYearlySummaryItem[];
}

export interface ItemYearlySummaryResponse {
  ok: boolean;
  styleNo: string;
  years: number[];
  combined: TrendTotals;
  data: YearTrendRow[];
}

// Single item trend used by item yearly detail views.
export const fetchItemYearlySummary = async (styleNo: string, years: string[]): Promise<ItemYearlySummaryResponse> => {
  const qs = new URLSearchParams();
  if (years.length) qs.set('years', years.join(','));
  const res = await fetchWithAuth(`${BASE_URL}/items/${encodeURIComponent(styleNo)}/yearly-summary?${qs.toString()}`);
  if (!res.ok) throw new Error(`Item yearly summary API error: ${res.status}`);
  return await res.json();
};

// Customer+item comparison data used by Top Orders compare mode.
export const fetchItemCustomerYearlySummary = async (pairs: ItemCustomerYearlySummaryPair[], years: string[], months?: string[], dateField?: string): Promise<ItemCustomerYearlySummaryResponse> => {
  const qs = new URLSearchParams();
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (pairs.length) qs.set('pairs', pairs.map(pair => `${pair.customerCode}|${pair.styleNo}`).join(','));
  if (years.length) qs.set('years', years.join(','));
  if (months && months.length > 0) qs.set('months', months.map(m => MONTHS.indexOf(m) + 1).join(','));
  if (dateField) qs.set('dateField', dateField);
  const res = await fetchWithAuth(`${BASE_URL}/items/yearly-summary?${qs.toString()}`);
  if (!res.ok) throw new Error(`Item customer yearly summary API error: ${res.status}`);
  return await res.json();
};

// Batch item trend lookup for multi-item yearly summaries.
export const fetchItemsYearlySummary = async (styleNos: string[], years: string[], dateField?: string): Promise<ItemsYearlySummaryResponse> => {
  const qs = new URLSearchParams();
  if (styleNos.length) qs.set('styles', styleNos.join(','));
  if (years.length) qs.set('years', years.join(','));
  if (dateField) qs.set('dateField', dateField);
  const res = await fetchWithAuth(`${BASE_URL}/items/yearly-summary?${qs.toString()}`);
  if (!res.ok) throw new Error(`Items yearly summary API error: ${res.status}`);
  return await res.json();
};

export interface TopGalleryCustomerBreakdown {
  custCode: string;
  groupId: string;
  groupLabel: string;
  qty: number;
  amount: number;
  baseYearQty?: number;
  baseYearAmnt?: number;
  compareYearQty?: number;
  compareYearAmnt?: number;
}

export interface TopGalleryItem {
  rank: number;
  itemNo: string;
  itemDesc: string;
  productType: string;
  productCategory: string;
  productTypeLabel: string;
  primaryCustCode: string;
  primaryGroupId: string;
  primaryGroupLabel: string;
  customersCount: number;
  totalCombinedQty: number;
  totalCombinedAmnt: number;
  baseYearQty: number;
  baseYearAmnt: number;
  compareYearQty: number;
  compareYearAmnt: number;
  qtyDiff: number;
  yoyGrowthPct: number | null;
  shareOfPortfolioQtyPct: number;
  shareOfPortfolioAmntPct: number;
  baseYearShareOfPortfolioQtyPct?: number;
  baseYearShareOfPortfolioAmntPct?: number;
  yearlyTotals: Record<string, { qty: number; amount: number }>;
  monthlyBreakdown: Record<string, Record<string, number>>;
  weeklyBreakdown: Record<string, Record<string, number>>;
  customerBreakdown: TopGalleryCustomerBreakdown[];
}

export interface TopGallerySummary {
  totalItemsCount: number;
  portfolioTotalQty: number;
  portfolioTotalAmnt: number;
  baseYearTotalQty: number;
  baseYearTotalAmnt: number;
  compareYearTotalQty: number;
  compareYearTotalAmnt: number;
}

export interface TopGalleryResponse {
  ok: boolean;
  years: number[];
  baseYear: number;
  compareYear: number | null;
  summary: TopGallerySummary;
  items: TopGalleryItem[];
}

export interface TopGalleryParams {
  years?: string[];
  months?: string[];
  baseYear?: string;
  compareYear?: string;
  groups?: string[];
  productType?: string;
  metric?: 'qty' | 'amount';
  search?: string;
  limit?: number;
  rankBy?: 'combined' | 'base' | 'growth';
  dateField?: 'ordDate' | 'dueDate';
  startDate?: string;
  endDate?: string;
  wStart?: number;
  wEnd?: number;
  salesName?: string;
}

export const fetchTopItemsGallery = async (params: TopGalleryParams): Promise<TopGalleryResponse> => {
  const qs = new URLSearchParams();
  if (params.years?.length) qs.set('years', params.years.join(','));
  if (params.months?.length) qs.set('months', params.months.join(','));
  if (params.baseYear) qs.set('baseYear', params.baseYear);
  if (params.compareYear) qs.set('compareYear', params.compareYear);
  if (params.groups?.length) qs.set('groups', params.groups.join(','));
  if (params.productType) qs.set('productType', params.productType);
  if (params.metric) qs.set('metric', params.metric);
  if (params.search) qs.set('search', params.search);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.rankBy) qs.set('rankBy', params.rankBy);
  if (params.dateField) qs.set('dateField', params.dateField);
  if (params.salesName && params.salesName !== 'ALL') qs.set('salesName', params.salesName);
  if (params.startDate && params.endDate) {
    qs.set('startDate', params.startDate);
    qs.set('endDate', params.endDate);
  }
  if (params.wStart && params.wEnd) {
    qs.set('wStart', String(params.wStart));
    qs.set('wEnd', String(params.wEnd));
  }

  const res = await fetchWithAuth(`${BASE_URL}/items/top-gallery?${qs.toString()}`);
  if (!res.ok) throw new Error(`Top gallery API error: ${res.status}`);
  return await res.json();
};

export const fetchAvailableSalespersons = async (): Promise<string[]> => {
  const res = await fetchWithAuth(`${BASE_URL}/items/salespersons`);
  if (!res.ok) throw new Error(`Fetch salespersons API error: ${res.status}`);
  const data = await res.json();
  return data.salespersons || [];
};
