import { ChevronLeft, ChevronRight, X, RefreshCw, Filter, RotateCcw, FileSpreadsheet } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import {
  SearchBox,
  EmptyRow,
} from '../../infographic/InfographicSalesTrends';
import type { SalesOrderRow } from '../../../services/orderVolumeSummaryAPI';
import type { Drilldown } from '../../../hooks/useOrderVolumeSummaryData';
import { fmtQty, formatDmY, ORDER_DETAIL_COLUMNS } from '../../../hooks/useOrderVolumeSummaryData';
import { exportOrderVolumeDetailsExcel } from '../../../utils/exportOrderVolumeDetailsExcel';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAGE_SIZE = 50;

const selectStyle: React.CSSProperties = {
  height: 28,
  padding: '0 8px',
  borderRadius: 6,
  border: '1px solid var(--color-border-light)',
  background: 'var(--color-surface-0)',
  color: 'var(--color-text-primary)',
  fontSize: '0.74rem',
  fontWeight: 700,
  outline: 'none',
  cursor: 'pointer'
};

const cellCompact: React.CSSProperties = {
  padding: '5px 8px',
  fontSize: '0.74rem',
  whiteSpace: 'nowrap'
};

const orderPanel: React.CSSProperties = { width: '100%', minHeight: 0, flex: '1 1 0' };
const panelTitle: React.CSSProperties = { margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-control)', fontWeight: 900 };
const panelMeta: React.CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900 };
const tableScroll: React.CSSProperties = { width: '100%', minHeight: 0 };
const td: React.CSSProperties = { height: 46, padding: '6px 8px', color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-dense)', fontWeight: 500, verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const tdStrongCenter: React.CSSProperties = { ...td, fontWeight: 900, textAlign: 'center' };
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' };
const tdStrongRight: React.CSSProperties = { ...td, fontWeight: 900, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const paginationBar: React.CSSProperties = { minHeight: 38, padding: '6px 10px' };
const paginationText: React.CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--erp-text-dense)', fontWeight: 850 };
const paginationButtons: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6 };
const pageButton: React.CSSProperties = { width: 28, height: 28, display: 'inline-grid', placeItems: 'center', borderRadius: 6, border: '1px solid var(--color-border-light)', background: 'var(--color-surface-1)', color: 'var(--color-text-primary)', cursor: 'pointer' };
const pageButtonDisabled: React.CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };
const pageText: React.CSSProperties = { color: 'var(--color-text-primary)', fontSize: 'var(--erp-text-dense)', fontWeight: 900, minWidth: 82, textAlign: 'center' };

/**
 * Modern Formal Status & Shipment Progress Load Bar
 * Displays clear delivery status alongside exact shipment completion percentage
 */
function StatusProgressBar({ bucket, orderQty, shippedQty }: { bucket?: string; orderQty: number; shippedQty: number }) {
  const isOverdue = bucket === 'Overdue';
  const isDue15 = bucket === 'Due in 15 Days';
  const isDue30 = bucket === 'Due in 16-30 Days';
  const isShipped = bucket === 'Shipped' || (orderQty > 0 && shippedQty >= orderQty);

  // Exact shipped progress percentage
  const pct = orderQty > 0 ? Math.min(100, Math.max(0, Math.round((shippedQty / orderQty) * 100))) : (isShipped ? 100 : 0);

  // High contrast WCAG 2.1 AA colors (≥ 4.5:1 ratio)
  let statusText = bucket || 'Scheduled';
  let textColor = 'var(--color-brand-700)';
  let dotColor = 'var(--color-brand-500)';
  let fillColor = 'var(--color-brand-600)';
  let trackColor = 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)';

  if (isOverdue) {
    statusText = 'Overdue';
    textColor = 'var(--color-danger-700)';
    dotColor = 'var(--color-danger-500)';
    fillColor = 'var(--color-danger-600)';
    trackColor = 'color-mix(in srgb, var(--color-danger-500) 15%, transparent)';
  } else if (isDue15) {
    statusText = 'Due ≤ 15d';
    textColor = 'var(--color-warning-700)';
    dotColor = 'var(--color-warning-500)';
    fillColor = 'var(--color-warning-600)';
    trackColor = 'color-mix(in srgb, var(--color-warning-500) 15%, transparent)';
  } else if (isDue30) {
    statusText = 'Due ≤ 30d';
    textColor = 'var(--color-info-700)';
    dotColor = 'var(--color-info-500)';
    fillColor = 'var(--color-info-600)';
    trackColor = 'color-mix(in srgb, var(--color-info-500) 15%, transparent)';
  } else if (isShipped) {
    statusText = 'Shipped';
    textColor = 'var(--color-success-700)';
    dotColor = 'var(--color-success-500)';
    fillColor = 'var(--color-success-600)';
    trackColor = 'color-mix(in srgb, var(--color-success-500) 15%, transparent)';
  }

  const ariaLabelText = `Status: ${statusText}, Shipped: ${pct}% (${shippedQty} of ${orderQty} pcs)`;

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabelText}
      style={{ display: 'inline-flex', flexDirection: 'column', width: '100%', minWidth: 85, maxWidth: 105, gap: 3, verticalAlign: 'middle' }}
    >
      {/* Top line: Status text + Shipped percentage */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.69rem', fontWeight: 700, color: textColor, lineHeight: 1.2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} aria-hidden="true" />
          {statusText}
        </span>
        <span style={{ fontSize: '0.64rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>{pct}%</span>
      </div>

      {/* Bottom line: Clean slim progress load bar (no heavy frame) */}
      <div style={{ width: '100%', height: 4, background: trackColor, borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            width: isOverdue && pct === 0 ? '100%' : `${pct}%`,
            height: '100%',
            background: isOverdue && pct === 0 ? 'repeating-linear-gradient(45deg, var(--color-danger-500), var(--color-danger-500) 3px, var(--color-danger-600) 3px, var(--color-danger-600) 6px)' : fillColor,
            borderRadius: 2,
            transition: 'width 0.3s ease'
          }}
        />
      </div>
    </div>
  );
}

interface VolumeOrdersTableProps {
  drilldown: Drilldown | null;
  drilldownLoading: boolean;
  drilldownOrders: SalesOrderRow[];
  filteredOrderRows: SalesOrderRow[];
  search: string;
  setSearch: (s: string) => void;
  clearSearch: () => void;
  handleSearchKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  resetDrilldown: () => void;
  page: number;
  setPage: (p: number) => void;
  selectedDepartment?: string | null;
  setSelectedDepartment?: (d: string | null) => void;
  selectedBucket?: string | null;
  setSelectedBucket?: (b: string | null) => void;
  selectedCustGroup?: string | null;
  setSelectedCustGroup?: (g: string | null) => void;
}

export function VolumeOrdersTable({
  drilldown,
  drilldownLoading,
  drilldownOrders,
  filteredOrderRows,
  search,
  setSearch,
  clearSearch,
  handleSearchKeyDown,
  resetDrilldown,
  page,
  setPage,
  selectedDepartment,
  setSelectedDepartment,
  selectedBucket,
  setSelectedBucket,
  selectedCustGroup,
  setSelectedCustGroup
}: VolumeOrdersTableProps) {
  const totalPages = Math.max(1, Math.ceil(filteredOrderRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredOrderRows.length);
  const pageRows = filteredOrderRows.slice(pageStart, pageEnd);

  const hasActiveFilters = Boolean(
    drilldown || search || (selectedDepartment && selectedDepartment !== 'ALL') || (selectedBucket && selectedBucket !== 'ALL') || (selectedCustGroup && selectedCustGroup !== 'ALL')
  );

  return (
    <>
      {drilldown && (
        <div className="customer-trends-drilldown no-print" role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-brand-50)', border: '1px solid var(--color-brand-200)', borderRadius: 6, marginBottom: 12 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-brand-700)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={13} aria-hidden="true" /> Drill-down Active:
          </span>
          {drilldown.year && <strong style={{ fontSize: '0.75rem', color: 'var(--color-brand-900)' }}>{drilldown.year}</strong>}
          {drilldown.month && (
            <strong style={{ fontSize: '0.75rem', color: 'var(--color-brand-900)' }}>
              {MONTHS[Number(drilldown.month) - 1]}
            </strong>
          )}
          {drilldown.type && <strong style={{ fontSize: '0.75rem', color: 'var(--color-brand-900)' }}>{drilldown.type}</strong>}
          <button
            type="button"
            onClick={resetDrilldown}
            aria-label="Clear active drilldown filters"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'var(--color-surface-0)',
              border: '1px solid var(--color-border-light)',
              fontSize: '0.7rem',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            <X size={12} aria-hidden="true" /> Clear Drilldown
          </button>
        </div>
      )}
      <section id="customer-trends-details-panel" aria-label="Order Details Section" className={['sales-dense-panel', filteredOrderRows.length > PAGE_SIZE ? 'sales-dense-panel--static-rows' : ''].filter(Boolean).join(' ')} style={orderPanel}>
        <div className="sales-dense-panel__header customer-trends-order-header" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ ...panelTitle, margin: 0 }}>Order Details</h2>

            {/* Custom Department Filter */}
            {setSelectedDepartment && (
              <label className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Dept:</span>
                <select
                  value={selectedDepartment || 'ALL'}
                  onChange={e => setSelectedDepartment(e.target.value === 'ALL' ? null : e.target.value)}
                  aria-label="Filter orders by factory department"
                  style={selectStyle}
                >
                  <option value="ALL">All Departments</option>
                  <option value="Wax / Preparation">Wax / Prep</option>
                  <option value="Casting">Casting</option>
                  <option value="Grinding">Grinding</option>
                  <option value="Filing">Filing</option>
                  <option value="Setting">Setting</option>
                  <option value="Polishing">Polishing</option>
                  <option value="Plating">Plating</option>
                  <option value="QC">QC</option>
                  <option value="Packing">Packing</option>
                </select>
              </label>
            )}

            {/* Custom Risk / Status Filter */}
            {setSelectedBucket && (
              <label className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Status:</span>
                <select
                  value={selectedBucket || 'ALL'}
                  onChange={e => setSelectedBucket(e.target.value === 'ALL' ? null : e.target.value)}
                  aria-label="Filter orders by risk and delivery status"
                  style={selectStyle}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Due in 15 Days">Due in 15 Days</option>
                  <option value="Due in 16-30 Days">Due in 16-30 Days</option>
                  <option value="Future Due">Future Due</option>
                  <option value="Shipped">Shipped</option>
                </select>
              </label>
            )}

            {/* Custom Customer Group Filter */}
            {setSelectedCustGroup && (
              <label className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Group:</span>
                <select
                  value={selectedCustGroup || 'ALL'}
                  onChange={e => setSelectedCustGroup(e.target.value === 'ALL' ? null : e.target.value)}
                  aria-label="Filter orders by customer group"
                  style={selectStyle}
                >
                  <option value="ALL">All Groups</option>
                  <option value="N008">N008 Group</option>
                  <option value="N044">N044 Group</option>
                  <option value="N098">N098 Group</option>
                  <option value="N051">N051 Group</option>
                  <option value="N083">N083 Group</option>
                  <option value="MLT">MLT Group</option>
                </select>
              </label>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                className="no-print"
                onClick={resetDrilldown}
                aria-label="Reset all table filters and search term"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  height: 28,
                  padding: '0 8px',
                  borderRadius: 6,
                  background: 'var(--color-surface-0)',
                  border: '1px solid var(--color-border-light)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer'
                }}
                title="Reset all filters and search"
              >
                <RotateCcw size={12} aria-hidden="true" /> Reset
              </button>
            )}
          </div>

          <div className="customer-trends-order-actions no-print" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="customer-trends-order-search" style={{ minWidth: 200 }}>
              <SearchBox
                value={search}
                onChange={value => setSearch(value.toUpperCase())}
                onKeyDown={handleSearchKeyDown}
                onClear={clearSearch}
                aria-label="Search order number, PO number, or item SKU"
              />
            </div>
            <button
              type="button"
              onClick={() => exportOrderVolumeDetailsExcel(filteredOrderRows, 'Order_Details')}
              disabled={filteredOrderRows.length === 0}
              aria-label="Export filtered order details to Excel"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                height: 28,
                padding: '0 10px',
                borderRadius: 6,
                background: 'var(--color-success-600)',
                border: '1px solid var(--color-success-700)',
                fontSize: '0.73rem',
                fontWeight: 700,
                color: 'var(--color-text-inverse)',
                cursor: filteredOrderRows.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredOrderRows.length === 0 ? 0.5 : 1
              }}
              title="Export filtered order details to Excel (.xlsx)"
            >
              <FileSpreadsheet size={13} aria-hidden="true" />
              Excel
            </button>
            <span style={panelMeta} aria-live="polite">
              {drilldownLoading
                ? 'Loading...'
                : `Showing ${filteredOrderRows.length === 0 ? 0 : pageStart + 1}-${pageEnd} of ${fmtQty(filteredOrderRows.length)} rows`}
            </span>
          </div>
        </div>
        <div className="content-scrollbar sales-dense-scroll" style={{ ...tableScroll, overflowX: 'auto' }}>
          {drilldownLoading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }} role="status">
              <RefreshCw size={18} className="animate-spin" aria-hidden="true" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 'var(--erp-text-control)', fontWeight: 700 }}>Loading order details...</p>
            </div>
          ) : !drilldown && drilldownOrders.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <p style={{ fontSize: 'var(--erp-text-control)', fontWeight: 700 }}>Click a chart bar or type to view order details</p>
            </div>
          ) : (
            <table className="sales-dense-table" style={{ width: '100%', minWidth: 1180, tableLayout: 'auto' }} aria-label="Production Order Items Table">
              <thead>
                <tr>
                  {ORDER_DETAIL_COLUMNS.map(([head, width], index) => (
                    <th
                      key={head}
                      scope="col"
                      className={index >= 13 ? 'sales-dense-table__number' : undefined}
                      style={{ width: Number(width), padding: '6px 8px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrderRows.length === 0 && <EmptyRow colSpan={20} label="No order item lines match the current filters." />}
                {pageRows.map((row, index) => {
                  const isOverdue = row.dueRiskBucket === 'Overdue';
                  const isDue15 = row.dueRiskBucket === 'Due in 15 Days';
                  const totalValue = row.itemAmnt || ((row.itemPrice || 0) * (row.orderQty || 0));
                  const backlogValue = (row.itemPrice || 0) * (row.openQty || 0);
                  const rowNumber = pageStart + index + 1;
                  const weekLabel = row.ordWeek ? `W${String(row.ordWeek).padStart(2, '0')}` : '-';

                  return (
                    <tr key={`${row.orderNo}-${row.itemNo}-${row.ordDate}-${row.custDate}-${index}`}>
                      <td style={{ ...tdCenter, ...cellCompact, color: 'var(--color-text-tertiary)' }}>{rowNumber}</td>
                      <td style={{ ...tdCenter, ...cellCompact, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{weekLabel}</td>
                      <td style={{ ...tdStrongCenter, ...cellCompact }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-brand-700)' }}>
                          {row.customerCode}
                        </span>
                      </td>
                      <td style={{ ...tdStrongCenter, ...cellCompact }}>{row.poNo || '-'}</td>
                      <td style={{ ...tdCenter, ...cellCompact, color: 'var(--color-text-secondary)' }}>{row.po2 || '-'}</td>
                      <td style={{ ...tdCenter, ...cellCompact, color: 'var(--color-text-secondary)' }}>{row.ordKind || '-'}</td>
                      <td style={{ ...tdCenter, ...cellCompact }}>{row.metal || '-'}</td>
                      <td style={{ ...tdStrongCenter, ...cellCompact }}>{row.itemNo || '-'}</td>
                      <td style={{ ...tdCenter, ...cellCompact, color: 'var(--color-text-secondary)' }}>{row.shipTo || '-'}</td>
                      <td style={{ ...tdCenter, ...cellCompact }}>
                        {formatDmY(row.ordDate)}
                      </td>
                      <td style={{ ...tdCenter, ...cellCompact, fontWeight: isOverdue || isDue15 ? 700 : 400, color: isOverdue ? 'var(--color-danger-700)' : isDue15 ? 'var(--color-warning-700)' : 'inherit' }}>
                        {formatDmY(row.custDate || row.dueDate)}
                      </td>
                      <td style={{ ...tdCenter, ...cellCompact }}>
                        <StatusProgressBar bucket={row.dueRiskBucket} orderQty={row.orderQty || 0} shippedQty={row.shippedQty || 0} />
                      </td>
                      <td style={{ ...tdCenter, ...cellCompact, color: 'var(--color-text-secondary)' }}>
                        {row.currentDepartment || 'Wax / Prep'}
                      </td>
                      <td style={{ ...tdStrongRight, ...cellCompact }}>{fmtQty(row.orderQty || 0)}</td>
                      <td style={{ ...tdStrongRight, ...cellCompact }}>{totalValue > 0 ? `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                      <td style={{ ...tdStrongRight, ...cellCompact }}>{fmtQty(row.shippedQty || 0)}</td>
                      <td style={{ ...tdStrongRight, ...cellCompact, color: row.openQty > 0 ? 'var(--color-brand-700)' : 'inherit' }}>{fmtQty(row.openQty || 0)}</td>
                      <td style={{ ...tdStrongRight, ...cellCompact }}>{backlogValue > 0 ? `$${backlogValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                      <td style={{ ...tdStrongRight, ...cellCompact, fontWeight: 700, color: row.daysToCustDue && row.daysToCustDue < 0 ? 'var(--color-danger-700)' : 'inherit' }}>
                        {row.daysToCustDue !== undefined && row.daysToCustDue !== null ? (row.daysToCustDue > 0 ? `+${row.daysToCustDue}` : `${row.daysToCustDue}`) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {filteredOrderRows.length > PAGE_SIZE && (
          <div className="sales-dense-pagination no-print" style={paginationBar} role="navigation" aria-label="Order items pagination">
            <div style={paginationText}>Showing {filteredOrderRows.length === 0 ? 0 : pageStart + 1}-{pageEnd} of {fmtQty(filteredOrderRows.length)}</div>
            <div style={paginationButtons}>
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Go to previous page" style={{ ...pageButton, ...(currentPage <= 1 ? pageButtonDisabled : null) }}><ChevronLeft size={14} aria-hidden="true" /></button>
              <span style={pageText}>Page {currentPage} / {totalPages}</span>
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Go to next page" style={{ ...pageButton, ...(currentPage >= totalPages ? pageButtonDisabled : null) }}><ChevronRight size={14} aria-hidden="true" /></button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
