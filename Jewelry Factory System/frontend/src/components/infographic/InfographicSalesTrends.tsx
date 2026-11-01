import { type KeyboardEvent, type ReactNode, type CSSProperties, useState } from 'react';
import { ArrowRight, Search, RefreshCw, ChevronDown, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Rectangle } from 'recharts';
import { fmtMetric, fmtQty, fmtSignedMetric, ORDER_DETAIL_COLUMNS, fmtAxis } from '../../hooks/useOrderVolumeSummaryData';
import type {
  Metric,
  TrendGranularity,
  TrendComparisonDatum,
  WeeklyComparisonGroup,
  TooltipPayloadEntry,
  DueOutlookDatum,
  ViewMode
} from '../../hooks/useOrderVolumeSummaryData';

const summaryHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 };
const summaryLabel: CSSProperties = { fontSize: 'var(--erp-text-meta)', fontWeight: 800, color: 'var(--color-text-secondary)' };
const summaryValue: CSSProperties = { fontSize: 'var(--erp-text-kpi)', fontWeight: 900, display: 'block', lineHeight: 1 };
const summaryHint: CSSProperties = { fontSize: 'var(--erp-text-micro)', fontWeight: 700, color: 'var(--color-text-tertiary)', display: 'block', marginTop: 8 };
const summaryHintUp: CSSProperties = { color: 'var(--color-success-600)' };
const summaryHintDown: CSSProperties = { color: 'var(--color-danger-600)' };
const searchBox: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 6, padding: '4px 10px' };
const searchIcon: CSSProperties = { color: 'var(--color-text-quaternary)' };
const searchInput: CSSProperties = { border: 'none', background: 'transparent', outline: 'none', fontSize: 'var(--erp-text-control)', width: 140, fontWeight: 800 };
const chipButton: CSSProperties = { background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', borderRadius: 20, padding: '4px 12px', fontSize: 'var(--erp-text-meta)', fontWeight: 800, color: 'var(--color-text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' };
const chipActive: CSSProperties = { background: 'var(--color-ui-selected)', border: '1px solid var(--color-ui-interactive)', color: 'var(--color-ui-interactive)' };
export function CustomerTrendsLoadingState({
  activeView,
  granularity,
  scopeSummary,
}: {
  activeView: ViewMode;
  granularity: TrendGranularity;
  scopeSummary: string;
}) {
  const chartBars = [42, 68, 54, 82, 46, 72, 58, 88, 62, 76, 50, 66];

  return (
    <div className={`customer-trends-page-loading customer-trends-page-loading--${activeView}`} role="status" aria-live="polite">
      <div className="customer-trends-loading-status">
        <RefreshCw size={15} className="animate-spin" aria-hidden="true" />
        <span>
          <strong>{activeView === 'overview' ? 'Loading customer trends' : 'Loading order details'}</strong>
          <small>{scopeSummary}</small>
        </span>
      </div>

      {activeView === 'overview' && (
        <section className="customer-trends-summary customer-trends-summary--loading" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="customer-trends-summary__item customer-trends-loading-metric">
              <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: `${38 + (index % 3) * 8}%` }} />
              <span className="customer-trends-skeleton customer-trends-skeleton--value" style={{ width: `${58 + (index % 2) * 12}%` }} />
              <span className="customer-trends-skeleton customer-trends-skeleton--hint" style={{ width: `${46 + (index % 3) * 9}%` }} />
            </div>
          ))}
        </section>
      )}

      <div className="customer-trends-viewbar customer-trends-loading-viewbar" aria-hidden="true">
        <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 86 }} />
        <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 220 }} />
      </div>

      {activeView === 'overview' ? (
        <section className={`customer-trends-overview customer-trends-overview--${granularity}`} aria-hidden="true">
          <div className="customer-trends-overview__header">
            <div>
              <h2>{granularity === 'monthly' ? 'Monthly Comparison' : 'Weekly Comparison'}</h2>
              <span>Preparing selected period data</span>
            </div>
          </div>
          <div className={`customer-trends-overview-loading customer-trends-overview-loading--${granularity}`}>
            <div className="customer-trends-loading-panel customer-trends-loading-panel--chart">
              <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 120 }} />
              {granularity === 'monthly' ? (
                <div className="customer-trends-loading-chart" aria-hidden="true">
                  {chartBars.map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
                </div>
              ) : (
                <div className="customer-trends-loading-list">
                  {Array.from({ length: 6 }, (_, index) => (
                    <span key={index}><i /><i /><i /></span>
                  ))}
                </div>
              )}
            </div>
            <div className="customer-trends-loading-panel customer-trends-loading-panel--contribution">
              <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 110 }} />
              <div className="customer-trends-loading-list">
                {Array.from({ length: 5 }, (_, index) => (
                  <span key={index}><i /><i /><i /></span>
                ))}
              </div>
            </div>
            <div className="customer-trends-loading-panel customer-trends-loading-panel--due">
              <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 124 }} />
              <div className="customer-trends-loading-due-grid">
                {Array.from({ length: 8 }, (_, index) => <span key={index}><i /><i /></span>)}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="sales-dense-panel customer-trends-loading-details" aria-hidden="true">
          <div className="sales-dense-panel__header">
            <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 96 }} />
            <span className="customer-trends-skeleton customer-trends-skeleton--label" style={{ width: 180 }} />
          </div>
          <div className="content-scrollbar sales-dense-scroll">
            <table className="sales-dense-table" style={{ width: '100%', minWidth: 1536 }}>
              <thead>
                <tr>
                  {ORDER_DETAIL_COLUMNS.map(([head, width], index) => (
                    <th
                      key={head}
                      className={index >= 21 ? 'sales-dense-table__number' : undefined}
                      style={{ width: Number(width) }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody><TableSkeletonRows columns={ORDER_DETAIL_COLUMNS.length} rows={13} /></tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export function InteractiveTrendBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  year,
  series,
  metric,
  fillColor,
  onActivate,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: TrendComparisonDatum;
  year: string;
  series: 'report' | 'compare';
  metric: Metric;
  fillColor: string;
  onActivate: (year: string, periodNumber: number | undefined) => void;
}) {
  const value = Number(payload?.[series] || 0);
  if (value <= 0 || width <= 0 || height <= 0 || !payload) return <g />;
  const label = `${payload.label} ${year}, ${fmtMetric(value, metric)}`;
  const activate = () => onActivate(year, payload.periodNumber);

  return (
    <Rectangle
      className="customer-trends-chart-segment"
      x={x}
      y={y}
      width={width}
      height={height}
      radius={[0, 0, 0, 0]}
      fill={fillColor}
      role="button"
      tabIndex={0}
      aria-label={`${label}. Open order details.`}
      onClick={activate}
      onKeyDown={(event: KeyboardEvent<SVGElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      }}
    >
      <title>{label}</title>
    </Rectangle>
  );
}

export function TrendComparisonTooltip({ active, payload, label, metric, reportYear, compareYear }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string | number; metric: Metric; reportYear: string; compareYear?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const reportValue = Number(point?.report || 0);
  const compareValue = Number(point?.compare || 0);
  const delta = reportValue - compareValue;
  const hasCompare = !!compareYear && compareValue > 0;


  return (
    <div className="customer-trends-tooltip">
      <div className="customer-trends-tooltip__header">
        <strong>{label}</strong>
        {hasCompare && <span className={delta < 0 ? 'is-down' : delta > 0 ? 'is-up' : undefined}>{fmtSignedMetric(delta, metric)}</span>}
      </div>
      <div className="customer-trends-tooltip__row">
        <span><i style={{ background: 'var(--color-brand-500)' }} />{reportYear}</span>
        <strong>{fmtMetric(reportValue, metric)}</strong>
        <small>Report</small>
      </div>
      {hasCompare && (
        <div className="customer-trends-tooltip__row">
          <span><i style={{ background: 'var(--color-text-quaternary)' }} />{compareYear}</span>
          <strong>{fmtMetric(compareValue, metric)}</strong>
          <small>Compare</small>
        </div>
      )}
    </div>
  );
}

export function WeeklyComparisonList({ groups, reportYear, compareYear, metric, onDrilldown }: { groups: WeeklyComparisonGroup[]; reportYear: string; compareYear?: string; metric: Metric; onDrilldown: (year: string, week: number | undefined) => void }) {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(() => groups[0]?.monthNumber ?? null);
  const hasCompare = !!compareYear;

  if (groups.length === 0) return <div className="customer-trends-chart-empty">No weekly data</div>;

  return (
    <section className="customer-trends-weekly" data-compare={hasCompare} aria-label={`Weekly comparison for ${reportYear}`}>
      <div className="customer-trends-weekly__columns" aria-hidden="true">
        <span>Month / week</span>
        <span>{reportYear || 'Report year'}</span>
        {hasCompare && <span>{compareYear}</span>}
        <span />
      </div>
      <div className="customer-trends-weekly__months">
        {groups.map(group => {
          const isExpanded = expandedMonth === group.monthNumber;
          const primaryTotal = group.weeks.reduce((sum, week) => sum + week.report, 0);
          const compareTotal = hasCompare ? group.weeks.reduce((sum, week) => sum + week.compare, 0) : 0;

          const panelId = `weekly-month-panel-${group.monthNumber}`;
          const triggerId = `weekly-month-trigger-${group.monthNumber}`;

          return (
            <section key={group.monthNumber} className="customer-trends-weekly__month">
              <button
                id={triggerId}
                type="button"
                className="customer-trends-weekly__month-toggle"
                data-tone={hasCompare && primaryTotal !== compareTotal ? (primaryTotal > compareTotal ? 'up' : 'down') : 'flat'}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => setExpandedMonth(current => current === group.monthNumber ? null : group.monthNumber)}
              >
                <span className="customer-trends-weekly__period">
                  <strong>{group.monthLabel}</strong>
                  <small>{group.weeks.length} {group.weeks.length === 1 ? 'week' : 'weeks'}</small>
                </span>
                <span className="customer-trends-weekly__metric">
                  <small>{reportYear}</small>
                  <strong>{fmtMetric(primaryTotal, metric)}</strong>
                </span>
                {hasCompare && (
                  <span className="customer-trends-weekly__metric">
                    <small>{compareYear}</small>
                    <strong>{fmtMetric(compareTotal, metric)}</strong>
                  </span>
                )}
                <ChevronDown className="customer-trends-weekly__chevron" size={15} aria-hidden="true" />
              </button>

              {isExpanded && (
                <div id={panelId} className="customer-trends-weekly__week-list" role="region" aria-labelledby={triggerId}>
                  {group.weeks.map((week) => {
                    const weekDelta = hasCompare ? week.report - week.compare : 0;

                    return (
                      <div key={week.periodNumber} className="customer-trends-weekly__week-row" data-tone={hasCompare && weekDelta !== 0 ? (weekDelta > 0 ? 'up' : 'down') : 'flat'}>
                        <span className="customer-trends-weekly__period">
                          <strong>{week.label}</strong>
                          <small>{week.dateRange}</small>
                        </span>
                        <button type="button" className="customer-trends-weekly__metric" disabled={week.report <= 0} onClick={() => onDrilldown(reportYear, week.periodNumber)} title={`Open ${reportYear} order details`}>
                          <small>{reportYear}</small>
                          <strong>{fmtMetric(week.report, metric)}</strong>
                        </button>
                        {hasCompare && (
                          <button type="button" className="customer-trends-weekly__metric" disabled={week.compare <= 0} onClick={() => onDrilldown(compareYear!, week.periodNumber)} title={`Open ${compareYear} order details`}>
                            <small>{compareYear}</small>
                            <strong>{fmtMetric(week.compare, metric)}</strong>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

export function DueDateOutlook({ rows, year, metric, loading, error, onDrilldown, onRetry }: { rows: DueOutlookDatum[]; year: string; metric: Metric; loading: boolean; error: string; onDrilldown: (monthNumber: number) => void; onRetry: () => void }) {
  const rawTotals = rows.reduce((sum, row) => ({
    due: sum.due + (metric === 'amount' ? row.dueAmount : row.dueQty),
    shipped: sum.shipped + (metric === 'amount' ? row.shippedAmount : row.shippedQty),
    risk: sum.risk + row.overdueOrders + row.dueSoonOrders,
  }), { due: 0, shipped: 0, risk: 0 });
  const totals = {
    ...rawTotals,
    open: metric === 'amount'
      ? Math.max(Math.round(rawTotals.due) - Math.round(rawTotals.shipped), 0)
      : Math.max(rawTotals.due - rawTotals.shipped, 0),
  };
  const hasData = totals.due > 0 || totals.shipped > 0 || totals.open > 0;

  return (
    <section className="customer-trends-due" aria-labelledby="customer-trends-due-title">
      <div className="customer-trends-due__header">
        <div>
          <h3 id="customer-trends-due-title">Due Date Outlook</h3>
          <span>Customer due / {year || '-'} / {metric === 'amount' ? 'Amount' : 'Quantity'}</span>
        </div>
      </div>

      {loading ? (
        <div className="customer-trends-due__loading" aria-label="Loading due date outlook"><span /><span /></div>
      ) : error ? (
        <div role="alert" className="customer-trends-error customer-trends-due__error">
          <span>{error}</span>
          <button type="button" onClick={onRetry}><RefreshCw size={13} />Retry</button>
        </div>
      ) : !hasData ? (
        <div className="customer-trends-due__empty">No customer due data for the current scope</div>
      ) : (
        <>
          <div className="customer-trends-due__summary" aria-label="Due date totals">
            <span><small>Due</small><strong>{fmtMetric(totals.due, metric)}</strong></span>
            <span><small>Shipped</small><strong>{fmtMetric(totals.shipped, metric)}</strong></span>
            <span><small>Open</small><strong>{fmtMetric(totals.open, metric)}</strong></span>
            <span data-tone={totals.risk > 0 ? 'down' : 'flat'}><small>At risk</small><strong>{fmtQty(totals.risk)} orders</strong></span>
          </div>
          <div className="customer-trends-due__rows">
            {rows.map(row => {
              const due = metric === 'amount' ? row.dueAmount : row.dueQty;
              const shipped = metric === 'amount' ? row.shippedAmount : row.shippedQty;
              const open = metric === 'amount' ? row.openAmount : row.openQty;
              const progress = due > 0 ? Math.min((shipped / due) * 100, 100) : 0;
              const riskLabel = row.overdueOrders > 0
                ? `${fmtQty(row.overdueOrders)} overdue`
                : row.dueSoonOrders > 0
                  ? `${fmtQty(row.dueSoonOrders)} due soon`
                  : open > 0
                    ? 'Scheduled'
                    : due > 0
                      ? 'Complete'
                      : 'No due';
              const riskTone = row.overdueOrders > 0 ? 'down' : row.dueSoonOrders > 0 ? 'warning' : open > 0 ? 'neutral' : 'up';
              return (
                <button key={row.monthNumber} type="button" className="customer-trends-due-row" disabled={due <= 0} onClick={() => onDrilldown(row.monthNumber)} aria-label={`Open customer due order details for ${row.monthLabel} ${year}`}>
                  <span className="customer-trends-due-row__month"><strong>{row.monthLabel}</strong><small>{year}</small></span>
                  <span className="customer-trends-due-row__progress"><i style={{ width: `${progress}%` }} /><small>{progress.toFixed(0)}% shipped</small></span>
                  <span><small>Due</small><strong>{fmtMetric(due, metric)}</strong></span>
                  <span><small>Shipped</small><strong>{fmtMetric(shipped, metric)}</strong></span>
                  <span><small>Open</small><strong>{fmtMetric(open, metric)}</strong></span>
                  <span className="customer-trends-due-row__risk" data-tone={riskTone}><small>Status</small><strong>{riskLabel}</strong></span>
                  <ArrowRight size={13} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export function TrendComparisonChart({ data, reportYear, compareYear, metric, granularity, onDrilldown }: { data: TrendComparisonDatum[]; reportYear: string; compareYear?: string; metric: Metric; granularity: TrendGranularity; onDrilldown: (year: string, periodNumber: number | undefined) => void }) {
  const hasData = data.some(point => point.report > 0);
  const hasCompare = !!compareYear && data.some(point => point.compare > 0);
  const intervalLabel = granularity === 'monthly' ? 'Monthly' : 'Weekly';
  const canvasWidth = granularity === 'weekly' ? data.length * 44 : '100%';
  return (
    <section className="customer-trends-comparison-chart" aria-label={`${intervalLabel} comparison for ${reportYear}`}>
      <div className="customer-trends-comparison-chart__legend">
        <span><i style={{ background: 'var(--color-brand-500)' }} /><small>Report</small><strong>{reportYear || '-'}</strong></span>
        {hasCompare && <span><i style={{ background: 'var(--color-text-quaternary)' }} /><small>Compare</small><strong>{compareYear}</strong></span>}
      </div>
      <div className="customer-trends-comparison-chart__scroll content-scrollbar">
        {!hasData ? (
          <div className="customer-trends-chart-empty">No data</div>
        ) : (
          <div className="customer-trends-comparison-chart__canvas" style={{ width: canvasWidth }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barCategoryGap="26%" barGap={0} margin={{ top: 8, right: 10, left: 0, bottom: 2 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border-light)" strokeDasharray="3 3" opacity={0.7} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} interval={0} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10, fontWeight: 800 }} dy={7} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value: number) => fmtAxis(value, metric)} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10, fontWeight: 750 }} width={58} />
                <Tooltip content={<TrendComparisonTooltip metric={metric} reportYear={reportYear} compareYear={compareYear} />} cursor={{ fill: 'color-mix(in srgb, var(--color-brand-500) 6%, transparent)' }} />
                {hasCompare && <Bar dataKey="compare" name={compareYear} fill="var(--color-text-quaternary)" isAnimationActive={false} shape={<InteractiveTrendBar year={compareYear!} series="compare" metric={metric} fillColor="var(--color-text-quaternary)" onActivate={onDrilldown} />} />}
                <Bar dataKey="report" name={reportYear} fill="var(--color-brand-500)" isAnimationActive={false} shape={<InteractiveTrendBar year={reportYear} series="report" metric={metric} fillColor="var(--color-brand-500)" onActivate={onDrilldown} />} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}

const searchButton: CSSProperties = { position: 'absolute', right: 4, width: 22, height: 22, display: 'grid', placeItems: 'center', border: '1px solid var(--color-border-light)', borderRadius: 5, background: 'var(--color-surface-1)', color: 'var(--color-text-tertiary)', cursor: 'pointer' };

export function SearchBox({ value, onChange, onKeyDown, onClear }: { value: string; onChange: (value: string) => void; onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void; onClear: () => void }) {
  return (
    <label style={searchBox}>
      <Search size={14} style={searchIcon} />
      <input value={value} onChange={event => onChange(event.target.value)} onKeyDown={onKeyDown} placeholder="Search order, item, customer" style={searchInput} />
      {value && <button type="button" onClick={onClear} title="Clear search" style={searchButton}><X size={13} /></button>}
    </label>
  );
}
export function SummaryMetric({ label, value, hint, tone, muted, control }: { label: ReactNode; value: string; hint: string; tone?: 'up' | 'down'; muted?: boolean; control?: ReactNode }) {
  const valueColor = muted ? 'var(--color-text-quaternary)' : tone === 'up' ? 'var(--color-success-500)' : tone === 'down' ? 'var(--color-danger-500)' : 'var(--color-text-primary)';
  return (
    <div className="customer-trends-summary__item">
      <div style={summaryHeader}>
        <span style={summaryLabel}>{label}</span>
        {control}
      </div>
      <strong style={{ ...summaryValue, color: valueColor }}>{value}</strong>
      <span style={{ ...summaryHint, ...(tone === 'up' ? summaryHintUp : tone === 'down' ? summaryHintDown : null) }}>{hint}</span>
    </div>
  );
}




export function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ ...chipButton, ...(active ? chipActive : null) }}
    >
      {label}
    </button>
  );
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <tr><td colSpan={colSpan} className="sales-dense-empty">{label}</td></tr>;
}


export function TableSkeletonRows({ columns, rows = 8 }: { columns: number; rows?: number }) {
  const widths = [72, 46, 58, 64, 54, 76, 66, 50, 60];
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <td key={columnIndex}>
              <span className="sales-dense-skeleton" style={{ width: `${widths[(rowIndex + columnIndex) % widths.length]}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
