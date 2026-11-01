import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import OrderTable from '../components/dashboard/poTracker/OrderTable';
import CustomViewModal from '../components/dashboard/poTracker/CustomViewModal';
import CustomSelect from '../components/ui/CustomSelect';
import { RefreshCw, AlertTriangle, Filter, Layers, FilterX, RotateCcw } from 'lucide-react';
import { usePOTrackerAdvanced } from '../hooks/usePOTrackerAdvanced';
import { useTopbarActions } from '../contexts/TopbarActionContext';
import { ErpSegmentedControl } from '../components/ui/ErpButtons';
import { useState, useEffect, useCallback } from 'react';
import { MultiSelectFilterInput } from '../components/dashboard/poTracker/MultiSelectFilterInput';

const GROUP_OPTIONS = [
  { value: 'N008', label: 'N008' },
  { value: 'N044', label: 'N044' },
  { value: 'N098', label: 'N098' },
  { value: 'N051', label: 'N051' },
  { value: 'MLT', label: 'MLT' },
  { value: 'ALL', label: 'General' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'finish', label: 'Finish' },
  { value: 'all', label: 'All' },
];

export default function POTrackerAdvanced() {
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const hasCustomWidths = Object.keys(colWidths).length > 0;

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

      <div className="app-content-frame app-content-frame--dashboard-wide app-page-content po-tracker-page" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ─── FILTERS: compact toolbar + popover + active chips ─── */}
        <div className="po-toolbar app-panel no-print" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
          background: 'var(--color-surface-0)',
          padding: '14px 20px', marginBottom: '24px',
        }}>
          {/* Left: Group + Status pill toggles */}
          <div className="po-toolbar__modes" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Group Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Group</span>
              <ErpSegmentedControl
                ariaLabel="Group Filter"
                value={groupFilter}
                onChange={(grp) => setGroupFilter(grp)}
                options={GROUP_OPTIONS}
              />
            </div>

            {/* Status Toggle — SP ทั้ง 5 dateType รับ @Status แล้ว */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing: '0.05em' }}>Status</span>
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

          <div className="po-toolbar__actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowCustomViewModal(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px',
                background: 'var(--color-surface-0)',
                border: '1px solid var(--color-border-strong)', color: 'var(--color-text-primary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease'
              }}
              className="hover:bg-[var(--color-surface-1)]"
            >
              <Layers size={14} />
              Custom View
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowFiltersPopover(!showFiltersPopover); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px',
                  background: showFiltersPopover ? 'var(--color-surface-2)' : 'var(--color-surface-0)', border: '1px solid var(--color-border-strong)',
                  color: 'var(--color-text-primary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                }}
                className="hover:bg-[var(--color-surface-1)]"
              >
                <Filter size={14} />
                Filters
                {activeFilterCount > 0 && (
                  <span style={{ background: 'var(--color-brand-500)', color: 'var(--color-ui-on-interactive)', padding: '2px 6px', borderRadius: '10px', fontSize: '0.65rem' }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

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

        {/* ─── SMART KPI TOOLBAR (WCAG 2.1 AA) ─── */}
        <div
          role="banner"
          aria-label="Tracker summary and data refresh"
          style={{
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: '24px',
            border: '1px solid var(--color-border-light)',
            borderRadius: '8px',
            background: 'var(--color-surface-0)',
            boxShadow: 'var(--shadow-panel)'
          }}
        >
          {/* Left Side: Framed Status Pod (Pending & Late Cust Due) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {loading && filtered.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '8px 16px',
                  background: 'var(--color-surface-1)',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: '8px',
                }}
              >
                {[70, 90].map((w, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="app-skeleton" style={{ width: w * 0.7, height: 10, borderRadius: 2 }} />
                    <div className="app-skeleton" style={{ width: w, height: 20, borderRadius: 4 }} />
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '6px 14px',
                  background: 'var(--color-surface-1)',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-panel)'
                }}
              >
                {/* Primary Active Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {statusFilter === 'all' ? 'ALL ORDERS' : statusFilter === 'finish' ? 'FINISHED' : 'PENDING'}
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 850, color: 'var(--color-brand-600)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                    {filtered.length.toLocaleString()}
                  </span>
                </div>

                {/* LATE (Cust Due) Pill with dynamic alert styling */}
                {statusFilter !== 'finish' && (
                  <>
                    <div style={{ width: '1px', height: '24px', background: 'var(--color-border-strong)' }} />
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: delayedCount > 0 ? 'var(--color-danger-50)' : 'transparent',
                        border: delayedCount > 0 ? '1px solid var(--color-danger-200)' : '1px solid transparent',
                        transition: 'all 0.2s ease'
                      }}
                      title="Late orders calculated based on Customer Due Date (CustDueDate)"
                    >
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: delayedCount > 0 ? 'var(--color-danger-600)' : 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        OVERDUE
                      </span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 850, color: delayedCount > 0 ? 'var(--color-danger-600)' : 'var(--color-text-secondary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                        {delayedCount.toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Side: Modern Framed Summary Pod (PO, QTY, AMOUNT) + Reset Columns Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {loading && filtered.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '8px 16px',
                  background: 'var(--color-surface-0)',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: '8px',
                }}
              >
                {[70, 80, 110].map((w, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="app-skeleton" style={{ width: w * 0.7, height: 10, borderRadius: 2 }} />
                    <div className="app-skeleton" style={{ width: w, height: 20, borderRadius: 4 }} />
                  </div>
                ))}
              </div>
            ) : (
              /* Modern Framed Summary Pod: PO, Qty, Amount ($) */
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'stretch',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-surface-0)',
                  boxShadow: 'var(--shadow-panel)',
                  overflow: 'hidden'
                }}
              >
                {/* PO Section */}
                <div
                  style={{
                    padding: '6px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRight: '1px solid var(--color-border-light)',
                    background: 'var(--color-surface-0)',
                    minWidth: '75px',
                    transition: 'background 0.15s ease'
                  }}
                  className="hover:bg-[var(--color-surface-1)]"
                  title={`Unique POs: ${totalPOs.toLocaleString()} | Active Order Lines: ${filtered.length.toLocaleString()}`}
                >
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PO</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 850, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
                    {totalPOs.toLocaleString()}
                  </span>
                </div>

                {/* QTY Section */}
                <div
                  style={{
                    padding: '6px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRight: '1px solid var(--color-border-light)',
                    background: 'var(--color-surface-0)',
                    minWidth: '95px',
                    transition: 'background 0.15s ease'
                  }}
                  className="hover:bg-[var(--color-surface-1)]"
                >
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL QTY</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 850, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
                    {totalQty.toLocaleString()}
                  </span>
                </div>

                {/* AMOUNT ($) Section with subtle premium highlight */}
                <div
                  style={{
                    padding: '6px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'color-mix(in srgb, var(--color-brand-50) 60%, var(--color-surface-0))',
                    minWidth: '130px',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-brand-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AMOUNT ($)</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 850, color: 'var(--color-brand-700)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
                    ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Reset Columns Widths Button */}
            <button
              type="button"
              onClick={() => setColWidths({})}
              disabled={!hasCustomWidths}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border-strong)',
                background: 'var(--color-surface-0)',
                color: hasCustomWidths ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: hasCustomWidths ? 'pointer' : 'default',
                opacity: hasCustomWidths ? 1 : 0.45,
                transition: 'all 0.15s ease',
                boxShadow: hasCustomWidths ? 'var(--shadow-control)' : 'none',
              }}
              className={hasCustomWidths ? "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] active:scale-95" : ""}
              title={hasCustomWidths ? "Reset column widths back to original default" : "Column widths are at default"}
            >
              <RotateCcw size={12} />
              Reset Columns
            </button>
          </div>
        </div>

        {/* ─── DATA TABLE — outer box owns the leftover viewport space (invisible, no chrome);
               inner card shrinks to its actual content and only grows up to that budget when the
               table is long enough to need it, so a short result set doesn't leave an empty box ─── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }} className="content-scrollbar">
          <div style={{ background: 'var(--color-surface-0)', borderRadius: '8px', border: '1px solid var(--color-border-light)', boxShadow: 'var(--shadow-panel)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {error && <div style={{ padding: '16px', background: 'var(--color-danger-50)', borderBottom: '1px solid var(--color-danger-500)', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} style={{ color: 'var(--color-danger-600)' }} /> <span style={{ fontSize: '0.85rem', color: 'var(--color-danger-600)' }}>{error}</span></div>}

            <OrderTable
              data={paged}
              loading={loading}
              pageOffset={pageStart}
              visibleKeys={visibleKeys}
              colWidths={colWidths}
              onColWidthsChange={setColWidths}
            />

            {/* Single Pagination Bar — record count, page size, and page nav together */}
            {!loading && filtered.length > 0 && (
              <div className="po-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: '12px 16px', borderTop: '1px solid var(--color-border-strong)', background: 'var(--color-surface-0)', gap: '12px', flexShrink: 0 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                  Showing <strong style={{ color: 'var(--color-text-primary)' }}>{pageStart + 1}</strong>–<strong style={{ color: 'var(--color-text-primary)' }}>{Math.min(pageStart + pageSize, filtered.length)}</strong> of <strong style={{ color: 'var(--color-brand-600)' }}>{filtered.length.toLocaleString()}</strong>
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 16px', borderRadius: '10px', border: '1px solid var(--color-border-light)', background: page === 1 ? 'transparent' : 'var(--color-surface-1)', color: page === 1 ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s' }} className="hover:bg-surface-2 active:scale-95">Prev</button>
                  {pageNumbers.map((p, i) => p === '...' ? <span key={i} style={{ color: 'var(--color-text-quaternary)', padding: '0 8px' }}>...</span> : (
                    <button key={i} onClick={() => setPage(p as number)} style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${page === p ? 'var(--color-brand-500)' : 'var(--color-border-light)'}`, background: page === p ? 'var(--color-brand-500)' : 'transparent', color: page === p ? 'var(--color-ui-on-interactive)' : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 900, minWidth: '38px', transition: 'all 0.2s' }} className="hover:bg-surface-1 active:scale-95">{p}</button>
                  ))}
                  <button onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 16px', borderRadius: '10px', border: '1px solid var(--color-border-light)', background: page === totalPages ? 'transparent' : 'var(--color-surface-1)', color: page === totalPages ? 'var(--color-text-quaternary)' : 'var(--color-text-secondary)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s' }} className="hover:bg-surface-2 active:scale-95">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
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
