import { useMemo, useEffect, type CSSProperties } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutGrid, BarChart3, RefreshCw } from "lucide-react";
import PageHeader from '../components/layout/PageHeader';
import { BREADCRUMBS } from '../config/breadcrumbs';
import { ErpSegmentedControl } from "../components/ui/ErpButtons";
import { useTopOrdersGalleryData } from "../hooks/useTopOrdersGalleryData";
import { TopOrdersFilterBar } from "../components/dashboard/topOrders/TopOrdersFilterBar";
import { TopOrdersGalleryGrid } from "../components/dashboard/topOrders/TopOrdersGalleryGrid";
import { TopOrdersItemPreview } from "../components/dashboard/topOrders/TopOrdersItemPreview";
import { TopOrdersSkeleton } from "../components/dashboard/topOrders/TopOrdersSkeleton";
import { comparisonTextStyle, formatSignedPct } from "../components/dashboard/topOrders/galleryComparison";
import { useTopbarActions } from "../contexts/TopbarActionContext";
import "./SalesResponsive.css";

export default function TopOrdersGalleryPage() {
  const {
    metric,
    isInitialLoading,
    isFilterLoading,
    availableYears,
    baseYear,
    compareYear,
    compareEnabled,
    selGroups,
    setSelGroups,
    toggleGroup,
    salesName,
    setSalesName,
    availableSalespersons,
    periodSetup,
    productType,
    setProductType,
    selTypes,
    setSelTypes,
    toggleType,
    perspectiveMode,
    setPerspectiveMode,
    swapYears,
    selectedPeriodLabel,
    searchDraft,
    setSearchDraft,
    searchQuery,
    setSearchQuery,
    startFilterTransition,
    summary,
    items,
    portfolioAllItems,
    previewItem,
    setPreviewItem,
    resetFilters,
    isFiltered,
    refreshData,
    analyticsPath,
  } = useTopOrdersGalleryData();

  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.startsWith("/dashboard/top-orders/analytics") ? "qty" : "gallery";

  const fmt = (val: number) => {
    if (metric === "qty") return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const fmtQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

  // Compute Product Type Significance KPI (using portfolioAllItems so breakdown is always preserved even when Type filtered)
  const typeSignificance = useMemo(() => {
    const targetItems = (portfolioAllItems && portfolioAllItems.length > 0) ? portfolioAllItems : items;
    if (!targetItems || targetItems.length === 0) return null;
    const typeMap: Record<string, { label: string; totalQty: number; totalAmnt: number; count: number }> = {};
    let grandQty = 0;
    let grandAmnt = 0;

    for (const it of targetItems) {
      const raw = String(it.productType || it.productCategory || 'OTH').trim().toUpperCase();
      const label = raw === 'OTHER' || raw === 'OTHERS' ? 'OTH' : raw;
      if (!typeMap[label]) {
        typeMap[label] = { label, totalQty: 0, totalAmnt: 0, count: 0 };
      }
      const qty = perspectiveMode === 'compare' ? it.baseYearQty : it.totalCombinedQty;
      const amnt = perspectiveMode === 'compare' ? it.baseYearAmnt : it.totalCombinedAmnt;

      typeMap[label].totalQty += qty;
      typeMap[label].totalAmnt += amnt;
      typeMap[label].count += 1;
      grandQty += qty;
      grandAmnt += amnt;
    }

    const sorted = Object.values(typeMap).sort((a, b) =>
      metric === 'amount' ? b.totalAmnt - a.totalAmnt : b.totalQty - a.totalQty
    );

    const leader = sorted[0];
    if (!leader) return null;

    const leaderVal = metric === 'amount' ? leader.totalAmnt : leader.totalQty;
    const grandVal = metric === 'amount' ? grandAmnt : grandQty;
    const leaderSharePct = grandVal > 0 ? (leaderVal / grandVal) * 100 : 0;

    let displayLabel = leader.label;
    let displaySharePct = leaderSharePct;

    if (selTypes && selTypes.length > 0) {
      displayLabel = selTypes.map(s => s.toUpperCase()).join('+');
      let sumVal = 0;
      for (const t of selTypes) {
        const key = t.toUpperCase();
        const entry = typeMap[key];
        if (entry) {
          sumVal += metric === 'amount' ? entry.totalAmnt : entry.totalQty;
        }
      }
      displaySharePct = grandVal > 0 ? (sumVal / grandVal) * 100 : 0;
    }

    // 4-Color Category Segments: Leader + Top 2 Runner-ups + Others
    const colors = [
      'var(--color-chart-1)',
      'var(--color-chart-2)',
      'var(--color-chart-3)',
      'var(--color-chart-4)',
    ];

    const segments: Array<{ label: string; sharePct: number; color: string }> = [];

    if (sorted.length > 0) {
      // 1. Leader
      segments.push({
        label: leader.label,
        sharePct: leaderSharePct,
        color: colors[0],
      });

      // 2. Runner-up 1
      if (sorted.length > 1) {
        const val1 = metric === 'amount' ? sorted[1].totalAmnt : sorted[1].totalQty;
        const share1 = grandVal > 0 ? (val1 / grandVal) * 100 : 0;
        segments.push({
          label: sorted[1].label,
          sharePct: share1,
          color: colors[1],
        });
      }

      // 3. Runner-up 2
      if (sorted.length > 2) {
        const val2 = metric === 'amount' ? sorted[2].totalAmnt : sorted[2].totalQty;
        const share2 = grandVal > 0 ? (val2 / grandVal) * 100 : 0;
        segments.push({
          label: sorted[2].label,
          sharePct: share2,
          color: colors[2],
        });
      }

      // 4. Others (remaining categories combined)
      if (sorted.length > 3) {
        let remainingVal = 0;
        for (let i = 3; i < sorted.length; i++) {
          remainingVal += metric === 'amount' ? sorted[i].totalAmnt : sorted[i].totalQty;
        }
        const remainingShare = grandVal > 0 ? (remainingVal / grandVal) * 100 : 0;
        segments.push({
          label: sorted.length === 4 ? sorted[3].label : 'OTH',
          sharePct: remainingShare,
          color: colors[3],
        });
      }
    }

    return {
      displayLabel,
      displaySharePct,
      leaderLabel: leader.label,
      leaderSharePct,
      leaderCount: leader.count,
      segments,
    };
  }, [portfolioAllItems, items, metric, perspectiveMode, selTypes]);

  const debugSkeleton = new URLSearchParams(location.search).get('debugSkeleton') === '1';
  const showInitialLoading = isInitialLoading || debugSkeleton;

  const { setTopbarActions } = useTopbarActions();
  useEffect(() => {
    setTopbarActions(
      <button onClick={refreshData} style={{ width:36, height:36, borderRadius:8, border:'none', background:'transparent', color:'var(--color-text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.background='var(--color-surface-2)'; e.currentTarget.style.color='var(--color-brand-600)'; }}
        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--color-text-secondary)'; }}
        title="Refresh"
        aria-label="Refresh"
      >
        <RefreshCw size={18} strokeWidth={1.75} className={isFilterLoading ? 'animate-spin text-[var(--color-brand-600)]' : ''} />
      </button>
    );
    return () => setTopbarActions(null);
  }, [setTopbarActions, refreshData, isFilterLoading]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-surface-1)]">
      <PageHeader
        breadcrumb={BREADCRUMBS.TOP_ORDERS_GALLERY}
        contentLayout="workspace"
        bottomContent={
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <TopOrdersFilterBar
              periodButtonLabel={selectedPeriodLabel}
              productType={productType}
              setProductType={setProductType}
              selTypes={selTypes}
              setSelTypes={setSelTypes}
              toggleType={toggleType}
              searchDraft={searchDraft}
              setSearchDraft={setSearchDraft}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              startFilterTransition={startFilterTransition}
              periodSetup={periodSetup}
              availableYears={availableYears}
              baseYear={baseYear}
              selectedPeriodLabel={selectedPeriodLabel}
              selGroups={selGroups}
              setSelGroups={setSelGroups}
              toggleGroup={toggleGroup}
              salesName={salesName}
              setSalesName={setSalesName}
              availableSalespersons={availableSalespersons}
              perspectiveMode={perspectiveMode}
              setPerspectiveMode={setPerspectiveMode}
              swapYears={swapYears}
              isFiltered={isFiltered}
              onReset={resetFilters}
            />
          </div>
        }
        rightContent={
          <div className="flex items-center gap-2">
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: 4 }}>
              <ErpSegmentedControl
                ariaLabel="View Mode"
                value={activeTab}
                onChange={(val) => {
                  if (val === "qty") navigate(analyticsPath);
                }}
                options={[
                  { value: "gallery", label: "Gallery", icon: <LayoutGrid size={13} /> },
                  { value: "qty", label: "Qty", icon: <BarChart3 size={13} /> }
                ]}
              />
            </div>
          </div>
        }
      />

      {/* Main Responsive Grid Area */}
      <div className="flex-1 overflow-y-auto min-h-0 relative" style={{ scrollBehavior: 'smooth' }}>
        <style>{`
          .gallery-card-hover .hover-overlay { opacity: 0; transform: translateY(10px); transition: all 0.2s ease; }
          .gallery-card-hover:hover .hover-overlay { opacity: 1; transform: translateY(0); }
          .gallery-img { transition: transform 0.25s ease, opacity 0.15s ease; }
          .gallery-card-hover:hover .gallery-img { transform: scale(1.04); }
          .gallery-grid {
            --gallery-track: clamp(260px, 16vw, 320px);
            --gallery-gap: clamp(14px, 1vw, 20px);
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(var(--gallery-track), 1fr));
            gap: var(--gallery-gap);
            width: 100%;
            max-width: 2400px;
            margin: 0 auto;
            direction: ltr;
            transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .gallery-card-clean {
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.3s ease;
            animation: galleryCardAppear 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
          }
          @keyframes galleryCardAppear {
            from {
              opacity: 0.6;
              transform: translateY(6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .gallery-filter-spinner { animation: galleryFilterSpin 0.8s linear infinite; }
          @keyframes galleryFilterSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .gallery-card-clean:hover .gallery-overlay {
            opacity: 1 !important;
          }
        `}</style>

        {/* WCAG 2.1 AA — Portfolio Summary Sub-header with Accessible KPI Cards */}
        {!showInitialLoading && summary.totalItemsCount > 0 && (
          <div
            role="banner"
            aria-label="Portfolio summary and key performance indicators"
            className={`transition-opacity duration-300 ${isFilterLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
            style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              borderBottom: '1px solid var(--color-border-light)',
              background: 'var(--color-surface-0)',
            }}
          >
            {/* Left Side: Scope & Ranked Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {perspectiveMode === 'combined' && (
                  <>
                    <span
                      style={{
                        fontSize: 'var(--erp-text-section)',
                        fontWeight: 800,
                        color: 'var(--color-brand-600)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      Combined All Years
                    </span>
                    <span style={{ fontSize: 'var(--erp-text-section)', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>
                      ·
                    </span>
                  </>
                )}
                <span style={{ fontSize: 'var(--erp-text-section)', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                  Top Ranked ({items.length > 0 ? items.length : 50} Items)
                </span>
              </div>
              <span style={{ fontSize: 'var(--erp-text-control)', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                {perspectiveMode === 'compare'
                  ? `Ranked by ${baseYear} metric • Comparing head-to-head with ${compareYear}`
                  : `Cumulative volume & value across all selected years in portfolio`}
              </span>
            </div>

            {/* Right Side: KPI Cards for Volume, Value, Avg Price & Product Type Significance (repeat(3, 1fr) 1.4fr) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) minmax(0, 1.4fr)',
                gap: 12,
                alignItems: 'stretch',
                flex: 1,
                minWidth: 'min(100%, 820px)',
                maxWidth: 1140,
              }}
            >
              {(() => {
                const isCompare = perspectiveMode === 'compare';
                const hasVolDelta = summary.compareYearTotalQty > 0 && summary.baseYearTotalQty > 0;
                const volDeltaPct = hasVolDelta
                  ? ((summary.baseYearTotalQty - summary.compareYearTotalQty) / summary.compareYearTotalQty) * 100
                  : null;
                const volValue = isCompare ? summary.baseYearTotalQty : summary.portfolioTotalQty;
                const volLabel = isCompare ? `${baseYear} Volume` : 'Total Volume';

                const hasValDelta = summary.compareYearTotalAmnt > 0 && summary.baseYearTotalAmnt > 0;
                const valDeltaPct = hasValDelta
                  ? ((summary.baseYearTotalAmnt - summary.compareYearTotalAmnt) / summary.compareYearTotalAmnt) * 100
                  : null;
                const valValue = isCompare ? summary.baseYearTotalAmnt : summary.portfolioTotalAmnt;
                const valLabel = isCompare ? `${baseYear} Value` : 'Total Value';

                // Unit Economics: Average Price per Unit ($/pc)
                const avgPriceVal = volValue > 0 ? valValue / volValue : 0;
                const compareAvgPriceVal = (isCompare || compareYear) && summary.compareYearTotalQty > 0
                  ? summary.compareYearTotalAmnt / summary.compareYearTotalQty
                  : null;
                const baseAvgPriceVal = summary.baseYearTotalQty > 0
                  ? summary.baseYearTotalAmnt / summary.baseYearTotalQty
                  : 0;

                const hasAvgDelta = compareAvgPriceVal !== null && compareAvgPriceVal > 0 && avgPriceVal > 0;
                const avgDeltaPct = hasAvgDelta
                  ? ((avgPriceVal - compareAvgPriceVal) / compareAvgPriceVal) * 100
                  : null;
                const avgLabel = isCompare ? `${baseYear} Avg Price` : 'Average Price';

                return (
                  <>
                    <GallerySummaryKpi
                      label={volLabel}
                      value={`${fmtQty(volValue)} pcs`}
                      ariaLabel={`${volLabel}: ${fmtQty(volValue)} pieces${hasVolDelta ? `, ${formatSignedPct(volDeltaPct ?? 0)} versus ${compareYear}` : ''}`}
                      deltaPct={volDeltaPct}
                      deltaVsYear={compareYear}
                      showHeaderDelta={isCompare && hasVolDelta}
                      deltaTitle={hasVolDelta
                        ? `${baseYear} ${fmtQty(summary.baseYearTotalQty)} pcs vs ${compareYear} ${fmtQty(summary.compareYearTotalQty)} pcs`
                        : undefined}
                      footnote={!isCompare && hasVolDelta
                        ? `${baseYear}: ${fmtQty(summary.baseYearTotalQty)} pcs · ${formatSignedPct(volDeltaPct ?? 0)} vs ${compareYear}`
                        : undefined}
                    />
                    <GallerySummaryKpi
                      label={valLabel}
                      value={fmt(valValue)}
                      ariaLabel={`${valLabel}: ${fmt(valValue)}${hasValDelta ? `, ${formatSignedPct(valDeltaPct ?? 0)} versus ${compareYear}` : ''}`}
                      deltaPct={valDeltaPct}
                      deltaVsYear={compareYear}
                      showHeaderDelta={isCompare && hasVolDelta}
                      deltaTitle={hasVolDelta
                        ? `${baseYear} ${fmt(summary.baseYearTotalAmnt)} vs ${compareYear} ${fmt(summary.compareYearTotalAmnt)}`
                        : undefined}
                      footnote={!isCompare && hasVolDelta
                        ? `${baseYear}: ${fmt(summary.baseYearTotalAmnt)} · ${formatSignedPct(valDeltaPct ?? 0)} vs ${compareYear}`
                        : undefined}
                    />
                    <GallerySummaryKpi
                      label={avgLabel}
                      value={`$${avgPriceVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      unit="/ pc"
                      ariaLabel={`${avgLabel}: $${avgPriceVal.toFixed(2)} per piece${hasAvgDelta ? `, ${formatSignedPct(avgDeltaPct ?? 0)} versus ${compareYear}` : ''}`}
                      deltaPct={avgDeltaPct}
                      deltaVsYear={compareYear}
                      showHeaderDelta={isCompare && hasAvgDelta}
                      deltaTitle={hasAvgDelta
                        ? `${baseYear} $${avgPriceVal.toFixed(2)}/pc vs ${compareYear} $${compareAvgPriceVal?.toFixed(2)}/pc`
                        : undefined}
                      footnote={!isCompare && hasAvgDelta
                        ? `${baseYear}: $${baseAvgPriceVal.toFixed(2)}/pc · ${formatSignedPct(avgDeltaPct ?? 0)} vs ${compareYear}`
                        : undefined}
                    />
                    {typeSignificance && (
                      <ProductTypeSignificanceKpi
                        typeSignificance={typeSignificance}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {showInitialLoading ? (
          <TopOrdersSkeleton />
        ) : (
          <div className={`transition-opacity duration-300 ${isFilterLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <TopOrdersGalleryGrid
              items={items}
              metric={metric}
              compareEnabled={compareEnabled}
              baseYear={baseYear}
              compareYear={compareYear}
              perspectiveMode={perspectiveMode}
              openPreview={(item) => setPreviewItem(item)}
              fmtQty={fmtQty}
            />
          </div>
        )}

      </div>

      <TopOrdersItemPreview
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        baseYear={baseYear}
        compareYear={compareYear}
        compareEnabled={compareEnabled}
        fmtQty={fmtQty}
      />
    </div>
  );
}

const kpiTileStyle: CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  background: "var(--color-surface-1)",
  border: "1px solid var(--color-border-light)",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

function GallerySummaryKpi({
  label,
  value,
  unit,
  ariaLabel,
  deltaPct,
  deltaVsYear,
  showHeaderDelta,
  deltaTitle,
  footnote,
}: {
  label: string;
  value: string;
  unit?: string;
  ariaLabel: string;
  deltaPct: number | null;
  deltaVsYear: string;
  showHeaderDelta: boolean;
  deltaTitle?: string;
  footnote?: string;
}) {
  return (
    <div role="region" aria-label={ariaLabel} style={{ ...kpiTileStyle, height: '100%', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: "var(--erp-text-control)", fontWeight: 800, color: "var(--color-text-tertiary)" }}>
            {label}
          </span>
          {showHeaderDelta && deltaPct !== null && (
            <span title={deltaTitle} style={comparisonTextStyle(deltaPct)}>
              {formatSignedPct(deltaPct)} vs {deltaVsYear}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
          <span
            aria-live="polite"
            style={{
              fontSize: "var(--erp-text-kpi)",
              fontWeight: 800,
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-display)",
              letterSpacing: 0,
            }}
          >
            {value}
          </span>
          {unit ? (
            <span style={{ fontSize: "var(--erp-text-control)", fontWeight: 800, color: "var(--color-text-tertiary)" }}>
              {unit}
            </span>
          ) : null}
        </div>
      </div>
      {footnote ? (
        <span style={{ fontSize: "var(--erp-text-dense)", color: "var(--color-text-tertiary)", fontWeight: 700, marginTop: 4 }}>
          {footnote}
        </span>
      ) : null}
    </div>
  );
}

function ProductTypeSignificanceKpi({
  typeSignificance,
}: {
  typeSignificance: {
    displayLabel: string;
    displaySharePct: number;
    leaderLabel: string;
    leaderSharePct: number;
    leaderCount: number;
    segments: Array<{ label: string; sharePct: number; color: string }>;
  };
}) {
  return (
    <div
      role="region"
      aria-label={`Top Product Type: ${typeSignificance.displayLabel} ${typeSignificance.displaySharePct.toFixed(2)}%`}
      style={{
        ...kpiTileStyle,
        minWidth: 0,
        height: '100%',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: "var(--erp-text-control)", fontWeight: 800, color: "var(--color-text-tertiary)" }}>
            Top Product Type
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
          <span
            style={{
              fontSize: "var(--erp-text-kpi)",
              fontWeight: 800,
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-display)",
              letterSpacing: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {typeSignificance.displayLabel}
          </span>
          <span style={{ fontSize: "var(--erp-text-control)", fontWeight: 800, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
            {typeSignificance.displaySharePct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Segmented Bar (แถบRatioสี 4 สี) */}
      <div
        style={{
          width: "100%",
          height: 6,
          borderRadius: 3,
          background: "var(--color-surface-2)",
          display: "flex",
          overflow: "hidden",
          gap: 1.5,
          marginTop: 6,
          marginBottom: 4,
        }}
        title={typeSignificance.segments.map(s => `${s.label}: ${s.sharePct.toFixed(2)}%`).join(' | ')}
      >
        {typeSignificance.segments.map((seg, idx) => (
          <div
            key={idx}
            style={{
              width: `${Math.max(seg.sharePct, 0.5)}%`,
              height: "100%",
              backgroundColor: seg.color,
              transition: "width 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Legend below the bar (จุดสีเล็กๆ บอกชื่อหมวด + %) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          rowGap: 2,
        }}
      >
        {typeSignificance.segments.map((seg, idx) => (
          <div
            key={idx}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.7rem",
              color: "var(--color-text-secondary)",
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: seg.color,
                flexShrink: 0,
              }}
            />
            <span style={{ whiteSpace: "nowrap" }}>
              {seg.label} <strong style={{ color: "var(--color-text-primary)", fontWeight: 800 }}>{seg.sharePct.toFixed(2)}%</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

