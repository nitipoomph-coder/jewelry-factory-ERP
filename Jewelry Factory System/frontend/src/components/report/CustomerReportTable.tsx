import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, DollarSign, Hash, RefreshCw, Search, X } from 'lucide-react';
import { ErpButton, ErpSegmentedControl } from '../ui/ErpButtons';
import './CustomerReportTable.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface CustomerReportRow extends Record<string, unknown> {
  id: string;
  label: string;
  topItem?: string;
  topItemQty?: number;
}

interface CustomerReportTableProps {
  loading: boolean;
  baseYear: string;
  viewMode: 'ytd' | 'quarterly' | 'monthly' | 'weekly' | 'daily';
  setViewMode?: (v: 'ytd' | 'quarterly' | 'monthly' | 'weekly' | 'daily') => void;
  aggregationMode?: 'group' | 'customer';
  setAggregationMode?: (v: 'group' | 'customer') => void;
  tableData: {
    rows: CustomerReportRow[];
    colTotals: Record<string, number>;
    activeYears: string[];
  };
  displayYears: string[];
  displayMonths: string[];
  displayWeeks?: number[];
  displayDays?: string[];
  currentYearStr: string;
  currentMonthIdx: number;
  growthComparisons: { a: string; b: string }[];
  sortOrder: 'desc' | 'asc';
  setSortOrder: (v: 'desc' | 'asc') => void;
  metric: string;
  setMetric?: (v: 'amount' | 'qty') => void;
  fmt: (val: number) => string;
  renderGrowthAmt: (baseVal: number, compVal: number) => { node: React.ReactNode, bgColor: string };
  renderGrowthPct: (baseVal: number, compVal: number, isTrulyNew?: boolean) => { node: React.ReactNode, bgColor: string };
  searchQuery?: string;
  setSearchQuery?: (value: string) => void;
  onResetMatrix?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type MatrixSkeletonStyle = React.CSSProperties & {
  '--matrix-skeleton-columns'?: number;
  '--matrix-skeleton-width'?: string;
};

export default function CustomerReportTable({
  loading,
  baseYear,
  viewMode,
  aggregationMode = 'group',
  setAggregationMode,
  tableData,
  displayYears,
  displayMonths,
  displayWeeks,
  displayDays = [],
  currentYearStr,
  currentMonthIdx,
  growthComparisons,
  sortOrder,
  setSortOrder,
  metric,
  setMetric,
  fmt,
  renderGrowthAmt,
  renderGrowthPct,
  searchQuery = '',
  setSearchQuery,
  onRefresh,
  isRefreshing,
}: CustomerReportTableProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeGrowthCount = displayYears.length > 1 ? growthComparisons.length : 0;
  const [searchDraft, setSearchDraft] = React.useState(searchQuery);
  const [appliedSearch, setAppliedSearch] = React.useState(searchQuery);
  const lastAppliedSearchRef = React.useRef(searchQuery);

  React.useEffect(() => {
    if (searchQuery !== lastAppliedSearchRef.current) {
      lastAppliedSearchRef.current = searchQuery;
      setSearchDraft(searchQuery);
      setAppliedSearch(searchQuery);
    }
  }, [searchQuery]);

  const applySearch = () => {
    const nextSearch = searchDraft.toUpperCase().trim();
    setSearchDraft(nextSearch);
    lastAppliedSearchRef.current = nextSearch;
    setAppliedSearch(nextSearch);
    setSearchQuery?.(nextSearch);
  };

  const clearSearch = () => {
    setSearchDraft('');
    lastAppliedSearchRef.current = '';
    setAppliedSearch('');
    setSearchQuery?.('');
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') applySearch();
    if (event.key === 'Escape') {
      const prev = lastAppliedSearchRef.current.toUpperCase();
      setSearchDraft(prev);
    }
  };

  const isSearchActive = appliedSearch.trim().length > 0;

  const handleCustomerClick = (custId: string) => {
    const params = new URLSearchParams(searchParams);
    
    // Drop the opposing filter to avoid contradictions
    if (aggregationMode === 'group') {
      params.set('groups', custId);
      params.delete('customers');
    } else {
      params.set('customers', custId);
      params.delete('groups');
    }
    
    navigate(`/dashboard/sales-customer-detail?${params.toString()}`);
  };

  const visibleRows = useMemo(() => {
    if (!appliedSearch.trim()) return tableData.rows;
    const q = appliedSearch.trim().toUpperCase();
    return tableData.rows.filter(r =>
      String(r.id || '').toUpperCase().includes(q) ||
      String(r.label || '').toUpperCase().includes(q)
    );
  }, [tableData.rows, appliedSearch]);

  const skeletonYearCount = Math.max(displayYears.length, 1);
  const skeletonMonthCount = displayMonths.length > 0 ? displayMonths.length : 1;
  const skeletonColumnCount = useMemo(() => {
    if (viewMode === 'quarterly') {
      return skeletonYearCount === 1 ? 5 : skeletonYearCount * 5;
    }
    if (viewMode === 'weekly') {
      return (displayWeeks && displayWeeks.length > 0 ? displayWeeks.length : 4) + 1;
    }
    if (viewMode === 'daily') {
      return (displayDays && displayDays.length > 0 ? displayDays.length : 7) + 1;
    }
    if (viewMode === 'monthly') {
      return skeletonMonthCount * (skeletonYearCount + activeGrowthCount * 2) + (skeletonYearCount + activeGrowthCount * 2);
    }
    // 'ytd'
    return skeletonYearCount * (skeletonMonthCount + 1) + activeGrowthCount * 2;
  }, [viewMode, skeletonYearCount, skeletonMonthCount, activeGrowthCount, displayWeeks, displayDays]);

  const skeletonRowCount = aggregationMode === 'group' ? Math.max(displayYears.length > 0 ? 4 : 3, 3) : 8;
  const skeletonColumns = useMemo(() => Array.from({ length: Math.max(skeletonColumnCount, 1) }, (_, index) => index), [skeletonColumnCount]);
  const skeletonRows = useMemo(() => Array.from({ length: skeletonRowCount }, (_, index) => index), [skeletonRowCount]);
  const skeletonWidths = [54, 72, 60, 84, 66, 78, 58, 70, 88, 62, 76, 56];
  const activeCurrentMonthIndex = currentMonthIdx;
  const skeletonPeriod = Math.max(skeletonMonthCount + 1, 1);
  const skeletonGridStyle: MatrixSkeletonStyle = { '--matrix-skeleton-columns': skeletonColumns.length };
  const skeletonCellStyle = (index: number): MatrixSkeletonStyle => ({
    '--matrix-skeleton-width': `${skeletonWidths[index % skeletonWidths.length]}%`,
  });
  const skeletonRowStyle = (index: number): React.CSSProperties => ({
    animationDelay: `${Math.min(index * 14, 180)}ms`,
  });
  const skeletonCellClassName = (index: number) => `customer-matrix-loading-cell ${activeCurrentMonthIndex >= 0 && index % skeletonPeriod === activeCurrentMonthIndex ? 'customer-matrix-loading-cell--current' : ''}`.trim();

  const totalsRow = useMemo(() => {
    if (!visibleRows || visibleRows.length === 0) return null;
    const tot: Record<string, number> = {};
    displayYears.forEach(yr => {
      displayMonths.forEach(m => {
        const key = `${yr}_${m}`;
        tot[key] = visibleRows.reduce((sum, r) => sum + Number(r[key] || 0), 0);
      });
      ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
        const key = `${yr}_${q}`;
        tot[key] = visibleRows.reduce((sum, r) => sum + Number(r[key] || 0), 0);
      });
      for (let w = 1; w <= 53; w++) {
        const key = `${yr}_W${w}`;
        tot[key] = visibleRows.reduce((sum, r) => sum + Number(r[key] || 0), 0);
      }
      const totKey = `${yr}_total`;
      tot[totKey] = visibleRows.reduce((sum, r) => sum + Number(r[totKey] || 0), 0);
    });
    return tot;
  }, [visibleRows, displayYears, displayMonths]);

  if (loading) {
    return (
      <section className="customer-matrix-shell customer-matrix-shell--loading" aria-busy="true" aria-label="Loading customer report matrix">
        <div className="customer-matrix-control-bar customer-matrix-control-bar--loading">
          <span className="customer-matrix-skeleton customer-matrix-skeleton--segment" style={{ width: 112, height: 28 }} />
          <span className="customer-matrix-skeleton customer-matrix-skeleton--segment" style={{ width: 140, height: 28 }} />
          <span className="customer-matrix-skeleton customer-matrix-skeleton--search" style={{ width: 220, height: 28 }} />
          <span className="customer-matrix-skeleton" style={{ width: 68, height: 14 }} />
          <span className="customer-matrix-control-spacer" />
          <span className="customer-matrix-skeleton customer-matrix-skeleton--icon" style={{ width: 28, height: 28 }} />
        </div>

        <div className="customer-matrix-scroll content-scrollbar">
          <div className="customer-matrix-loading-table" style={skeletonGridStyle}>
            <div className="customer-matrix-loading-row-grid customer-matrix-loading-row-grid--header">
              <div className="customer-matrix-loading-cell customer-matrix-loading-cell--customer customer-matrix-loading-cell--header">
                <span className="customer-matrix-skeleton customer-matrix-skeleton--customer-label" />
                <span className="customer-matrix-skeleton customer-matrix-skeleton--sort" />
              </div>
              {skeletonColumns.map((columnIndex) => (
                <div key={`head_${columnIndex}`} className="customer-matrix-loading-cell customer-matrix-loading-cell--header">
                  <span className="customer-matrix-skeleton customer-matrix-skeleton--header" style={skeletonCellStyle(columnIndex)} />
                </div>
              ))}
            </div>

            <div className="customer-matrix-loading-row-grid customer-matrix-loading-row-grid--subheader">
              <div className="customer-matrix-loading-cell customer-matrix-loading-cell--customer customer-matrix-loading-cell--subheader" />
              {skeletonColumns.map((columnIndex) => (
                <div key={`sub_${columnIndex}`} className={`${skeletonCellClassName(columnIndex)} customer-matrix-loading-cell--subheader`}>
                  <span className="customer-matrix-skeleton customer-matrix-skeleton--subheader" style={skeletonCellStyle(columnIndex + 3)} />
                </div>
              ))}
            </div>

            {skeletonRows.map((rowIndex) => (
              <div key={`row_${rowIndex}`} className="customer-matrix-loading-row-grid customer-matrix-loading-row-grid--data" style={skeletonRowStyle(rowIndex)}>
                <div className="customer-matrix-loading-cell customer-matrix-loading-cell--customer">
                  <span className="customer-matrix-skeleton customer-matrix-skeleton--customer-id" style={skeletonCellStyle(rowIndex)} />
                  <span className="customer-matrix-skeleton customer-matrix-skeleton--customer-sub" style={skeletonCellStyle(rowIndex + 5)} />
                </div>
                {skeletonColumns.map((columnIndex) => (
                  <div key={`cell_${rowIndex}_${columnIndex}`} className={skeletonCellClassName(columnIndex)}>
                    <span className="customer-matrix-skeleton customer-matrix-skeleton--value" style={skeletonCellStyle(columnIndex + rowIndex)} />
                  </div>
                ))}
              </div>
            ))}

            <div className="customer-matrix-loading-row-grid customer-matrix-loading-row-grid--footer">
              <div className="customer-matrix-loading-cell customer-matrix-loading-cell--customer customer-matrix-loading-cell--footer">
                <span className="customer-matrix-skeleton" style={{ width: 68, height: 12 }} />
              </div>
              {skeletonColumns.map((columnIndex) => (
                <div key={`foot_${columnIndex}`} className="customer-matrix-loading-cell customer-matrix-loading-cell--footer">
                  <span className="customer-matrix-skeleton customer-matrix-skeleton--value" style={skeletonCellStyle(columnIndex + 8)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!baseYear) {
    return (
      <div className="customer-matrix-shell">
        <div className="customer-matrix-empty">No year selected. Please apply filters.</div>
      </div>
    );
  }

  const sortSelect = (
    <ErpButton
      size="sm"
      variant="ghost"
      icon={sortOrder === 'desc' ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
      onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
      title="Toggle sort order"
    >
      {sortOrder === 'desc' ? 'High First' : 'Low First'}
    </ErpButton>
  );

  const customerIdTh = (rowSpan: number) => (
    <th rowSpan={rowSpan} className="customer-matrix-th customer-matrix-th--top customer-matrix-th--customer">
      <div className="customer-matrix-sort-stack">
        <span>Customer ID</span>
        {sortSelect}
      </div>
    </th>
  );

  const renderCell = (val: number, className = '') => {
    const isAmt = metric === 'amount';
    const str = fmt(val);
    const numStr = isAmt ? str.replace('$', '') : str;
    const muted = val > 0 ? '' : 'customer-matrix-muted';
    return (
      <div className={`customer-matrix-cell-value ${muted} ${className}`.trim()}>
        {isAmt && <span className="customer-matrix-currency">$</span>}
        <span>{numStr}</span>
      </div>
    );
  };

  const isCurrentMonth = (yr: string, month: string) => yr === currentYearStr && MONTHS.indexOf(month) === currentMonthIdx;
  const isCurrentYear = (yr: string) => yr === currentYearStr;
  const totalHeaderClassName = (yr: string) => `customer-matrix-th customer-matrix-th--sub customer-matrix-td--number customer-matrix-td--total ${isCurrentYear(yr) ? 'customer-matrix-current' : ''}`.trim();
  const totalCellClassName = (yr: string) => `customer-matrix-td customer-matrix-td--number customer-matrix-td--total customer-matrix-total ${isCurrentYear(yr) ? 'customer-matrix-current' : ''}`.trim();

  return (
    <section className={['customer-matrix-shell', isSearchActive ? 'customer-matrix-shell--searching' : ''].filter(Boolean).join(' ')} aria-label="Customer report matrix">
      <div className="customer-matrix-control-bar">
        {setMetric && (
          <ErpSegmentedControl
            ariaLabel="Metric mode"
            value={metric === 'qty' ? 'qty' : 'amount'}
            onChange={(v) => setMetric(v as 'amount' | 'qty')}
            options={[
              { value: 'amount', label: 'Sales', icon: <DollarSign size={13} /> },
              { value: 'qty', label: 'Qty', icon: <Hash size={13} /> }
            ]}
          />
        )}

        {setAggregationMode && (
          <ErpSegmentedControl
            ariaLabel="Aggregation mode"
            value={aggregationMode}
            onChange={setAggregationMode}
            options={[
              { value: 'group', label: 'By Group' },
              { value: 'customer', label: 'By Customer' }
            ]}
          />
        )}

        {setSearchQuery && (
          <label className="customer-matrix-search">
            <Search size={14} />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value.toUpperCase())}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search customer"
            />
            {searchDraft.length > 0 && (
              <button
                type="button"
                onClick={clearSearch}
                className="customer-matrix-search-clear"
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </label>
        )}

        <span className="customer-matrix-count">{visibleRows.length} customers</span>
        <span className="customer-matrix-control-spacer" />

        {onRefresh && (
          <ErpButton
            size="sm"
            variant="ghost"
            icon={<RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />}
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Refresh
          </ErpButton>
        )}
      </div>

      <div className="customer-matrix-scroll content-scrollbar">
        <table className="customer-matrix-table">
          {viewMode === 'quarterly' ? (
            <>
              {displayYears.length === 1 ? (
                <>
                  <thead>
                    <tr>
                      {customerIdTh(2)}
                      {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                        <th key={q} colSpan={1} className="customer-matrix-th customer-matrix-th--top">
                          <div className="customer-matrix-year-label"><span>{q}</span></div>
                        </th>
                      ))}
                      <th colSpan={1} className="customer-matrix-th customer-matrix-th--top">
                        <div className="customer-matrix-year-label"><span>Total</span></div>
                      </th>
                    </tr>
                    <tr>
                      {[
                        { id: 'Q1', label: 'Q1', sub: 'Jan-Mar' },
                        { id: 'Q2', label: 'Q2', sub: 'Apr-Jun' },
                        { id: 'Q3', label: 'Q3', sub: 'Jul-Sep' },
                        { id: 'Q4', label: 'Q4', sub: 'Oct-Dec' }
                      ].map((q) => (
                        <th key={q.id} className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--number">
                          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)' }}>{q.sub}</span>
                        </th>
                      ))}
                      <th className={totalHeaderClassName(displayYears[0])}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr><td colSpan={6} className="customer-matrix-empty">No customers match the current filter.</td></tr>
                    ) : visibleRows.map((row) => (
                      <tr key={row.id} className="customer-matrix-row">
                        <td className="customer-matrix-td customer-matrix-td--customer">
                          <button 
                            onClick={() => handleCustomerClick(row.id)} 
                            style={{ background: 'none', border: 'none', color: 'var(--color-brand-600)', fontWeight: 900, cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit', maxWidth: '100%' }}
                            title={`View details for ${row.label}`}
                          >
                            {row.label}
                          </button>
                        </td>
                        {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                          <td key={q} className="customer-matrix-td customer-matrix-td--number">{renderCell(Number(row[`${displayYears[0]}_${q}`] || 0))}</td>
                        ))}
                        <td className={totalCellClassName(displayYears[0])}>{renderCell(Number(row[`${displayYears[0]}_total`] || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              ) : (
                <>
                  <thead>
                    <tr>
                      {customerIdTh(2)}
                      {[
                        { id: 'Q1', label: 'Q1', sub: 'Jan-Mar' },
                        { id: 'Q2', label: 'Q2', sub: 'Apr-Jun' },
                        { id: 'Q3', label: 'Q3', sub: 'Jul-Sep' },
                        { id: 'Q4', label: 'Q4', sub: 'Oct-Dec' }
                      ].map((q) => (
                        <th key={q.id} colSpan={displayYears.length + (growthComparisons.length * 2)} className="customer-matrix-th customer-matrix-th--top">
                          <div className="customer-matrix-year-label">
                            <span>{q.label}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.75 }}>({q.sub})</span>
                          </div>
                        </th>
                      ))}
                      <th colSpan={displayYears.length} className="customer-matrix-th customer-matrix-th--top">
                        <div className="customer-matrix-year-label"><span>Total</span></div>
                      </th>
                    </tr>
                    <tr>
                      {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                        <React.Fragment key={`sub_hdr_${q}`}>
                          {displayYears.map((yr) => (
                            <th key={`${q}_${yr}`} className={`customer-matrix-th customer-matrix-th--sub customer-matrix-td--number ${isCurrentYear(yr) ? 'customer-matrix-current' : ''}`}>{yr}</th>
                          ))}
                          {growthComparisons.map((comp, idx) => (
                            <React.Fragment key={`${q}_comp_${idx}`}>
                              <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth" title={`Growth Amount (${comp.a} vs ${comp.b})`}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingRight: 4 }}>
                                  <span>Growth</span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--color-success-500)', fontWeight: 900 }}>↑</span>
                                </div>
                              </th>
                              <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth" title={`Growth Rate % (${comp.a} vs ${comp.b})`}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingRight: 4 }}>
                                  <span>Growth %</span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--color-brand-500)', fontWeight: 900 }}>↑↓</span>
                                </div>
                              </th>
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      ))}
                      {displayYears.map((yr) => (
                        <th key={`tot_${yr}`} className={totalHeaderClassName(yr)}>{yr} Total</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td colSpan={1 + 4 * (displayYears.length + growthComparisons.length * 2) + displayYears.length} className="customer-matrix-empty">
                          No customers match the current filter.
                        </td>
                      </tr>
                    ) : visibleRows.map((row) => (
                      <tr key={row.id} className="customer-matrix-row">
                        <td className="customer-matrix-td customer-matrix-td--customer">{row.label}</td>
                        {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                          <React.Fragment key={`row_${q}`}>
                            {displayYears.map((yr) => {
                              const val = Number(row[`${yr}_${q}`] || 0);
                              return <td key={`${q}_${yr}`} className={`customer-matrix-td customer-matrix-td--number ${isCurrentYear(yr) ? 'customer-matrix-current' : ''}`}>{renderCell(val)}</td>;
                            })}
                            {growthComparisons.map((comp, idx) => {
                              const valA = Number(row[`${comp.a}_${q}`] || 0);
                              const valB = Number(row[`${comp.b}_${q}`] || 0);
                              const amt = renderGrowthAmt(valA, valB);
                              const pct = renderGrowthPct(valA, valB, Boolean(row[`isTrulyNew_${comp.a}`]));
                              return (
                                <React.Fragment key={`row_${q}_comp_${idx}`}>
                                  <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                                  <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        ))}
                        {displayYears.map((yr) => (
                          <td key={`tot_${yr}`} className={totalCellClassName(yr)}>{renderCell(Number(row[`${yr}_total`] || 0))}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  {totalsRow && (
                    <tfoot className="customer-matrix-footer">
                      <tr className="customer-matrix-row customer-matrix-row--total">
                        <td className="customer-matrix-td customer-matrix-td--customer customer-matrix-footer-label" style={{ textAlign: 'center' }}>Total Row</td>
                        {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                          <React.Fragment key={`tot_row_${q}`}>
                            {displayYears.map((yr) => (
                              <td key={`tot_row_${q}_${yr}`} className={`customer-matrix-td customer-matrix-td--number customer-matrix-total ${isCurrentYear(yr) ? 'customer-matrix-current' : ''}`} style={{ textAlign: 'center' }}>
                                {renderCell(totalsRow[`${yr}_${q}`] || 0)}
                              </td>
                            ))}
                            {growthComparisons.map((comp, idx) => {
                              const valA = totalsRow[`${comp.a}_${q}`] || 0;
                              const valB = totalsRow[`${comp.b}_${q}`] || 0;
                              const amt = renderGrowthAmt(valA, valB);
                              const pct = renderGrowthPct(valA, valB);
                              return (
                                <React.Fragment key={`tot_row_${q}_comp_${idx}`}>
                                  <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                                  <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        ))}
                        {displayYears.map((yr) => (
                          <td key={`tot_row_tot_${yr}`} className={totalCellClassName(yr)} style={{ textAlign: 'center' }}>
                            {renderCell(totalsRow[`${yr}_total`] || 0)}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  )}
                </>
              )}
            </>
          ) : viewMode === 'ytd' ? (
            <>
              <thead>
                <tr>
                  {customerIdTh(2)}
                  {displayYears.map((yr) => (
                    <th key={yr} colSpan={displayMonths.length + 1} className="customer-matrix-th customer-matrix-th--top">
                      <div className="customer-matrix-year-label"><span>{yr}</span></div>
                    </th>
                  ))}
                  {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                    <th key={`growth_hdr_top_${idx}`} colSpan={2} className="customer-matrix-th customer-matrix-th--top">
                      <div className="customer-matrix-growth-label"><span>Growth</span><span>{comp.a} vs {comp.b}</span></div>
                    </th>
                  ))}
                </tr>
                <tr>
                  {displayYears.map((yr) => (
                    <React.Fragment key={yr}>
                      {displayMonths.map((m) => (
                        <th key={`${yr}_${m}`} className={`customer-matrix-th customer-matrix-th--sub customer-matrix-td--number ${isCurrentMonth(yr, m) ? 'customer-matrix-current' : ''}`}>{m}</th>
                      ))}
                      <th key={`${yr}_total`} className={totalHeaderClassName(yr)}>Total</th>
                    </React.Fragment>
                  ))}
                  {displayYears.length > 1 && growthComparisons.map((_, idx) => (
                    <React.Fragment key={`growth_hdr_sub_${idx}`}>
                      <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth">Growth</th>
                      <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth">Growth %</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody>
                {visibleRows.length === 0 ? (
                  <tr><td colSpan={1 + displayYears.length * (displayMonths.length + 1) + activeGrowthCount * 2} className="customer-matrix-empty">No customers match the current filter.</td></tr>
                ) : visibleRows.map((row) => (
                  <tr key={row.id} className="customer-matrix-row">
                    <td className="customer-matrix-td customer-matrix-td--customer">
                      <button 
                        onClick={() => handleCustomerClick(row.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--color-brand-600)', fontWeight: 900, cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit', maxWidth: '100%' }}
                        title={`View details for ${row.label}`}
                      >
                        {row.label}
                      </button>
                    </td>
                    {displayYears.map((yr) => (
                      <React.Fragment key={yr}>
                        {displayMonths.map((m) => {
                          const val = Number(row[`${yr}_${m}`] || 0);
                          return <td key={`${yr}_${m}`} className={`customer-matrix-td customer-matrix-td--number ${isCurrentMonth(yr, m) ? 'customer-matrix-current' : ''}`}>{renderCell(val)}</td>;
                        })}
                        <td key={`${yr}_total`} className={totalCellClassName(yr)}>{renderCell(Number(row[`${yr}_total`] || 0))}</td>
                      </React.Fragment>
                    ))}
                    {displayYears.length > 1 && growthComparisons.map((comp, idx) => {
                      const amt = renderGrowthAmt(Number(row[`${comp.a}_total`] || 0), Number(row[`${comp.b}_total`] || 0));
                      const pct = renderGrowthPct(Number(row[`${comp.a}_total`] || 0), Number(row[`${comp.b}_total`] || 0), Boolean(row[`isTrulyNew_${comp.a}`]));
                      return (
                        <React.Fragment key={`growth_row_${idx}`}>
                          <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                          <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              {totalsRow && (
                <tfoot className="customer-matrix-footer">
                  <tr className="customer-matrix-row customer-matrix-row--total">
                    <td className="customer-matrix-td customer-matrix-td--customer customer-matrix-footer-label" style={{ textAlign: 'center' }}>Total Row</td>
                    {displayYears.map((yr) => (
                      <React.Fragment key={`tot_row_ytd_${yr}`}>
                        {displayMonths.map((m) => (
                          <td key={`tot_row_${yr}_${m}`} className={`customer-matrix-td customer-matrix-td--number ${isCurrentMonth(yr, m) ? 'customer-matrix-current' : ''}`}>
                            {renderCell(totalsRow[`${yr}_${m}`] || 0)}
                          </td>
                        ))}
                        <td key={`tot_row_${yr}_total`} className={totalCellClassName(yr)}>
                          {renderCell(totalsRow[`${yr}_total`] || 0)}
                        </td>
                      </React.Fragment>
                    ))}
                    {displayYears.length > 1 && growthComparisons.map((comp, idx) => {
                      const valA = totalsRow[`${comp.a}_total`] || 0;
                      const valB = totalsRow[`${comp.b}_total`] || 0;
                      const amt = renderGrowthAmt(valA, valB);
                      const pct = renderGrowthPct(valA, valB);
                      return (
                        <React.Fragment key={`tot_row_ytd_comp_${idx}`}>
                          <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                          <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                </tfoot>
              )}


            </>
          ) : viewMode === 'monthly' ? (
            <>
              <thead>
                <tr>
                  {customerIdTh(2)}
                  {displayMonths.map((m) => (
                    <th key={m} colSpan={displayYears.length + activeGrowthCount * 2} className="customer-matrix-th customer-matrix-th--top">{m}</th>
                  ))}
                  <th colSpan={displayYears.length} className="customer-matrix-th customer-matrix-th--top">{metric === 'qty' ? 'Grand Total QTY' : 'Grand Total Sales'}</th>
                </tr>
                <tr>
                  {displayMonths.map((m) => (
                    <React.Fragment key={m}>
                      {displayYears.map((yr) => <th key={`${m}_${yr}`} className={`customer-matrix-th customer-matrix-th--sub customer-matrix-td--number ${isCurrentMonth(yr, m) ? 'customer-matrix-current' : ''}`}>{yr}</th>)}
                      {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                        <React.Fragment key={`growth_m_hdr_${idx}`}>
                          <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth" title={`Growth Amount (${comp.a} vs ${comp.b})`}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingRight: 4 }}>
                              <span>Growth</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-success-500)', fontWeight: 900 }}>↑</span>
                            </div>
                          </th>
                          <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth" title={`Growth Rate % (${comp.a} vs ${comp.b})`}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingRight: 4 }}>
                              <span>Growth %</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-brand-500)', fontWeight: 900 }}>↑↓</span>
                            </div>
                          </th>
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                  {displayYears.map((yr) => <th key={`tot_hdr_${yr}`} className={totalHeaderClassName(yr)}>{yr} Total</th>)}
                </tr>
              </thead>

              <tbody>
                {visibleRows.length === 0 ? (
                  <tr><td colSpan={1 + displayMonths.length * (displayYears.length + activeGrowthCount * 2) + displayYears.length} className="customer-matrix-empty">No customers match the current filter.</td></tr>
                ) : visibleRows.map((row) => (
                  <tr key={row.id} className="customer-matrix-row">
                    <td className="customer-matrix-td customer-matrix-td--customer">
                      <button 
                        onClick={() => handleCustomerClick(row.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--color-brand-600)', fontWeight: 900, cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit', maxWidth: '100%' }}
                        title={`View details for ${row.label}`}
                      >
                        {row.label}
                      </button>
                      {metric === 'qty' && row.topItem && displayYears.some(yr => Number(row[`${yr}_total`] || 0) > 0) && <span className="customer-matrix-top-item">Top: {row.topItem} ({fmt(Number(row.topItemQty || 0))} pcs)</span>}
                    </td>
                    {displayMonths.map((m) => (
                      <React.Fragment key={m}>
                        {displayYears.map((yr) => {
                          const val = Number(row[`${yr}_${m}`] || 0);
                          return <td key={`${m}_${yr}`} className={`customer-matrix-td customer-matrix-td--number ${isCurrentMonth(yr, m) ? 'customer-matrix-current' : ''}`}>{renderCell(val)}</td>;
                        })}
                        {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                          const amt = renderGrowthAmt(Number(row[`${comp.a}_${m}`] || 0), Number(row[`${comp.b}_${m}`] || 0));
                          const pct = renderGrowthPct(Number(row[`${comp.a}_${m}`] || 0), Number(row[`${comp.b}_${m}`] || 0), Boolean(row[`isTrulyNew_${comp.a}`]));
                          return (
                            <React.Fragment key={`growth_m_row_${m}_${gIdx}`}>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {displayYears.map((yr) => <td key={`total_${yr}`} className={totalCellClassName(yr)}>{renderCell(Number(row[`${yr}_total`] || 0))}</td>)}
                  </tr>
                ))}
              </tbody>
              {totalsRow && (
                <tfoot className="customer-matrix-footer">
                  <tr className="customer-matrix-row customer-matrix-row--total">
                    <td className="customer-matrix-td customer-matrix-td--customer customer-matrix-footer-label" style={{ textAlign: 'center' }}>Total Row</td>
                    {displayMonths.map((m) => (
                      <React.Fragment key={`tot_row_m_${m}`}>
                        {displayYears.map((yr) => (
                          <td key={`tot_row_${m}_${yr}`} className={`customer-matrix-td customer-matrix-td--number ${isCurrentMonth(yr, m) ? 'customer-matrix-current' : ''}`}>
                            {renderCell(totalsRow[`${yr}_${m}`] || 0)}
                          </td>
                        ))}
                        {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                          const valA = totalsRow[`${comp.a}_${m}`] || 0;
                          const valB = totalsRow[`${comp.b}_${m}`] || 0;
                          const amt = renderGrowthAmt(valA, valB);
                          const pct = renderGrowthPct(valA, valB);
                          return (
                            <React.Fragment key={`tot_row_growth_${m}_${gIdx}`}>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {displayYears.map((yr) => (
                      <td key={`tot_row_m_tot_${yr}`} className={totalCellClassName(yr)} style={{ textAlign: 'center' }}>
                        {renderCell(totalsRow[`${yr}_total`] || 0)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </>
          ) : viewMode === 'daily' ? (
            <>
              <thead>
                <tr>
                  {customerIdTh(2)}
                  {displayDays.map((dStr) => {
                    const [mm, dd] = dStr.split('-');
                    const mName = MONTHS[parseInt(mm) - 1];
                    return (
                      <th key={`d_${dStr}`} colSpan={displayYears.length + activeGrowthCount * 2} className="customer-matrix-th customer-matrix-th--top">{`${parseInt(dd)} ${mName}`}</th>
                    );
                  })}
                  <th colSpan={displayYears.length} className="customer-matrix-th customer-matrix-th--top">{metric === 'qty' ? 'Grand Total QTY' : 'Grand Total Sales'}</th>
                </tr>
                <tr>
                  {displayDays.map((dStr) => (
                    <React.Fragment key={`d_sub_${dStr}`}>
                      {displayYears.map((yr) => <th key={`${dStr}_${yr}`} className={`customer-matrix-th customer-matrix-th--sub customer-matrix-td--number`}>{yr}</th>)}
                      {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                        <React.Fragment key={`growth_d_hdr_${idx}`}>
                          <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth" title={`Growth Amount (${comp.a} vs ${comp.b})`}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingRight: 4 }}>
                              <span>Growth</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-success-500)', fontWeight: 900 }}>↑</span>
                            </div>
                          </th>
                          <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth" title={`Growth Rate % (${comp.a} vs ${comp.b})`}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingRight: 4 }}>
                              <span>Growth %</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-brand-500)', fontWeight: 900 }}>↑↓</span>
                            </div>
                          </th>
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                  {displayYears.map((yr) => <th key={`tot_hdr_${yr}`} className={totalHeaderClassName(yr)}>{yr} Total</th>)}
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr><td colSpan={1 + displayDays.length * (displayYears.length + activeGrowthCount * 2) + displayYears.length} className="customer-matrix-empty">No customers match the current filter.</td></tr>
                ) : visibleRows.map((row) => (
                  <tr key={row.id} className="customer-matrix-row">
                    <td className="customer-matrix-td customer-matrix-td--customer">
                      <button 
                        onClick={() => handleCustomerClick(row.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--color-brand-600)', fontWeight: 900, cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit', maxWidth: '100%' }}
                        title={`View details for ${row.label}`}
                      >
                        {row.label}
                      </button>
                    </td>
                    {displayDays.map((dStr) => (
                      <React.Fragment key={`d_cell_${dStr}`}>
                        {displayYears.map((yr) => {
                          const val = Number(row[`${yr}_D_${dStr}`] || 0);
                          return <td key={`${dStr}_${yr}`} className={`customer-matrix-td customer-matrix-td--number`}>{renderCell(val)}</td>;
                        })}
                        {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                          const amt = renderGrowthAmt(Number(row[`${comp.a}_D_${dStr}`] || 0), Number(row[`${comp.b}_D_${dStr}`] || 0));
                          const pct = renderGrowthPct(Number(row[`${comp.a}_D_${dStr}`] || 0), Number(row[`${comp.b}_D_${dStr}`] || 0), Boolean(row[`isTrulyNew_${comp.a}`]));
                          return (
                            <React.Fragment key={`growth_d_row_${dStr}_${gIdx}`}>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {displayYears.map((yr) => <td key={`total_${yr}`} className={totalCellClassName(yr)}>{renderCell(Number(row[`${yr}_total`] || 0))}</td>)}
                  </tr>
                ))}
              </tbody>
              {totalsRow && (
                <tfoot className="customer-matrix-footer">
                  <tr className="customer-matrix-row customer-matrix-row--total">
                    <td className="customer-matrix-td customer-matrix-td--customer customer-matrix-footer-label" style={{ textAlign: 'center' }}>Total Row</td>
                    {displayDays.map((dStr) => (
                      <React.Fragment key={`tot_row_d_${dStr}`}>
                        {displayYears.map((yr) => (
                          <td key={`tot_row_${dStr}_${yr}`} className={`customer-matrix-td customer-matrix-td--number`} style={{ textAlign: 'center' }}>
                            {renderCell(totalsRow[`${yr}_D_${dStr}`] || 0)}
                          </td>
                        ))}
                        {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                          const valA = totalsRow[`${comp.a}_D_${dStr}`] || 0;
                          const valB = totalsRow[`${comp.b}_D_${dStr}`] || 0;
                          const amt = renderGrowthAmt(valA, valB);
                          const pct = renderGrowthPct(valA, valB);
                          return (
                            <React.Fragment key={`tot_row_growth_d_${dStr}_${gIdx}`}>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {displayYears.map((yr) => (
                      <td key={`tot_row_d_tot_${yr}`} className={totalCellClassName(yr)} style={{ textAlign: 'center' }}>
                        {renderCell(totalsRow[`${yr}_total`] || 0)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </>
          ) : (
            <>
              <thead>
                <tr>
                  {customerIdTh(2)}
                  {(displayWeeks || Array.from({ length: 53 }, (_, i) => i + 1)).map((w) => (
                    <th key={`w_${w}`} colSpan={displayYears.length + activeGrowthCount * 2} className="customer-matrix-th customer-matrix-th--top">W{w}</th>
                  ))}
                  <th colSpan={displayYears.length} className="customer-matrix-th customer-matrix-th--top">{metric === 'qty' ? 'Grand Total QTY' : 'Grand Total Sales'}</th>
                </tr>
                <tr>
                  {(displayWeeks || Array.from({ length: 53 }, (_, i) => i + 1)).map((w) => (
                    <React.Fragment key={`w_sub_${w}`}>
                      {displayYears.map((yr) => <th key={`${w}_${yr}`} className={`customer-matrix-th customer-matrix-th--sub customer-matrix-td--number`}>{yr}</th>)}
                      {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                        <React.Fragment key={`growth_w_hdr_${idx}`}>
                          <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth" title={`Growth Amount (${comp.a} vs ${comp.b})`}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingRight: 4 }}>
                              <span>Growth</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-success-500)', fontWeight: 900 }}>↑</span>
                            </div>
                          </th>
                          <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth" title={`Growth Rate % (${comp.a} vs ${comp.b})`}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingRight: 4 }}>
                              <span>Growth %</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-brand-500)', fontWeight: 900 }}>↑↓</span>
                            </div>
                          </th>
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                  {displayYears.map((yr) => <th key={`tot_hdr_${yr}`} className={totalHeaderClassName(yr)}>{yr} Total</th>)}
                </tr>
              </thead>

              <tbody>
                {visibleRows.length === 0 ? (
                  <tr><td colSpan={1 + (displayWeeks ? displayWeeks.length : 53) * displayYears.length + displayYears.length} className="customer-matrix-empty">No customers match the current filter.</td></tr>
                ) : visibleRows.map((row) => (
                  <tr key={row.id} className="customer-matrix-row">
                    <td className="customer-matrix-td customer-matrix-td--customer">
                      <button 
                        onClick={() => handleCustomerClick(row.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--color-brand-600)', fontWeight: 900, cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit', maxWidth: '100%' }}
                        title={`View details for ${row.label}`}
                      >
                        {row.label}
                      </button>
                    </td>
                    {(displayWeeks || Array.from({ length: 53 }, (_, i) => i + 1)).map((w) => (
                      <React.Fragment key={`w_cell_${w}`}>
                        {displayYears.map((yr) => {
                          const val = Number(row[`${yr}_W${w}`] || 0);
                          return <td key={`${w}_${yr}`} className={`customer-matrix-td customer-matrix-td--number`}>{renderCell(val)}</td>;
                        })}
                        {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                          const amt = renderGrowthAmt(Number(row[`${comp.a}_W${w}`] || 0), Number(row[`${comp.b}_W${w}`] || 0));
                          const pct = renderGrowthPct(Number(row[`${comp.a}_W${w}`] || 0), Number(row[`${comp.b}_W${w}`] || 0), Boolean(row[`isTrulyNew_${comp.a}`]));
                          return (
                            <React.Fragment key={`growth_w_row_${w}_${gIdx}`}>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {displayYears.map((yr) => <td key={`total_${yr}`} className={totalCellClassName(yr)}>{renderCell(Number(row[`${yr}_total`] || 0))}</td>)}
                  </tr>
                ))}
              </tbody>
              {totalsRow && (
                <tfoot className="customer-matrix-footer">
                  <tr className="customer-matrix-row customer-matrix-row--total">
                    <td className="customer-matrix-td customer-matrix-td--customer customer-matrix-footer-label" style={{ textAlign: 'center' }}>Total Row</td>
                    {(displayWeeks || Array.from({ length: 53 }, (_, i) => i + 1)).map((w) => (
                      <React.Fragment key={`tot_row_w_${w}`}>
                        {displayYears.map((yr) => (
                          <td key={`tot_row_${w}_${yr}`} className={`customer-matrix-td customer-matrix-td--number`} style={{ textAlign: 'center' }}>
                            {renderCell(totalsRow[`${yr}_W${w}`] || 0)}
                          </td>
                        ))}
                        {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                          const valA = totalsRow[`${comp.a}_W${w}`] || 0;
                          const valB = totalsRow[`${comp.b}_W${w}`] || 0;
                          const amt = renderGrowthAmt(valA, valB);
                          const pct = renderGrowthPct(valA, valB);
                          return (
                            <React.Fragment key={`tot_row_growth_w_${w}_${gIdx}`}>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {displayYears.map((yr) => (
                      <td key={`tot_row_w_tot_${yr}`} className={totalCellClassName(yr)} style={{ textAlign: 'center' }}>
                        {renderCell(totalsRow[`${yr}_total`] || 0)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </>
          )}
        </table>
      </div>
    </section>
  );
}


