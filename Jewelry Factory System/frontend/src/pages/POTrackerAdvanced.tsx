import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import OrderTable from '../components/dashboard/poTracker/OrderTable';
import CustomViewModal from '../components/dashboard/poTracker/CustomViewModal';
import CustomSelect from '../components/ui/CustomSelect';
import { RefreshCw, AlertTriangle, Filter, Layers, FilterX, RotateCcw } from 'lucide-react';
import { usePOTrackerAdvanced } from '../hooks/usePOTrackerAdvanced';
import { useTopbarActions } from '../contexts/TopbarActionContext';
import { ErpButton, ErpSegmentedControl } from '../components/ui/ErpButtons';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { MultiSelectFilterInput } from '../components/dashboard/poTracker/MultiSelectFilterInput';
import { DEFAULT_COL_WIDTHS, PINNED_KEYS, getActiveColumnKeys } from '../components/dashboard/poTracker/orderTableConfig';
import { currentUserKey, useColumnWidths } from '../hooks/useColumnWidths';
import './POTracker.css';

const GROUP_OPTIONS = [
  { value: 'N008', label: 'N008' },
  { value: 'N044', label: 'N044' },
  { value: 'N098', label: 'N098' },
  { value: 'N051', label: 'N051' },
  { value: 'MLT', label: 'MLT' },
  { value: 'ALL', label: 'General' },
];

// Photo size in the table (only offered when the Photo column is shown, e.g. N051). Saved per user.
type PhotoSize = 'S' | 'M' | 'L';
const PHOTO_SIZES: Record<PhotoSize, number> = { S: 40, M: 72, L: 112 };
const PHOTO_SIZE_KEY = 'po-tracker-photo-size:v1';
function loadPhotoSize(): PhotoSize {
  try {
    const saved = localStorage.getItem(`${PHOTO_SIZE_KEY}:${currentUserKey()}`);
    return saved === 'M' || saved === 'L' ? saved : 'S';
  } catch {
    return 'S';
  }
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'finish', label: 'Finish' },
  { value: 'all', label: 'All' },
];

export default function POTrackerAdvanced() {
  const {
    isFiltered,
    resetFilters,
    statusFilter,
    setStatusFilter,
    groupFilter,
    setGroupFilter,
    dateType,
    setDateType,
    setPage,
    pageSize,
    filterType,
    setFilterType,
    filterWeek,
    setFilterWeek,
    filterCust,
    setFilterCust,
    filterPO,
    setFilterPO,
    filterShipTo,
    setFilterShipTo,
    showFiltersPopover,
    setShowFiltersPopover,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    visibleKeys,
    setVisibleKeys,
    loading,
    error,
    load,
    showCustomViewModal,
    setShowCustomViewModal,
    filtered,
    totalPOs,
    totalQty,
    totalAmount,
    delayedCount,
    uniqueTypes,
    uniqueWeeks,
    uniqueCusts,
    totalPages,
    page,
    pageStart,
    paged,
    pageNumbers,
    activeFilterCount
  } = usePOTrackerAdvanced();

  // Column widths: dragged without re-rendering the table, remembered per user (hooks/useColumnWidths).
  const activeColumnKeys = useMemo(() => getActiveColumnKeys(visibleKeys), [visibleKeys]);
  // Photo size: the Photo column's default width follows it (a width the user dragged still wins)
  const [photoSize, setPhotoSize] = useState<PhotoSize>(loadPhotoSize);
  const changePhotoSize = (size: PhotoSize) => {
    setPhotoSize(size);
    try { localStorage.setItem(`${PHOTO_SIZE_KEY}:${currentUserKey()}`, size); } catch { /* storage blocked: size still applies for this visit */ }
  };
  const showsPhoto = activeColumnKeys.includes('photo');
  const widthDefaults = useMemo(
    () => ({ ...DEFAULT_COL_WIDTHS, photo: Math.max(DEFAULT_COL_WIDTHS.photo ?? 72, PHOTO_SIZES[photoSize] + 16) }),
    [photoSize],
  );
  const columnWidths = useColumnWidths('po-tracker', widthDefaults, { minWidth: 40, keys: activeColumnKeys, stickyKeys: PINNED_KEYS });
  const hasCustomWidths = columnWidths.isCustomized;

  const { setTopbarActions } = useTopbarActions();
  const [isSpinning, setIsSpinning] = useState(false);

  const handleReload = useCallback(async () => {
    setIsSpinning(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 600));
    try {
      load();
      await minDelay;
    } finally {
      setIsSpinning(false);
    }
  }, [load]);

  const isRefreshing = isSpinning || loading;

  useEffect(() => {
    setTopbarActions(
      <button
        onClick={handleReload}
        disabled={isRefreshing}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isRefreshing ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          opacity: isRefreshing ? 0.8 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isRefreshing) {
            e.currentTarget.style.background = 'var(--color-surface-2)';
            e.currentTarget.style.color = 'var(--color-brand-600)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
        title="Refresh Data"
        aria-label="Refresh Data"
      >
        <RefreshCw
          size={18}
          strokeWidth={1.75}
          className={isRefreshing ? 'animate-spin text-[var(--color-brand-600)]' : ''}
        />
      </button>
    );
    return () => setTopbarActions(null);
  }, [setTopbarActions, handleReload, isRefreshing]);

  return (
    <div className="app-page font-body">
      <PageHeader breadcrumb={BREADCRUMBS.PO_TRACKER} contentLayout="dashboard-wide" />

      {/* One flat surface (2026-11-27): toolbar, summary and table are separated by hairlines, not boxes */}
      <div className="app-content-frame app-content-frame--dashboard-wide app-page-content po-tracker-page" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ─── FILTERS: compact toolbar + Filters popover (the count on the button shows active filters) ─── */}
        <div className="po-toolbar no-print">
          {/* Left: Group + Status pill toggles */}
          <div className="po-toolbar__modes">
            {/* Group Toggle */}
            <div className="po-toolbar__field">
              <span className="po-toolbar__label">Group</span>
              <ErpSegmentedControl
                ariaLabel="Group Filter"
                value={groupFilter}
                onChange={(grp) => setGroupFilter(grp)}
                options={GROUP_OPTIONS}
              />
            </div>

            {/* Status Toggle — SP ทั้ง 5 dateType รับ @Status แล้ว */}
            <div className="po-toolbar__field">
              <span className="po-toolbar__label">Status</span>
              <ErpSegmentedControl
                ariaLabel="Status Filter"
                value={statusFilter}
                onChange={(st) => setStatusFilter(st as 'pending' | 'finish' | 'all')}
                options={STATUS_OPTIONS}
              />
            </div>

            {/* Single Global Reset Button (FilterX) covering all page filters */}
            {isFiltered && (
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  background: "none",
                  border: "none",
                  padding: "6px",
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
                className="hover:bg-[var(--color-surface-2)] active:scale-95"
                title="Reset filters"
                aria-label="Reset filters"
              >
                <FilterX size={14} />
              </button>
            )}
          </div>

          <div className="po-toolbar__actions">
            {showsPhoto && (
              <div className="po-toolbar__field">
                <span className="po-toolbar__label">Photo</span>
                <ErpSegmentedControl<PhotoSize>
                  ariaLabel="Photo size"
                  value={photoSize}
                  onChange={changePhotoSize}
                  options={[{ value: 'S', label: 'S' }, { value: 'M', label: 'M' }, { value: 'L', label: 'L' }]}
                />
              </div>
            )}
            {hasCustomWidths && (
              <ErpButton variant="ghost" icon={<RotateCcw size={14} />} onClick={columnWidths.resetAll} title="Return every column to its default width">
                Reset Columns
              </ErpButton>
            )}
            <ErpButton variant="secondary" icon={<Layers size={14} />} onClick={(e) => { e.stopPropagation(); setShowCustomViewModal(true); }}>
              Custom View
            </ErpButton>
            <div style={{ position: 'relative' }}>
              <ErpButton
                variant="secondary"
                icon={<Filter size={14} />}
                onClick={(e) => { e.stopPropagation(); setShowFiltersPopover(!showFiltersPopover); }}
                aria-expanded={showFiltersPopover}
              >
                Filters
                {activeFilterCount > 0 && <span className="po-filter-count">{activeFilterCount}</span>}
              </ErpButton>

              {showFiltersPopover && (
                <>
                  <div
                    onClick={() => setShowFiltersPopover(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'transparent' }}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="po-filter-popover"
                    style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 101,
                      background: 'var(--color-ui-surface)', borderRadius: '8px',
                      boxShadow: 'var(--shadow-dropdown)', border: '1px solid var(--color-border-light)',
                      padding: '20px', width: '640px', maxWidth: '92vw',
                      display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Week</label>
                      <MultiSelectFilterInput value={filterWeek} onChange={setFilterWeek} options={uniqueWeeks} placeholder="Filter Week..." width="120px" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Customer</label>
                      <MultiSelectFilterInput value={filterCust} onChange={setFilterCust} options={uniqueCusts} placeholder="Filter Cust..." width="120px" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>PO / Order No</label>
                      <input type="text" value={filterPO} onChange={e => setFilterPO(e.target.value)} placeholder="Filter PO/Ord..." style={{ width: '150px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }} className="focus:border-brand-400" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Order Type</label>
                      <CustomSelect
                        value={filterType}
                        onChange={setFilterType}
                        options={[
                          { value: '', label: 'All Types' },
                          ...uniqueTypes.map(t => ({ value: t, label: t }))
                        ]}
                        width="140px"
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Ship To</label>
                      <input type="text" value={filterShipTo} onChange={e => setFilterShipTo(e.target.value)} placeholder="Filter ShipTo..." style={{ width: '150px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }} className="focus:border-brand-400" />
                    </div>

                    <div className="po-filter-date-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '300px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Date Range</label>
                      <div className="po-date-range" style={{ display: 'flex', alignItems: 'center', borderRadius: '8px', gap: '8px' }}>
                        <CustomSelect
                          value={dateType}
                          onChange={setDateType}
                          options={[
                            { value: 'Order Date', label: 'Order Date' },
                            { value: 'Factory Due Date', label: 'Factory Due Date' },
                            { value: 'Cust Due Date', label: 'Cust Due Date' },
                            { value: 'Finish Date', label: 'Finish Date' },
                            { value: 'All', label: 'All Dates' }
                          ]}
                          width="140px"
                        />
                        <div className="po-date-inputs" style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', gap: '8px', flex: 1, border: '1px solid var(--color-border-strong)', borderRadius: '8px', background: 'var(--color-surface-0)' }}>
                          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '0.8rem', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 600 }} />
                          <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.65rem', fontWeight: 800 }}>TO</span>
                          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '0.8rem', color: 'var(--color-text-primary)', outline: 'none', fontWeight: 600 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Refresh button moved to the KPI header below */}
          </div>
        </div>

        {/* ─── SUMMARY: Pending + Overdue first (what needs follow-up), then PO / Qty / Amount ─── */}
        <div className="po-kpis" role="group" aria-label="Tracker summary">
          {loading && filtered.length === 0 ? (
            [[70, 64], [70, 52], [40, 48], [60, 76], [70, 110]].map(([lw, vw], idx) => (
              <div key={idx} className="po-kpi">
                <span className="app-skeleton po-kpi-skeleton" style={{ width: lw, height: 11 }} />
                <span className="app-skeleton po-kpi-skeleton" style={{ width: vw, height: idx < 2 ? 26 : 18 }} />
              </div>
            ))
          ) : (
            <>
              <div className="po-kpi">
                <span className="po-kpi-label">{statusFilter === 'all' ? 'All Orders' : statusFilter === 'finish' ? 'Finished' : 'Pending'}</span>
                <span className="po-kpi-value">{filtered.length.toLocaleString()}</span>
              </div>
              {statusFilter !== 'finish' && (
                <div
                  className={`po-kpi ${delayedCount > 0 ? 'po-kpi--late' : ''}`.trim()}
                  title="Orders past the customer due date (CustDueDate)"
                >
                  <span className="po-kpi-label">Overdue (Cust Due)</span>
                  <span className="po-kpi-value">{delayedCount.toLocaleString()}</span>
                </div>
              )}
              <span className="po-kpi-divider" aria-hidden="true" />
              <div className="po-kpi po-kpi--minor" title={`Unique POs: ${totalPOs.toLocaleString()} | Order lines: ${filtered.length.toLocaleString()}`}>
                <span className="po-kpi-label">PO</span>
                <span className="po-kpi-value">{totalPOs.toLocaleString()}</span>
              </div>
              <div className="po-kpi po-kpi--minor">
                <span className="po-kpi-label">Total Qty</span>
                <span className="po-kpi-value">{totalQty.toLocaleString()}<span className="po-kpi-unit">pcs</span></span>
              </div>
              <div className="po-kpi po-kpi--minor">
                <span className="po-kpi-label">Amount</span>
                <span className="po-kpi-value">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </>
          )}
        </div>

        {/* ─── DATA TABLE: the only scroll area; no card around it ─── */}
        <div className="po-table-region" style={{ '--po-photo-size': `${PHOTO_SIZES[photoSize]}px` } as React.CSSProperties}>
          {error && <div className="po-error"><AlertTriangle size={16} /> <span>{error}</span></div>}

          <OrderTable
            data={paged}
            loading={loading}
            pageOffset={pageStart}
            visibleKeys={visibleKeys}
            columnWidths={columnWidths}
          />
        </div>

        {/* Pager: record count and page buttons, flat like the Order List */}
        {!loading && filtered.length > 0 && (
          <div className="po-pagination">
            <span>
              <b>{pageStart + 1}</b>–<b>{Math.min(pageStart + pageSize, filtered.length)}</b> of <b>{filtered.length.toLocaleString()}</b> orders
            </span>
            <span className="po-pages">
              <button type="button" className="po-page-btn" onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">Prev</button>
              {pageNumbers.map((p, i) => p === '...'
                ? <span key={i} className="po-page-gap">…</span>
                : (
                  <button key={i} type="button" className="po-page-btn" onClick={() => setPage(p as number)} aria-current={page === p ? 'page' : undefined}>
                    {p}
                  </button>
                ))}
              <button type="button" className="po-page-btn" onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page">Next</button>
            </span>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .animate-spin{animation:spin 1s linear infinite}
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <CustomViewModal
        isOpen={showCustomViewModal}
        onClose={() => setShowCustomViewModal(false)}
        initialVisibleKeys={visibleKeys}
        initialGroup={groupFilter}
        onApply={(grp, keys) => {
          setGroupFilter(grp);
          setVisibleKeys(keys);
        }}
      />
    </div>
  );
}
