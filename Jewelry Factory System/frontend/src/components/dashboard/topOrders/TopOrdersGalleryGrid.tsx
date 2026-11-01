import type { SyntheticEvent } from 'react';
import type { TopGalleryItem } from '../../../services/itemYearlySummaryAPI';
import type { PerspectiveMode } from '../../../hooks/useTopOrdersGalleryData';
import { comparisonTextStyle, formatSignedPct } from './galleryComparison';

/**
 * Category-based image scale mapping.
 * Adjust scale factor here for each product type.
 * Default is 1.0 (100%)
 */
const CATEGORY_IMAGE_SCALES: Record<string, number> = {
  BNS: 1.0, // Necklace = 100%
  NECKLACE: 1.0,
  BBS: 1.0,  // Bracelet & Bangle = 100%
  BES: 1.0,  // Earring = 100%
  BRS: 1.0,  // Ring = 100%
  BPS: 1.0,  // Pendant = 100%
  BCS: 1.0,  // Charm = 100%
  BTS: 1.0,  // Brooch = 100%
  OTHER: 1.0,
};

const getCategoryImageScale = (productType?: string, productTypeLabel?: string): number => {
  const typeKey = String(productType || '').trim().toUpperCase();
  if (typeKey && CATEGORY_IMAGE_SCALES[typeKey] !== undefined) {
    return CATEGORY_IMAGE_SCALES[typeKey];
  }
  const labelKey = String(productTypeLabel || '').trim().toUpperCase();
  if (labelKey && CATEGORY_IMAGE_SCALES[labelKey] !== undefined) {
    return CATEGORY_IMAGE_SCALES[labelKey];
  }
  if (labelKey.includes('NECKLACE') || labelKey.includes('Necklace')) {
    return 1.0
      ;
  }
  return 1.0;
};

interface TopOrdersGalleryGridProps {
  items: TopGalleryItem[];
  metric: 'qty' | 'amount';
  compareEnabled: boolean;
  baseYear: string;
  compareYear: string;
  perspectiveMode?: PerspectiveMode;
  openPreview: (item: TopGalleryItem) => void;
  fmtQty: (value: number) => string;
}

export function TopOrdersGalleryGrid({
  items,
  metric,
  compareEnabled,
  baseYear,
  compareYear,
  perspectiveMode = 'combined',
  openPreview,
  fmtQty,
}: TopOrdersGalleryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: 320 }}>
        <p className="text-sm font-bold text-[var(--color-text-secondary)]">
          No items found matching the selected filters.
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          Try adjusting product types, customer groups, or period range.
        </p>
      </div>
    );
  }

  return (
    <div className="gallery-grid" style={{ padding: '16px 20px' }}>
      {items.map((item) => {
        const isTop3 = item.rank <= 3;
        const isCompare = perspectiveMode === 'compare';
        const imgScale = getCategoryImageScale(item.productType, item.productTypeLabel);

        const itemQty = isCompare ? item.baseYearQty : item.totalCombinedQty;
        const itemAmnt = isCompare ? item.baseYearAmnt : item.totalCombinedAmnt;
        const avgUnitPrice = itemQty > 0 ? itemAmnt / itemQty : 0;
        const fmtCurrency = (val: number) => '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        return (
          <div
            key={item.itemNo}
            className="gallery-card-clean group"
            onClick={() => openPreview(item)}
            style={{
              background: 'var(--color-surface-0)',
              borderRadius: 8,
              border: isTop3 ? '1px solid var(--color-border-strong)' : '1px solid var(--color-border-light)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
            }}
          >
            {/* Header Meta: Rank + Category + % Share or YoY Badge */}
            <div
              style={{
                padding: '10px 12px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontWeight: 950,
                    color: isTop3 ? 'var(--color-brand-600)' : 'var(--color-text-secondary)',
                    fontSize: '0.8rem',
                  }}
                >
                  #{item.rank}
                </span>
                <span style={{ color: 'var(--color-border-default)' }}>•</span>
                <span style={{ fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                  {item.productTypeLabel}
                </span>
              </div>

              {isCompare && compareEnabled && compareYear && item.yoyGrowthPct !== null && (
                <div style={comparisonTextStyle(item.yoyGrowthPct)}>
                  {formatSignedPct(item.yoyGrowthPct)}
                </div>
              )}
            </div>

            {/* Product Image Canvas (Clean, full width without dark padding gaps) */}
            <div
              style={{
                height: 190,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                background: 'var(--color-product-canvas)',
                overflow: 'hidden',
              }}
            >
              {/* Category-based Image Wrapper: isolates scale to the image only, keeping all text unscaled */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `scale(${imgScale})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease',
                }}
              >
                <img
                  src={`/api/photos/ps/${item.itemNo}`}
                  alt={item.itemNo}
                  style={{
                    objectFit: 'contain',
                    width: '100%',
                    height: '100%',
                    padding: '0 4px',
                    transition: 'transform 0.2s ease',
                  }}
                  className="group-hover:scale-105"
                  onError={(event: SyntheticEvent<HTMLImageElement>) => {
                    const image = event.currentTarget;
                    if (!image.dataset.triedCad) {
                      image.dataset.triedCad = 'true';
                      image.src = `/api/photos/cad/${item.itemNo}`;
                    } else {
                      image.style.display = 'none';
                    }
                  }}
                />
              </div>

              {/* Minimal Hover Overlay - Flush edge-to-edge with no leaks */}
              <div
                className="gallery-overlay group-hover:opacity-100"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  zIndex: 10,
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  background: 'color-mix(in srgb, var(--color-surface-900) 94%, transparent)',
                  backdropFilter: 'blur(6px)',
                  pointerEvents: 'none',
                }}
              >
                <span style={{ fontSize: '0.72rem', color: 'var(--color-overlay-text-muted)', fontWeight: 700 }}>
                  {isCompare ? `${baseYear} vs ${compareYear}` : `Combined (${baseYear}${compareEnabled && compareYear ? ` & ${compareYear}` : ''})`}
                </span>
                <span style={{ fontSize: '1.25rem', color: 'var(--color-overlay-text)', fontWeight: 950, fontFamily: 'var(--font-display)' }}>
                  {fmtQty(itemQty)} pcs
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-brand-400)', fontWeight: 800 }}>
                  {fmtCurrency(itemAmnt)}
                </span>
                {avgUnitPrice > 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-overlay-text-muted)', fontWeight: 700, background: 'color-mix(in srgb, var(--color-text-inverse) 12%, transparent)', padding: '2px 8px', borderRadius: 4, marginTop: 2 }}>
                    Avg ${avgUnitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / pc
                  </span>
                )}
              </div>
            </div>

            {/* Footer Summary: Item No + Primary Value + Secondary Volume + Avg Price/pc + YoY */}
            <div
              style={{
                padding: '8px 12px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {/* Row 1: Item No (Left) & Main Metric Value (Right) */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 950,
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-display)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={item.itemNo}
                >
                  {item.itemNo}
                </span>

                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    color: 'var(--color-brand-600)',
                    fontFamily: 'var(--font-display)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {metric === 'amount' ? fmtCurrency(itemAmnt) : `${fmtQty(itemQty)} pcs`}
                </span>
              </div>

              {/* Row 2: Customer Group (Left) & Secondary Metric Value (Right) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: '0.74rem' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.primaryGroupLabel}
                </span>
                <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  {metric === 'amount' ? `${fmtQty(itemQty)} pcs` : fmtCurrency(itemAmnt)}
                </span>
              </div>

              {/* Row 3: Unit Economics Avg Price/pc (Left) & Comparison / YoY (Right) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: '0.7rem', marginTop: 2 }}>
                <span
                  style={{
                    background: 'var(--color-surface-2)',
                    padding: '2px 7px',
                    borderRadius: 4,
                    fontWeight: 800,
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border-light)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                  title={`Average Price: Total Value ÷ Total Volume = $${avgUnitPrice.toFixed(2)} per piece`}
                >
                  <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 700 }}>Avg:</span>
                  <span>${avgUnitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/pc</span>
                </span>

                {compareEnabled && compareYear && (
                  isCompare ? (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                      vs {compareYear}: <strong style={{ color: 'var(--color-text-secondary)' }}>{fmtQty(item.compareYearQty)}</strong>
                    </span>
                  ) : (
                    item.yoyGrowthPct !== null && (
                      <span
                        style={comparisonTextStyle(item.yoyGrowthPct)}
                        title={`${baseYear} (${fmtQty(item.baseYearQty)} pcs) vs ${compareYear} (${fmtQty(item.compareYearQty)} pcs): ${item.qtyDiff >= 0 ? '+' : ''}${fmtQty(item.qtyDiff)} pcs (${formatSignedPct(item.yoyGrowthPct)})`}
                      >
                        {formatSignedPct(item.yoyGrowthPct)} ({item.qtyDiff >= 0 ? '+' : ''}{fmtQty(item.qtyDiff)} pcs)
                      </span>
                    )
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
