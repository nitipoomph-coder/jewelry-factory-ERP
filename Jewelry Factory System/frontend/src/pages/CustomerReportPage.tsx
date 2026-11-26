import { useCallback, useMemo } from 'react';
import { DollarSign, Hash } from 'lucide-react';
import './SalesResponsive.css';
import { ALL_GROUPS, type CustomerGroup } from '../config/customerGroups';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import PeriodSetupPanel from '../components/period/PeriodSetupPanel';
import { CustomerGroupFilter } from '../components/dashboard/customerSales/CustomerGroupFilter';
import { FilterX } from 'lucide-react';
import CustomerReportTable from '../components/report/CustomerReportTable';
import { useCustomerReportData } from '../hooks/useCustomerReportData';
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
    availableYears
  } = useCustomerReportData();

  // Group KPIs: By Customer view only, and only groups flagged showKpi in config/customerGroups.ts
  const visibleGroupKpis = useMemo(
    () => (aggregationMode === 'customer' ? groupKpis.filter((g: CustomerGroup) => g.showKpi) : []),
    [aggregationMode, groupKpis],
  );
  const skeletonGroupKpis = useMemo(
    () => (aggregationMode === 'customer' ? ALL_GROUPS.filter(g => g.showKpi && selGroups.includes(g.id)) : []),
    [aggregationMode, selGroups],
  );

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
      <div className="customer-report-host content-scrollbar">
        <div className="app-content-frame app-content-frame--dashboard-wide sales-report-page">
          {/* KPI row: Year totals always; group KPIs only in By Customer view, only for groups flagged showKpi */}
          {(loading && tableData.rows.length === 0) && (
            <div className="customer-kpi-strip" aria-hidden="true">
              {(displayYears.length > 0 ? displayYears : ['2025', '2024']).map((yr) => (
                <div key={`kpi-skeleton-yr-${yr}`} className="customer-kpi">
                  <div className="app-skeleton" style={{ width: 84, height: 12, borderRadius: 4 }} />
                  <div className="app-skeleton" style={{ width: 150, height: 24, borderRadius: 6 }} />
                </div>
              ))}
              {skeletonGroupKpis.length > 0 && <span className="customer-kpi-divider" />}
              {skeletonGroupKpis.map((g) => (
                <div key={`kpi-skeleton-grp-${g.id}`} className="customer-kpi customer-kpi--group">
                  <span className="customer-kpi-label">{g.label}</span>
                  <div className="app-skeleton" style={{ width: 120, height: 18, borderRadius: 4 }} />
                  <div className="app-skeleton" style={{ width: 110, height: 12, borderRadius: 4 }} />
                </div>
              ))}
            </div>
          )}

          {(!loading || tableData.rows.length > 0) && (
            <div
              className={`customer-kpi-strip transition-opacity duration-300 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
              key={`kpis-${displayYears.join(',')}-${selGroups.join(',')}-${selMonths.join(',')}-${metric}`}
            >
              {displayYears.map((yr, yIdx) => (
                <div key={yr} className="customer-kpi">
                  <span className="customer-kpi-label">
                    {metric === 'qty' ? <Hash size={13} /> : <DollarSign size={13} />}
                    Year {yr} {metric === 'qty' ? '(PCS)' : ''}
                  </span>
                  <span className={`customer-kpi-value ${yIdx === 0 ? '' : 'customer-kpi-value--previous'}`.trim()}>
                    {fmtCurr(tableData.colTotals[`${yr}_total`] || 0)}
                  </span>
                </div>
              ))}

              {visibleGroupKpis.length > 0 && <span className="customer-kpi-divider" aria-hidden="true" />}

              {visibleGroupKpis.map((g: CustomerGroup & { totals: Record<string, number> }) => {
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
                  <div key={g.id} className="customer-kpi customer-kpi--group">
                    <span className="customer-kpi-label">
                      <span className="customer-kpi-swatch" style={{ background: g.color }} aria-hidden="true" />
                      {g.label} · {cardBaseYear}
                    </span>
                    <span className="customer-kpi-value customer-kpi-value--group">{fmtCurr(bTotal)}</span>
                    {diff !== null && cardCompYear && (
                      <span className={`customer-kpi-delta ${isUp ? 'customer-kpi-delta--up' : isDown ? 'customer-kpi-delta--down' : ''}`.trim()}>
                        {isUp ? '↑ ' : isDown ? '↓ ' : ''}
                        {metric === 'qty' ? Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '$' + Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {pct !== null && ` (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)`}
                        <span className="customer-kpi-basis"> vs {cardCompYear}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className={`sales-report-table-region transition-opacity duration-300 ${(loading && tableData.rows.length > 0) ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
