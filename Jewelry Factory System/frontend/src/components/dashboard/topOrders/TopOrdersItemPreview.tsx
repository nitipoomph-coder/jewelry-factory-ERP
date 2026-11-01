import { useEffect, type SyntheticEvent } from 'react';
import { X, Sparkles } from 'lucide-react';
import type { TopGalleryItem } from '../../../services/itemYearlySummaryAPI';

import { formatSignedPct } from './galleryComparison';

interface TopOrdersItemPreviewProps {
  item: TopGalleryItem | null;
  onClose: () => void;
  baseYear: string;
  compareYear: string;
  compareEnabled: boolean;
  fmtQty: (value: number) => string;
}

export function TopOrdersItemPreview({
  item,
  onClose,
  baseYear,
  compareYear,
  compareEnabled,
  fmtQty,
}: TopOrdersItemPreviewProps) {
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [item, onClose]);

  if (!item) return null;

  const hasCompare = compareEnabled && compareYear && compareYear !== baseYear;

  // Exact calculations for the active comparison
  const baseQty = item.baseYearQty || 0;
  const baseAmnt = item.baseYearAmnt || 0;
  const baseUnitPrice = baseQty > 0 ? baseAmnt / baseQty : 0;

  const compQty = item.compareYearQty || 0;
  const compAmnt = item.compareYearAmnt || 0;
  const compUnitPrice = compQty > 0 ? compAmnt / compQty : 0;

  // Selected totals (Base + Compare)
  const totalQty = hasCompare ? baseQty + compQty : baseQty;
  const totalAmnt = hasCompare ? baseAmnt + compAmnt : baseAmnt;
  const overallUnitPrice = totalQty > 0 ? totalAmnt / totalQty : 0;

  const avgQtyPerYr = hasCompare ? Math.round(totalQty / 2) : totalQty;
  const avgAmntPerYr = hasCompare ? totalAmnt / 2 : totalAmnt;

  const fmtCur = (val: number) => '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'color-mix(in srgb, var(--color-surface-900) 45%, transparent)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
      <div
        style={{
          width: 'min(540px, 95vw)',
          height: '100vh',
          backgroundColor: 'var(--color-surface-0)',
          borderLeft: '1px solid var(--color-border-light)',
          boxShadow: 'var(--shadow-modal)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header: Rank + Item SKU + Category + Close Button */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-surface-1)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: item.rank === 1 ? 'linear-gradient(135deg, var(--color-warning-500) 0%, var(--color-warning-600) 100%)' : 'var(--color-brand-600)',
                color: 'var(--color-text-inverse)',
                fontSize: '0.85rem',
                fontWeight: 950,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {item.rank === 1 && <Sparkles size={13} />}
              Rank #{item.rank}
            </span>

            <span style={{ fontSize: '1.25rem', fontWeight: 950, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
              {item.itemNo}
            </span>

            <span
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontWeight: 800,
                background: 'var(--color-surface-2)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              {item.productTypeLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: 6,
              cursor: 'pointer',
              color: 'var(--color-text-tertiary)',
              borderRadius: 6,
              display: 'flex',
            }}
            className="hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body: Vertical Scrolling Flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20, overflowY: 'auto', flex: 1 }}>
          {/* Section 1: Hero Studio Photo */}
          <div
            style={{
              height: 220,
              width: '100%',
              borderRadius: 10,
              border: '1px solid var(--color-border-light)',
              background: 'var(--color-product-canvas)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: 12,
              boxShadow: 'var(--shadow-panel)',
              flexShrink: 0,
            }}
          >
            <img
              src={`/api/photos/ps/${item.itemNo}`}
              alt={item.itemNo}
              style={{ objectFit: 'contain', width: '100%', height: '100%' }}
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

          {/* Customer Bar */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 800 }}>Cust:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '0.92rem' }}>
                {item.primaryCustCode || '-'}
              </span>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700, fontSize: '0.78rem' }}>
                ({item.primaryGroupLabel})
              </span>
            </div>
          </div>

          {/* Section 2: 2 Big Stat Cards: Total & Average */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flexShrink: 0 }}>
            {/* Total Card */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>
                Total {hasCompare ? `(${baseYear} + ${compareYear})` : `(${baseYear})`}
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 950, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                {fmtQty(totalQty)} pcs
              </span>
              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-brand-600)' }}>
                {fmtCur(totalAmnt)}
              </span>
            </div>

            {/* Average Card */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', fontWeight: 800 }}>
                Average {hasCompare ? `(Per Year)` : `(Unit Economics)`}
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 950, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                {fmtQty(avgQtyPerYr)} pcs / year
              </span>
              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                Unit Price: {fmtCur(overallUnitPrice)} / pc
              </span>
            </div>
          </div>

          {/* Section 3: Clean Period Breakdown Table */}
          <div
            style={{
              borderRadius: 10,
              border: '1px solid var(--color-border-light)',
              overflow: 'hidden',
              background: 'var(--color-surface-0)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--color-surface-1)',
                borderBottom: '1px solid var(--color-border-light)',
                fontSize: '0.8rem',
                fontWeight: 900,
                color: 'var(--color-text-primary)',
              }}
            >
              Period Breakdown
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border-light)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>Period</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>Volume</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>Value</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>Avg Price</th>
                  {hasCompare && <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-tertiary)' }}>YoY</th>}
                </tr>
              </thead>
              <tbody>
                {/* Base Year Row */}
                <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <td style={{ padding: '9px 12px', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                    {baseYear} (Base)
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                    {fmtQty(baseQty)} pcs
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--color-brand-600)' }}>
                    {fmtCur(baseAmnt)}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                    {fmtCur(baseUnitPrice)}/pc
                  </td>
                  {hasCompare && (
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 900 }}>
                      {item.yoyGrowthPct !== null ? (
                        <span style={{ color: item.yoyGrowthPct >= 0 ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
                          {formatSignedPct(item.yoyGrowthPct)}
                        </span>
                      ) : '-'}
                    </td>
                  )}
                </tr>

                {/* Compare Year Row */}
                {hasCompare && (
                  <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                      {compareYear} (Compare)
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                      {fmtQty(compQty)} pcs
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                      {fmtCur(compAmnt)}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                      {fmtCur(compUnitPrice)}/pc
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--color-text-tertiary)' }}>
                      -
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Total & Average Footers */}
              {hasCompare && (
                <tfoot>
                  <tr style={{ background: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border-default)' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 950, color: 'var(--color-text-primary)' }}>
                      Total (+)
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 950, color: 'var(--color-text-primary)' }}>
                      {fmtQty(totalQty)} pcs
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 950, color: 'var(--color-brand-600)' }}>
                      {fmtCur(totalAmnt)}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                      {fmtCur(overallUnitPrice)}/pc
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 900, color: item.qtyDiff >= 0 ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
                      {item.qtyDiff >= 0 ? `+${fmtQty(item.qtyDiff)}` : `${fmtQty(item.qtyDiff)}`}
                    </td>
                  </tr>
                  <tr style={{ background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border-light)' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                      Avg / Year (÷)
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                      {fmtQty(avgQtyPerYr)} pcs
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 900, color: 'var(--color-text-secondary)' }}>
                      {fmtCur(avgAmntPerYr)}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--color-text-tertiary)' }}>
                      -
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--color-text-tertiary)' }}>
                      -
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
