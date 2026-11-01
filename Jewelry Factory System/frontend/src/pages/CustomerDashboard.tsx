import { useState, useMemo, useEffect, useCallback } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { DollarSign, Hash, Calendar, CalendarDays, Layers, Users, Eye, EyeOff } from 'lucide-react';
import { fetchCustomerSummary } from '../services/customerSummaryAPI';
import { ALL_GROUPS } from '../config/customerGroups';
import { ErpSegmentedControl } from '../components/ui/ErpButtons';
import { printChartDashboard } from '../utils/printChart';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import PeriodSetupPanel from '../components/period/PeriodSetupPanel';
import { CustomerGroupFilter } from '../components/dashboard/customerSales/CustomerGroupFilter';
import { useCustomerPageFilters } from '../hooks/useCustomerPageFilters';
import { FilterX } from 'lucide-react';
import { useCustomerSalesData, type Metric, type CustomerSummaryRow } from '../hooks/useCustomerSalesData';
import { CustomerSalesChart } from '../components/dashboard/customerSales/CustomerSalesChart';
import { CustomerKpiCards } from '../components/dashboard/customerSales/CustomerKpiCards';
import { CustomerDashboardSkeleton } from '../components/dashboard/customerSales/CustomerDashboardSkeleton';
import type { CustomerDashboardOutletContext } from './CustomerDashboardLayout';
import './CustomerDashboard.css';

const YEAR_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)'];

export default function CustomerDashboard({ metric: propMetric = 'amount' }: { metric?: Metric }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const metric = (searchParams.get('metric') as Metric) || propMetric;
  const { availableYears, refreshCounter, setIsRefreshing, setIsChildLoading } = useOutletContext<CustomerDashboardOutletContext>();
  const [custData, setCustData] = useState<CustomerSummaryRow[]>([]);

  const {
    periodSetup,
    selGroups,
    setSelGroups,
    toggleGroup,
    dynamicActiveGroups,
    isFiltered,
    resetFilters
  } = useCustomerPageFilters(availableYears, { presets: ['full-year', 'ytd', 'this-month', 'last-month', 'custom'] }, custData);

  const selectedYears = periodSetup.committed.selectedYears;
  const selectedMonths = periodSetup.committed.selectedMonths;
  const kpiCompareYear = periodSetup.committed.kpiCompareYear;
  const [loading, setLoading] = useState(true);

  // New State mappings
  const [mode, setMode] = useState<'yearly' | 'monthly'>('yearly');
  const [monthlySeries, setMonthlySeries] = useState<'year' | 'group'>('year');

  // Track user manual override for labels
  const [userCustomLabels, setUserCustomLabels] = useState<boolean | null>(null);
  const [prevSeriesFilter, setPrevSeriesFilter] = useState({ mode, monthlySeries });

  if (prevSeriesFilter.mode !== mode || prevSeriesFilter.monthlySeries !== monthlySeries) {
    setPrevSeriesFilter({ mode, monthlySeries });
    setUserCustomLabels(null);
  }

  // Default: if filter = By Group + Month simultaneously -> default hide (false), else default show (true)
  const defaultShowLabels = !(mode === 'monthly' && monthlySeries === 'group');
  const showLabels = userCustomLabels !== null ? userCustomLabels : defaultShowLabels;

  const handleToggleLabels = () => {
    setUserCustomLabels(!showLabels);
  };


  const activeYears = useMemo(() => [...selectedYears].sort(), [selectedYears]);

  const handlePrint = useCallback(() => {
    const scopeYears = activeYears.join('-');
    const title = `Customer_Sales_Chart_${mode}_${metric}_${scopeYears || 'all'}`;
    printChartDashboard(title);
  }, [activeYears, mode, metric]);

  // Listen to GlobalTopbar app-print event
  useEffect(() => {
    const onPrint = () => handlePrint();
    window.addEventListener('app-print', onPrint);
    return () => window.removeEventListener('app-print', onPrint);
  }, [handlePrint]);

  // Fetch all data for available years
  useEffect(() => {
    if (!availableYears || availableYears.length === 0) {
      return;
    }
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setCustData([]);
        if (setIsChildLoading) setIsChildLoading(true);
      }
    });

    const minDelay = new Promise((resolve) => setTimeout(resolve, 500));
    const isWeekMode = periodSetup.committed.preset === 'week';
    const isDayMode = periodSetup.committed.preset === 'day';
    const isFilteredMonths = periodSetup.committed.selectedMonths.length > 0 && periodSetup.committed.selectedMonths.length < 12;

    const fetchWork = fetchCustomerSummary({
      years: availableYears,
      months: isFilteredMonths ? periodSetup.committed.selectedMonths.map(String) : undefined,
      startDate: isDayMode ? periodSetup.committed.dateFrom : undefined,
      endDate: isDayMode ? periodSetup.committed.dateTo : undefined,
      wStart: isWeekMode ? periodSetup.committed.weekFrom : undefined,
      wEnd: isWeekMode ? periodSetup.committed.weekTo : undefined,
      dateField: periodSetup.committed.dateField
    });

    Promise.all([fetchWork, minDelay])
      .then(([data]) => {
        if (!cancelled) setCustData(data as CustomerSummaryRow[]);
      })
      .catch((err) => {
        if (!cancelled) console.error('Error fetching customer summary:', err);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          if (setIsRefreshing) setIsRefreshing(false);
          if (setIsChildLoading) setIsChildLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [availableYears, refreshCounter, periodSetup.committed, setIsChildLoading, setIsRefreshing]);

  // Keep groups in ALL_GROUPS order for consistent colors
  const sortedSel = useMemo(
    () => ALL_GROUPS.filter(g => selGroups.includes(g.id)).map(g => g.id),
    [selGroups]
  );

  const {
    chartData,
    summaries,
    yearSummaries,
  } = useCustomerSalesData({
    custData,
    availableYears,
    activeYears,
    selectedMonths,
    sortedSel,
    metric,
    mode,
    monthlySeries,
    kpiCompareYear
  });

  const usesGroupSeriesColors = monthlySeries === 'group';

  // Listen to GlobalTopbar app-export event
  useEffect(() => {
    const handleExportEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: string }>;
      const exportType = customEvent.detail?.type;
      if (!chartData || chartData.length === 0) return;

      customEvent.preventDefault();

      const keys = Object.keys(chartData[0] || {}).filter(k => k !== 'sortKey');
      const filename = `Sales_Summary_${mode}_${metric}_${new Date().toISOString().slice(0, 10)}`;

      if (exportType === 'csv') {
        const headerRow = keys.join(',');
        const dataRows = chartData.map(row =>
          keys.map(k => {
            const val = row[k];
            if (typeof val === 'number') return val;
            return `"${String(val ?? '').replace(/"/g, '""')}"`;
          }).join(',')
        );
        const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (exportType === 'excel') {
        const tableHtml = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head><meta charset="utf-8"/></head>
          <body>
            <table>
              <thead>
                <tr style="background-color: \x232563eb; color: \x23ffffff; font-weight: bold;">
                  ${keys.map(k => `<th>${k.toUpperCase()}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${chartData.map(row => `
                  <tr>
                    ${keys.map(k => `<td>${row[k] ?? ''}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
          </html>
        `;
        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.xls`;
        link.click();
        URL.revokeObjectURL(url);
      }
    };

    window.addEventListener('app-export', handleExportEvent);
    return () => window.removeEventListener('app-export', handleExportEvent);
  }, [chartData, mode, metric]);

  const switchMetric = (nextMetric: Metric) => {
    if (nextMetric === metric) return;
    const nextParams = new URLSearchParams(searchParams);
    if (nextMetric === 'qty') {
      nextParams.set('metric', 'qty');
    } else {
      nextParams.delete('metric');
    }
    setSearchParams(nextParams, { replace: true });
  };

  if (loading && custData.length === 0) {
    return <CustomerDashboardSkeleton sortedSel={sortedSel} activeYears={activeYears} />;
  }

  return (
    <>
      <PageHeader
        breadcrumb={BREADCRUMBS.CUSTOMER_DASHBOARD_TAB('dashboard')}
        contentLayout="workspace"
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
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{
        background: 'var(--color-surface-2)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div className="app-content-frame app-content-frame--workspace app-page-content" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, width: '100%', flex: 1, minHeight: 0 }}>
          {/* Main Content Grid: Chart on Left, YoY Cards on Right */}
          <div className="sales-summary-main-grid">

            {/* Main Chart Section */}
            <div className="sales-summary-chart" style={{ background: 'var(--color-surface-0)', borderRadius: 8, border: '1px solid var(--color-border-light)', boxShadow: 'none' }}>
              {/* Chart Controls — integrated into chart card header */}
              <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 16px', borderBottom: '1px solid var(--color-border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <ErpSegmentedControl ariaLabel="Metric" value={metric} onChange={(v) => switchMetric(v as Metric)} options={[{ value: 'amount', label: 'Sales', icon: <DollarSign size={13} /> }, { value: 'qty', label: 'Qty', icon: <Hash size={13} /> }]} />
                  <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
                  <ErpSegmentedControl ariaLabel="View" value={mode} onChange={(v) => setMode(v as 'yearly' | 'monthly')} options={[{ value: 'yearly', label: 'Year', icon: <CalendarDays size={13} /> }, { value: 'monthly', label: 'Month', icon: <Calendar size={13} /> }]} />
                  <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
                  <ErpSegmentedControl ariaLabel="Series" value={monthlySeries} onChange={(v) => setMonthlySeries(v as 'year' | 'group')} options={[{ value: 'year', label: 'By Year', icon: <Layers size={13} /> }, { value: 'group', label: 'By Group', icon: <Users size={13} /> }]} />
                  <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
                  <button
                    type="button"
                    onClick={handleToggleLabels}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)] transition-colors shrink-0 cursor-pointer p-0"
                    title={showLabels ? 'Hide Labels' : 'Show Labels'}
                    aria-label={showLabels ? 'Hide Labels' : 'Show Labels'}
                  >
                    {showLabels ? (
                      <Eye size={16} strokeWidth={1.75} className="text-[var(--color-brand-600)]" />
                    ) : (
                      <EyeOff size={16} strokeWidth={1.75} className="text-[var(--color-text-tertiary)] opacity-65" />
                    )}
                  </button>
                </div>
              </div>
              {/* Dynamic Chart Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14, flexWrap: 'wrap', padding: '18px 18px 0' }}>
                <div>
                  <h2 style={{ fontSize: 'var(--erp-text-section)', fontWeight: 900, color: 'var(--color-text-primary)', textTransform: 'capitalize', letterSpacing: 0, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                    {mode === 'yearly' ? (metric === 'qty' ? `Annual Quantity Comparison` : `Annual Sales Comparison`) : (metric === 'qty' ? `Monthly Quantity Breakdown` : `Monthly Sales Breakdown`)}
                  </h2>
                  <p style={{ margin: 0, fontSize: 'var(--erp-text-control)', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                    Unit: {metric === 'qty' ? 'PCS' : 'USD'} / Series Color: {usesGroupSeriesColors ? 'Customer Group' : 'Year'} {showLabels ? '/ Value Labels Displayed' : '/ Value Labels Hidden'}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.68rem', color: 'var(--color-text-quaternary)', fontWeight: 800 }}>
                    (Value Colors: <span style={{ color: 'var(--color-success-600)' }}>Green = Above Avg</span>, <span style={{ color: 'var(--color-danger-500)' }}>Red = Below Avg</span>)
                  </p>

                  {/* Chart Legend */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--erp-text-dense)', fontWeight: 900, color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>
                      {usesGroupSeriesColors ? 'Group Colors' : 'Year Colors'}
                    </span>
                    {usesGroupSeriesColors ? sortedSel.map(gId => {
                      const g = ALL_GROUPS.find(x => x.id === gId)!;
                      return (
                        <div key={gId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--erp-text-dense)', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: g.color }} />
                          {g.label}
                        </div>
                      );
                    }) : activeYears.map((y, idx) => {
                      const color = YEAR_COLORS[idx % YEAR_COLORS.length];
                      return (
                        <div key={y} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--erp-text-dense)', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                          Year {y}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recharts Component */}
              <div className="sales-summary-chart-body" style={{ padding: '10px 8px 8px' }}>
                <CustomerSalesChart
                  chartData={chartData}
                  metric={metric}
                  mode={mode}
                  monthlySeries={monthlySeries}
                  showLabels={showLabels}
                  sortedSel={sortedSel}
                  activeYears={activeYears}
                />
              </div>
            </div>

            <CustomerKpiCards
              yearSummaries={yearSummaries}
              groupSummaries={summaries}
              activeYears={activeYears}
              metric={metric}
              monthlySeries={monthlySeries}
              sortedSel={sortedSel}
            />

          </div>
        </div>
      </div>
    </>
  );
}
