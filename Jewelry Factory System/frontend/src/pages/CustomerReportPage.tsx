import { useCallback } from 'react';
import { DollarSign, Hash } from 'lucide-react';
import './SalesResponsive.css';
import { ALL_GROUPS, type CustomerGroup } from '../config/customerGroups';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import PeriodSetupPanel from '../components/period/PeriodSetupPanel';
import { CustomerGroupFilter } from '../components/dashboard/customerSales/CustomerGroupFilter';
import { FilterX } from 'lucide-react';
import CustomerReportTable from '../components/report/CustomerReportTable';
import { useCustomerReportData, YEAR_COLORS } from '../hooks/useCustomerReportData';
import { renderGrowthAmt, renderGrowthPct } from '../components/dashboard/customerReport/GrowthHelpers';

export default function CustomerReportPage() {
  const {
    theme,
    metric,
    handleSetMetric,
    fmt,
    fmtCurr,
    baseYear,
    activeYears,
    displayYears,
    displayMonths,
    displayWeeks,
    displayDays,
    selMonths,
    selGroups,
    kpiCompareYear,
    loading,
    viewMode,
    setViewMode,
    aggregationMode,
    setAggregationMode,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    growthComparisons,
    currentYearStr,
    currentMonthIdx,
    tableData,
    groupKpis,
    periodSetup,
    setSelGroups,
    toggleGroup,
    dynamicActiveGroups,
    isFiltered,
    resetFilters,
    availableYears,
    triggerRefresh,
    isRefreshing
  } = useCustomerReportData();

  const handleRenderGrowthAmt = useCallback((baseVal: number, compVal: number) => {
    return renderGrowthAmt(baseVal, compVal, fmt, theme);
  }, [fmt, theme]);

  const handleRenderGrowthPct = useCallback((baseVal: number, compVal: number, isTrulyNew = false) => {
    return renderGrowthPct(baseVal, compVal, theme, isTrulyNew);
  }, [theme]);

  return (
    <>
      <PageHeader
        breadcrumb={BREADCRUMBS.CUSTOMER_DASHBOARD_TAB('matrix')}
        contentLayout="dashboard-wide"
        hideTitle={true}
        bottomContent={
          <div className="sales-global-filters flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <PeriodSetupPanel periodSetup={periodSetup} availableYears={availableYears} />
              <CustomerGroupFilter
                selGroups={selGroups}
                setSelGroups={setSelGroups}
                dynamicActiveGroups={dynamicActiveGroups}
                toggleGroup={toggleGroup}
              />
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
          </div>
        }
      />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="app-content-frame app-content-frame--dashboard-wide sales-report-page">
          {/* Loading Skeletons for KPIs */}
          {(loading && tableData.rows.length === 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>
              {/* Year KPI Skeletons */}
              <div className="sales-report-kpis flex-wrap" style={{ display: 'flex', gap: 12, marginBottom: 1 }}>
                {(displayYears.length > 0 ? displayYears : ['2025', '2024']).map((yr, i) => (
                  <div
                    key={`kpi-skeleton-yr-${yr}`}
                    style={{
                      background: 'var(--color-surface-0)',
                      border: '1px solid var(--color-border-light)',
                      borderLeft: `4px solid ${YEAR_COLORS[i % YEAR_COLORS.length] || 'var(--color-border-light)'}`,
                      borderRadius: 8,
                      padding: '12px 16px',
                      flex: '1 1 200px',
                      minWidth: 180,
                      boxShadow: '0 8px 20px -16px color-mix(in srgb, var(--color-surface-900) 25%, transparent)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 5
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="app-skeleton" style={{ width: 16, height: 16, borderRadius: 4 }} />
                      <div className="app-skeleton" style={{ width: 85, height: 16, borderRadius: 4 }} />
                    </div>
                    <div className="app-skeleton" style={{ width: '70%', height: 26, borderRadius: 6, marginTop: 4 }} />
                  </div>
                ))}
              </div>

              {/* Group KPI Skeletons */}
              {selGroups.length > 1 && (
                <div className="sales-report-kpis flex-wrap" style={{ display: 'flex', gap: 12 }}>
                  {selGroups.map((gId: string) => {
                    const group = ALL_GROUPS.find(x => x.id === gId);
                    const color = group?.color || 'var(--color-border-light)';
                    const label = group?.label || gId;
                    return (
                      <div
                        key={`kpi-skeleton-grp-${gId}`}
                        style={{
                          background: 'var(--color-surface-0)',
                          border: '1px solid var(--color-border-light)',
                          borderLeft: `4px solid ${color}`,
                          borderRadius: 8,
                          padding: '12px 16px',
                          flex: '1 1 200px',
                          minWidth: 180,
                          boxShadow: '0 8px 20px -16px color-mix(in srgb, var(--color-surface-900) 25%, transparent)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 900, color: 'var(--color-text-secondary)', opacity: 0.7 }}>{label}</span>
                          <div className="app-skeleton" style={{ width: 35, height: 14, borderRadius: 4 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div className="app-skeleton" style={{ width: '75%', height: 24, borderRadius: 6 }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="app-skeleton" style={{ width: 90, height: 14, borderRadius: 4 }} />
                            <div className="app-skeleton" style={{ width: 45, height: 12, borderRadius: 4 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {(!loading || tableData.rows.length > 0) && (
            <div className={`transition-opacity duration-300 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`} key={`kpis-${displayYears.join(',')}-${selGroups.join(',')}-${selMonths.join(',')}-${metric}`}>
              <div className="sales-report-kpis flex-wrap" style={{ display: 'flex', gap: 12, marginBottom: 1 }}>
                {displayYears.map((yr, yIdx) => (
                  <div
                    key={yr}
                    className="kpi-card"
                    style={{
                      background: 'var(--color-surface-0)',
                      border: '1px solid var(--color-border-light)',
                      borderLeft: `4px solid ${YEAR_COLORS[yIdx % YEAR_COLORS.length] || 'var(--color-border-light)'}`,
                      borderRadius: 8,
                      padding: '12px 16px',
                      flex: '1 1 200px',
                      minWidth: 180,
                      boxShadow: '0 8px 20px -16px color-mix(in srgb, var(--color-surface-900) 25%, transparent)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 5
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-tertiary)' }}>
                      {metric === 'qty' ? <Hash size={14} /> : <DollarSign size={14} />}
                      <span style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 900, textTransform: 'capitalize', letterSpacing: 0 }}>
                        Year {yr} {metric === 'qty' ? '(PCS)' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--erp-text-kpi)', fontWeight: 900, color: yIdx === 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: 0, marginTop: 2 }}>
                      {fmtCurr(tableData.colTotals[`${yr}_total`] || 0)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Groups Growth KPI Cards */}
              {groupKpis.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div className="sales-report-kpis flex-wrap" style={{ display: 'flex', gap: 12 }}>
                    {groupKpis.map((g: CustomerGroup & { totals: Record<string, number> }) => {
                      const sortedYearsDesc = [...activeYears].map(String).sort((y1, y2) => Number(y2) - Number(y1));
                      const cardBaseYear = sortedYearsDesc[0] || activeYears[0];
                      const cardCompYear = kpiCompareYear === 'none' ? null : (kpiCompareYear && activeYears.includes(kpiCompareYear) && kpiCompareYear !== cardBaseYear
                        ? kpiCompareYear
                        : (sortedYearsDesc.length > 1 ? sortedYearsDesc.find(y => y !== cardBaseYear) || null : null));

                      const bTotal = g.totals[cardBaseYear] || 0;
                      const cTotal = cardCompYear ? (g.totals[cardCompYear] || 0) : 0;

                      let diff = null;
                      let pct = null;
                      if (cardCompYear) {
                        if (bTotal > 0 || cTotal > 0) diff = bTotal - cTotal;
                        if (cTotal > 0) pct = ((bTotal - cTotal) / cTotal) * 100;
                      }

                      const isUp = diff !== null && diff > 0;
                      const isDown = diff !== null && diff < 0;

                      return (
                        <div
                          key={g.id}
                          className="kpi-card"
                          style={{
                            background: 'var(--color-surface-0)',
                            border: '1px solid var(--color-border-light)',
                            borderLeft: `4px solid ${g.color || 'var(--color-border-light)'}`,
                            borderRadius: 8,
                            padding: '12px 16px',
                            flex: '1 1 200px',
                            minWidth: 180,
                            boxShadow: '0 8px 20px -16px color-mix(in srgb, var(--color-surface-900) 25%, transparent)'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 900, color: 'var(--color-text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{g.label}</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>{cardBaseYear}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ fontSize: 'var(--erp-text-panel)', fontWeight: 900, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)' }}>
                                {fmtCurr(bTotal)}
                              </div>
                              {diff !== null && cardCompYear && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 900,
                                      color: isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                  >
                                    <span>
                                      {isUp ? '↑ ' : isDown ? '↓ ' : ''}
                                      {metric === 'qty' ? Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '$' + Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      {pct !== null && ` (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)`}
                                    </span>
                                  </span>
                                  <span style={{ fontSize: '0.62rem', opacity: 0.75, color: 'var(--color-text-quaternary)', fontWeight: 800 }}>
                                    vs {cardCompYear}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={`sales-report-table-region transition-opacity duration-300 ${(loading && tableData.rows.length > 0) ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <CustomerReportTable
                loading={loading && tableData.rows.length === 0}
                baseYear={baseYear}
                viewMode={viewMode}
                setViewMode={setViewMode}
                aggregationMode={aggregationMode}
                setAggregationMode={setAggregationMode}
                tableData={tableData}
                displayYears={displayYears}
                displayMonths={displayMonths}
                displayWeeks={displayWeeks}
                displayDays={displayDays}
                currentYearStr={currentYearStr}
                currentMonthIdx={currentMonthIdx}
                growthComparisons={growthComparisons}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                metric={metric}
                setMetric={handleSetMetric}
                fmt={fmt}
                renderGrowthAmt={handleRenderGrowthAmt}
                renderGrowthPct={handleRenderGrowthPct}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onRefresh={triggerRefresh}
                isRefreshing={isRefreshing}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
