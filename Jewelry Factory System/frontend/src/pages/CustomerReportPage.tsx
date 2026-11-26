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
import { formatCompact, growthAmtCompactInfo, growthAmtInfo, growthPctInfo, renderGrowthAmt, renderGrowthPct } from '../components/dashboard/customerReport/GrowthHelpers';

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

  // Group KPIs: By Customer view only (in By Group view the table rows are the groups, same numbers),
  // every group picked in the Groups filter, as one short line each
  const visibleGroupKpis = useMemo(() => (aggregationMode === 'customer' ? groupKpis : []), [aggregationMode, groupKpis]);
  const skeletonGroupKpis = useMemo(
    () => (aggregationMode === 'customer' ? ALL_GROUPS.filter(g => selGroups.includes(g.id)) : []),
    [aggregationMode, selGroups],
  );

  // Base and compare year of the group KPIs (Period compare target, else the next newest year)
  const groupYears = useMemo(() => {
    const sortedYearsDesc = [...activeYears].map(String).sort((y1, y2) => Number(y2) - Number(y1));
    const base = sortedYearsDesc[0] || '';
    const comp = kpiCompareYear === 'none' ? null : (kpiCompareYear && activeYears.includes(kpiCompareYear) && kpiCompareYear !== base
      ? kpiCompareYear
      : (sortedYearsDesc.find(y => y !== base) || null));
    return { base, comp };
  }, [activeYears, kpiCompareYear]);

  // Growth KPIs: the newest year vs each older year shown, from the same year totals and the same
  // Growth formula as the table's Grand Total, so both always show the same numbers.
  const yearGrowthKpis = useMemo(() => {
    if (displayYears.length < 2) return [];
    const newest = displayYears.reduce((max, yr) => (Number(yr) > Number(max) ? yr : max), displayYears[0]);
    const base = tableData.colTotals[`${newest}_total`] || 0;
    return displayYears
      .filter(yr => yr !== newest)
      .sort((a, b) => Number(b) - Number(a))
      .map(yr => {
        const comp = tableData.colTotals[`${yr}_total`] || 0;
        return { base: newest, comp: yr, amount: growthAmtInfo(base, comp, fmtCurr), pct: growthPctInfo(base, comp) };
      });
  }, [displayYears, tableData.colTotals, fmtCurr]);

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
          {/* KPI row: Year totals, Growth vs each older year, then one KPI per selected group */}
          {(loading && tableData.rows.length === 0) && (
            <div className="customer-kpi-strip" aria-hidden="true">
              {(displayYears.length > 0 ? displayYears : ['2025', '2024']).map((yr) => (
                <div key={`kpi-skeleton-yr-${yr}`} className="customer-kpi">
                  <div className="app-skeleton" style={{ width: 84, height: 12, borderRadius: 4 }} />
                  <div className="app-skeleton" style={{ width: 150, height: 24, borderRadius: 6 }} />
                </div>
              ))}
              {displayYears.length > 1 && displayYears.slice(1).map((yr) => (
                <div key={`kpi-skeleton-growth-${yr}`} className="customer-kpi">
                  <div className="app-skeleton" style={{ width: 120, height: 12, borderRadius: 4 }} />
                  <div className="app-skeleton" style={{ width: 210, height: 24, borderRadius: 6 }} />
                </div>
              ))}
              {skeletonGroupKpis.length > 0 && (
                <div className="customer-kpi-groups">
                  {skeletonGroupKpis.map((g) => (
                    <span key={`kpi-skeleton-grp-${g.id}`} className="customer-kpi-chip">
                      <span className="customer-kpi-swatch" style={{ background: g.color }} />
                      <span className="customer-kpi-chip-name">{g.label.replace(' Group', '')}</span>
                      <span className="app-skeleton" style={{ width: 150, height: 12, borderRadius: 4 }} />
                    </span>
                  ))}
                </div>
              )}
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

              {yearGrowthKpis.map((g) => (
                <div key={`growth-${g.comp}`} className="customer-kpi">
                  <span className="customer-kpi-label">Growth {g.base} vs {g.comp}</span>
                  <span className="customer-kpi-growth">
                    <span className={`customer-kpi-value customer-kpi-value--${g.amount.tone}`}>{g.amount.text}</span>
                    <span className={`customer-kpi-delta customer-kpi-delta--${g.pct.tone}`}>{g.pct.text}</span>
                  </span>
                </div>
              ))}

              {/* Group line (By Customer view): one short chip per selected group, full numbers on hover */}
              {visibleGroupKpis.length > 0 && (
                <div className="customer-kpi-groups">
                  <span className="customer-kpi-groups-basis">
                    Groups {groupYears.base}{groupYears.comp ? ` vs ${groupYears.comp}` : ''}
                  </span>
                  {visibleGroupKpis.map((g: CustomerGroup & { totals: Record<string, number> }) => {
                    const bTotal = g.totals[groupYears.base] || 0;
                    const cTotal = groupYears.comp ? (g.totals[groupYears.comp] || 0) : 0;
                    // Same Growth formula as the table
                    const amount = groupYears.comp ? growthAmtCompactInfo(bTotal, cTotal, metric === 'amount') : null;
                    const fullAmount = groupYears.comp ? growthAmtInfo(bTotal, cTotal, fmtCurr) : null;
                    const pct = groupYears.comp ? growthPctInfo(bTotal, cTotal, cTotal === 0 && bTotal > 0) : null;
                    const title = `${g.label} ${groupYears.base}: ${fmtCurr(bTotal)}`
                      + (fullAmount && pct ? ` · Growth ${fullAmount.text} (${pct.text}) vs ${groupYears.comp}` : '');
                    return (
                      <span key={g.id} className="customer-kpi-chip" title={title}>
                        <span className="customer-kpi-swatch" style={{ background: g.color }} aria-hidden="true" />
                        <span className="customer-kpi-chip-name">{g.label.replace(' Group', '')}</span>
                        <span className="customer-kpi-chip-value">{formatCompact(bTotal, metric === 'amount')}</span>
                        {amount && pct && (
                          <>
                            <span className={`customer-kpi-delta customer-kpi-delta--${amount.tone}`}>{amount.text}</span>
                            <span className={`customer-kpi-delta customer-kpi-delta--${pct.tone}`}>{pct.text}</span>
                          </>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
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
