// src/components/dashboard/CardDetailPanel.tsx
import { useState, useEffect, type ReactNode } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Calendar, Users, Loader2, AlertTriangle, Package, CheckCircle2, Settings, CalendarDays } from 'lucide-react';
import { fetchCardDetail, fetchAvailableYears, type CardDetailData, type CardType, type MonthlyData, type BreakdownItem } from '../../../services/dashboardAPI';
import { getErrorMessage } from '../../../utils/errors';
import './DashboardOverview.css';

// ─── Icon wrapper ────────────────────────────────────────────────────────────
function CardIcon({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div className="card-icon" style={{ background:`color-mix(in srgb, ${color}, transparent 88%)`, color }}>
      {children}
    </div>
  );
}

const CARD_META: Record<CardType, { title: string; accent: string; icon: ReactNode }> = {
  today:     { title: 'Orders Today',     accent: 'var(--color-brand-500)',   icon: <CardIcon color="var(--color-brand-500)"><Package size={22}/></CardIcon> },
  completed: { title: 'Completed',        accent: 'var(--color-success-500)', icon: <CardIcon color="var(--color-success-500)"><CheckCircle2 size={22}/></CardIcon> },
  wip:       { title: 'Work In Progress', accent: 'var(--color-brand-600)',   icon: <CardIcon color="var(--color-brand-600)"><Settings size={22}/></CardIcon> },
  overdue:   { title: 'Overdue',          accent: 'var(--color-danger-500)',  icon: <CardIcon color="var(--color-danger-500)"><AlertTriangle size={22}/></CardIcon> },
  month:     { title: 'This Month',       accent: 'var(--color-brand-600)',   icon: <CardIcon color="var(--color-brand-600)"><CalendarDays size={22}/></CardIcon> },
};

// ─── Change Badge ────────────────────────────────────────────────────────────
function ChangeBadge({ pct, inverse }: { pct: number; inverse?: boolean }) {
  const isPos = pct > 0;
  const isNeg = pct < 0;
  const isGood = inverse ? isNeg : isPos;
  const isBad  = inverse ? isPos : isNeg;
  const color = isGood ? 'var(--color-success-500)' : isBad ? 'var(--color-danger-500)' : 'var(--color-text-secondary)';
  const bg    = isGood ? 'color-mix(in srgb, var(--color-success-500) 15%, transparent)' : isBad ? 'color-mix(in srgb, var(--color-danger-500) 15%, transparent)' : 'var(--color-surface-2)';
  const Icon  = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;
  return (
    <span className="change-badge" style={{ background:bg, color, border:`1px solid ${isGood ? 'color-mix(in srgb, var(--color-success-500) 25%, transparent)' : isBad ? 'color-mix(in srgb, var(--color-danger-500) 25%, transparent)' : 'transparent'}` }}>
      <Icon size={13}/> {pct > 0 ? '+' : ''}{pct}%
    </span>
  );
}

// ─── Custom Premium Glowing SVG Line Chart ──────────────────────────────────────
function SVGLineChart({
  monthly,
  accentColor,
  year1,
  year2,
  cardType,
  showLabels
}: {
  monthly: MonthlyData[];
  accentColor: string;
  year1: number;
  year2: number;
  cardType: string;
  showLabels: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const N = monthly.length;
  if (N <= 1) return null;

  // 1. Calculate global max value across both series for adaptive vertical scaling
  const allValues = monthly.flatMap(m => [
    m.year2 || 0,
    m.isFuture ? 0 : (m.year1 || 0)
  ]);
  const rawMax = Math.max(...allValues, 10);

  // 2. Compute Nice Ticks & Nice Maximum dynamically following international standards
  const targets = [
    1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 
    1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 
    100000, 200000, 250000, 500000, 1000000
  ];
  const roughStep = rawMax / 4;
  const niceStep = targets.find(t => t >= roughStep) || 1000000;
  const maxVal = Math.ceil(rawMax / niceStep) * niceStep;

  // Generate grid ticks as exact nice values
  const gridTicks: number[] = [];
  const numSteps = Math.round(maxVal / niceStep);
  for (let i = 0; i <= numSteps; i++) {
    gridTicks.push(i * niceStep);
  }

  // Smooth themed reference color that adapts perfectly to any card type
  const refColor = `color-mix(in srgb, ${accentColor} 42%, transparent)`;

  // SVG Coordinates space
  const svgWidth = 1000;
  const svgHeight = 250;
  const paddingTop = 45;
  const paddingBottom = 40;
  const paddingLeft = 60;
  const paddingRight = 60;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const points1: { x: number; y: number; val: number; label: string }[] = [];
  const points2: { x: number; y: number; val: number; label: string }[] = [];

  const marginX = 40; // ระยะห่างด้านซ้าย-ขวา เพื่อไม่ให้ตัวเลขกราฟจุดแรกandจุดสุดท้ายชนกับแกน Y andขอบขวา
  monthly.forEach((m, i) => {
    const x = paddingLeft + marginX + (i / (N - 1)) * (chartWidth - 2 * marginX);
    
    // Series 1: selected year or daily actual
    if (!m.isFuture && m.year1 !== null && m.year1 !== undefined) {
      const y = paddingTop + chartHeight - (m.year1 / maxVal) * chartHeight;
      points1.push({ x, y, val: m.year1, label: m.label });
    }

    // Series 2: previous year or moving avg baseline
    if (m.year2 !== null && m.year2 !== undefined) {
      const y = paddingTop + chartHeight - (m.year2 / maxVal) * chartHeight;
      points2.push({ x, y, val: m.year2, label: m.label });
    }
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert to SVG coordinate space
    const svgX = (clientX / rect.width) * svgWidth;
    
    // Find the closest point based on X coordinate
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < N; i++) {
      const xVal = paddingLeft + marginX + (i / (N - 1)) * (chartWidth - 2 * marginX);
      const diff = Math.abs(svgX - xVal);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    setHoveredIdx(closestIdx);
    setMousePos({ x: clientX, y: clientY });
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  // Find corresponding hovered coordinate points
  const hoveredX = hoveredIdx !== null ? paddingLeft + marginX + (hoveredIdx / (N - 1)) * (chartWidth - 2 * marginX) : 0;
  const hoveredPoint1 = hoveredIdx !== null ? points1.find(p => Math.abs(p.x - hoveredX) < 1) : null;
  const hoveredPoint2 = hoveredIdx !== null ? points2.find(p => Math.abs(p.x - hoveredX) < 1) : null;

  // Construct lines paths
  let pathD1 = '';
  if (points1.length > 0) {
    pathD1 = points1.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  let areaD1 = '';
  if (points1.length > 1) {
    const first = points1[0];
    const last = points1[points1.length - 1];
    areaD1 = `${pathD1} L ${last.x} ${paddingTop + chartHeight} L ${first.x} ${paddingTop + chartHeight} Z`;
  }

  let pathD2 = '';
  if (points2.length > 0) {
    pathD2 = points2.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: 250 }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        height="100%"
        style={{ overflow: 'visible', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Glowing Drop Shadow filter */}
          <filter id="stock-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={accentColor} floodOpacity="0.4" />
          </filter>
          {/* Smooth Vertical Gradient under the Line */}
          <linearGradient id="stock-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* ─── Grid Lines (Nice Scale Aligned) ─── */}
        {gridTicks.map((tickVal, idx) => {
          const y = paddingTop + chartHeight - (tickVal / maxVal) * chartHeight;
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="var(--color-border-light)"
                strokeDasharray="4 6"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 14}
                y={y + 4}
                fill="var(--color-text-tertiary)"
                fontSize="11"
                fontWeight="700"
                textAnchor="end"
                fontFamily="var(--font-sans)"
              >
                {tickVal.toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* ─── Series 2: Reference/Previous Line (Dashed) ─── */}
        {pathD2 && (
          <path
            d={pathD2}
            fill="none"
            stroke={refColor}
            strokeWidth="2.2"
            strokeDasharray="4 5"
          />
        )}

        {/* ─── Series 1: Area Gradient Fill ─── */}
        {areaD1 && (
          <path
            d={areaD1}
            fill="url(#stock-gradient)"
          />
        )}

        {/* ─── Series 1: Primary Line (Glowing) ─── */}
        {pathD1 && (
          <path
            d={pathD1}
            fill="none"
            stroke={accentColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#stock-glow)"
          />
        )}

        {/* ─── Hover Guideline (Vertical) ─── */}
        {hoveredIdx !== null && (
          <line
            x1={hoveredX}
            y1={paddingTop}
            x2={hoveredX}
            y2={paddingTop + chartHeight}
            stroke="var(--color-text-tertiary)"
            strokeWidth="1.5"
            opacity="0.45"
            strokeDasharray="3 3"
          />
        )}

        {/* ─── Series 2 Reference Nodes & Values (Anti-Collision Auto Positioning) ─── */}
        {points2.map((p2, idx) => {
          const p1 = points1.find(p => p.label === p2.label);
          let drawBelow = true;

          if (p1) {
            const diffY = Math.abs(p1.y - p2.y);
            // If nodes are close vertically, and primary (p1) is lower than ref (p2), draw ref ABOVE
            if (diffY < 38 && p1.y > p2.y) {
              drawBelow = false;
            }
          }

          const isHovered = hoveredIdx !== null && Math.abs(p2.x - hoveredX) < 1;

          return (
            <g key={`y2-${idx}`}>
              <circle
                cx={p2.x}
                cy={p2.y}
                r={isHovered ? "6" : "4"}
                fill="var(--color-surface-0)"
                stroke={refColor}
                strokeWidth={isHovered ? "3.5" : "2"}
              />
              {showLabels && (
                <text
                  x={p2.x}
                  y={drawBelow ? p2.y + 16 : p2.y - 12}
                  fill="var(--color-text-tertiary)"
                  fontSize="10.5"
                  fontWeight="700"
                  textAnchor="middle"
                  fontFamily="var(--font-sans)"
                >
                  {p2.val.toLocaleString()}
                </text>
              )}
            </g>
          );
        })}

        {/* ─── Series 1 Primary Nodes & Glowing Value Pills (Anti-Collision Auto Positioning) ─── */}
        {points1.map((p1, idx) => {
          const p2 = points2.find(p => p.label === p1.label);
          let drawAbove = true;

          if (p2) {
            const diffY = Math.abs(p1.y - p2.y);
            // If nodes are close vertically, and primary (p1) is lower than ref (p2), draw primary BELOW
            if (diffY < 38 && p1.y > p2.y) {
              drawAbove = false;
            }
          }

          const pillY = drawAbove ? p1.y - 28 : p1.y + 10;
          const textY = drawAbove ? p1.y - 15 : p1.y + 23;
          const isHovered = hoveredIdx !== null && Math.abs(p1.x - hoveredX) < 1;

          return (
            <g key={`y1-${idx}`}>
              <circle
                cx={p1.x}
                cy={p1.y}
                r={isHovered ? "8" : "6"}
                fill="var(--color-surface-0)"
                stroke={accentColor}
                strokeWidth={isHovered ? "4" : "2.5"}
              />
              {showLabels && (
                <g>
                  {/* Elegant glassmorphic pill background for value */}
                  <rect
                    x={p1.x - 27}
                    y={pillY}
                    width="54"
                    height="18"
                    rx="5"
                    fill="var(--color-surface-1)"
                    stroke="var(--color-border-light)"
                    strokeWidth="1"
                    opacity="0.95"
                  />
                  <text
                    x={p1.x}
                    y={textY}
                    fill={accentColor}
                    fontSize="11"
                    fontWeight="900"
                    textAnchor="middle"
                    fontFamily="var(--font-sans)"
                  >
                    {p1.val.toLocaleString()}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* ─── X-Axis Labels (Contrast Optimized for both Light/Dark Themes) ─── */}
        {monthly.map((m, idx) => {
          const x = paddingLeft + marginX + (idx / (N - 1)) * (chartWidth - 2 * marginX);
          const isHovered = hoveredIdx === idx;
          return (
            <text
              key={`x-${idx}`}
              x={x}
              y={svgHeight - 10}
              fill={isHovered ? accentColor : (m.isFuture ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)')}
              opacity={m.isFuture && !isHovered ? 0.5 : 1}
              fontSize="11.5"
              fontWeight={isHovered ? "900" : "800"}
              textAnchor="middle"
              fontFamily="var(--font-display)"
              letterSpacing="0.02em"
            >
              {m.label}
            </text>
          );
        })}
      </svg>

      {/* ─── Premium Glassmorphic Floating Tooltip ─── */}
      {hoveredIdx !== null && monthly[hoveredIdx] && (
        <div style={{
          position: 'absolute',
          left: mousePos.x + 16,
          top: mousePos.y - 48,
          pointerEvents: 'none',
          zIndex: 100,
          background: 'var(--color-tooltip-surface)',
          border: '1px solid var(--color-overlay-border)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: 'var(--shadow-dropdown)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          color: 'var(--color-overlay-text)',
          fontSize: '0.75rem',
          minWidth: '170px',
          transform: mousePos.x > 750 ? 'translateX(-112%)' : 'none',
          transition: 'transform 0.05s ease-out',
        }}>
          {/* Header (Month Name) */}
          <div style={{ fontWeight: 900, color: 'var(--color-overlay-text)', fontSize: '0.8rem', borderBottom: '1px solid var(--color-overlay-border)', paddingBottom: '6px', marginBottom: '2px', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
            {monthly[hoveredIdx].labelTh || monthly[hoveredIdx].label || 'Month'}
          </div>

          {/* Series 1 Value (Solid Line / Current Year or Actual) */}
          {hoveredPoint1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--color-overlay-text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor, display: 'inline-block' }} />
                {cardType === 'today' ? 'Daily Actual' : `Year ${year1}`}
              </span>
              <span style={{ fontWeight: 900, color: accentColor, fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}>
                {hoveredPoint1.val.toLocaleString()}
              </span>
            </div>
          )}

          {/* Series 2 Value (Dashed Line / Comparison Year or Baseline) */}
          {hoveredPoint2 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--color-overlay-text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', border: `1.5px dashed color-mix(in srgb, ${accentColor} 60%, var(--color-overlay-text))`, display: 'inline-block', background: 'var(--color-overlay-control)' }} />
                {cardType === 'today' ? '7d Average' : `Year ${year2}`}
              </span>
              <span style={{ fontWeight: 900, color: 'var(--color-overlay-text)', fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}>
                {hoveredPoint2.val.toLocaleString()}
              </span>
            </div>
          )}

          {/* Comparison / Difference if both points are valid */}
          {hoveredPoint1 && hoveredPoint2 && (
            <div style={{ borderTop: '1px solid var(--color-overlay-border)', paddingTop: '6px', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, color: 'var(--color-overlay-text-muted)', fontSize: '0.68rem' }}>Diff (Diff)</span>
              {(() => {
                const diffVal = hoveredPoint1.val - hoveredPoint2.val;
                const pct = hoveredPoint2.val > 0 ? +((diffVal / hoveredPoint2.val) * 100).toFixed(1) : 0;
                const isPos = pct > 0;
                const isNeg = pct < 0;
                const isGood = cardType === 'overdue' ? isNeg : isPos;
                const badgeColor = isGood ? 'var(--color-success-500)' : isNeg ? 'var(--color-danger-500)' : 'var(--color-overlay-text-muted)';
                return (
                  <span style={{ fontWeight: 900, color: badgeColor, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    {pct > 0 ? '+' : ''}{pct}%
                  </span>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────
export default function CardDetailPanel({ cardType, selectedYear, onClose }: { cardType: CardType; selectedYear: string; onClose: () => void }) {
  const meta = CARD_META[cardType];
  const curYear = new Date().getFullYear();

  // 1. External selected year (derived from prop selectedYear)
  const extYear = (selectedYear && selectedYear !== 'all') ? parseInt(selectedYear) : curYear;

  // 2. Local state for the internal comparison year (initialized to extYear - 1)
  const [compareSelection, setCompareSelection] = useState({ baseYear: extYear, year: extYear - 1 });
  const [years, setYears] = useState<number[]>([]);
  const [detailState, setDetailState] = useState<{
    key: string;
    data: CardDetailData | null;
    error: string | null;
  }>({ key: '', data: null, error: null });
  const [showLabels, setShowLabels] = useState(false);

  const compareYear = compareSelection.baseYear === extYear ? compareSelection.year : extYear - 1;
  const year1 = extYear;
  const year2 = compareYear;
  const detailKey = `${cardType}:${extYear}:${compareYear}`;
  const hasCurrentDetail = detailState.key === detailKey;
  const data = hasCurrentDetail ? detailState.data : null;
  const error = hasCurrentDetail ? detailState.error : null;
  const loading = !hasCurrentDetail;

  useEffect(() => {
    fetchAvailableYears().then(y => { setYears(y); }).catch(() => {});
  }, []);

  // Load detail when cardType, extYear, or compareYear change
  useEffect(() => {
    let cancelled = false;
    fetchCardDetail(cardType, extYear, compareYear)
      .then(d => {
        if (!cancelled) setDetailState({ key: detailKey, data: d, error: null });
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setDetailState({ key: detailKey, data: null, error: getErrorMessage(requestError, 'Failed to load comparison data') });
        }
      });
    return () => { cancelled = true; };
  }, [cardType, extYear, compareYear, detailKey]);

  const isInverse = cardType === 'overdue';

  return (
    <div style={{
      background: 'var(--color-surface-0)', borderRadius: 8,
      border: '1px solid var(--color-border-light)',
      boxShadow: 'var(--shadow-panel)',
      overflow: 'hidden',
      animation: 'panelSlideDown 0.45s cubic-bezier(0.16,1,0.3,1) forwards',
    }}>

      {/* ═══ Header ═══ */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'20px 28px', borderBottom:'1px solid var(--color-border-light)',
        background: 'var(--color-surface-0)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {meta.icon}
          <div>
            <h3 style={{ fontSize:'1.1rem', fontWeight:900, color:'var(--color-text-primary)', fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:0 }}>
              {cardType === 'today' 
                ? `${meta.title} — Moving Average` 
                : cardType === 'wip'
                ? `WIP by Customer (Pending by Customer)`
                : `${meta.title} — Year Comparison`
              }
            </h3>
            <p style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--color-text-tertiary)', margin:'2px 0 0', textTransform: 'capitalize', letterSpacing:'0.06em' }}>
              {cardType === 'today' 
                ? '7 working days moving average comparison (excluding Sundays/Holidays)' 
                : cardType === 'wip'
                ? 'Active Work In Progress orders & pieces currently in production stages'
                : 'Monthly breakdown with year-over-year comparison'
              }
            </p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {/* Year / Period Selector */}
          {cardType === 'today' ? (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:14, background:'var(--color-surface-1)', border:'1px solid var(--color-border-light)' }}>
              <Calendar size={14} style={{ color: meta.accent }}/>
              <span style={{ fontSize:'0.72rem', fontWeight:800, color:'var(--color-text-secondary)' }}>Moving Average: Last 7 Working Days</span>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:14, background:'var(--color-surface-1)', border:'1px solid var(--color-border-light)' }}>
              <Calendar size={14} style={{ color:'var(--color-text-tertiary)' }}/>
              <span style={{ fontSize:'0.72rem', fontWeight:800, color:'var(--color-text-secondary)' }}>Compare with year:</span>
              <select value={compareYear} onChange={e => setCompareSelection({ baseYear: extYear, year: +e.target.value })} style={{ border:'none', background:'transparent', fontSize:'0.8rem', fontWeight:800, color: meta.accent, outline:'none', cursor:'pointer' }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:10, background:'var(--color-surface-2)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--color-text-tertiary)', transition:'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--color-danger-500)'; e.currentTarget.style.color='var(--color-overlay-text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='var(--color-surface-2)'; e.currentTarget.style.color='var(--color-text-tertiary)'; }}
          ><X size={18}/></button>
        </div>
      </div>

      {/* ═══ Content ═══ */}
      {loading ? (
        <div style={{ padding:60, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <Loader2 size={28} style={{ color: meta.accent, animation: 'spin 1s linear infinite' }}/>
          <span style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--color-text-tertiary)' }}>Loading comparison data...</span>
        </div>
      ) : error ? (
        <div style={{ padding:40, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <AlertTriangle size={24} style={{ color:'var(--color-danger-500)' }}/>
          <span style={{ fontSize:'0.8rem', color:'var(--color-danger-500)' }}>{error}</span>
        </div>
      ) : data && (
        <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:24 }}>

          {/* ─── Summary Cards ─── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {(() => {
              const qtyChangePct = data.summary.year2Qty > 0
                ? +(((data.summary.year1Qty - data.summary.year2Qty) / data.summary.year2Qty) * 100).toFixed(1)
                : (data.summary.year1Qty > 0 ? 100 : 0);

              const summaryCards = [
                {
                  label: cardType === 'today' 
                    ? "Today's Orders" 
                    : cardType === 'wip'
                    ? `WIP Orders (${year1})`
                    : `${year1} Orders`,
                  value: data.summary.year1Total,
                  color: meta.accent,
                  badge: cardType === 'wip' ? undefined : data.summary.changePct
                },
                {
                  label: cardType === 'today' 
                    ? "7d Work Average" 
                    : cardType === 'wip'
                    ? `WIP Orders (${year2})`
                    : `${year2} Orders`,
                  value: data.summary.year2Total,
                  color: 'var(--color-text-secondary)',
                  badge: undefined
                },
                {
                  label: cardType === 'today' 
                    ? "Today's Piece Qty" 
                    : cardType === 'wip'
                    ? `WIP Pieces (${year1})`
                    : `${year1} Qty`,
                  value: data.summary.year1Qty,
                  color: meta.accent,
                  badge: cardType === 'wip' ? undefined : qtyChangePct
                },
                {
                  label: cardType === 'today' 
                    ? "7d Work Average Qty" 
                    : cardType === 'wip'
                    ? `WIP Pieces (${year2})`
                    : `${year2} Qty`,
                  value: data.summary.year2Qty,
                  color: 'var(--color-text-secondary)',
                  badge: undefined
                }
              ];

              return summaryCards.map((s, i) => (
                <div key={i} style={{ padding:'16px 20px', borderRadius:8, background:'var(--color-surface-1)', border:'1px solid var(--color-border-light)', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                  <div style={{ fontSize:'0.6rem', fontWeight:800, color:'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing:'0.08em', marginBottom:6 }}>{s.label}</div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                    <div style={{ fontSize:'1.4rem', fontWeight:900, color: s.color, fontFamily:'var(--font-display)', letterSpacing:'-0.02em' }}>
                      {s.value.toLocaleString()}
                    </div>
                    {s.badge !== undefined && (
                      <ChangeBadge pct={s.badge} inverse={isInverse}/>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* ─── SVG Line Chart (Stock Style) ─── */}
          <div style={{ borderRadius:8, border:'1px solid var(--color-border-light)', overflow:'hidden', background:'var(--color-surface-0)' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--color-border-light)', display:'flex', alignItems:'center', justifyContent:'space-between', gap: 16 }}>
              <span style={{ fontSize:'0.65rem', fontWeight:800, color:'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing:'0.08em' }}>
                {cardType === 'today' ? 'Daily Actual vs Moving Average' : 'Monthly Trend comparison'}
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                {/* ─── Sleek Custom iOS-style Switch for Show Labels ─── */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ position: 'relative', width: 34, height: 18 }}>
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={e => setShowLabels(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                    />
                    <div style={{
                      width: 34,
                      height: 18,
                      borderRadius: 10,
                      background: showLabels ? 'var(--color-brand-500)' : 'var(--color-surface-2)',
                      border: '1px solid var(--color-border-light)',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    }} />
                    <div style={{
                      position: 'absolute',
                      left: showLabels ? 18 : 3,
                      top: 3,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: 'var(--color-product-canvas)',
                      boxShadow: 'var(--shadow-panel)',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'capitalize', letterSpacing: '0.04em' }}>
                    Show Numbers (Show Labels)
                  </span>
                </label>

                {cardType === 'today' ? (
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.65rem', fontWeight:700, color:'var(--color-text-secondary)' }}>
                      <svg width="20" height="6" style={{ overflow:'visible', display:'inline-block' }}>
                        <line x1="0" y1="3" x2="20" y2="3" stroke={meta.accent} strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Daily Actual
                    </span>
                    <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.65rem', fontWeight:700, color:'var(--color-text-tertiary)' }}>
                      <svg width="20" height="6" style={{ overflow:'visible', display:'inline-block' }}>
                        <line x1="0" y1="3" x2="20" y2="3" stroke={`color-mix(in srgb, ${meta.accent} 42%, transparent)`} strokeWidth="2.2" strokeDasharray="3 3" strokeLinecap="round"/>
                      </svg>
                      7d Average Baseline
                    </span>
                  </div>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.65rem', fontWeight:700, color:'var(--color-text-secondary)' }}>
                      <svg width="20" height="6" style={{ overflow:'visible', display:'inline-block' }}>
                        <line x1="0" y1="3" x2="20" y2="3" stroke={meta.accent} strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Year {year1}
                    </span>
                    <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.65rem', fontWeight:700, color:'var(--color-text-tertiary)' }}>
                      <svg width="20" height="6" style={{ overflow:'visible', display:'inline-block' }}>
                        <line x1="0" y1="3" x2="20" y2="3" stroke={`color-mix(in srgb, ${meta.accent} 42%, transparent)`} strokeWidth="2.2" strokeDasharray="3 3" strokeLinecap="round"/>
                      </svg>
                      Year {year2}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <SVGLineChart
                monthly={data.monthly}
                accentColor={meta.accent}
                year1={year1}
                year2={year2}
                cardType={cardType}
                showLabels={showLabels}
              />
            </div>
          </div>

          {/* ─── Customer / Daily Breakdown Table ─── */}
          {data.breakdown.length > 0 && (
            <div style={{ borderRadius:8, border:'1px solid var(--color-border-light)', overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--color-border-light)', display:'flex', alignItems:'center', gap:8 }}>
                <Users size={14} style={{ color:'var(--color-text-tertiary)' }}/>
                <span style={{ fontSize:'0.65rem', fontWeight:800, color:'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing:'0.08em' }}>
                  {cardType === 'today' ? 'Daily Working Days History' : 'Customer Breakdown (Top 10)'}
                </span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.75rem' }}>
                  <thead>
                    <tr style={{ background:'var(--color-surface-1)' }}>
                      {(cardType === 'today'
                        ? ['Date', 'Day of Week', 'Actual Orders', 'Average Baseline', 'Actual Qty', 'Average Qty', 'Performance']
                        : cardType === 'wip'
                        ? ['Customer', 'Customer Name', `WIP Orders (${year1})`, `WIP Orders (${year2})`, `WIP Pieces (${year1})`, `WIP Pieces (${year2})`, 'Change']
                        : ['Customer', 'Customer Name', `${year1} Orders`, `${year2} Orders`, `${year1} Qty`, `${year2} Qty`, 'Change']
                      ).map(h => (
                        <th key={h} style={{ padding:'10px 16px', textAlign: h.includes('Orders')||h.includes('Qty')||h.includes('Actual')||h.includes('Average')||h==='Change'||h==='Performance'?'right':'left', fontSize:'0.6rem', fontWeight:800, color:'var(--color-text-tertiary)', textTransform: 'capitalize', letterSpacing:'0.06em', borderBottom:'1px solid var(--color-border-light)', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.breakdown.map((r: BreakdownItem) => (
                      <tr key={r.code} style={{ borderBottom:'1px solid var(--color-border-light)', transition:'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--color-surface-1)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                      >
                        <td style={{ padding:'10px 16px', fontWeight:800, color:'var(--color-text-primary)' }}>
                          {cardType === 'today' ? new Date(r.code).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : r.code}
                        </td>
                        <td style={{ padding:'10px 16px', fontWeight:600, color:'var(--color-text-secondary)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:800, color: meta.accent }}>{r.year1.toLocaleString()}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color:'var(--color-text-primary)' }}>{r.year2.toLocaleString()}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color:'var(--color-text-primary)' }}>{r.year1Qty.toLocaleString()}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color:'var(--color-text-secondary)' }}>{r.year2Qty.toLocaleString()}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right' }}>
                          <ChangeBadge pct={r.changePct} inverse={isInverse}/>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes panelSlideDown { from { opacity:0; max-height:0; transform:translateY(-20px); } to { opacity:1; max-height:2000px; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}
