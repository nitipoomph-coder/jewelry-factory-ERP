import { useState, useMemo } from "react";
import { ImageOff, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { TopGalleryItem } from "../../../services/itemYearlySummaryAPI";

const fmtQty = (val: number) => val.toLocaleString(undefined, { maximumFractionDigits: 0 });

// Format price for concise dashboard display:
// >= 1M: 2 decimals, e.g. $3.48M
// >= 100K: K format with no decimals/satang, e.g. $348K
// < 100K: e.g. $45K or formatted integer without satang
export const fmtCompactPrice = (val: number): string => {
  if (!val || val <= 0) return '$0';
  if (val >= 1_000_000) {
    const mVal = val / 1_000_000;
    return `$${mVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  }
  if (val >= 100_000) {
    const kVal = Math.round(val / 1_000);
    return `$${kVal.toLocaleString()}K`;
  }
  if (val >= 1_000) {
    const kVal = Math.round(val / 1_000);
    return `$${kVal.toLocaleString()}K`;
  }
  return `$${Math.round(val).toLocaleString()}`;
};

// Full price for tooltip/hover: $3,481,250.00 USD
export const fmtFullPrice = (val: number): string => {
  return `$${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
};

// Beautiful Area Sparkline with smooth Bezier Spline, Soft Gradient Area Fill, and Interactive Hover
function DimeStockSparkline({
  id,
  dataPoints,
  isPositive,
  width = 188,
  height = 34,
}: {
  id?: string;
  dataPoints: { label: string; value: number; qty: number }[];
  isPositive: boolean;
  width?: number;
  height?: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const padX = 4;
  const padTop = 4;
  const padBottom = 4;
  const usableW = Math.max(10, width - padX * 2);
  const usableH = Math.max(10, height - padTop - padBottom);

  const strokeColor = isPositive ? '#10B981' : '#F43F5E';
  const gradId = `dime-grad-${(id || 'spark').replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const values = dataPoints.map(p => p.value);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = (max - min) || (max || 1);

  const pts = useMemo(() => {
    if (dataPoints.length === 0) return [];
    return dataPoints.map((p, i) => {
      const x = padX + (i / Math.max(1, dataPoints.length - 1)) * usableW;
      const normalized = (p.value - min) / range;
      const y = padTop + (1 - normalized) * usableH;
      return { x, y, ...p };
    });
  }, [dataPoints, min, range, usableW, usableH]);

  const { linePath, areaPath } = useMemo(() => {
    if (pts.length === 0) return { linePath: '', areaPath: '' };
    if (pts.length === 1) {
      const p = pts[0];
      return {
        linePath: `M ${padX},${p.y} L ${width - padX},${p.y}`,
        areaPath: `M ${padX},${p.y} L ${width - padX},${p.y} L ${width - padX},${height} L ${padX},${height} Z`,
      };
    }

    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 >= pts.length ? pts.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    const last = pts[pts.length - 1];
    const first = pts[0];
    const area = `${d} L ${last.x.toFixed(1)},${height} L ${first.x.toFixed(1)},${height} Z`;

    return { linePath: d, areaPath: area };
  }, [pts, padX, width, height]);

  if (pts.length === 0) {
    return <div className="h-[34px] flex items-center justify-center text-[10px] text-[var(--color-text-tertiary)]">—</div>;
  }

  const lastPt = pts[pts.length - 1];
  const activePt = hoverIndex !== null ? pts[hoverIndex] : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    let closestIdx = 0;
    let closestDist = Infinity;
    pts.forEach((pt, idx) => {
      const dist = Math.abs(pt.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });
    setHoverIndex(closestIdx);
  };

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[34px] overflow-visible cursor-crosshair"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.32" />
            <stop offset="70%" stopColor={strokeColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Soft Glowing Gradient Area Fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Crisp Wave Curve */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover Crosshair Guide */}
        {activePt && (
          <>
            <line
              x1={activePt.x}
              y1={0}
              x2={activePt.x}
              y2={height}
              stroke="var(--color-text-tertiary)"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.6"
            />
            <circle
              cx={activePt.x}
              cy={activePt.y}
              r="4"
              fill={strokeColor}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </>
        )}

        {/* Stock Ticker Pin (at current/latest point when not hovering) */}
        {!activePt && (
          <g>
            {/* Outer subtle glow ring - breathes smoothly in place */}
            <circle
              cx={lastPt.x}
              cy={lastPt.y}
              r="5.5"
              fill={strokeColor}
            >
              <animate
                attributeName="opacity"
                values="0.35;0.06;0.35"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Main solid dot - blinks/pulses right on the point */}
            <circle
              cx={lastPt.x}
              cy={lastPt.y}
              r="3.5"
              fill={strokeColor}
            >
              <animate
                attributeName="opacity"
                values="1;0.45;1"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Center crisp white pin point */}
            <circle
              cx={lastPt.x}
              cy={lastPt.y}
              r="1.5"
              fill="#ffffff"
            />
          </g>
        )}
      </svg>

      {/* Floating Hover Tooltip (like Dime app price scrubber) */}
      {activePt && (
        <div
          className="absolute z-30 pointer-events-none px-2 py-1 rounded bg-slate-900/95 text-white text-[10px] tabular-nums whitespace-nowrap shadow-xl flex items-center gap-1.5 -top-7 transition-all -translate-x-1/2 border border-slate-700/50"
          style={{
            left: `${Math.min(85, Math.max(15, (activePt.x / width) * 100))}%`,
          }}
        >
          <span className="font-semibold text-slate-300">{activePt.label}:</span>
          <span className="font-bold text-emerald-400">{fmtCompactPrice(activePt.value)}</span>
          <span className="text-slate-400 text-[9px]">({fmtQty(activePt.qty)} pcs)</span>
        </div>
      )}
    </div>
  );
}

export function TopAnalyticsTable({ 
  rows, 
  loading, 
  displayYears,
  onPhotoClick,
}: { 
  rows: TopGalleryItem[]; 
  loading: boolean;
  displayYears: string[];
  onPhotoClick?: (item: TopGalleryItem) => void;
  grandTotalQty?: number;
}) {
  // Sorting state: default by Price descending (มาก -> น้อย)
  const [sortKey, setSortKey] = useState<string>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc'); // Default to descending on first click
    }
  };

  // Only show Total and Avg when 2 or more years are displayed (avoids duplicate single year columns)
  const showAvg = displayYears.length > 1;
  const colSpanCount = 5 + displayYears.length + (showAvg ? 2 : 0);

  // Sorted rows based on selected column and direction
  const sortedRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const list = [...rows];
    list.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (sortKey === 'price') {
        valA = displayYears.reduce((sum, yr) => sum + (a.yearlyTotals?.[yr]?.amount || 0), 0);
        valB = displayYears.reduce((sum, yr) => sum + (b.yearlyTotals?.[yr]?.amount || 0), 0);
      } else if (sortKey === 'volume' || sortKey === 'total') {
        valA = displayYears.reduce((sum, yr) => sum + (a.yearlyTotals?.[yr]?.qty || 0), 0);
        valB = displayYears.reduce((sum, yr) => sum + (b.yearlyTotals?.[yr]?.qty || 0), 0);
      } else if (sortKey === 'avg') {
        const totA = displayYears.reduce((sum, yr) => sum + (a.yearlyTotals?.[yr]?.qty || 0), 0);
        const totB = displayYears.reduce((sum, yr) => sum + (b.yearlyTotals?.[yr]?.qty || 0), 0);
        valA = totA / (displayYears.length || 1);
        valB = totB / (displayYears.length || 1);
      } else if (displayYears.includes(sortKey)) {
        valA = a.yearlyTotals?.[sortKey]?.qty || 0;
        valB = b.yearlyTotals?.[sortKey]?.qty || 0;
      } else {
        valA = displayYears.reduce((sum, yr) => sum + (a.yearlyTotals?.[yr]?.amount || 0), 0);
        valB = displayYears.reduce((sum, yr) => sum + (b.yearlyTotals?.[yr]?.amount || 0), 0);
      }

      if (valA === valB) {
        return 0;
      }
      return sortOrder === 'asc' ? ((valA as number) - (valB as number)) : ((valB as number) - (valA as number));
    });
    return list;
  }, [rows, sortKey, sortOrder, displayYears]);

  const renderSortIcon = (key: string) => {
    const isActive = sortKey === key;
    if (isActive) {
      return sortOrder === 'desc' ? (
        <ArrowDown size={13} className="shrink-0" style={{ color: 'var(--color-ui-interactive)' }} />
      ) : (
        <ArrowUp size={13} className="shrink-0" style={{ color: 'var(--color-ui-interactive)' }} />
      );
    }
    return (
      <ArrowUpDown size={12} className="shrink-0 opacity-20 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--color-text-tertiary)' }} />
    );
  };

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full min-w-[960px] table-fixed text-left border-collapse text-sm">
        <thead>
          <tr 
            className="font-bold text-xs uppercase tracking-wider"
            style={{
              backgroundColor: 'var(--color-ui-raised)',
              color: 'var(--color-text-secondary)',
              borderBottom: '1px solid var(--color-border-light)',
            }}
          >
            <th 
              onClick={() => {
                setSortKey('price');
                setSortOrder('desc');
              }}
              className="py-3 px-3 text-center w-16 select-none cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
              title="Click to reset to default rank (Top Price descending)"
            >
              Rank
            </th>
            {/* Descriptive columns */}
            <th className="py-3 px-4 select-none">Item No</th>
            <th className="py-3 px-3 text-center w-32 select-none">Photo</th>
            <th className="py-3 px-4 select-none">Customer</th>
            {/* Price & Trend (USD): locked fixed width of 220px */}
            <th 
              onClick={() => handleSort('price')}
              className="py-3 px-4 w-[220px] min-w-[220px] max-w-[220px] cursor-pointer select-none transition-colors group hover:text-[var(--color-text-primary)]"
              style={{ color: sortKey === 'price' ? 'var(--color-ui-interactive)' : undefined }}
              title="Click to sort by Total Price (USD)"
            >
              <div className="inline-flex items-center gap-1.5">
                <span>Price & Trend (USD)</span>
                {renderSortIcon('price')}
              </div>
            </th>
            
            {/* Dynamic Year Columns in chronological order */}
            {displayYears.map(yr => (
              <th 
                key={yr} 
                onClick={() => handleSort(yr)}
                className="py-3 px-4 text-right w-28 tabular-nums cursor-pointer select-none transition-colors group hover:text-[var(--color-text-primary)]"
                style={{ color: sortKey === yr ? 'var(--color-ui-interactive)' : undefined }}
                title={`Click to sort by Year ${yr}`}
              >
                <div className="inline-flex items-center justify-end gap-1.5 w-full">
                  <span>{yr}</span>
                  {renderSortIcon(yr)}
                </div>
              </th>
            ))}

            {/* Summary Headers: Total & Avg (only displayed when >= 2 years) */}
            {showAvg && (
              <th 
                onClick={() => handleSort('total')}
                className="py-3 px-4 text-right w-28 tabular-nums font-bold cursor-pointer select-none transition-colors group hover:text-[var(--color-text-primary)]"
                style={{
                  backgroundColor: 'var(--color-ui-raised)',
                  color: sortKey === 'total' ? 'var(--color-ui-interactive)' : 'var(--color-text-primary)',
                }}
                title="Click to sort by Total"
              >
                <div className="inline-flex items-center justify-end gap-1.5 w-full">
                  <span>Total</span>
                  {renderSortIcon('total')}
                </div>
              </th>
            )}
            {showAvg && (
              <th 
                onClick={() => handleSort('avg')}
                className="py-3 px-4 text-right w-28 tabular-nums font-bold cursor-pointer select-none transition-colors group hover:text-[var(--color-text-primary)]"
                style={{
                  backgroundColor: 'var(--color-ui-raised)',
                  color: sortKey === 'avg' ? 'var(--color-ui-interactive)' : 'var(--color-text-primary)',
                }}
                title="Click to sort by Average / Year"
              >
                <div className="inline-flex items-center justify-end gap-1.5 w-full">
                  <span>Avg / Yr</span>
                  {renderSortIcon('avg')}
                </div>
              </th>
            )}
          </tr>
        </thead>
        <tbody 
          style={{ backgroundColor: 'var(--color-ui-surface)' }}
        >
          {loading ? (
            Array.from({ length: 12 }).map((_, index) => <SkeletonRow key={index} numCols={colSpanCount} />)
          ) : sortedRows.length === 0 ? (
            <tr>
              <td 
                colSpan={colSpanCount} 
                className="text-center py-16"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                No items match the current filters.
              </td>
            </tr>
          ) : (
            sortedRows.map((row, index) => (
              <AnalyticsTableRow 
                key={`${row.primaryCustCode}-${row.itemNo}`} 
                row={row}
                rank={index + 1}
                displayYears={displayYears}
                showAvg={showAvg}
                onPhotoClick={() => onPhotoClick?.(row)}
              />
            ))
          )}
        </tbody>
        {rows.length > 0 && !loading && (
          <tfoot>
            <tr 
              className="font-bold text-sm"
              style={{
                backgroundColor: 'var(--color-ui-raised)',
                borderTop: '2px solid var(--color-border-default)',
                color: 'var(--color-text-primary)',
              }}
            >
              <td className="py-3.5 px-3 text-center font-bold text-base" style={{ color: 'var(--color-ui-interactive)' }}>Σ</td>
              <td className="py-3.5 px-4 font-bold text-sm">Top {rows.length} Total</td>
              <td className="py-3.5 px-3"></td>
              <td className="py-3.5 px-4 font-semibold text-sm" style={{ color: 'var(--color-text-secondary)' }}>{rows.length} Items</td>
              <td 
                className="py-3.5 px-4 w-[220px] min-w-[220px] max-w-[220px] tabular-nums font-bold text-sm"
                title={fmtFullPrice(rows.reduce((s, r) => s + displayYears.reduce((ys, yr) => ys + (r.yearlyTotals?.[yr]?.amount || 0), 0), 0))}
              >
                <div className="flex flex-col">
                  <span className="text-base font-black font-display" style={{ color: 'var(--color-ui-interactive)' }}>
                    {fmtCompactPrice(rows.reduce((s, r) => s + displayYears.reduce((ys, yr) => ys + (r.yearlyTotals?.[yr]?.amount || 0), 0), 0))}
                  </span>
                  <span className="text-[10px] font-normal" style={{ color: 'var(--color-text-tertiary)' }}>
                    Total Price
                  </span>
                </div>
              </td>
              {displayYears.map(yr => {
                const yrTotal = rows.reduce((s, r) => s + (r.yearlyTotals?.[yr]?.qty || 0), 0);
                return (
                  <td key={yr} className="py-3.5 px-4 text-right tabular-nums font-bold text-sm">
                    {fmtQty(yrTotal)}
                  </td>
                );
              })}
              {showAvg && (
                <td 
                  className="py-3.5 px-4 text-right tabular-nums font-black text-sm"
                  style={{ color: 'var(--color-ui-interactive)' }}
                >
                  {fmtQty(rows.reduce((s, r) => s + displayYears.reduce((ys, yr) => ys + (r.yearlyTotals?.[yr]?.qty || 0), 0), 0))}
                </td>
              )}
              {showAvg && (
                <td className="py-3.5 px-4 text-right tabular-nums font-bold text-sm">
                  {fmtQty(Math.round(rows.reduce((s, r) => s + displayYears.reduce((ys, yr) => ys + (r.yearlyTotals?.[yr]?.qty || 0), 0), 0) / (displayYears.length || 1)))}
                </td>
              )}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function AnalyticsTableRow({ 
  row, 
  rank, 
  displayYears,
  showAvg,
  onPhotoClick
}: { 
  row: TopGalleryItem; 
  rank: number;
  displayYears: string[];
  showAvg: boolean;
  onPhotoClick?: () => void;
}) {
  // Compute exact displayed price and volume for the active years
  const rowDisplayedTotal = displayYears.reduce((sum, yr) => sum + (row.yearlyTotals?.[yr]?.qty || 0), 0);
  const rowDisplayedAmount = displayYears.reduce((sum, yr) => sum + (row.yearlyTotals?.[yr]?.amount || 0), 0);
  const rowDisplayedAvg = displayYears.length > 0 ? Math.round(rowDisplayedTotal / displayYears.length) : 0;

  // Extract unit prices across displayed years and customer breakdowns
  const unitPrices: number[] = [];
  displayYears.forEach(yr => {
    const yTotal = row.yearlyTotals?.[yr];
    if (yTotal && yTotal.qty > 0 && yTotal.amount > 0) {
      unitPrices.push(yTotal.amount / yTotal.qty);
    }
  });

  if (row.customerBreakdown && row.customerBreakdown.length > 0) {
    row.customerBreakdown.forEach(c => {
      if (c.qty > 0 && c.amount > 0) {
        unitPrices.push(c.amount / c.qty);
      }
    });
  }

  // Derive min, max, and latest unit price
  let minPrice = unitPrices.length > 0 ? Math.min(...unitPrices) : 0;
  let maxPrice = unitPrices.length > 0 ? Math.max(...unitPrices) : 0;

  // Latest price: find from the most recent year in displayYears
  let latestPrice = 0;
  for (let i = displayYears.length - 1; i >= 0; i--) {
    const yr = displayYears[i];
    const yTotal = row.yearlyTotals?.[yr];
    if (yTotal && yTotal.qty > 0 && yTotal.amount > 0) {
      latestPrice = yTotal.amount / yTotal.qty;
      break;
    }
  }
  if (!latestPrice && unitPrices.length > 0) {
    latestPrice = unitPrices[0];
  }
  if (!latestPrice && row.totalCombinedQty > 0 && row.totalCombinedAmnt > 0) {
    latestPrice = row.totalCombinedAmnt / row.totalCombinedQty;
    if (minPrice === 0) minPrice = latestPrice;
    if (maxPrice === 0) maxPrice = latestPrice;
  }

  // Construct Dime-style chart timeline data points (month by month across displayYears)
  const chartPoints = useMemo(() => {
    const pts: { label: string; value: number; qty: number }[] = [];
    const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sortedYrs = [...displayYears].sort((a, b) => Number(a) - Number(b));

    sortedYrs.forEach(yr => {
      const yrTotal = row.yearlyTotals?.[yr];
      const unitPrice = (yrTotal && yrTotal.qty > 0) ? (yrTotal.amount / yrTotal.qty) : (latestPrice || 1);
      
      for (let m = 1; m <= 12; m++) {
        const mKey = String(m);
        const q = row.monthlyBreakdown?.[yr]?.[mKey] || 0;
        const val = q * unitPrice;
        pts.push({
          label: `${MONTH_SHORT[m - 1]} '${yr.slice(-2)}`,
          value: val,
          qty: q,
        });
      }
    });

    // Trim trailing unbooked future zero months so the line and ticker dot end on the actual latest month with data
    let lastActiveIdx = -1;
    for (let i = pts.length - 1; i >= 0; i--) {
      if (pts[i].qty > 0) {
        lastActiveIdx = i;
        break;
      }
    }

    return lastActiveIdx >= 0 ? pts.slice(0, lastActiveIdx + 1) : pts;
  }, [displayYears, row, latestPrice]);

  // Compute trend % change (Dime style)
  let pctChange: number | null = null;
  let isPositive = true;

  if (displayYears.length >= 2) {
    const firstYr = displayYears[0];
    const lastYr = displayYears[displayYears.length - 1];
    const firstAmt = row.yearlyTotals?.[firstYr]?.amount || 0;
    const lastAmt = row.yearlyTotals?.[lastYr]?.amount || 0;
    if (firstAmt > 0) {
      pctChange = ((lastAmt - firstAmt) / firstAmt) * 100;
    } else if (lastAmt > 0) {
      pctChange = 100;
    } else {
      pctChange = 0;
    }
    isPositive = pctChange >= 0;
  } else if (row.yoyGrowthPct !== null && row.yoyGrowthPct !== undefined) {
    pctChange = row.yoyGrowthPct;
    isPositive = pctChange >= 0;
  } else {
    // Single year: compare last non-zero month vs first non-zero month
    const nonZeroPts = chartPoints.filter(p => p.qty > 0);
    if (nonZeroPts.length >= 2) {
      const firstVal = nonZeroPts[0].value;
      const lastVal = nonZeroPts[nonZeroPts.length - 1].value;
      if (firstVal > 0) {
        pctChange = ((lastVal - firstVal) / firstVal) * 100;
      }
      isPositive = (pctChange ?? 0) >= 0;
    }
  }

  // Exact Min, High, and Latest monthly total price directly from the graph
  const nonZeroGraphPts = chartPoints.filter(p => p.value > 0);
  const graphLow = nonZeroGraphPts.length > 0 ? Math.min(...nonZeroGraphPts.map(p => p.value)) : 0;
  const graphHigh = Math.max(...chartPoints.map(p => p.value), 0);
  const graphLatest = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].value : 0;

  // Compute trend indicator comparing latest year to previous year
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (displayYears.length >= 2) {
    const latestYr = displayYears[displayYears.length - 1];
    const prevYr = displayYears[displayYears.length - 2];
    const latestQty = row.yearlyTotals?.[latestYr]?.qty || 0;
    const prevQty = row.yearlyTotals?.[prevYr]?.qty || 0;
    if (latestQty > prevQty) trend = 'up';
    else if (latestQty < prevQty) trend = 'down';
    else trend = 'flat';
  }

  return (
    <tr 
      className="transition-colors hover:bg-[var(--color-ui-raised)]"
      style={{ borderBottom: '1px solid var(--color-border-light)' }}
    >
      {/* Rank Column */}
      <td className="py-3 px-3 text-center whitespace-nowrap">
        <span 
          className="font-bold text-sm tabular-nums" 
          style={{ 
            color: rank === 1 
              ? 'var(--color-rank-1)' 
              : rank === 2 
                ? 'var(--color-rank-2)' 
                : rank === 3 
                  ? 'var(--color-rank-3)' 
                  : 'var(--color-text-tertiary)' 
          }}
        >
          {rank}
        </span>
      </td>

      {/* Item No */}
      <td className="py-3 px-4">
        <div 
          onClick={onPhotoClick}
          className="text-base font-bold tracking-tight transition-colors cursor-pointer hover:underline"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {row.itemNo}
        </div>
      </td>

      {/* Photo Thumbnail */}
      <td className="py-2 px-3 text-center">
        <div 
          className="w-24 h-20 rounded-md p-1.5 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform cursor-pointer mx-auto"
          style={{
            backgroundColor: 'var(--color-product-canvas)',
            border: '1px solid var(--color-border-light)',
          }}
          onClick={onPhotoClick}
          title={`Click to preview ${row.itemNo}`}
        >
          <PhotoThumb itemNo={row.itemNo} />
        </div>
      </td>

      {/* Customer */}
      <td className="py-3 px-4">
        <div className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {row.primaryCustCode || '-'}
        </div>
        {row.primaryGroupLabel && (
          <div className="text-xs truncate max-w-[120px]" style={{ color: 'var(--color-text-tertiary)' }} title={row.primaryGroupLabel}>
            {row.primaryGroupLabel}
          </div>
        )}
      </td>

      {/* Price & Stock Graph (USD) Column: 220px Clean Minimalist Line Style (No BG Frame) */}
      <td className="py-2.5 px-4 w-[220px] min-w-[220px] max-w-[220px]">
        <div className="flex flex-col gap-1 w-full">
          {/* Top: Compact Price & Clean % Change Text (No BG/Border Box) */}
          <div className="flex items-baseline justify-between gap-1">
            <span 
              className="font-black text-base tabular-nums tracking-tight font-display cursor-help"
              style={{ color: 'var(--color-text-primary)' }}
              title={fmtFullPrice(rowDisplayedAmount)}
            >
              {fmtCompactPrice(rowDisplayedAmount)}
            </span>

            {/* Clean % Change (No BG/Border) */}
            {pctChange !== null && (
              <span 
                className="font-bold text-[11px] tabular-nums shrink-0"
                style={{
                  color: isPositive ? '#059669' : '#dc2626',
                }}
                title={`Period Trend Change: ${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%`}
              >
                {isPositive ? '▲' : '▼'} {Math.abs(pctChange).toFixed(1)}%
              </span>
            )}
          </div>

          {/* Middle: Clean Wave Line Sparkline with Soft Gradient Area Fill */}
          <DimeStockSparkline 
            id={`${row.itemNo}-${rank}`}
            dataPoints={chartPoints}
            isPositive={isPositive}
            width={188}
            height={34}
          />

          {/* Bottom: Exact Min, Latest, and Peak totals directly from the graph */}
          <div className="flex items-center justify-between text-[10px] tabular-nums font-medium pt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            <span title={`Lowest Month: ${fmtFullPrice(graphLow)}`}>
              Low: <strong className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{fmtCompactPrice(graphLow)}</strong>
            </span>
            <span 
              className="font-bold text-[9px]"
              style={{ color: 'var(--color-ui-interactive)' }}
              title={`Latest Month: ${fmtFullPrice(graphLatest)}`}
            >
              ● {fmtCompactPrice(graphLatest)}
            </span>
            <span title={`Peak Month: ${fmtFullPrice(graphHigh)}`}>
              High: <strong className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{fmtCompactPrice(graphHigh)}</strong>
            </span>
          </div>
        </div>
      </td>

      {/* Dynamic Year Values */}
      {displayYears.map(yr => {
        const qtyForYear = row.yearlyTotals?.[yr]?.qty || 0;
        return (
          <td 
            key={yr} 
            className="py-3 px-4 text-right text-sm tabular-nums"
            style={{ 
              color: qtyForYear > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              fontWeight: qtyForYear > 0 ? 600 : 400
            }}
          >
            {qtyForYear > 0 ? fmtQty(qtyForYear) : '—'}
          </td>
        );
      })}

      {/* Harmonious Total and Average Columns (only when >= 2 years) */}
      {showAvg && (
        <td 
          className="py-3 px-4 text-right font-bold text-sm tabular-nums"
          style={{ 
            color: 'var(--color-text-primary)',
            backgroundColor: 'var(--color-ui-raised)',
          }}
        >
          {fmtQty(rowDisplayedTotal)}
        </td>
      )}
      {showAvg && (
        <td 
          className="py-3 px-4 text-right font-semibold text-sm tabular-nums"
          style={{ 
            color: 'var(--color-text-primary)',
            backgroundColor: 'var(--color-ui-raised)',
          }}
        >
          <div className="inline-flex items-center gap-1.5 justify-end w-full">
            <span>{fmtQty(rowDisplayedAvg)}</span>
            {trend === 'up' && (
              <span className="inline-flex items-center font-bold" style={{ color: 'var(--color-success-500)' }} title="Trending Up">
                <TrendingUp size={13} />
              </span>
            )}
            {trend === 'down' && (
              <span className="inline-flex items-center font-bold" style={{ color: 'var(--color-danger-500)' }} title="Trending Down">
                <TrendingDown size={13} />
              </span>
            )}
            {trend === 'flat' && (
              <span className="inline-flex items-center" style={{ color: 'var(--color-text-tertiary)' }} title="Stable">
                <Minus size={12} />
              </span>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

function PhotoThumb({ itemNo }: { itemNo: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <ImageOff size={16} style={{ color: 'var(--color-text-tertiary)', opacity: 0.6 }} />
  ) : (
    <img
      src={`/api/photos/ps/${itemNo}`}
      alt={itemNo}
      loading="lazy"
      className="w-full h-full object-contain"
      onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
        const image = event.currentTarget;
        if (!image.dataset.triedCad) {
          image.dataset.triedCad = "true";
          image.src = `/api/photos/cad/${itemNo}`;
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

function SkeletonRow({ numCols }: { numCols: number }) {
  return (
    <tr className="animate-pulse" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
      {Array.from({ length: numCols }).map((_, index) => (
        <td key={index} className="py-2.5 px-4 text-center">
          <div 
            className="rounded"
            style={{ 
              width: index === 0 ? '24px' : index === 2 ? '80px' : '75%',
              height: index === 2 ? '64px' : '16px',
              margin: index === 0 || index === 2 ? '0 auto' : undefined,
              backgroundColor: 'var(--color-ui-raised)' 
            }} 
          />
        </td>
      ))}
    </tr>
  );
}
