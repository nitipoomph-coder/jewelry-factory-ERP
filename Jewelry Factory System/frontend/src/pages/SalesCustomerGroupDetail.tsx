// Order List page (/dashboard/sales-customer-detail): the order lines behind one cell of the Customer
// Report Matrix, for one customer group or one customer.
// - Data: /api/dashboard/sales-orders (services/orderVolumeSummaryAPI.ts), the same view and filters as
//   the Matrix (active customers only), so the totals here equal the Matrix numbers it was opened from.
// - Scope (group / customer / period) comes from the URL. Opened from the menu with no scope, the page
//   asks for a group first instead of loading every order.
// - Layout (option D, 2026-11-26): scope line, KPI row, breakdown by customer and by product type
//   (click a bar to filter), one toolbar, then the table, which is the only scroll area on desktop.
// - Columns: 13 shown by default, the rest under "Columns" (saved per user).
// - Excel: registered with the Global Topbar (Print / Export → Export to Excel); utils/exportOrderListExcel.ts writes
//   the columns shown on screen with the scope and filters on top.
// - Year switch on the scope line (one year at a time); Refresh Data button in the Global Topbar.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Columns3, DollarSign, Hash, RefreshCw, RotateCcw, Search, Users, X } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import CustomSelect from '../components/ui/CustomSelect';
import { ErpButton, ErpSegmentedControl } from '../components/ui/ErpButtons';
import { BREADCRUMBS } from '../config/breadcrumbs';
import { ALL_GROUPS, getCustomerGroupId, getGroupCustomerFilter } from '../config/customerGroups';
import { currentUserKey, useColumnWidths } from '../hooks/useColumnWidths';
import { fetchSalesOrders, type SalesOrderRow } from '../services/orderVolumeSummaryAPI';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { usePageExcelExport } from '../contexts/pageExportStore';
import { useTopbarActions } from '../contexts/TopbarActionContext';
import { exportOrderListExcel, type OrderListExcelType } from '../utils/exportOrderListExcel';
import { canAccessRoute, getStoredAllowedMenus } from '../utils/authRedirect';
import './SalesResponsive.css';
import './OrderList.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAGE_SIZE = 50;
const COLUMN_PREFS_KEY = 'order-list-columns:v1';

const fmtDate = (value: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const fmtQty = (value: number) => (value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtAmount = (value: number) => `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtWeight = (value: number) => (value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type ShipState = 'done' | 'part' | 'open' | 'none';
function shipState(row: SalesOrderRow): ShipState {
  const ordered = Number(row.orderQty || 0);
  const shipped = Number(row.shippedQty || 0);
  if (ordered <= 0) return 'none';
  if (shipped >= ordered) return 'done';
  return shipped > 0 ? 'part' : 'open';
}
function shipLabel(row: SalesOrderRow): string {
  const state = shipState(row);
  if (state === 'done') return 'Shipped';
  if (state === 'part') return `Partial ${Math.round((Number(row.shippedQty) / Number(row.orderQty)) * 100)}%`;
  return state === 'open' ? 'Open' : '-';
}

// Shipping filter on the toolbar (lines with ordered qty 0 are only in All)
type ShipFilter = 'all' | 'open' | 'part' | 'done';
const SHIP_FILTER_LABELS: Record<Exclude<ShipFilter, 'all'>, string> = { open: 'Open', part: 'Partial', done: 'Shipped' };

// OrdNo / PONo open the PO Tracker Order Detail page; shown as links only when this user may open it
function canOpenOrderDetail(): boolean {
  try {
    return canAccessRoute('/po-tracker/ord/x', (localStorage.getItem('auth_role') || '').toLowerCase(), getStoredAllowedMenus());
  } catch {
    return false;
  }
}

type ColumnSet = 'Dates' | 'Order' | 'Item' | 'Amounts';
type TotalField = 'orderQty' | 'itemAmnt' | 'shippedQty' | 'openQty' | 'shippedAmnt';

interface OrderListColumn {
  key: string;
  label: string;
  width: number;
  set: ColumnSet;
  align?: 'right';
  tone?: 'strong' | 'soft' | 'order';
  /** Text shown (and used for the hover title / Excel) */
  text: (row: SalesOrderRow) => string;
  /** Optional cell content instead of the text */
  render?: (row: SalesOrderRow) => ReactNode;
  /** Numeric field summed in the Total row */
  total?: TotalField;
  /** Numeric field: a zero value shows in faint text */
  zeroField?: keyof SalesOrderRow;
  /** Excel: cell type and raw value (default: text from `text`) */
  excel?: { type: OrderListExcelType; value: (row: SalesOrderRow) => string | number | null };
}

const COLUMNS: OrderListColumn[] = [
  { key: 'orderNo', label: 'OrdNo', width: 118, set: 'Order', tone: 'order', text: r => r.orderNo },
  { key: 'ordDate', label: 'OrdDate', width: 92, set: 'Dates', text: r => fmtDate(r.ordDate), excel: { type: 'date', value: r => r.ordDate } },
  { key: 'dueDate', label: 'DueDate', width: 92, set: 'Dates', text: r => fmtDate(r.dueDate), excel: { type: 'date', value: r => r.dueDate } },
  { key: 'custDate', label: 'CustDate', width: 92, set: 'Dates', text: r => fmtDate(r.custDate), excel: { type: 'date', value: r => r.custDate } },
  { key: 'customerCode', label: 'CustCode', width: 82, set: 'Order', tone: 'strong', text: r => r.customerCode },
  { key: 'poNo', label: 'PONo', width: 108, set: 'Order', tone: 'soft', text: r => r.poNo || '-' },
  { key: 'po2', label: 'PO2', width: 130, set: 'Order', tone: 'soft', text: r => r.po2 || '-' },
  { key: 'salesName', label: 'SalesName', width: 130, set: 'Order', text: r => r.salesName || '-' },
  { key: 'shipTo', label: 'Ship To', width: 180, set: 'Order', text: r => r.shipTo || '-' },
  { key: 'ordStamp', label: 'OrdStamp', width: 160, set: 'Order', text: r => r.ordStamp || '-' },
  { key: 'ordMaker', label: 'OrdMaker', width: 110, set: 'Order', text: r => r.ordMaker || '-' },
  { key: 'ordWeek', label: 'OrdWeek', width: 76, set: 'Order', align: 'right', text: r => (r.ordWeek ? String(r.ordWeek) : '-'), excel: { type: 'int', value: r => r.ordWeek || null } },
  { key: 'itemNo', label: 'ItemNo', width: 112, set: 'Item', tone: 'strong', text: r => r.itemNo },
  { key: 'productTypeCode', label: 'Type', width: 58, set: 'Item', text: r => r.productTypeCode || '-' },
  { key: 'itemDesc', label: 'ItemDesc', width: 230, set: 'Item', tone: 'soft', text: r => r.itemDesc || '-' },
  { key: 'itemSku', label: 'Item SKU', width: 120, set: 'Item', text: r => r.itemSku || '-' },
  { key: 'custItem', label: 'Cust Item', width: 120, set: 'Item', text: r => r.custItem || '-' },
  { key: 'itemMat', label: 'ItemMat', width: 80, set: 'Item', text: r => r.itemMat || '-' },
  { key: 'itemSize', label: 'ItemSize', width: 100, set: 'Item', text: r => r.itemSize || '-' },
  { key: 'itemStone', label: 'ItemStone', width: 170, set: 'Item', text: r => r.itemStone || '-' },
  { key: 'itemPlate', label: 'Itemplate', width: 170, set: 'Item', text: r => r.itemPlate || '-' },
  { key: 'setType', label: 'SetType', width: 80, set: 'Item', text: r => r.setType || '-' },
  { key: 'itemWeight', label: 'ItemWeight', width: 96, set: 'Item', align: 'right', text: r => fmtWeight(r.itemWeight), excel: { type: 'decimal', value: r => r.itemWeight } },
  {
    key: 'shipping', label: 'Shipping', width: 112, set: 'Amounts', text: shipLabel,
    render: r => <span className={`order-list-status order-list-status--${shipState(r)}`}>{shipLabel(r)}</span>,
  },
  { key: 'orderQty', label: 'ItemQTY', width: 86, set: 'Amounts', align: 'right', text: r => fmtQty(r.orderQty), total: 'orderQty', zeroField: 'orderQty', excel: { type: 'int', value: r => r.orderQty } },
  { key: 'itemPrice', label: 'ItemPrice', width: 96, set: 'Amounts', align: 'right', tone: 'soft', text: r => fmtAmount(r.itemPrice), excel: { type: 'money', value: r => r.itemPrice } },
  { key: 'itemAmnt', label: 'ItemAmt', width: 124, set: 'Amounts', align: 'right', tone: 'strong', text: r => fmtAmount(r.itemAmnt), total: 'itemAmnt', zeroField: 'itemAmnt', excel: { type: 'money', value: r => r.itemAmnt } },
  { key: 'shippedQty', label: 'ExportQTY', width: 92, set: 'Amounts', align: 'right', text: r => fmtQty(r.shippedQty), total: 'shippedQty', zeroField: 'shippedQty', excel: { type: 'int', value: r => r.shippedQty } },
  { key: 'openQty', label: 'OpenQTY', width: 90, set: 'Amounts', align: 'right', text: r => fmtQty(r.openQty), total: 'openQty', zeroField: 'openQty', excel: { type: 'int', value: r => r.openQty } },
  { key: 'shippedAmnt', label: 'ExportAmt', width: 124, set: 'Amounts', align: 'right', text: r => fmtAmount(r.shippedAmnt), total: 'shippedAmnt', zeroField: 'shippedAmnt', excel: { type: 'money', value: r => r.shippedAmnt } },
];
const COLUMN_SETS: ColumnSet[] = ['Dates', 'Order', 'Item', 'Amounts'];
const PINNED_KEY = 'orderNo';
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = Object.fromEntries(COLUMNS.map(col => [col.key, col.width]));
// Shown by default; the date column follows the Period date basis (Order Date or Due Date)
const DEFAULT_VISIBLE = ['orderNo', 'customerCode', 'poNo', 'itemNo', 'productTypeCode', 'itemDesc', 'shipping', 'orderQty', 'itemPrice', 'itemAmnt', 'shippedQty', 'openQty'];

function csv(value: string | null) {
  return (value || '').split(',').map(v => v.trim()).filter(Boolean);
}

function monthSummary(months: string[]) {
  if (months.length === 0 || months.length === 12) return 'All months';
  return months.map(m => MONTHS[Number(m) - 1] || m).join(', ');
}

// Column choices are saved per signed-in user in this browser, as overrides of the defaults.
function loadColumnPrefs(): Record<string, boolean> {
  try {
    const saved = JSON.parse(localStorage.getItem(`${COLUMN_PREFS_KEY}:${currentUserKey()}`) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}
function saveColumnPrefs(prefs: Record<string, boolean>) {
  try {
    const key = `${COLUMN_PREFS_KEY}:${currentUserKey()}`;
    if (Object.keys(prefs).length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(prefs));
  } catch { /* storage blocked: choices still apply for this visit */ }
}

export default function SalesCustomerGroupDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Scope from the URL (same params the Matrix sends) ──
  const years = useMemo(() => csv(searchParams.get('years')), [searchParams]);
  const months = useMemo(() => csv(searchParams.get('months')), [searchParams]);
  const groups = useMemo(() => csv(searchParams.get('groups')), [searchParams]);
  const types = useMemo(() => csv(searchParams.get('types')), [searchParams]);
  const customersFromUrl = useMemo(() => csv(searchParams.get('customers')), [searchParams]);
  const metric = searchParams.get('metric') === 'qty' ? 'qty' : 'amount';
  const preset = searchParams.get('preset');
  const dateField = searchParams.get('dateField') === 'dueDate' ? 'dueDate' : 'ordDate';
  const weekFrom = preset === 'week' ? Number(searchParams.get('wStart')) || undefined : undefined;
  const weekTo = preset === 'week' ? Number(searchParams.get('wEnd')) || undefined : undefined;
  const dayFrom = preset === 'day' ? searchParams.get('dateFrom') || undefined : undefined;
  const dayTo = preset === 'day' ? searchParams.get('dateTo') || undefined : undefined;
  const filteredMonths = useMemo(() => (months.length > 0 && months.length < 12 ? months : []), [months]);

  const hasScope = groups.length > 0 || customersFromUrl.length > 0;
  const groupFilter = useMemo(() => getGroupCustomerFilter(groups), [groups]);
  const scopeCustomers = useMemo(
    () => (customersFromUrl.length > 0 ? customersFromUrl : Array.from(new Set(groupFilter.customers)).sort()),
    [customersFromUrl, groupFilter],
  );
  // General group → "everyone except the named groups" (only while no customers are named)
  const excludeCustomers = useMemo(() => (customersFromUrl.length > 0 ? [] : groupFilter.excludeCustomers), [customersFromUrl, groupFilter]);
  const singleCustomer = customersFromUrl.length === 1 ? customersFromUrl[0] : null;
  const scopeGroupId = groups.length === 1 ? groups[0] : singleCustomer ? getCustomerGroupId(singleCustomer) : '';
  const scopeGroup = ALL_GROUPS.find(g => g.id === scopeGroupId);

  // No years in the URL (the Period's default) → the API uses the current year, so say that year
  const periodYears = useMemo(() => (years.length > 0 ? years : [String(new Date().getFullYear())]), [years]);
  const weekText = weekFrom && weekTo ? (weekFrom === weekTo ? `Week ${weekFrom}` : `Week ${weekFrom}–${weekTo}`) : '';
  const dayText = dayFrom && dayTo ? (dayFrom === dayTo ? dayFrom : `${dayFrom} – ${dayTo}`) : '';
  const rangeText = weekText || dayText || monthSummary(months);
  const periodText = `${periodYears.join(', ')} · ${rangeText}`;

  // ── Data ──
  const [rows, setRows] = useState<SalesOrderRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestKey = JSON.stringify([years, filteredMonths, scopeCustomers, excludeCustomers, types, dateField, weekFrom, weekTo, dayFrom, dayTo]);
  const loadSalesOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSalesOrders({
        years,
        months: filteredMonths,
        customers: scopeCustomers,
        excludeCustomers,
        types,
        dateField,
        wStart: weekFrom,
        wEnd: weekTo,
        startDate: dayFrom,
        endDate: dayTo,
      });
      setRows(data);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales orders');
    } finally {
      setLoading(false);
    }
    // requestKey stands for every filter above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  useEffect(() => {
    if (!hasScope) return;
    const loadTimer = window.setTimeout(() => { void loadSalesOrders(); }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadSalesOrders, hasScope]);

  // ── Topbar Refresh Data: reloads the same scope; page filters, search and page stay as they are ──
  const [refreshing, setRefreshing] = useState(false);
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    // Keep the dim at least ~450ms so a fast reload does not flicker
    await Promise.all([loadSalesOrders(), new Promise(resolve => window.setTimeout(resolve, 450))]);
    setRefreshing(false);
  }, [loadSalesOrders]);

  const { setTopbarActions } = useTopbarActions();
  const refreshBusy = loading || refreshing;
  useEffect(() => {
    if (!hasScope) {
      setTopbarActions(null);
      return;
    }
    setTopbarActions(
      <button
        type="button"
        onClick={() => { void refreshData(); }}
        disabled={refreshBusy}
        className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border-none bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)] transition-colors"
        style={{ cursor: refreshBusy ? 'wait' : 'pointer', opacity: refreshBusy ? 0.8 : 1 }}
        title="Refresh Data"
        aria-label="Refresh Data"
      >
        <RefreshCw size={18} strokeWidth={1.75} className={refreshBusy ? 'animate-spin text-[var(--color-brand-600)]' : ''} />
      </button>
    );
  }, [setTopbarActions, refreshData, refreshBusy, hasScope]);
  useEffect(() => () => setTopbarActions(null), [setTopbarActions]);

  // ── Page filters (customer, product type, search) ──
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [shipFilter, setShipFilter] = useState<ShipFilter>('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // A new group / customer scope starts with no page filters (a year switch keeps them)
  const filterScopeKey = JSON.stringify([scopeCustomers, excludeCustomers, types]);
  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setSelectedCustomers([]);
      setTypeFilter(null);
      setShipFilter('all');
      setPage(1);
    }, 0);
    return () => window.clearTimeout(resetTimer);
  }, [filterScopeKey]);

  // ── Year switch: one year at a time, so the KPIs match one Matrix number (an old link with several
  //    years still shows them, as one "2026 + 2025" choice) ──
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    fetchAvailableYears()
      .then(list => { if (alive) setAvailableYears(list.map(String)); })
      .catch(() => { /* the dropdown still lists the years in the URL */ });
    return () => { alive = false; };
  }, []);
  const yearValue = periodYears.join(',');
  const yearOptions = useMemo(() => {
    const options = Array.from(new Set([...availableYears, ...periodYears]))
      .sort((a, b) => Number(b) - Number(a))
      .map(yr => ({ value: yr, label: yr }));
    if (periodYears.length > 1) options.unshift({ value: yearValue, label: periodYears.join(' + ') });
    return options;
  }, [availableYears, periodYears, yearValue]);

  const valueOf = useCallback((row: SalesOrderRow) => Number((metric === 'qty' ? row.orderQty : row.itemAmnt) || 0), [metric]);

  const searchedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row => [row.orderNo, row.poNo, row.po2, row.itemNo, row.customerCode, row.itemDesc, row.custItem]
      .some(value => String(value || '').toLowerCase().includes(q)));
  }, [rows, search]);

  const customerMatch = useCallback((row: SalesOrderRow) => selectedCustomers.length === 0 || selectedCustomers.includes(row.customerCode), [selectedCustomers]);
  const typeMatch = useCallback((row: SalesOrderRow) => !typeFilter || row.productTypeCode === typeFilter, [typeFilter]);
  const shipMatch = useCallback((row: SalesOrderRow) => shipFilter === 'all' || shipState(row) === shipFilter, [shipFilter]);

  // Line count per shipping state, under the other filters (shown on the Shipping buttons)
  const shipCounts = useMemo(() => {
    const counts = { all: 0, open: 0, part: 0, done: 0 };
    searchedRows.forEach(row => {
      if (!customerMatch(row) || !typeMatch(row)) return;
      counts.all += 1;
      const state = shipState(row);
      if (state !== 'none') counts[state] += 1;
    });
    return counts;
  }, [searchedRows, customerMatch, typeMatch]);

  const filteredRows = useMemo(() => {
    const list = searchedRows.filter(row => customerMatch(row) && typeMatch(row) && shipMatch(row));
    // Biggest first; order number + line keep the order stable for equal values
    return list.sort((a, b) => valueOf(b) - valueOf(a)
      || String(a.orderNo).localeCompare(String(b.orderNo))
      || Number(a.ordLineNo || 0) - Number(b.ordLineNo || 0));
  }, [searchedRows, customerMatch, typeMatch, shipMatch, valueOf]);

  // ── Breakdowns: each one filtered by the other dimension, so clicking one updates the other ──
  const customerBreakdown = useMemo(
    () => breakdown(searchedRows.filter(row => typeMatch(row) && shipMatch(row)), r => r.customerCode, valueOf),
    [searchedRows, typeMatch, shipMatch, valueOf],
  );
  const typeBreakdown = useMemo(
    () => breakdown(searchedRows.filter(row => customerMatch(row) && shipMatch(row)), r => r.productTypeCode || '-', valueOf),
    [searchedRows, customerMatch, shipMatch, valueOf],
  );
  const orderLinks = useMemo(() => canOpenOrderDetail(), []);
  const scopeCustomerCodes = useMemo(() => Array.from(new Set(rows.map(r => r.customerCode))).sort(), [rows]);
  const showCustomerBreakdown = !singleCustomer && scopeCustomerCodes.length > 1;

  // ── KPIs ──
  const totals = useMemo(() => {
    const sum = (field: TotalField) => Math.round(filteredRows.reduce((s, r) => s + Number(r[field] || 0), 0) * 100) / 100;
    return {
      orderQty: sum('orderQty'), itemAmnt: sum('itemAmnt'), shippedQty: sum('shippedQty'), openQty: sum('openQty'), shippedAmnt: sum('shippedAmnt'),
      orders: new Set(filteredRows.map(r => r.orderNo)).size,
    };
  }, [filteredRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filteredRows, currentPage]);

  // ── Columns ──
  const [columnPrefs, setColumnPrefs] = useState<Record<string, boolean>>(loadColumnPrefs);
  const defaultVisible = useMemo(() => new Set([...DEFAULT_VISIBLE, dateField]), [dateField]);
  const isShown = useCallback((key: string) => key === PINNED_KEY || (columnPrefs[key] ?? defaultVisible.has(key)), [columnPrefs, defaultVisible]);
  const visibleColumns = useMemo(
    // One customer in scope: the CustCode column would repeat the same code on every row
    () => COLUMNS.filter(col => isShown(col.key) && !(singleCustomer && col.key === 'customerCode')),
    [isShown, singleCustomer],
  );
  const toggleColumn = (key: string) => {
    setColumnPrefs(prev => {
      const next = { ...prev };
      const nextShown = !isShown(key);
      if (nextShown === defaultVisible.has(key)) delete next[key];
      else next[key] = nextShown;
      saveColumnPrefs(next);
      return next;
    });
  };
  const resetColumns = () => {
    setColumnPrefs({});
    saveColumnPrefs({});
  };
  // Every column on (saved as "on" overrides of the columns that are off by default)
  const showAllColumns = () => {
    const next: Record<string, boolean> = {};
    COLUMNS.forEach(col => { if (col.key !== PINNED_KEY && !defaultVisible.has(col.key)) next[col.key] = true; });
    setColumnPrefs(next);
    saveColumnPrefs(next);
  };
  const allColumnsShown = COLUMNS.every(col => isShown(col.key));

  const visibleKeys = useMemo(() => visibleColumns.map(c => c.key), [visibleColumns]);
  const { tableRef, colRef, getWidth, tableStyle, handleProps, stickyClass, resetAll: resetColumnWidths, isCustomized: hasCustomWidths } =
    useColumnWidths('order-list', DEFAULT_COLUMN_WIDTHS, { keys: visibleKeys, stickyKeys: [PINNED_KEY] });

  // ── Navigation ──
  // Back to the Customer Report Matrix with the same period / metric (group / customer dropped, so the
  // report opens on every group again)
  // Opened from a Matrix value (router state): go back to that exact Matrix view, period included
  const matrixFrom = (location.state as { from?: string } | null)?.from;
  const reportPath = useMemo(() => {
    if (matrixFrom?.startsWith('/dashboard/customer/matrix')) return matrixFrom;
    const params = new URLSearchParams(searchParams);
    params.delete('customers');
    params.delete('groups');
    const query = params.toString();
    return query ? `/dashboard/customer/matrix?${query}` : '/dashboard/customer/matrix';
  }, [searchParams, matrixFrom]);

  const setGroup = (groupId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('groups', groupId);
    next.delete('customers');
    setSearchParams(next, { replace: true, state: location.state });
  };

  const setYear = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('years', value);
    // Day range: move the dates to the new year (end date in that year; a range over New Year starts the
    // year before), the same way the API maps the range and the Matrix links move it
    const from = next.get('dateFrom');
    const to = next.get('dateTo');
    if (preset === 'day' && !value.includes(',') && from && to) {
      const span = Number(to.slice(0, 4)) - Number(from.slice(0, 4));
      next.set('dateFrom', `${Number(value) - span}${from.slice(4)}`);
      next.set('dateTo', `${value}${to.slice(4)}`);
    }
    setSearchParams(next, { replace: true, state: location.state });
    setPage(1);
  };

  const setMetric = (nextMetric: 'amount' | 'qty') => {
    const next = new URLSearchParams(searchParams);
    next.set('metric', nextMetric);
    setSearchParams(next, { replace: true, state: location.state });
    setPage(1);
  };

  const applySearch = () => {
    const nextSearch = searchDraft.toUpperCase().trim();
    setSearchDraft(nextSearch);
    setSearch(nextSearch);
    setPage(1);
  };
  const clearSearch = () => {
    setSearchDraft('');
    setSearch('');
    setPage(1);
  };
  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') applySearch();
    if (event.key === 'Escape') setSearchDraft(search);
  };

  const toggleCustomer = (code: string) => {
    setSelectedCustomers(prev => (prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code].sort()));
    setPage(1);
  };
  const pickCustomer = (code: string) => {
    setSelectedCustomers(prev => (prev.length === 1 && prev[0] === code ? [] : [code]));
    setPage(1);
  };
  const pickType = (code: string) => {
    setTypeFilter(prev => (prev === code ? null : code));
    setPage(1);
  };

  // Columns shown on screen, in screen order; the page filters are written above the table
  const exportToExcel = async () => {
    const scopeName = singleCustomer || scopeGroup?.label || groups.join('-') || 'Orders';
    const scope: [string, string][] = [
      singleCustomer ? ['Customer', singleCustomer] : ['Group', scopeGroup?.label || groups.join(', ')],
      ['Period', periodText],
      ['Date', dateField === 'dueDate' ? 'Due Date' : 'Order Date'],
    ];
    const filters: [string, string][] = [];
    if (selectedCustomers.length > 0) filters.push(['Customers', selectedCustomers.join(', ')]);
    if (typeFilter) filters.push(['Type', typeFilter]);
    if (shipFilter !== 'all') filters.push(['Shipping', SHIP_FILTER_LABELS[shipFilter]]);
    if (search) filters.push(['Search', search]);
    await exportOrderListExcel({
      title: 'Order List',
      scope,
      filters,
      columns: visibleColumns.map(col => ({
        label: col.label,
        width: col.width,
        type: col.excel?.type ?? 'text',
        value: col.excel?.value ?? col.text,
        total: Boolean(col.total),
      })),
      rows: filteredRows,
      fileName: `Order List ${scopeName} ${periodYears.join('-')}.xlsx`,
    });
  };

  // Excel export lives in the Global Topbar (Print / Export menu → Export to Excel)
  usePageExcelExport(exportToExcel, {
    description: `${fmtQty(filteredRows.length)} order lines`,
    disabled: !hasScope || filteredRows.length === 0,
  });

  const initialLoading = hasScope && !loaded && !error;
  const refetching = (loading || refreshing) && loaded;
  const groupOptions = ALL_GROUPS.map(g => ({ value: g.id, label: g.label }));

  return (
    <>
      <PageHeader breadcrumb={BREADCRUMBS.SALES_CUSTOMER_GROUP_DETAIL} contentLayout="workspace" />
      <div className="order-list-host content-scrollbar">
        <div className="app-content-frame app-content-frame--workspace order-list-page">
          {/* Scope: what these orders are */}
          <div className="order-list-scope">
            <button type="button" className="order-list-back" onClick={() => navigate(reportPath)}>
              <ArrowLeft size={14} /> Customer Report Matrix
            </button>
            <span className="order-list-scope-sep" aria-hidden="true" />
            <span className="order-list-scope-item">
              <span className="order-list-scope-key">Group</span>
              <CustomSelect value={scopeGroupId} onChange={setGroup} options={groupOptions} placeholder="Pick a group" width={170} ariaLabel="Customer group" />
            </span>
            {singleCustomer && (
              <span className="order-list-scope-item"><span className="order-list-scope-key">Customer</span>{singleCustomer}</span>
            )}
            {customersFromUrl.length > 1 && (
              <span className="order-list-scope-item"><span className="order-list-scope-key">Customers</span>{customersFromUrl.length}</span>
            )}
            <span className="order-list-scope-item">
              <span className="order-list-scope-key">Year</span>
              <CustomSelect value={yearValue} onChange={setYear} options={yearOptions} width={periodYears.length > 1 ? 130 : 96} ariaLabel="Year" />
            </span>
            <span className="order-list-scope-item"><span className="order-list-scope-key">Period</span>{rangeText}</span>
            <span className="order-list-scope-item"><span className="order-list-scope-key">Date</span>{dateField === 'dueDate' ? 'Due Date' : 'Order Date'}</span>
          </div>

          {!hasScope && (
            <div className="order-list-pick">
              <p className="order-list-pick-title">Pick a customer group to see its orders</p>
              <p className="order-list-pick-text">Or open a group or customer from the Customer Report Matrix to see the orders behind its numbers.</p>
              <div className="order-list-pick-groups">
                {ALL_GROUPS.map(g => (
                  <button key={g.id} type="button" className="order-list-pick-group" onClick={() => setGroup(g.id)}>
                    <span className="customer-kpi-swatch" style={{ background: g.color }} aria-hidden="true" />
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasScope && initialLoading && <OrderListSkeleton showCustomers={!singleCustomer} />}

          {hasScope && !initialLoading && (
            <div className={`order-list-body transition-opacity duration-300 ${refetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              {/* KPI row */}
              <div className="order-list-kpis">
                <Kpi label="Ordered Amount" value={fmtAmount(totals.itemAmnt)} />
                <Kpi label="Ordered Qty (PCS)" value={fmtQty(totals.orderQty)} />
                <Kpi
                  label="Shipped Qty (PCS)"
                  value={fmtQty(totals.shippedQty)}
                  sub={totals.orderQty > 0 ? `${Math.round((totals.shippedQty / totals.orderQty) * 100)}% of ordered` : undefined}
                />
                <Kpi label="Open Qty (PCS)" value={fmtQty(totals.openQty)} />
                <Kpi label="Orders" value={fmtQty(totals.orders)} sub={`${fmtQty(filteredRows.length)} lines`} />
              </div>

              {/* Where the number comes from: click a bar to filter the table */}
              {rows.length > 0 && (
                <div className={`order-list-breakdowns ${showCustomerBreakdown ? '' : 'order-list-breakdowns--single'}`.trim()}>
                  {showCustomerBreakdown && (
                    <Breakdown
                      title="By customer"
                      items={customerBreakdown}
                      active={selectedCustomers.length === 1 ? selectedCustomers[0] : null}
                      onPick={pickCustomer}
                      metric={metric}
                    />
                  )}
                  <Breakdown title="By product type" items={typeBreakdown} active={typeFilter} onPick={pickType} metric={metric} />
                </div>
              )}

              {/* Toolbar */}
              <div className="order-list-toolbar">
                <ErpSegmentedControl
                  ariaLabel="Sort and break down by"
                  value={metric}
                  onChange={(v) => setMetric(v as 'amount' | 'qty')}
                  options={[
                    { value: 'amount', label: 'Amount', icon: <DollarSign size={13} /> },
                    { value: 'qty', label: 'Qty', icon: <Hash size={13} /> },
                  ]}
                />
                {showCustomerBreakdown && (
                  <CheckMenu
                    icon={<Users size={14} />}
                    label={selectedCustomers.length === 0 ? `Customers: All (${scopeCustomerCodes.length})` : `Customers: ${selectedCustomers.length} of ${scopeCustomerCodes.length}`}
                    sections={[{
                      items: scopeCustomerCodes.map(code => ({
                        key: code,
                        label: code,
                        meta: fmtCount(customerBreakdown.find(b => b.key === code)?.value ?? 0, metric),
                        checked: selectedCustomers.length === 0 || selectedCustomers.includes(code),
                      })),
                    }]}
                    onToggle={(code) => {
                      // From "all" the first click keeps only the others unchecked → start from every code
                      if (selectedCustomers.length === 0) setSelectedCustomers(scopeCustomerCodes.filter(c => c !== code));
                      else toggleCustomer(code);
                      setPage(1);
                    }}
                    footer={selectedCustomers.length > 0 ? { label: 'Show all customers', onClick: () => { setSelectedCustomers([]); setPage(1); } } : undefined}
                  />
                )}
                {typeFilter && (
                  <button type="button" className="order-list-chip" onClick={() => pickType(typeFilter)} title="Remove the product type filter">
                    Type: {typeFilter} <X size={12} />
                  </button>
                )}
                <ErpSegmentedControl<ShipFilter>
                  ariaLabel="Shipping status"
                  value={shipFilter}
                  onChange={value => { setShipFilter(value); setPage(1); }}
                  options={[
                    { value: 'all', label: `All ${fmtQty(shipCounts.all)}` },
                    { value: 'open', label: `Open ${fmtQty(shipCounts.open)}` },
                    { value: 'part', label: `Partial ${fmtQty(shipCounts.part)}` },
                    { value: 'done', label: `Shipped ${fmtQty(shipCounts.done)}` },
                  ]}
                />
                <label className="order-list-search">
                  <Search size={14} />
                  <input
                    value={searchDraft}
                    onChange={event => setSearchDraft(event.target.value.toUpperCase())}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search order, PO, item…"
                    aria-label="Search orders"
                  />
                  {searchDraft.length > 0 && (
                    <button type="button" className="order-list-search-clear" onClick={clearSearch} aria-label="Clear search" title="Clear search">
                      <X size={12} />
                    </button>
                  )}
                </label>
                <CheckMenu
                  icon={<Columns3 size={14} />}
                  label={`Columns ${visibleColumns.length}/${COLUMNS.length - (singleCustomer ? 1 : 0)}`}
                  actions={[
                    { label: 'Default', onClick: resetColumns, disabled: Object.keys(columnPrefs).length === 0, title: 'Back to the starting columns' },
                    { label: 'Show all', onClick: showAllColumns, disabled: allColumnsShown, title: 'Show every column' },
                  ]}
                  sections={COLUMN_SETS.map(set => ({
                    title: set,
                    items: COLUMNS.filter(col => col.set === set && col.key !== PINNED_KEY).map(col => ({
                      key: col.key,
                      label: col.label,
                      checked: isShown(col.key),
                      disabled: Boolean(singleCustomer && col.key === 'customerCode'),
                    })),
                  }))}
                  onToggle={toggleColumn}
                />
                {hasCustomWidths && (
                  <ErpButton variant="ghost" icon={<RotateCcw size={14} />} onClick={resetColumnWidths} title="Return every column to its default width">
                    Reset widths
                  </ErpButton>
                )}
                <span className="order-list-count">{fmtQty(filteredRows.length)} of {fmtQty(rows.length)} lines</span>
              </div>

              {error && <div className="order-list-error">{error}</div>}

              {/* Table: the only scroll area; header, OrdNo and Total row stay pinned */}
              <div className="order-list-scroll content-scrollbar">
                <table ref={tableRef} className="order-list-table" style={tableStyle}>
                  <colgroup>
                    {visibleColumns.map(col => <col key={col.key} ref={colRef(col.key)} style={{ width: getWidth(col.key) }} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      {visibleColumns.map(col => (
                        <th key={col.key} className={cellClass(col, stickyClass)}>
                          <span className="order-list-th-label">{col.label}</span>
                          <span className="order-list-resizer" {...handleProps(col.key, col.label)} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <OrderListBody rows={pageRows} columns={visibleColumns} stickyClass={stickyClass} orderLinks={orderLinks} />
                  {filteredRows.length > 0 && (
                    <tfoot>
                      <tr>
                        {visibleColumns.map((col, i) => (
                          <td key={col.key} className={cellClass(col, stickyClass)}>
                            {i === 0 ? `Total · ${fmtQty(filteredRows.length)} lines`
                              : col.total ? (col.total === 'itemAmnt' || col.total === 'shippedAmnt' ? fmtAmount(totals[col.total]) : fmtQty(totals[col.total]))
                                : ''}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div className="order-list-pager">
                <span>
                  Showing {filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of {fmtQty(filteredRows.length)}
                  {' · '}sorted by {metric === 'amount' ? 'ItemAmt' : 'ItemQTY'}, biggest first
                </span>
                <span className="order-list-pager-buttons">
                  <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
                  <span>Page <b>{currentPage}</b> / {totalPages}</span>
                  <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface BreakdownItem {
  key: string;
  value: number;
}

/** Sums the metric per key, biggest first (key as tie-breaker). */
function breakdown(rows: SalesOrderRow[], keyOf: (row: SalesOrderRow) => string, valueOf: (row: SalesOrderRow) => number): BreakdownItem[] {
  const sums = new Map<string, number>();
  rows.forEach(row => {
    const key = keyOf(row);
    sums.set(key, (sums.get(key) || 0) + valueOf(row));
  });
  return Array.from(sums, ([key, value]) => ({ key, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
}

const fmtCount = (value: number, metric: string) => (metric === 'qty' ? `${fmtQty(value)} pcs` : fmtAmount(value));

function cellClass(col: OrderListColumn, stickyClass: (key: string) => string) {
  return [
    col.align === 'right' ? 'order-list-num' : '',
    col.key === PINNED_KEY ? `order-list-pin ${stickyClass(col.key)}` : '',
    col.key === 'itemNo' || col.key === 'shipping' ? 'order-list-group-start' : '',
  ].filter(Boolean).join(' ');
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="customer-kpi">
      <span className="customer-kpi-label">{label}</span>
      <span className="customer-kpi-value">
        {value}
        {sub && <span className="order-list-kpi-sub">{sub}</span>}
      </span>
    </div>
  );
}

function Breakdown({ title, items, active, onPick, metric }: {
  title: string;
  items: BreakdownItem[];
  active: string | null;
  onPick: (key: string) => void;
  metric: string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="order-list-breakdown">
      <div className="order-list-breakdown-title">{title} <span>· click to filter</span></div>
      <div className="order-list-breakdown-list content-scrollbar">
        {items.map(item => (
          <button
            key={item.key}
            type="button"
            className={`order-list-breakdown-row ${active === item.key ? 'is-active' : ''}`.trim()}
            onClick={() => onPick(item.key)}
            aria-pressed={active === item.key}
            title={`${item.key}: ${fmtCount(item.value, metric)} (${((item.value / total) * 100).toFixed(1)}%)`}
          >
            <span className="order-list-breakdown-key">{item.key}</span>
            <span className="order-list-breakdown-bar"><i style={{ width: `${Math.max(0, (item.value / max) * 100)}%` }} /></span>
            <span className="order-list-breakdown-value">{fmtCount(item.value, metric)}</span>
            <span className="order-list-breakdown-pct">{((item.value / total) * 100).toFixed(1)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface CheckMenuItem {
  key: string;
  label: string;
  meta?: string;
  checked: boolean;
  disabled?: boolean;
}

/** Button with a popover list of checkboxes (customers, columns). `actions` = quick buttons on top
 *  (the menu stays open so the change is visible); `footer` = one link at the bottom that closes it. */
function CheckMenu({ icon, label, sections, onToggle, footer, actions }: {
  icon: ReactNode;
  label: string;
  sections: { title?: string; items: CheckMenuItem[] }[];
  onToggle: (key: string) => void;
  footer?: { label: string; onClick: () => void };
  actions?: { label: string; onClick: () => void; disabled?: boolean; title?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="order-list-menu-wrap" ref={ref}>
      <ErpButton variant="secondary" icon={icon} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="true">
        {/* Text and arrow on one line (svg is display: block by default) */}
        <span className="order-list-menu-label">{label}<ChevronDown size={12} aria-hidden="true" /></span>
      </ErpButton>
      {open && (
        <div className="order-list-menu content-scrollbar" role="menu">
          {actions && actions.length > 0 && (
            <div className="order-list-menu-actions">
              {actions.map(action => (
                <button key={action.label} type="button" className="order-list-menu-action" onClick={action.onClick} disabled={action.disabled} title={action.title}>
                  {action.label}
                </button>
              ))}
            </div>
          )}
          {sections.map((section, si) => (
            <div key={section.title ?? si} className="order-list-menu-section">
              {section.title && <div className="order-list-menu-title">{section.title}</div>}
              {section.items.map(item => (
                <label key={item.key} className={`order-list-menu-item ${item.disabled ? 'is-disabled' : ''}`.trim()}>
                  <input type="checkbox" checked={item.checked} disabled={item.disabled} onChange={() => onToggle(item.key)} />
                  <span>{item.label}</span>
                  {item.meta && <span className="order-list-menu-meta">{item.meta}</span>}
                </label>
              ))}
            </div>
          ))}
          {footer && (
            <button type="button" className="order-list-menu-footer" onClick={() => { footer.onClick(); setOpen(false); }}>
              {footer.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Body rows. Memoized: column widths live on <col>, so resizing a column or typing in the search box
// does not re-render the body cells.
const OrderListBody = memo(function OrderListBody({ rows, columns, stickyClass, orderLinks }: {
  rows: SalesOrderRow[];
  columns: OrderListColumn[];
  stickyClass: (key: string) => string;
  /** OrdNo / PONo link to the PO Tracker Order Detail page */
  orderLinks: boolean;
}) {
  return (
    <tbody>
      {rows.length === 0 && (
        <tr><td colSpan={columns.length} className="order-list-empty">No orders match the current filter.</td></tr>
      )}
      {rows.map((row, index) => (
        // OrdNo + OrdLineNo is not unique in OrdDT, so the position keeps keys unique
        <tr key={`${row.orderNo}-${row.ordLineNo}-${index}`}>
          {columns.map(col => {
            const text = col.text(row);
            const zero = col.zeroField && Number(row[col.zeroField] || 0) === 0;
            const tone = zero ? 'order-list-zero' : col.tone ? `order-list-${col.tone}` : '';
            return (
              <td key={col.key} className={`${cellClass(col, stickyClass)} ${tone}`.trim()} title={text && text !== '-' ? text : undefined}>
                {orderLinks && col.key === 'orderNo' && row.orderNo
                  ? <Link className="order-list-link" to={`/po-tracker/ord/${encodeURIComponent(row.orderNo)}`} title={`Open order ${row.orderNo}`}>{text}</Link>
                  : orderLinks && col.key === 'poNo' && row.poNo
                    ? <Link className="order-list-link" to={`/po-tracker/po/${encodeURIComponent(row.poNo)}`} title={`Open PO ${row.poNo}`}>{text}</Link>
                    : col.render ? col.render(row) : text}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
});

// First load: same footprint as the final page (KPI row, breakdowns, toolbar, table rows).
function OrderListSkeleton({ showCustomers }: { showCustomers: boolean }) {
  const widths = [68, 72, 46, 54, 76, 48, 60, 44, 70, 58, 52, 46];
  return (
    <div className="order-list-body" aria-busy="true" aria-label="Loading orders">
      <div className="order-list-kpis">
        {[150, 110, 110, 110, 90].map((w, i) => (
          <div key={i} className="customer-kpi">
            <span className="app-skeleton" style={{ width: 84, height: 12, borderRadius: 4 }} />
            <span className="app-skeleton" style={{ width: w, height: 24, borderRadius: 6 }} />
          </div>
        ))}
      </div>
      <div className={`order-list-breakdowns ${showCustomers ? '' : 'order-list-breakdowns--single'}`.trim()}>
        {(showCustomers ? [0, 1] : [0]).map(b => (
          <div key={b} className="order-list-breakdown">
            <span className="app-skeleton" style={{ width: 120, height: 12, borderRadius: 4 }} />
            <div className="order-list-breakdown-list">
              {[90, 70, 52, 36, 22].map((w, i) => (
                <div key={i} className="order-list-breakdown-row order-list-breakdown-row--skeleton">
                  <span className="app-skeleton" style={{ width: 40, height: 10, borderRadius: 3 }} />
                  <span className="app-skeleton" style={{ width: `${w}%`, height: 8, borderRadius: 0 }} />
                  <span className="app-skeleton" style={{ width: 80, height: 10, borderRadius: 3 }} />
                  <span className="app-skeleton" style={{ width: 30, height: 10, borderRadius: 3 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="order-list-toolbar">
        {/* Same order as the toolbar: Amount / Qty, Customers (only with several customers), Shipping, search, Columns, line count */}
        {[150, ...(showCustomers ? [150] : []), 300, 240, 110, 110].map((w, i) => <span key={i} className="app-skeleton" style={{ width: w, height: 28, borderRadius: 6 }} />)}
      </div>
      <div className="order-list-scroll">
        <div className="order-list-skeleton-row order-list-skeleton-row--head" />
        {Array.from({ length: 24 }, (_, r) => (
          <div key={r} className="order-list-skeleton-row">
            {widths.map((w, c) => <span key={c} className="app-skeleton" style={{ width: `${(w * (((r + c) % 3) + 4)) / 6}%`, height: 10, borderRadius: 3 }} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
