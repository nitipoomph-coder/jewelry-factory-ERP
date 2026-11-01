import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import {
  fetchSalesOrders,
  fetchSalesMonthlyAnalytics,
  fetchSalesDeliveryOutlook,
  fetchSalesRiskAnalytics,
  type SalesOrderRow,
  type SalesMonthlyPoint,
  type DeliveryOutlookResponse,
  type SalesRiskPoint,
  type SalesAnalyticsParams
} from '../services/orderVolumeSummaryAPI';
export type { SalesOrderRow } from '../services/orderVolumeSummaryAPI';
import { CUSTOMER_GROUPS, getCustomerGroupId } from '../config/customerGroups';
import { useCustomerPageFilters } from './useCustomerPageFilters';

// --- Types ---
export type Metric = 'amount' | 'qty';
export type TrendGranularity = 'monthly' | 'weekly';

export type ViewMode = 'overview' | 'details';
export type DrilldownBasis = 'order' | 'due' | 'risk';
export type Drilldown = { year: string; month?: string; week?: number; type?: string; basis?: DrilldownBasis; metric?: Metric };
export type SalesTotals = {
  avgQtyPerOrder: number;
  avgAmountPerOrder: number;
  qty: number;
  amount: number;
  shippedQty: number;
  shippedAmount: number;
  gapQty: number;
  gapAmount: number;
  orders: number;
};
export type TrendComparisonDatum = {
  label: string;
  periodNumber: number;
  report: number;
  compare: number;
  reportShipped?: number;
  compareShipped?: number;
};
export type WeeklyComparisonGroup = {
  monthNumber: number;
  monthLabel: string;
  weeks: Array<TrendComparisonDatum & { dateRange: string }>;
};
export type TooltipPayloadEntry = {
  color?: string;
  dataKey?: string | number;
  name?: string;
  payload?: TrendComparisonDatum;
  value?: number;
};

export type DueOutlookDatum = {
  monthNumber: number;
  monthLabel: string;
  dueQty: number;
  shippedQty: number;
  openQty: number;
  dueAmount: number;
  shippedAmount: number;
  openAmount: number;
  overdueOrders: number;
  dueSoonOrders: number;
};

export const ORDER_DETAIL_COLUMNS = [
  ['No.', 45],
  ['Week', 55],
  ['Cust', 65],
  ['PO No.', 110],
  ['PO 2', 95],
  ['New/Replen', 80],
  ['Metal', 55],
  ['Item No.', 110],
  ['Ship To', 75],
  ['Order Date', 90],
  ['Due Date', 90],
  ['Status', 110],
  ['Factory Stage', 95],
  ['Ordered Qty', 75],
  ['Total Value ($)', 95],
  ['Shipped Qty', 75],
  ['Backlog Qty', 75],
  ['Backlog Value ($)', 95],
  ['Days +/-', 60]
] as const;

// --- Helpers ---
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const emptyTotals: SalesTotals = { avgQtyPerOrder: 0, avgAmountPerOrder: 0, qty: 0, amount: 0, shippedQty: 0, shippedAmount: 0, gapQty: 0, gapAmount: 0, orders: 0 };

function selectedCustomerCodes(groupIds: string[]) {
  if (groupIds.length === 0) return [];
  return CUSTOMER_GROUPS.filter(group => groupIds.includes(group.id)).flatMap(group => group.prefixes);
}

function calcTotalsFromMonthly(rows: SalesMonthlyPoint[], year: string): SalesTotals {
  const yearNum = Number(year);
  const filtered = rows.filter(r => r.year === yearNum);
  if (filtered.length === 0) return emptyTotals;
  const qty = filtered.reduce((s, r) => s + (r.qty || 0), 0);
  const amount = filtered.reduce((s, r) => s + (r.amount || 0), 0);
  const shippedQty = filtered.reduce((s, r) => s + (r.shippedQty || 0), 0);
  const shippedAmount = filtered.reduce((s, r) => s + (r.shippedAmount || 0), 0);
  const gapQty = filtered.reduce((s, r) => s + (r.gapQty || 0), 0);
  const gapAmount = amount > shippedAmount ? amount - shippedAmount : 0;
  const orders = filtered.reduce((s, r) => s + (r.orderCount || 0), 0);
  const avgQtyPerOrder = orders > 0 ? qty / orders : 0;
  const avgAmountPerOrder = orders > 0 ? amount / orders : 0;
  return { avgQtyPerOrder, avgAmountPerOrder, qty, amount, shippedQty, shippedAmount, gapQty, gapAmount, orders };
}

function buildMonthlyComparison(rows: SalesMonthlyPoint[], primaryYear: string, compareYear?: string, metric: Metric = 'amount'): TrendComparisonDatum[] {
  const pYear = Number(primaryYear);
  const cYear = compareYear ? Number(compareYear) : null;
  const data: TrendComparisonDatum[] = [];
  for (let m = 1; m <= 12; m++) {
    const primary = rows.find(r => r.year === pYear && r.month === m);
    const compare = cYear ? rows.find(r => r.year === cYear && r.month === m) : null;
    const report = metric === 'amount' ? (primary?.amount || 0) : (primary?.qty || 0);
    const comp = metric === 'amount' ? (compare?.amount || 0) : (compare?.qty || 0);
    if (report > 0 || comp > 0) {
      data.push({
        label: MONTHS[m - 1],
        periodNumber: m,
        report,
        compare: comp,
        reportShipped: metric === 'amount' ? (primary?.shippedAmount || 0) : (primary?.shippedQty || 0),
        compareShipped: metric === 'amount' ? (compare?.shippedAmount || 0) : (compare?.shippedQty || 0),
      });
    }
  }
  return data;
}



export function growthPercent(primary: number, compare: number) {
  if (compare === 0) return 0;
  return ((primary - compare) / compare) * 100;
}

export function formatDmY(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export const fmtQty = (value: number) => (value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
export const fmtCurrency = (value: number) => `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtMetric = (value: number, metric: Metric) => metric === 'amount' ? fmtCurrency(value) : fmtQty(value);
export const fmtSignedMetric = (value: number, metric: Metric) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${fmtMetric(Math.abs(value), metric)}`;
export const fmtPercent = (value: number) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${Math.abs(value).toFixed(1)}%`;
const compactNumber = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
export const fmtAxis = (value: number, metric: Metric) => metric === 'amount' ? `$${compactNumber.format(value)}` : `${compactNumber.format(value)}`;

export function useOrderVolumeSummaryData() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { availableYears, refreshCounter, setIsRefreshing, triggerRefresh, isRefreshing, setIsChildLoading } = useOutletContext<import('../pages/CustomerDashboardLayout').CustomerDashboardOutletContext>();

  // Pass an empty custData for now or fetch it if needed for dynamic groups, but typically Trends can just use availableYears.
  // Wait, does Trends need dynamic active groups? It's fine to just use the default.
  const { periodSetup, selGroups: selectedGroups, setSelGroups, toggleGroup, dynamicActiveGroups, isFiltered, resetFilters } = useCustomerPageFilters(availableYears, { presets: ['full-year', 'ytd', 'month', 'week', 'day', 'custom'], allowWeekRange: true }, []);

  const selectedYears = periodSetup?.committed?.selectedYears || [];
  const selectedMonths = periodSetup?.committed?.selectedMonths || [];
  const kpiCompareYear = periodSetup?.committed?.kpiCompareYear;
  const draftYear = periodSetup?.draft?.baseYear;
  const compareYearVal1 = periodSetup?.draft?.compareYear1;

  const loadRequestIdRef = useRef(0);
  const urlMetric = searchParams.get('metric') as Metric | null;
  const metric: Metric = urlMetric === 'qty' ? 'qty' : 'amount';

  const switchMetric = (m: Metric) => {
    const newParams = new URLSearchParams(searchParams);
    if (m === 'qty') newParams.set('metric', 'qty');
    else newParams.delete('metric');
    setSearchParams(newParams, { replace: true });
  };

  const [activeView, setActiveView] = useState<ViewMode>('overview');
  const [drilldown, setDrilldown] = useState<Drilldown | null>(null);

  const [monthlyData, setMonthlyData] = useState<SalesMonthlyPoint[]>([]);
  const [deliveryOutlookData, setDeliveryOutlookData] = useState<DeliveryOutlookResponse | null>(null);
  const [riskData, setRiskData] = useState<SalesRiskPoint[]>([]);

  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedCustCode, setSelectedCustCode] = useState<string | null>(null);

  const [drilldownOrders, setDrilldownOrders] = useState<SalesOrderRow[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const yearsLoading = availableYears.length === 0;
  const [loading, setLoading] = useState(true);
  const [hasResolvedData, setHasResolvedData] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const customers = useMemo(() => selectedCustomerCodes(selectedGroups), [selectedGroups]);
  const customersKey = customers.join('|');
  const selectedYearsKey = selectedYears.join('|');
  const selectedMonthsKey = selectedMonths.join('|');

  const drilldownKey = drilldown ? `${drilldown.basis || 'order'}|${drilldown.year}|${drilldown.month || 'all'}|${drilldown.week || 'all'}|${drilldown.type || 'all'}` : 'all';
  const filterPageKey = `${selectedYearsKey}|${selectedGroups.join('|')}|${search}|${drilldownKey}|${selectedBucket || ''}|${selectedDepartment || ''}|${selectedCustCode || ''}`;

  useEffect(() => {
    const resetTimer = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(resetTimer);
  }, [filterPageKey]);

  const loadOverviewData = useCallback(async () => {
    if (yearsLoading) return;
    const requestId = ++loadRequestIdRef.current;
    if (selectedYearsKey.length === 0) {
      setMonthlyData([]);
      setDeliveryOutlookData(null);
      setHasResolvedData(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setHasResolvedData(false);
    setError('');

    const apiParams = {
      years: selectedYearsKey ? selectedYearsKey.split('|') : [],
      months: selectedMonthsKey ? selectedMonthsKey.split('|') : [],
      customers: customersKey ? customersKey.split('|') : [],
      startDate: periodSetup.committed.dateFrom,
      endDate: periodSetup.committed.dateTo,
      wStart: periodSetup.committed.weekFrom,
      wEnd: periodSetup.committed.weekTo,
      dateField: periodSetup.committed.dateField,
    };

    try {
      const [monthlyResult, deliveryResult, riskResult] = await Promise.allSettled([
        fetchSalesMonthlyAnalytics(apiParams),
        fetchSalesDeliveryOutlook(apiParams),
        fetchSalesRiskAnalytics(apiParams)
      ]);

      if (requestId !== loadRequestIdRef.current) return;

      if (monthlyResult.status === 'fulfilled') setMonthlyData(monthlyResult.value);
      else { setMonthlyData([]); setError(monthlyResult.reason instanceof Error ? monthlyResult.reason.message : 'Failed to load monthly analytics'); }

      if (deliveryResult.status === 'fulfilled') setDeliveryOutlookData(deliveryResult.value);
      else setDeliveryOutlookData(null);
      
      if (riskResult.status === 'fulfilled') setRiskData(riskResult.value);
      else setRiskData([]);

      if (monthlyResult.status === 'fulfilled' || deliveryResult.status === 'fulfilled' || riskResult.status === 'fulfilled') {
        setHasResolvedData(true);
      }
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      setMonthlyData([]);
      setDeliveryOutlookData(null);
      setRiskData([]);
      setError(err instanceof Error ? err.message : 'Failed to load order volume summary');
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
        if (setIsChildLoading) setIsChildLoading(false);
        if (setIsRefreshing) setIsRefreshing(false);
      }
    }
  }, [customersKey, selectedYearsKey, selectedMonthsKey, yearsLoading, setIsChildLoading, setIsRefreshing]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadOverviewData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadOverviewData]);

  useEffect(() => () => {
    loadRequestIdRef.current += 1;
  }, []);

  const primaryYear = draftYear || availableYears[availableYears.length - 1] || '';
  const compareYear = kpiCompareYear === 'none' ? 'none' : (kpiCompareYear && selectedYears.includes(kpiCompareYear) && kpiCompareYear !== primaryYear)
    ? kpiCompareYear
    : compareYearVal1 || 'none';
  const hasCompareYear = compareYear !== 'none';

  const primaryTotals = useMemo(() => calcTotalsFromMonthly(monthlyData, primaryYear), [monthlyData, primaryYear]);
  const compareTotals = useMemo(() => hasCompareYear ? calcTotalsFromMonthly(monthlyData, compareYear) : emptyTotals, [monthlyData, compareYear, hasCompareYear]);
  const primaryMetric = metric === 'amount' ? primaryTotals.amount : primaryTotals.qty;

  const selectedTypeTotals = useMemo(() => {
    return {
      primary: primaryTotals,
      compare: compareTotals,
      isFiltered: false,
      typeName: 'All Types'
    };
  }, [primaryTotals, compareTotals]);

  const kpiPrimaryMetric = metric === 'amount' ? selectedTypeTotals.primary.amount : selectedTypeTotals.primary.qty;
  const kpiCompareMetric = metric === 'amount' ? selectedTypeTotals.compare.amount : selectedTypeTotals.compare.qty;
  const kpiChangeAmount = hasCompareYear ? kpiPrimaryMetric - kpiCompareMetric : 0;
  const kpiGrowthRate = hasCompareYear && kpiCompareMetric !== 0 ? growthPercent(kpiPrimaryMetric, kpiCompareMetric) : null;
  const kpiDeliveryRate = selectedTypeTotals.primary.qty > 0 ? (selectedTypeTotals.primary.shippedQty / selectedTypeTotals.primary.qty) * 100 : 0;
  const kpiCompareDeliveryRate = selectedTypeTotals.compare.qty > 0 ? (selectedTypeTotals.compare.shippedQty / selectedTypeTotals.compare.qty) * 100 : null;
  const kpiOutstandingMetric = metric === 'amount' ? selectedTypeTotals.primary.gapAmount : selectedTypeTotals.primary.gapQty;

  const loadDrilldownOrders = useCallback(async (dd: Drilldown) => {
    setDrilldownLoading(true);
    setDrilldownOrders([]);
    try {
      const params: SalesAnalyticsParams = {
        years: [dd.year],
        months: dd.month ? [dd.month] : selectedMonths,
        customers,
      };
      if (dd.type) params.types = [dd.type];
      if (dd.basis === 'due') params.dateView = 'custdate';

      const orders = await fetchSalesOrders(params);
      setDrilldownOrders(orders);
    } catch {
      setDrilldownOrders([]);
    } finally {
      setDrilldownLoading(false);
    }
  }, [selectedMonths, customers]);

  const loadFilteredDeliveryOrders = useCallback(async (bucket: string | null, dept: string | null, custCode: string | null) => {
    setDrilldownLoading(true);
    setActiveView('details');
    try {
      const params: SalesAnalyticsParams = {
        years: selectedYears,
        months: selectedMonths,
        customers: custCode ? [custCode] : customers,
      };
      if (bucket) params.bucket = bucket;
      if (dept) params.department = dept;
      const orders = await fetchSalesOrders(params);
      setDrilldownOrders(orders);
      setDrilldown({
        basis: 'due',
        year: primaryYear,
        type: dept ? `Dept: ${dept}` : bucket ? `Risk: ${bucket}` : custCode ? `Cust: ${custCode}` : undefined
      });
    } catch {
      setDrilldownOrders([]);
    } finally {
      setDrilldownLoading(false);
    }
  }, [selectedYears, selectedMonths, customers, primaryYear]);

  const handleSelectBucket = (bucket: string | null) => {
    setSelectedBucket(bucket);
    if (bucket) {
      void loadFilteredDeliveryOrders(bucket, selectedDepartment, selectedCustCode);
    }
  };

  const handleSelectDepartment = (dept: string | null) => {
    setSelectedDepartment(dept);
    if (dept) {
      void loadFilteredDeliveryOrders(selectedBucket, dept, selectedCustCode);
    }
  };

  const handleSelectCustCode = (custCode: string | null) => {
    setSelectedCustCode(custCode);
    if (custCode) {
      void loadFilteredDeliveryOrders(selectedBucket, selectedDepartment, custCode);
    }
  };

  const monthlyComparisonData = useMemo(
    () => buildMonthlyComparison(monthlyData, primaryYear, hasCompareYear ? compareYear : undefined, metric),
    [monthlyData, primaryYear, compareYear, hasCompareYear, metric],
  );



  const [selectedCustGroup, setSelectedCustGroup] = useState<string | null>(null);

  const filteredOrderRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = drilldownOrders;

    if (q) {
      rows = rows.filter(row => [
        row.orderNo,
        row.poNo,
        row.itemNo,
        row.customerCode,
        row.productTypeCode,
      ].some(value => String(value || '').toLowerCase().includes(q)));
    }

    if (selectedDepartment && selectedDepartment !== 'ALL') {
      rows = rows.filter(row => (row.currentDepartment || 'Wax / Preparation') === selectedDepartment);
    }

    if (selectedBucket && selectedBucket !== 'ALL') {
      rows = rows.filter(row => (row.dueRiskBucket || 'Scheduled') === selectedBucket);
    }

    if (selectedCustGroup && selectedCustGroup !== 'ALL') {
      rows = rows.filter(row => getCustomerGroupId(row.customerCode) === selectedCustGroup);
    }

    return [...rows].sort((a, b) => {
      // most overdue first (daysToCustDue asc)
      const daysA = a.daysToCustDue !== undefined && a.daysToCustDue !== null ? a.daysToCustDue : 99999;
      const daysB = b.daysToCustDue !== undefined && b.daysToCustDue !== null ? b.daysToCustDue : 99999;
      if (daysA !== daysB) return daysA - daysB;
      // fallback
      const dateSort = (a.ordDate ? new Date(a.ordDate).getTime() : 0) - (b.ordDate ? new Date(b.ordDate).getTime() : 0);
      return dateSort || String(a.orderNo || '').localeCompare(String(b.orderNo || ''));
    });
  }, [drilldownOrders, search, selectedDepartment, selectedBucket, selectedCustGroup]);

  const loadAllDetailsOrders = useCallback(async () => {
    if (selectedYears.length === 0) return;
    setDrilldownLoading(true);
    try {
      const params: SalesAnalyticsParams = {
        years: selectedYears,
        months: selectedMonths,
        customers: selectedCustCode ? [selectedCustCode] : customers,
      };
      if (selectedBucket) params.bucket = selectedBucket;
      if (selectedDepartment) params.department = selectedDepartment;

      const orders = await fetchSalesOrders(params);
      setDrilldownOrders(orders);
    } catch {
      setDrilldownOrders([]);
    } finally {
      setDrilldownLoading(false);
    }
  }, [selectedYears, selectedMonths, customers, selectedBucket, selectedDepartment, selectedCustCode]);

  useEffect(() => {
    if (activeView === 'details' && drilldownOrders.length === 0 && !drilldownLoading) {
      void Promise.resolve().then(() => loadAllDetailsOrders());
    }
  }, [activeView, drilldownOrders.length, drilldownLoading, loadAllDetailsOrders]);

  const clearSearch = () => setSearch('');
  const retryLoad = () => {
    if (availableYears.length === 0) {
      window.location.reload();
      return;
    }
    void loadOverviewData();
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') clearSearch();
  };

  const resetDrilldown = useCallback(() => {
    setDrilldown(null);
    setSelectedBucket(null);
    setSelectedDepartment(null);
    setSelectedCustCode(null);
    setSelectedCustGroup(null);
    setSearch('');
    setPage(1);
    if (activeView === 'details') {
      void loadAllDetailsOrders();
    }
  }, [activeView, loadAllDetailsOrders]);

  const openChartDetail = (year: string, periodNumber: number | undefined) => {
    const dd: Drilldown = {
      year,
      month: periodNumber ? String(periodNumber) : undefined,
      basis: 'order',
      metric,
    };
    setDrilldown(dd);
    setSearch('');
    setPage(1);
    setActiveView('details');
    void loadDrilldownOrders(dd);
  };

  return {
    metric, switchMetric,
    activeView, setActiveView,
    drilldown, setDrilldown, resetDrilldown,
    monthlyData, deliveryOutlookData,
    selectedBucket, setSelectedBucket, handleSelectBucket,
    selectedDepartment, setSelectedDepartment, handleSelectDepartment,
    selectedCustCode, setSelectedCustCode, handleSelectCustCode,
    selectedCustGroup, setSelectedCustGroup,
    drilldownOrders, drilldownLoading, loadDrilldownOrders,
    loading, error, hasResolvedData, retryLoad, loadOverviewData,
    search, setSearch, clearSearch, handleSearchKeyDown,
    page, setPage,
    primaryYear, compareYear, hasCompareYear,
    primaryMetric, selectedTypeTotals,
    kpiPrimaryMetric, kpiCompareMetric, kpiChangeAmount, kpiGrowthRate, kpiDeliveryRate, kpiCompareDeliveryRate, kpiOutstandingMetric,
    monthlyComparisonData,
    filteredOrderRows,
    selectedYears, selectedGroups, availableYears,
    openChartDetail,
    riskData,
    periodSetup,
    setSelGroups,
    toggleGroup,
    dynamicActiveGroups,
    isFiltered,
    resetFilters,
    refreshCounter,
    setIsRefreshing,
    triggerRefresh,
    isRefreshing
  };
}

