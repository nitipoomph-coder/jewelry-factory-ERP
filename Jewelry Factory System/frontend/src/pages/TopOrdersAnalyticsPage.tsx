import { useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BarChart3, Award, TrendingUp, Package, LayoutGrid, RefreshCw } from "lucide-react";
import { useTopOrdersGalleryData } from "../hooks/useTopOrdersGalleryData";
import { TopOrdersFilterBar } from "../components/dashboard/topOrders/TopOrdersFilterBar";
import { TopAnalyticsTable } from "../components/dashboard/topAnalytics/TopAnalyticsTable";
import { TopOrdersItemPreview } from "../components/dashboard/topOrders/TopOrdersItemPreview";
import { useTopbarActions } from "../contexts/TopbarActionContext";
import { ErpSegmentedControl } from "../components/ui/ErpButtons";

export default function TopOrdersAnalyticsPage() {
  const dataProps = useTopOrdersGalleryData();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    isInitialLoading,
    isFilterLoading,
    selectedPeriodLabel,
    refreshData,
    items,
    summary,
    previewItem,
    setPreviewItem,
    baseYear,
    compareYear,
    compareEnabled,
    rowLimit,
    setRowLimit,
  } = dataProps;

  const fmtQty = (val: number) => val.toLocaleString(undefined, { maximumFractionDigits: 0 });

  // Display all selected comparison years in chronological ascending order (e.g. 2024, 2025, 2026)
  const displayYears = useMemo(() => {
    const years = [
      dataProps.periodSetup.committed.baseYear,
      dataProps.periodSetup.committed.compareActive1 ? dataProps.periodSetup.committed.compareYear1 : null,
      dataProps.periodSetup.committed.compareActive2 && dataProps.periodSetup.committed.compareYear2 !== 'none' ? dataProps.periodSetup.committed.compareYear2 : null,
    ].filter(Boolean) as string[];

    return [...new Set(years)].sort((a, b) => Number(a) - Number(b));
  }, [
    dataProps.periodSetup.committed.baseYear,
    dataProps.periodSetup.committed.compareActive1,
    dataProps.periodSetup.committed.compareYear1,
    dataProps.periodSetup.committed.compareActive2,
    dataProps.periodSetup.committed.compareYear2,
  ]);

  // Grand total volume from summary (full filtered portfolio), falling back to displayed items sum
  const totalVolume = useMemo(() => {
    if (summary && typeof summary.portfolioTotalQty === 'number' && summary.portfolioTotalQty > 0) {
      return summary.portfolioTotalQty;
    }
    return items.reduce((sum: number, item) => {
      return sum + displayYears.reduce((yrSum: number, yr: string) => yrSum + (item.yearlyTotals?.[yr]?.qty || 0), 0);
    }, 0);
  }, [summary, items, displayYears]);

  // Total SKUs matching the filter
  const totalSkuCount = summary?.totalItemsCount || items.length;

  // Average quantity per SKU per year across the full filtered portfolio
  const avgPerItemPerYear = useMemo(() => {
    if (totalSkuCount === 0 || displayYears.length === 0) return 0;
    return Math.round(totalVolume / (totalSkuCount * displayYears.length));
  }, [totalVolume, totalSkuCount, displayYears.length]);

  // Best selling item in the selected period
  const bestSellingItem = useMemo(() => {
    if (items.length === 0) return null;
    let best = items[0];
    let maxQty = -1;
    for (const it of items) {
      const itQty = displayYears.reduce((s: number, yr: string) => s + (it.yearlyTotals?.[yr]?.qty || 0), 0);
      if (itQty > maxQty) {
        maxQty = itQty;
        best = it;
      }
    }
    return {
      item: best,
      totalQty: maxQty,
    };
  }, [items, displayYears]);

  // Hook into Global Topbar Refresh action
  const { setTopbarActions } = useTopbarActions();
  useEffect(() => {
    setTopbarActions(
      <button 
        type="button"
        onClick={refreshData} 
        className="w-9 h-9 rounded-lg border-0 flex items-center justify-center cursor-pointer transition-colors"
        style={{ background: 'transparent', color: 'var(--color-text-secondary)' }}
        title="Refresh"
        aria-label="Refresh"
      >
        <RefreshCw size={17} className={isFilterLoading ? 'animate-spin' : ''} style={{ color: isFilterLoading ? 'var(--color-ui-interactive)' : 'inherit' }} />
      </button>
    );
    return () => setTopbarActions(null);
  }, [setTopbarActions, refreshData, isFilterLoading]);

  // Compute reverse galleryPath preserving search parameters
  const galleryPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    params.set("metric", "amount");
    if (dataProps.periodSetup?.committed?.baseYear) params.set("year", dataProps.periodSetup.committed.baseYear);
    if (dataProps.periodSetup?.committed?.compareActive1 && dataProps.periodSetup?.committed?.compareYear1) params.set("compareYear", dataProps.periodSetup.committed.compareYear1);
    if (dataProps.selectedMonthNumbers?.length) params.set("months", dataProps.selectedMonthNumbers.join(","));
    if (dataProps.periodSetup?.committed?.dateFrom) params.set("dateFrom", dataProps.periodSetup.committed.dateFrom);
    if (dataProps.periodSetup?.committed?.dateTo) params.set("dateTo", dataProps.periodSetup.committed.dateTo);
    if (dataProps.periodSetup?.committed?.weekFrom) params.set("wStart", String(dataProps.periodSetup.committed.weekFrom));
    if (dataProps.periodSetup?.committed?.weekTo) params.set("wEnd", String(dataProps.periodSetup.committed.weekTo));
    if (dataProps.periodSetup?.committed?.dateField && dataProps.periodSetup.committed.dateField !== 'dueDate') params.set("dateField", dataProps.periodSetup.committed.dateField);
    if (dataProps.salesName && dataProps.salesName !== 'ALL') params.set("salesName", dataProps.salesName);
    if (dataProps.selGroups?.length && dataProps.selGroups.length < 7) params.set("groups", dataProps.selGroups.join(","));
    if (dataProps.selTypes && dataProps.selTypes.length > 0 && dataProps.selTypes.length < 5) {
      params.set("type", dataProps.selTypes.join(','));
    } else if (dataProps.selTypes && dataProps.selTypes.length === 0) {
      params.set("type", "NONE");
    }
    const qs = params.toString();
    return `/dashboard/top-orders${qs ? `?${qs}` : ''}`;
  }, [location.search, dataProps]);

  return (
    <div className="app-page-scroll content-scrollbar w-full">
      <div className="app-content-frame app-content-frame--dashboard-wide app-page-content flex flex-col gap-4 pb-16">
        {/* ─── Filter Bar Card with Integrated View Switcher (No Hero Section) ───── */}
        <div 
          className="rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--color-ui-surface)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <div className="flex-1 min-w-0">
            <TopOrdersFilterBar
              periodButtonLabel={selectedPeriodLabel} 
              {...dataProps} 
              hidePerspectiveToggle={true}
              onReset={dataProps.resetFilters} 
            />
          </div>

          {/* View Switcher: Gallery / Qty Table (router-driven with search params) */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              background: 'var(--color-ui-surface)', 
              border: '1px solid var(--color-border-light)', 
              borderRadius: 8, 
              padding: 3 
            }}
          >
            <ErpSegmentedControl
              ariaLabel="View Mode"
              value="qty"
              onChange={(val) => {
                if (val === "gallery") {
                  navigate(galleryPath);
                }
              }}
              options={[
                { value: "gallery", label: "Gallery", icon: <LayoutGrid size={13} /> },
                { value: "qty", label: "Qty", icon: <BarChart3 size={13} /> }
              ]}
            />
          </div>
        </div>

        {/* ─── 3 KPI Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Total Volume */}
          <div 
            className="rounded-lg p-4 flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--color-ui-surface)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                Total Volume ({displayYears.length} {displayYears.length === 1 ? 'Year' : 'Years'})
              </span>
              <Package size={18} style={{ color: 'var(--color-ui-interactive)' }} />
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tight font-display" style={{ color: 'var(--color-text-primary)' }}>
                  {fmtQty(totalVolume)}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
                  pcs
                </span>
              </div>
            </div>

            <div 
              className="text-xs pt-2 flex items-center justify-between"
              style={{ 
                borderTop: '1px solid var(--color-border-light)',
                color: 'var(--color-text-tertiary)' 
              }}
            >
              <span>By {dataProps.periodSetup.committed.dateField === 'ordDate' ? 'Order Date' : 'Due Date'}</span>
              <span className="font-semibold text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                {displayYears.join(', ') || 'Current'}
              </span>
            </div>
          </div>

          {/* Card 2: Average */}
          <div 
            className="rounded-lg p-4 flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--color-ui-surface)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                Avg Volume / Item / Year
              </span>
              <TrendingUp size={18} style={{ color: 'var(--color-ui-interactive)' }} />
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tight font-display" style={{ color: 'var(--color-text-primary)' }}>
                  {fmtQty(avgPerItemPerYear)}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
                  pcs / yr
                </span>
              </div>
            </div>

            <div 
              className="text-xs pt-2 flex items-center justify-between"
              style={{ 
                borderTop: '1px solid var(--color-border-light)',
                color: 'var(--color-text-tertiary)' 
              }}
            >
              <span>Item Portfolio Count</span>
              <span className="font-semibold text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                {totalSkuCount.toLocaleString()} SKUs
              </span>
            </div>
          </div>

          {/* Card 3: Best Seller */}
          <div 
            onClick={() => bestSellingItem && setPreviewItem(bestSellingItem.item)}
            className="rounded-lg p-4 flex flex-col justify-between cursor-pointer transition-all"
            style={{
              backgroundColor: 'var(--color-ui-surface)',
              border: '1px solid var(--color-border-light)',
            }}
            title={bestSellingItem ? `Click to inspect ${bestSellingItem.item.itemNo}` : undefined}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm uppercase tracking-wider font-bold" style={{ color: 'var(--color-rank-1)' }}>
                Top Best Seller
              </span>
              <Award size={18} style={{ color: 'var(--color-rank-1)' }} />
            </div>

            <div className="my-2 flex items-baseline justify-between gap-3">
              <span className="text-3xl font-black tracking-tight font-display" style={{ color: 'var(--color-text-primary)' }}>
                {bestSellingItem ? bestSellingItem.item.itemNo : '-'}
              </span>
              {bestSellingItem && (
                <span 
                  className="text-sm font-bold tabular-nums"
                  style={{ color: 'var(--color-ui-interactive)' }}
                >
                  {fmtQty(bestSellingItem.totalQty)} pcs
                </span>
              )}
            </div>

            <div 
              className="text-xs pt-2 flex items-center justify-between"
              style={{ 
                borderTop: '1px solid var(--color-border-light)',
                color: 'var(--color-text-tertiary)' 
              }}
            >
              <span>Product Type</span>
              <span className="font-semibold text-xs" style={{ color: 'var(--color-ui-interactive)' }}>
                {bestSellingItem?.item.productTypeLabel || 'Click to Preview'} →
              </span>
            </div>
          </div>
        </div>

        {/* ─── Main Table Section ─────────────────────────────────────────────────── */}
        <div 
          className={`rounded-lg overflow-hidden flex flex-col transition-opacity duration-200 ${isFilterLoading || isInitialLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
          style={{
            backgroundColor: 'var(--color-ui-surface)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          {/* Table Header Bar */}
          <div 
            className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{
              backgroundColor: 'var(--color-ui-raised)',
              borderBottom: '1px solid var(--color-border-light)',
            }}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider m-0" style={{ color: 'var(--color-text-primary)' }}>
                Top Item Volume Breakdown
              </h2>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                (Showing top {items.length.toLocaleString()} of {totalSkuCount.toLocaleString()} SKUs)
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Row Limit Selector */}
              <div 
                className="flex items-center gap-1 p-0.5 rounded-md text-xs"
                style={{
                  backgroundColor: 'var(--color-ui-surface)',
                  border: '1px solid var(--color-border-light)',
                }}
              >
                <span className="px-2 font-medium text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Rows:</span>
                {(['50', '100', '250', 'all'] as const).map(limitOpt => {
                  const optVal = limitOpt === 'all' ? 'all' : Number(limitOpt);
                  const isSel = rowLimit === optVal;
                  return (
                    <button
                      key={limitOpt}
                      type="button"
                      onClick={() => setRowLimit(optVal)}
                      className="px-2.5 py-0.5 rounded text-xs font-semibold transition-all cursor-pointer border-0"
                      style={{
                        backgroundColor: isSel ? 'var(--color-ui-interactive)' : 'transparent',
                        color: isSel ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                      }}
                    >
                      {limitOpt === 'all' ? 'All' : limitOpt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Table Body */}
          <TopAnalyticsTable 
            rows={items} 
            loading={isInitialLoading} 
            displayYears={displayYears} 
            grandTotalQty={totalVolume}
            onPhotoClick={(item) => setPreviewItem(item)}
          />
        </div>
      </div>

      {/* Item Quick Preview Modal */}
      {previewItem && (
        <TopOrdersItemPreview
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          baseYear={baseYear}
          compareYear={compareYear || ''}
          compareEnabled={compareEnabled}
          fmtQty={fmtQty}
        />
      )}
    </div>
  );
}