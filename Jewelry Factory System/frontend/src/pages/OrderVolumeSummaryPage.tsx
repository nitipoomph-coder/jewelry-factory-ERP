import {
  CustomerTrendsLoadingState,
  SummaryMetric,
} from '../components/infographic/InfographicSalesTrends';
import {
  RefreshCw,
  AlertCircle,
  Clock,
  Factory,
  Workflow,
  CheckCircle2,
  AlertTriangle,
  X,
  FilterX
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import PeriodSetupPanel from '../components/period/PeriodSetupPanel';
import { CustomerGroupFilter } from '../components/dashboard/customerSales/CustomerGroupFilter';
import '../components/sales/SalesDenseTable.css';
import './OrderVolumeSummaryPage.css';
import { useOrderVolumeSummaryData, fmtMetric, fmtQty } from '../hooks/useOrderVolumeSummaryData';
import { VolumeFilterBar } from '../components/dashboard/orderVolume/VolumeFilterBar';
import { VolumeOrdersTable } from '../components/dashboard/orderVolume/VolumeOrdersTable';
import { RiskCustomerChart } from '../components/dashboard/orderVolume/RiskCustomerChart';
import { OrderVolumeTrendChart } from '../components/dashboard/orderVolume/OrderVolumeTrendChart';
import { FactoryDepartmentWIP } from '../components/dashboard/orderVolume/FactoryDepartmentWIP';
import { CustomerBacklogTable } from '../components/dashboard/orderVolume/CustomerBacklogTable';

export default function OrderVolumeSummaryPage() {
  const data = useOrderVolumeSummaryData();
  const {
    metric, switchMetric,
    activeView, setActiveView,
    drilldown, resetDrilldown,
    monthlyData, deliveryOutlookData,
    selectedBucket, handleSelectBucket,
    selectedDepartment, handleSelectDepartment,
    selectedCustCode, handleSelectCustCode,
    drilldownOrders, drilldownLoading,
    loading, error, hasResolvedData, retryLoad, loadOverviewData,
    search, setSearch, clearSearch, handleSearchKeyDown,
    page, setPage,
    primaryYear, compareYear, hasCompareYear,
    filteredOrderRows,
    selectedGroups,
    periodSetup,
    availableYears,
    setSelGroups,
    toggleGroup,
    dynamicActiveGroups,
    isFiltered,
    resetFilters
  } = data;

  const selectedYearSummary = hasCompareYear ? `${primaryYear} vs ${compareYear}` : primaryYear || '-';
  const selectedGroupSummary = selectedGroups.length === 0 ? 'All groups' : `${selectedGroups.length} groups`;
  const hasOverviewData = monthlyData.length > 0;
  const loadingScopeSummary = primaryYear ? `${selectedYearSummary} / ${selectedGroupSummary} / ${metric === 'amount' ? 'Sales ($)' : 'Quantity (PCS)'}` : 'Preparing available reporting periods';
  const loadFailure = !hasResolvedData ? error : '';

  // --- New Risk KPIs ---
  const getBucketStats = (name: string) => {
    const buckets = deliveryOutlookData?.buckets || [];
    const b = buckets.find(x => x.bucket?.toLowerCase() === name.toLowerCase());
    return {
      qty: b?.openQty || 0,
      amount: b?.openAmount || 0,
      orders: b?.orderCount || 0
    };
  };

  const overdue = getBucketStats('Overdue');
  const due15 = getBucketStats('Due in 15 Days');

  const totalWIP = (deliveryOutlookData?.departments || []).reduce((acc, d) => {
    return {
      qty: acc.qty + (d.openQty || 0),
      amount: acc.amount + (d.openAmount || 0)
    };
  }, { qty: 0, amount: 0 });

  const sortedDepts = [...(deliveryOutlookData?.departments || [])].sort((a, b) => (b.openQty || 0) - (a.openQty || 0));
  const topBottleneck = sortedDepts.length > 0 ? sortedDepts[0] : null;

  const overdueMetric = metric === 'amount' ? overdue.amount : overdue.qty;
  const overdueRate = data.kpiPrimaryMetric > 0 ? (overdueMetric / data.kpiPrimaryMetric) * 100 : 0;

  const onTimeDiff = data.kpiCompareDeliveryRate !== null ? data.kpiDeliveryRate - data.kpiCompareDeliveryRate : null;
  const onTimeHint = onTimeDiff !== null
    ? `vs prior year (${onTimeDiff > 0 ? '▲' : onTimeDiff < 0 ? '▼' : ''}${Math.abs(onTimeDiff).toFixed(1)}%)`
    : 'No compare year';

  return (
    <>
      <PageHeader
        breadcrumb={BREADCRUMBS.CUSTOMER_DASHBOARD_TAB('trends')}
        contentLayout="workspace"
        hideTitle={true}
        bottomContent={
          <div className="sales-global-filters flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <PeriodSetupPanel periodSetup={periodSetup} availableYears={availableYears} />
              <CustomerGroupFilter
                selGroups={selectedGroups}
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
        <div className={`app-content-frame app-content-frame--workspace app-page-content customer-trends-page customer-trends-page--${activeView}`}>
          <VolumeFilterBar
            metric={metric}
            switchMetric={switchMetric}
            activeView={activeView}
            setActiveView={setActiveView}
            resetDrilldown={resetDrilldown}
            setDrilldownOrders={() => { }} // Hook manages this, or pass a handler
            loading={loading}
            loadOverviewData={loadOverviewData}
          />

          {(loading && !hasOverviewData) ? (
            <CustomerTrendsLoadingState
              activeView={activeView}
              granularity="monthly"
              scopeSummary={loadingScopeSummary}
            />
          ) : loadFailure ? (
            <div className="customer-trends-load-failure" role="alert">
              <div className="customer-trends-error">
                <span>{loadFailure}</span>
                <button type="button" onClick={retryLoad}><RefreshCw size={13} />Retry</button>
              </div>
            </div>
          ) : (
            <div className={`transition-opacity duration-300 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'} flex-1 flex flex-col min-h-0`}>
              {activeView === 'overview' && (
                <section className="customer-trends-summary" aria-label="Risk and WIP summary">
                  <SummaryMetric
                    label={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={14} color="var(--color-danger-500)" /> Total Overdue</span>}
                    value={metric === 'amount' ? fmtMetric(overdue.amount, 'amount') : fmtMetric(overdue.qty, 'qty')}
                    hint={`${fmtQty(overdue.orders)} orders at risk`}
                    tone="down"
                  />
                  <SummaryMetric
                    label={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} color="var(--color-warning-500)" /> Due in 15 Days</span>}
                    value={metric === 'amount' ? fmtMetric(due15.amount, 'amount') : fmtMetric(due15.qty, 'qty')}
                    hint={`${fmtQty(due15.orders)} orders pending`}
                    tone="down"
                  />
                  <SummaryMetric
                    label={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Factory size={14} color="var(--color-brand-500)" /> Total WIP (Factory)</span>}
                    value={metric === 'amount' ? fmtMetric(totalWIP.amount, 'amount') : fmtMetric(totalWIP.qty, 'qty')}
                    hint="Open work-in-process"
                  />
                  <SummaryMetric
                    label={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Workflow size={14} color="var(--color-text-secondary)" /> Top Bottleneck</span>}
                    value={topBottleneck ? topBottleneck.department : '-'}
                    hint={topBottleneck ? `${metric === 'amount' ? fmtMetric(topBottleneck.openAmount, 'amount') : fmtMetric(topBottleneck.openQty, 'qty')} pending` : 'No bottlenecks'}
                  />
                  <SummaryMetric
                    label={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14} color="var(--color-success-500)" /> On-Time Completion</span>}
                    value={`${data.kpiDeliveryRate.toFixed(1)}%`}
                    hint={onTimeHint}
                    tone={onTimeDiff !== null ? (onTimeDiff >= 0 ? 'up' : 'down') : undefined}
                  />
                  <SummaryMetric
                    label={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} color="var(--color-danger-500)" /> Overdue Rate</span>}
                    value={`${overdueRate.toFixed(1)}%`}
                    hint="Current Snapshot"
                    tone={overdueRate > 0 ? 'down' : undefined}
                  />
                </section>
              )}

              {error && (
                <div role="alert" className="customer-trends-error">
                  <span>{error}</span>
                  <button type="button" onClick={() => void loadOverviewData()}><RefreshCw size={13} />Retry</button>
                </div>
              )}

              {activeView === 'overview' && (
                <>
                  {!hasOverviewData && !deliveryOutlookData ? (
                    <div className="customer-trends-empty" style={{ background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: 24 }}>
                      <strong>No data for the current scope</strong>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Active Filter Indicator */}
                      {(selectedBucket || selectedDepartment || selectedCustCode) && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 12px',
                            background: 'var(--color-surface-0)',
                            borderRadius: 6,
                            border: '1px solid var(--color-border-light)'
                          }}
                        >
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                            Active Filter:{' '}
                            {[
                              selectedBucket && `Risk: ${selectedBucket}`,
                              selectedDepartment && `Dept: ${selectedDepartment}`,
                              selectedCustCode && `Cust: ${selectedCustCode}`
                            ]
                              .filter(Boolean)
                              .join(' • ')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectBucket(null);
                              handleSelectDepartment(null);
                              handleSelectCustCode(null);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-brand-600)',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <X size={12} /> Clear filter
                          </button>
                        </div>
                      )}

                      {/* Unified 2-Column Dashboard Grid (Single Screen Layout - 4 Peer Cards) */}
                      <div
                        className="customer-trends-grid"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
                          gap: 14,
                          alignItems: 'start'
                        }}
                      >
                        {/* Left Column: Trend Chart & Customer Group Risk */}
                        <div className="customer-trends-col" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <OrderVolumeTrendChart
                            data={data.monthlyComparisonData}
                            metric={metric}
                            hasCompareYear={hasCompareYear}
                            primaryYear={primaryYear}
                            compareYear={compareYear}
                          />

                          {data.riskData && (
                            <RiskCustomerChart
                              riskData={data.riskData}
                              metric={metric}
                              selectedGroups={data.selectedGroups}
                            />
                          )}
                        </div>

                        {/* Right Column: Factory Dept WIP & Top Customer Backlog */}
                        <div className="customer-trends-col" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <FactoryDepartmentWIP
                            departments={deliveryOutlookData?.departments || []}
                            metric={metric}
                            selectedDepartment={selectedDepartment}
                            onSelectDepartment={handleSelectDepartment}
                          />

                          <CustomerBacklogTable
                            customers={deliveryOutlookData?.customers || []}
                            metric={metric}
                            selectedCustCode={selectedCustCode}
                            onSelectCustCode={handleSelectCustCode}
                            selectedGroups={data.selectedGroups}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeView === 'details' && (
                <VolumeOrdersTable
                  drilldown={drilldown}
                  drilldownLoading={drilldownLoading}
                  drilldownOrders={drilldownOrders}
                  filteredOrderRows={filteredOrderRows}
                  search={search}
                  setSearch={setSearch}
                  clearSearch={clearSearch}
                  handleSearchKeyDown={handleSearchKeyDown}
                  resetDrilldown={resetDrilldown}
                  page={page}
                  setPage={setPage}
                  selectedDepartment={data.selectedDepartment}
                  setSelectedDepartment={data.setSelectedDepartment}
                  selectedBucket={data.selectedBucket}
                  setSelectedBucket={data.setSelectedBucket}
                  selectedCustGroup={data.selectedCustGroup}
                  setSelectedCustGroup={data.setSelectedCustGroup}
                />
              )}

            </div>
          )}
        </div>
      </div>
    </>
  );
}
