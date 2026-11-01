import { fetchWithAuth } from '../utils/fetchWithAuth';
// src/services/dashboardAPI.ts

export interface StatCard {
  label: string;
  value: number;
  change: string;
  trend: 'up' | 'down' | 'bad' | 'good';
  isAlert?: boolean;
  yoyPct?: number | null;
  yoyLabel?: string;
}

export interface TrendPoint {
  day: string;
  date: string;
  count: number;
}

export interface ProcessSegment {
  label: string;
  value: number;
}

export interface ProcessDistribution {
  total: number;
  segments: ProcessSegment[];
}

export interface MaterialBreakdown {
  material: string;
  code: string;
  orders: number;
  qty: number;
}

export interface OrderType {
  type: string;
  count: number;
}

export interface TopCustomer {
  code: string;
  name: string;
  orders: number;
  qty: number;
}

export interface DelayOrder {
  ordNo: string;
  poNo: string;
  custCode: string;
  custName: string;
  dueDate: string;
  delayDays: number;
  qty: number;
}

export interface RecentOrder {
  ordNo: string;
  poNo: string;
  custCode: string;
  ordDate: string;
  material: string;
  type: string;
  qty: number;
  status: string;
}

export interface StoneFindingSummary {
  totalItems: number;
  stone: { pending: number; done: number; pendingQty: number };
  finding: { pending: number; done: number; pendingQty: number };
}

export interface CockpitKpi {
  totalWipPcs: number;
  totalWipOrders: number;
  fbeOutputPcs: number;
  fbeShare: number;
  cllOutputPcs: number;
  cllShare: number;
  dailyRunRate: number;
  activeWorkdays: number;
  overdueCount: number;
  overduePcs: number;
  onTimeRate: number;
}

export interface CockpitTimelinePoint {
  month: number;
  label: string;
  fbe: number;
  cll: number;
  total: number;
  dailyAvg: number;
}

export interface CockpitPipelineStage {
  id: string;
  name: string;
  pcs: number;
  isBottleneck: boolean;
  sharePct: number;
}

export interface CockpitDepartment {
  code: string;
  name: string;
  seq: number;
  fbePcs: number;
  cllPcs: number;
  totalPcs: number;
  sharePct: number;
  dailyAvg: number;
}

export interface CockpitCustomerShare {
  code: string;
  name: string;
  orders: number;
  qty: number;
  sharePct: number;
}

export interface CockpitOverdueOrder {
  ordNo: string;
  poNo: string;
  custCode: string;
  dueDate: string;
  delayDays: number;
  qty: number;
  facility: 'FBE' | 'CLL';
}

export interface DualPipelineLane {
  facility: 'FBE' | 'CLL';
  facilityName: string;
  wipPcs: number;
  wipOrders: number;
  bottleneckStage: string;
  stages: CockpitPipelineStage[];
}

export interface DualPipelineData {
  cll: DualPipelineLane;
  fbe: DualPipelineLane;
}

export interface CockpitBundle {
  facility: 'ALL' | 'FBE' | 'CLL';
  kpi: CockpitKpi;
  timeline: CockpitTimelinePoint[];
  pipeline: CockpitPipelineStage[];
  dualPipeline?: DualPipelineData;
  departments: CockpitDepartment[];
  customerShare: CockpitCustomerShare[];
  overdueOrders: CockpitOverdueOrder[];
}

export interface DashboardData {
  cockpit?: CockpitBundle;
  statCards: StatCard[];
  orderTrend: TrendPoint[];
  processDistribution: ProcessDistribution;
  materialBreakdown: MaterialBreakdown[];
  orderTypes: OrderType[];
  topCustomers: TopCustomer[];
  delayOrders: DelayOrder[];
  recentOrders: RecentOrder[];
  stoneFindings: StoneFindingSummary;
}

import { BASE_URL } from './poTrackerAPI';

export const fetchDashboardData = async (
  year?: number | string,
  facility?: 'ALL' | 'FBE' | 'CLL'
): Promise<DashboardData> => {
  const params = new URLSearchParams();
  if (year && year !== 'all') params.set('year', String(year));
  if (facility) params.set('facility', facility);
  const qStr = params.toString() ? `?${params.toString()}` : '';
  const url = `${BASE_URL}/dashboard${qStr}`;
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error(`Dashboard API error: ${res.status}`);
  return await res.json();
};

// Card detail (year-over-year)

export interface MonthlyData {
  month: number;
  label: string;
  labelTh?: string;
  isFuture: boolean;
  year1: number | null;
  year1Qty: number | null;
  year2: number;
  year2Qty: number;
}

export interface BreakdownItem {
  code: string;
  name: string;
  year1: number;
  year2: number;
  year1Qty: number;
  year2Qty: number;
  changePct: number;
}

export interface CardDetailData {
  ok: boolean;
  cardType: string;
  year1: number;
  year2: number;
  summary: {
    year1Total: number;
    year2Total: number;
    year1Qty: number;
    year2Qty: number;
    changePct: number;
  };
  monthly: MonthlyData[];
  breakdown: BreakdownItem[];
}

export type CardType = 'today' | 'completed' | 'wip' | 'overdue' | 'month';

export const fetchCardDetail = async (cardType: CardType, year1: number, year2: number): Promise<CardDetailData> => {
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/detail/${cardType}?year1=${year1}&year2=${year2}`);
  if (!res.ok) throw new Error(`Detail API error: ${res.status}`);
  return await res.json();
};

export interface AvailableYearsResponse {
  years: number[];
  firstDataYear: number | null;
}

export const fetchAvailableYearsMeta = async (): Promise<AvailableYearsResponse> => {
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/years`);
  if (!res.ok) throw new Error(`Years API error: ${res.status}`);
  const json = await res.json();
  const years = json.years || [];
  return {
    years,
    firstDataYear: json.firstDataYear ?? years[0] ?? null,
  };
};

export const fetchAvailableYears = async (): Promise<number[]> => {
  const { years } = await fetchAvailableYearsMeta();
  return years;
};

export const fetchSalesSummary = async (years: string[]): Promise<Record<string, unknown>[]> => {
  const yearsParam = years.join(',');
  const res = await fetchWithAuth(`${BASE_URL}/dashboard/sales-summary?years=${yearsParam}`);
  if (!res.ok) throw new Error(`Sales summary API error: ${res.status}`);
  const json = await res.json();
  return json.data || [];
};

export { fetchCustomerSummary } from './customerSummaryAPI';
export {
  fetchSalesCustomerGroups,
  fetchSalesMonthlyAnalytics,
  fetchSalesRiskAnalytics,
  fetchSalesOrders,
  fetchTopItems,
} from './orderVolumeSummaryAPI';
export type {
  SalesMetric,
  SalesDateView,
  SalesCustomerGroupPoint,
  SalesMonthlyPoint,
  SalesRiskPoint,
  SalesOrderRow,
  TopItemRow,
} from './orderVolumeSummaryAPI';
export {
  fetchItemYearlySummary,
  fetchItemCustomerYearlySummary,
  fetchItemsYearlySummary,
} from './itemYearlySummaryAPI';
export type {
  TrendTotals,
  YearTrendRow,
  ItemYearlySummaryItem,
  ItemsYearlySummaryResponse,
  ItemCustomerYearlySummaryPair,
  ItemCustomerYearlySummaryItem,
  ItemCustomerYearlySummaryResponse,
  ItemYearlySummaryResponse,
} from './itemYearlySummaryAPI';
