import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, DollarSign, Hash, RotateCcw, Search } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import '../components/sales/SalesDenseTable.css';
import './SalesResponsive.css';
import { CUSTOMER_GROUPS, getGroupCustomerFilter } from '../config/customerGroups';
import { fetchSalesOrders, type SalesOrderRow } from '../services/orderVolumeSummaryAPI';
import { ErpButton, ErpSegmentedControl } from '../components/ui/ErpButtons';
import { useColumnWidths } from '../hooks/useColumnWidths';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAGE_SIZE = 30;
const configuredCustomers = Array.from(new Set(CUSTOMER_GROUPS.flatMap(group => group.prefixes))).sort();

const fmtDate = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB');
};
const fmtQty = (value: number) => (value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtAmount = (value: number) => `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtWeight = (value: number) => (value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtTableAmount =(value: number) => `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Table columns: header label (legacy VB.NET names, same as the Excel export), default width in px,
// and the displayed text. Users can resize each column; see useColumnWidths.
interface OrderListColumn {
  key: string;
  label: string;
  width: number;
  align?: 'right';
  strong?: boolean;
  value: (row: SalesOrderRow) => string;
}

const COLUMNS: OrderListColumn[] = [
  { key: 'orderNo', label: 'OrdNo', width: 112, strong: true, value: r => r.orderNo },
  { key: 'ordDate', label: 'OrdDate', width: 92, value: r => fmtDate(r.ordDate) },
  { key: 'dueDate', label: 'DueDate', width: 92, value: r => fmtDate(r.dueDate) },
  { key: 'custDate', label: 'CustDate', width: 92, value: r => fmtDate(r.custDate) },
  { key: 'customerCode', label: 'CustCode', width: 80, strong: true, value: r => r.customerCode },
  { key: 'salesName', label: 'SalesName', width: 140, value: r => r.salesName ?? '' },
  { key: 'poNo', label: 'PONo', width: 110, value: r => r.poNo || '-' },
  { key: 'po2', label: 'PO2', width: 140, value: r => r.po2 || '-' },
  { key: 'shipTo', label: 'Ship T', width: 190, value: r => r.shipTo || '-' },
  { key: 'ordStamp', label: 'OrdStamp', width: 170, value: r => r.ordStamp || '-' },
  { key: 'ordMaker', label: 'OrdMaker', width: 120, value: r => r.ordMaker || '-' },
  { key: 'itemNo', label: 'ItemNo', width: 110, strong: true, value: r => r.itemNo },
  { key: 'itemSku', label: 'Item SKU', width: 120, value: r => r.itemSku || '-' },
  { key: 'productTypeCode', label: 'Type', width: 60, strong: true, value: r => r.productTypeCode || '-' },
  { key: 'custItem', label: 'Cust Item', width: 120, value: r => r.custItem || '-' },
  { key: 'itemMat', label: 'ItemMat', width: 76, value: r => r.itemMat || '-' },
  { key: 'itemSize', label: 'ItemSize', width: 110, value: r => r.itemSize || '-' },
  { key: 'itemStone', label: 'ItemStone', width: 170, value: r => r.itemStone || '-' },
  { key: 'itemDesc', label: 'ItemDesc', width: 200, value: r => r.itemDesc || '-' },
  { key: 'itemPlate', label: 'Itemplate', width: 210, value: r => r.itemPlate || '-' },
  { key: 'setType', label: 'SetType', width: 76, value: r => r.setType || '-' },
  { key: 'itemWeight', label: 'ItemWeight', width: 96, align: 'right', value: r => fmtWeight(r.itemWeight) },
  { key: 'orderQty', label: 'ItemQTY', width: 86, align: 'right', value: r => fmtQty(r.orderQty) },
  { key: 'itemPrice', label: 'ItemPrice', width: 96, align: 'right', value: r => fmtTableAmount(r.itemPrice || 0) },
  { key: 'itemAmnt', label: 'ItemAmt', width: 120, align: 'right', value: r => fmtTableAmount(r.itemAmnt || 0) },
  { key: 'shippedQty', label: 'ExportQTY', width: 92, align: 'right', value: r => fmtQty(r.shippedQty) },
  { key: 'shippedAmnt', label: 'ExportAmt', width: 120, align: 'right', value: r => fmtTableAmount(r.shippedAmnt || 0) },
];
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = Object.fromEntries(COLUMNS.map(col => [col.key, col.width]));

function csv(value: string | null) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function monthSummary(months: string[]) {
  if (months.length === 0 || months.length === 12) return 'All Months';
  if (months.length <= 4) return months.map(month => MONTHS[Number(month) - 1]).filter(Boolean).join(', ');
  return `${months.length} months selected`;
}

export default function SalesCustomerGroupDetail() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const years = useMemo(() => csv(searchParams.get('years')), [searchParams]);
  const months = useMemo(() => csv(searchParams.get('months')), [searchParams]);
  const groups = useMemo(() => csv(searchParams.get('groups')), [searchParams]);
  const types = useMemo(() => csv(searchParams.get('types')), [searchParams]);
  const customersFromUrl = useMemo(() => csv(searchParams.get('customers')), [searchParams]);
  const groupFilter = useMemo(() => getGroupCustomerFilter(groups), [groups]);
  const groupCustomers = useMemo(() => Array.from(new Set(groupFilter.customers)).sort(), [groupFilter]);
  // General group → "everyone except the unselected named groups" (only while no explicit customers are picked)
  const excludeCustomers = useMemo(
    () => customersFromUrl.length > 0 ? [] : groupFilter.excludeCustomers,
    [customersFromUrl, groupFilter],
  );
  const excludeCustomersKey = excludeCustomers.join('|');
  const requestedCustomers = useMemo(
    () => customersFromUrl.length > 0 ? customersFromUrl : groupCustomers,
    [customersFromUrl, groupCustomers],
  );
  const metric = searchParams.get('metric') === 'qty' ? 'qty' : 'amount';
  const customersKey = requestedCustomers.join('|');
  // Period exactly as Sales Summary / Customer Report send it (same URL params from usePeriodSetup)
  const preset = searchParams.get('preset');
  const dateField = searchParams.get('dateField') === 'dueDate' ? 'dueDate' : 'ordDate';
  const weekFrom = preset === 'week' ? Number(searchParams.get('wStart')) || undefined : undefined;
  const weekTo = preset === 'week' ? Number(searchParams.get('wEnd')) || undefined : undefined;
  const dayFrom = preset === 'day' ? searchParams.get('dateFrom') || undefined : undefined;
  const dayTo = preset === 'day' ? searchParams.get('dateTo') || undefined : undefined;
  const filteredMonths = useMemo(() => (months.length > 0 && months.length < 12 ? months : []), [months]);

  const [selectedCustomers, setSelectedCustomers] = useState<string[]>(requestedCustomers);
  const [rows, setRows] = useState<SalesOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { tableRef, colRef, getWidth, totalWidth, handleProps, resetAll: resetColumnWidths, isCustomized: hasCustomWidths } = useColumnWidths('order-list', DEFAULT_COLUMN_WIDTHS);

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      setSelectedCustomers(requestedCustomers);
      setPage(1);
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, [customersKey, requestedCustomers]);

  const loadSalesOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSalesOrders({
        years,
        months: filteredMonths,
        customers: selectedCustomers,
        excludeCustomers: excludeCustomersKey ? excludeCustomersKey.split('|') : [],
        types,
        dateField,
        wStart: weekFrom,
        wEnd: weekTo,
        startDate: dayFrom,
        endDate: dayTo,
      });
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales orders');
    } finally {
      setLoading(false);
    }
  }, [years, filteredMonths, selectedCustomers, excludeCustomersKey, types, dateField, weekFrom, weekTo, dayFrom, dayTo]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void loadSalesOrders(); }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadSalesOrders]);

  const applySearch = () => {
    const nextSearch = searchDraft.toUpperCase();
    setSearchDraft(nextSearch);
    setSearch(nextSearch);
    setPage(1);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') applySearch();
    if (event.key === 'Escape') setSearchDraft(search.toUpperCase());
  };
  const customerOptions = useMemo(() => {
    const codes = new Set<string>(configuredCustomers);
    selectedCustomers.forEach(code => codes.add(code));
    rows.forEach(row => codes.add(row.customerCode));
    return Array.from(codes).filter(Boolean).sort();
  }, [rows, selectedCustomers]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const baseRows = q ? rows.filter(row => [row.orderNo, row.poNo, row.itemNo, row.customerCode, row.itemDesc, row.itemType].some(value => String(value || '').toLowerCase().includes(q))) : rows;
    return [...baseRows].sort((a, b) => {
      if (metric === 'qty') return Number(b.orderQty || 0) - Number(a.orderQty || 0);
      return Number(b.itemAmnt || 0) - Number(a.itemAmnt || 0);
    });
  }, [rows, search, metric]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filteredRows, currentPage]);

  const totals = useMemo(() => ({
    qty: filteredRows.reduce((sum, row) => sum + Number(row.orderQty || 0), 0),
    shipped: filteredRows.reduce((sum, row) => sum + Number(row.shippedQty || 0), 0),
    amount: filteredRows.reduce((sum, row) => sum + Number(row.itemAmnt || 0), 0),
  }), [filteredRows]);

  // Back to Customer Report Matrix with the same period / metric. `groups` / `customers` are dropped:
  // the report's click replaced them with the clicked row, so the report opens on every group again.
  const reportPath = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    params.delete('customers');
    params.delete('groups');
    const query = params.toString();
    return query ? `/dashboard/customer/matrix?${query}` : '/dashboard/customer/matrix';
  }, [searchParams]);

  const applyCustomers = (nextCustomers: string[]) => {
    const sorted = [...nextCustomers].sort();
    setSelectedCustomers(sorted);
    const next = new URLSearchParams(searchParams);
    if (sorted.length > 0) next.set('customers', sorted.join(','));
    else next.delete('customers');
    next.delete('groups');
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const toggleCustomer = (code: string) => {
    const next = selectedCustomers.includes(code) ? selectedCustomers.filter(item => item !== code) : [...selectedCustomers, code];
    applyCustomers(next);
  };

  const setMetric = (nextMetric: 'amount' | 'qty') => {
    const next = new URLSearchParams(searchParams);
    next.set('metric', nextMetric);
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const exportToExcel = () => {
    const exportData = filteredRows.map(row => ({
      'OrdNo': row.orderNo || '',
      'OrdDate': fmtDate(row.ordDate),
      'DueDate': fmtDate(row.dueDate),
      'CustDate': fmtDate(row.custDate),
      'CustCode': row.customerCode || '',
      'SalesName': row.salesName || '',
      'PONo': row.poNo || '',
      'PO2': row.po2 || '',
      'Ship T': row.shipTo || '',
      'OrdStamp': row.ordStamp || '',
      'OrdMaker': row.ordMaker || '',
      'ItemNo': row.itemNo || '',
      'Item SKU': row.itemSku || '',
      'Type': row.productTypeCode || '-',
      'Cust Item': row.custItem || '',
      'ItemMat': row.itemMat || '',
      'ItemSize': row.itemSize || '',
      'ItemStone': row.itemStone || '',
      'ItemDesc': row.itemDesc || '',
      'Itemplate': row.itemPlate || '',
      'SetType': row.setType || '',
      'ItemWeight': row.itemWeight || 0,
      'ItemQTY': row.orderQty || 0,
      'ItemPrice': row.itemPrice || 0,
      'ItemAmt': row.itemAmnt || 0,
      'ExportQTY': row.shippedQty || 0,
      'ExportAmt': row.shippedAmnt || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Order Detail");

    // Attempt to format filename as Order Detail For xxxx-xxxx
    const periodString = years.length > 0 ? years.join('-') : 'All';
    XLSX.writeFile(wb, `Order Detail For ${periodString}.xlsx`);
  };

  return (
    <>
      <PageHeader breadcrumb={BREADCRUMBS.SALES_CUSTOMER_GROUP_DETAIL} contentLayout="workspace" />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="app-content-frame app-content-frame--workspace app-page-content sales-order-detail-frame flex flex-col gap-4">
          <div style={{ ...pageHeader, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => navigate(reportPath)} style={backButton}><ArrowLeft size={14} /> Customer Report</button>
              <span style={{ ...pageSubtitle, margin: 0 }}>{years.join(', ') || 'All Years'} / {weekFrom && weekTo ? `Week ${weekFrom}–${weekTo}` : dayFrom && dayTo ? `${dayFrom} – ${dayTo}` : monthSummary(months)} / {dateField === 'dueDate' ? 'Due Date' : 'Order Date'} / sorted by {metric === 'amount' ? 'Sales Amount' : 'Ordered Qty'}</span>
            </div>
            <div style={headerActions}>
              <ErpSegmentedControl
                ariaLabel="Metric mode"
                value={metric}
                onChange={(v) => setMetric(v as 'amount' | 'qty')}
                options={[
                  { value: 'amount', label: 'Amount', icon: <DollarSign size={13} /> },
                  { value: 'qty', label: 'Qty', icon: <Hash size={13} /> },
                ]}
              />
            </div>
          </div>

          <div style={kpiGrid}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={kpiTile}>
                  <div className="app-skeleton" style={{ width: 80, height: 14, borderRadius: 4, marginBottom: 8 }} />
                  <div className="app-skeleton" style={{ width: 120, height: 28, borderRadius: 6 }} />
                </div>
              ))
            ) : (
              <>
                <Kpi label="Rows" value={fmtQty(filteredRows.length)} />
                <Kpi label="Ordered Qty" value={fmtQty(totals.qty)} />
                <Kpi label="Shipped Qty" value={fmtQty(totals.shipped)} />
                <Kpi label="Sales Amount" value={fmtAmount(totals.amount)} />
              </>
            )}
          </div>

          <section style={filterPanel}>
            <div style={customerFilterRow}>
              <span style={filterLabel}><Hash size={14} /> Customer</span>
              <FilterChip active={selectedCustomers.length === 0} onClick={() => applyCustomers([])} label="All" />
              {customerOptions.map(code => <FilterChip key={code} active={selectedCustomers.includes(code)} onClick={() => toggleCustomer(code)} label={code} />)}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={searchWrap}>
                <Search size={14} style={searchIcon} />
                <input value={searchDraft} onChange={event => setSearchDraft(event.target.value.toUpperCase())} onKeyDown={handleSearchKeyDown} placeholder="Search order, item, customer..." style={searchInput} />
              </div>
              <button
                type="button"
                onClick={exportToExcel}
                style={{ ...chipButton, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-success-500)', color: 'var(--color-overlay-text)', borderColor: 'var(--color-success-600)' }}
              >
                <Download size={14} /> Export Excel
              </button>
              {hasCustomWidths && (
                <ErpButton variant="ghost" icon={<RotateCcw size={14} />} onClick={resetColumnWidths} title="Return every column to its default width">
                  Reset widths
                </ErpButton>
              )}
            </div>
          </section>

          {error && <div style={errorText}>{error}</div>}

          <section className="sales-dense-panel" style={tablePanel}>
            <div className="content-scrollbar sales-dense-scroll">
              {/* OrdNo stays pinned on the left while scrolling sideways; widths are user-resizable (saved per user) */}
              <table
                ref={tableRef}
                className="sales-dense-table sales-dense-table--sticky-first"
                style={{ ...tableBase, width: totalWidth }}
              >
                <colgroup>
                  {COLUMNS.map(col => <col key={col.key} ref={colRef(col.key)} style={{ width: getWidth(col.key) }} />)}
                </colgroup>
                <thead>
                  <tr>
                    {COLUMNS.map(col => (
                      <th key={col.key} className={col.align === 'right' ? 'sales-dense-table__number' : undefined}>
                        <span className="sales-dense-th-label">{col.label}</span>
                        <span className="sales-dense-resizer" {...handleProps(col.key, col.label)} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <OrderListBody rows={pageRows} loading={loading} />
              </table>
            </div>
            <div className="sales-dense-pagination" style={paginationBar}>
              <div style={paginationText}>Showing {filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</div>
              <div style={paginationButtons}>
                <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} style={{ ...pageButton, ...(currentPage <= 1 ? disabledPageButton : null) }}><ChevronLeft size={14} /></button>
                <span style={pageText}>Page {currentPage} / {totalPages}</span>
                <button disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} style={{ ...pageButton, ...(currentPage >= totalPages ? disabledPageButton : null) }}><ChevronRight size={14} /></button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}



function Kpi({ label, value }: { label: string; value: string }) {
  return <div style={kpiTile}><div style={kpiLabel}>{label}</div><div style={kpiValue}>{value}</div></div>;
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} style={{ ...chipButton, ...(active ? chipActive : null) }}>{label}</button>;
}

// Body rows. Memoized on the page's rows: column widths live on <col>, so resizing a column or
// typing in the search box does not re-render the body cells.
const OrderListBody = memo(function OrderListBody({ rows, loading }: { rows: SalesOrderRow[]; loading: boolean }) {
  return (
    <tbody>
      {loading && <DetailSkeletonRows columns={COLUMNS.length} />}
      {!loading && rows.length === 0 && <tr><td colSpan={COLUMNS.length} className="sales-dense-empty">No orders match the current filter.</td></tr>}
      {!loading && rows.map((row, index) => (
        // OrdNo + OrdLineNo is not unique in OrdDT, so the position keeps keys unique
        <tr key={`${row.orderNo}-${row.ordLineNo}-${index}`}>
          {COLUMNS.map(col => {
            const text = col.value(row);
            // Full text on hover when a narrowed column cuts it off
            return <td key={col.key} style={col.align === 'right' ? tdRight : col.strong ? tdStrong : td} title={text && text !== '-' ? text : undefined}>{text}</td>;
          })}
        </tr>
      ))}
    </tbody>
  );
});

function DetailSkeletonRows({ columns, rows = 10 }: { columns: number; rows?: number }) {
  const widths = [68, 72, 46, 54, 76, 48, 60, 44, 70, 58, 52, 46, 28];
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <td key={columnIndex}>
              <span className="sales-dense-skeleton" style={{ width: `${widths[(rowIndex + columnIndex) % widths.length]}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const pageHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' };
const backButton: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-control)', fontWeight: 900, marginBottom: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' };
const pageSubtitle: CSSProperties = { marginTop: 4, color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-control)', fontWeight: 800 };
const headerActions: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const kpiGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 };
const kpiTile: CSSProperties = { background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: 14 };
const kpiLabel: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900, marginBottom: 6 };
const kpiValue: CSSProperties = { color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-kpi)', fontWeight: 900, fontFamily: 'var(--font-display)' };
const filterPanel: CSSProperties = { background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 };
const customerFilterRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const filterLabel: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-control)', fontWeight: 900, minWidth: 112 };
const chipButton: CSSProperties = { padding: '6px 11px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-control)', fontWeight: 900, cursor: 'pointer', fontFamily: 'var(--font-body)' };
const chipActive: CSSProperties = { borderColor: 'var(--color-brand-500)', background: 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)', color: 'var(--color-brand-600)' };
const searchWrap: CSSProperties = { position: 'relative', width: 'min(420px, 100%)' };
const searchIcon: CSSProperties = { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' };
const searchInput: CSSProperties = { width: '100%', height: 36, background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: '8px 12px 8px 32px', color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-control)', fontWeight: 800, outline: 'none', fontFamily: 'var(--font-body)' };
const tablePanel: CSSProperties = { minHeight: 0, flex: 1 };
// Width comes from the column widths; no min-width so narrowing a column really narrows it
const tableBase: CSSProperties = { minWidth: 0 };
const td: CSSProperties = { height: 48, padding: '6px 8px', color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-dense)', fontWeight: 800, verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const tdStrong: CSSProperties = { ...td, fontWeight: 900 };
const tdRight: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };





const paginationBar: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--color-border-light)', flexWrap: 'wrap' };
const paginationText: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-control)', fontWeight: 800 };
const paginationButtons: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
const pageButton: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', cursor: 'pointer' };
const disabledPageButton: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };
const pageText: CSSProperties = { color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-control)', fontWeight: 900 };
const errorText: CSSProperties = { color: 'var(--color-danger-500)', fontWeight: 800, fontSize: 'var(--erp-text-body)' };
