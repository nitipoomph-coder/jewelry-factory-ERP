import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, DollarSign, Hash, Search } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import '../components/sales/SalesDenseTable.css';
import './SalesResponsive.css';
import { CUSTOMER_GROUPS } from '../config/customerGroups';
import { fetchSalesOrders, type SalesOrderRow } from '../services/orderVolumeSummaryAPI';
import { ErpSegmentedControl } from '../components/ui/ErpButtons';
import { buildCustomerTrendsPath } from '../utils/customerTrendsUrl';
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
const fmtTableAmount = (value: number) => `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  const groupCustomers = useMemo(() => Array.from(new Set(
    CUSTOMER_GROUPS
      .filter(group => groups.includes(group.id))
      .flatMap(group => group.prefixes),
  )).sort(), [groups]);
  const requestedCustomers = useMemo(
    () => customersFromUrl.length > 0 ? customersFromUrl : groupCustomers,
    [customersFromUrl, groupCustomers],
  );
  const metric = searchParams.get('metric') === 'qty' ? 'qty' : 'amount';
  const customersKey = requestedCustomers.join('|');

  const [selectedCustomers, setSelectedCustomers] = useState<string[]>(requestedCustomers);
  const [rows, setRows] = useState<SalesOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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
      const data = await fetchSalesOrders({ years, months, customers: selectedCustomers, types });
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales orders');
    } finally {
      setLoading(false);
    }
  }, [years, months, selectedCustomers, types]);

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
    const baseRows = q ? rows.filter(row => [row.orderNo, row.poNo, row.itemNo, row.customerCode, row.customerName, row.itemType].some(value => String(value || '').toLowerCase().includes(q))) : rows;
    return [...baseRows].sort((a, b) => {
      if (metric === 'qty') return Number(b.orderQty || 0) - Number(a.orderQty || 0);
      return Number(b.itemAmnt || 0) - Number(a.itemAmnt || 0);
    });
  }, [rows, search, metric]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totals = useMemo(() => ({
    qty: filteredRows.reduce((sum, row) => sum + Number(row.orderQty || 0), 0),
    shipped: filteredRows.reduce((sum, row) => sum + Number(row.shippedQty || 0), 0),
    amount: filteredRows.reduce((sum, row) => sum + Number(row.itemAmnt || 0), 0),
  }), [filteredRows]);

  const overviewPath = useMemo(() => {
    return buildCustomerTrendsPath({
      years,
      months,
      groups,
      customers: selectedCustomers,
      metric,
    });
  }, [years, months, groups, selectedCustomers, metric]);

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
      'ItemWeight': 0,
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
              <button onClick={() => navigate(overviewPath)} style={backButton}><ArrowLeft size={14} /> Sales Overview</button>
              <span style={{ ...pageSubtitle, margin: 0 }}>{years.join(', ') || 'All Years'} / {monthSummary(months)} / sorted by {metric === 'amount' ? 'Sales Amount' : 'Ordered Qty'}</span>
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
            </div>
          </section>

          {error && <div style={errorText}>{error}</div>}

          <section className={['sales-dense-panel', searchDraft.trim() ? 'sales-dense-panel--searching' : ''].filter(Boolean).join(' ')} style={tablePanel}>
            <div className="content-scrollbar sales-dense-scroll">
              <table className="sales-dense-table" style={tableBase}>
                <thead>
                  <tr>
                    {['OrdNo', 'OrdDate', 'DueDate', 'CustDate', 'CustCode', 'SalesName', 'PONo', 'PO2', 'Ship T', 'OrdStamp', 'OrdMaker', 'ItemNo', 'Item SKU', 'Type', 'Cust Item', 'ItemMat', 'ItemSize', 'ItemStone', 'ItemDesc', 'Itemplate', 'SetType', 'ItemWeight', 'ItemQTY', 'ItemPrice', 'ItemAmt', 'ExportQTY', 'ExportAmt'].map((head, index) => <th key={head} className={(index >= 21) ? 'sales-dense-table__number' : undefined}>{head}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {loading && <DetailSkeletonRows columns={27} />}
                  {!loading && pageRows.length === 0 && <tr><td colSpan={27} className="sales-dense-empty">No orders match the current filter.</td></tr>}
                  {!loading && pageRows.map(row => {
                    return (
                      <tr key={`${row.orderNo}-${row.itemNo}`}>
                        <td style={tdStrong}>{row.orderNo}</td>
                        <td style={td}>{fmtDate(row.ordDate)}</td>
                        <td style={td}>{fmtDate(row.dueDate)}</td>
                        <td style={td}>{fmtDate(row.custDate)}</td>
                        <td style={tdStrong}>{row.customerCode}</td>
                        <td style={td}>{row.salesName}</td>
                        <td style={td}>{row.poNo || '-'}</td>
                        <td style={td}>{row.po2 || '-'}</td>
                        <td style={td}>{row.shipTo || '-'}</td>
                        <td style={td}>{row.ordStamp || '-'}</td>
                        <td style={td}>{row.ordMaker || '-'}</td>
                        <td style={tdStrong}><button onClick={() => navigate(`/item-detail/${encodeURIComponent(row.itemNo)}`)} style={linkButton}>{row.itemNo}</button></td>
                        <td style={td}>{row.itemSku || '-'}</td>
                        <td style={tdStrong}>{row.productTypeCode || '-'}</td>
                        <td style={td}>{row.custItem || '-'}</td>
                        <td style={td}>{row.itemMat || '-'}</td>
                        <td style={td}>{row.itemSize || '-'}</td>
                        <td style={td}>{row.itemStone || '-'}</td>
                        <td style={td}>{row.itemDesc || '-'}</td>
                        <td style={td}>{row.itemPlate || '-'}</td>
                        <td style={td}>{row.setType || '-'}</td>
                        <td style={tdRight}>{fmtQty(0)}</td>
                        <td style={tdRight}>{fmtQty(row.orderQty)}</td>
                        <td style={tdRight}>{fmtTableAmount(row.itemPrice || 0)}</td>
                        <td style={tdRight}>{fmtTableAmount(row.itemAmnt || 0)}</td>
                        <td style={tdRight}>{fmtQty(row.shippedQty)}</td>
                        <td style={tdRight}>{fmtTableAmount(row.shippedAmnt || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
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
const tableBase: CSSProperties = { minWidth: 1220 };
const td: CSSProperties = { height: 48, padding: '6px 8px', color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-dense)', fontWeight: 800, verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const tdStrong: CSSProperties = { ...td, fontWeight: 900 };
const tdRight: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

const linkButton: CSSProperties = { background: 'none', border: 'none', color: 'var(--color-brand-600)', fontWeight: 900, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' };




const paginationBar: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--color-border-light)', flexWrap: 'wrap' };
const paginationText: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-control)', fontWeight: 800 };
const paginationButtons: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
const pageButton: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', cursor: 'pointer' };
const disabledPageButton: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };
const pageText: CSSProperties = { color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-control)', fontWeight: 900 };
const errorText: CSSProperties = { color: 'var(--color-danger-500)', fontWeight: 800, fontSize: 'var(--erp-text-body)' };
