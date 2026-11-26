// Customer Report Matrix table (page: pages/CustomerReportPage.tsx).
// - One flat surface: no frame around the table, hairlines only. The table body is the only scroll area;
//   the header rows, the customer column and the Total row stay pinned.
// - Every view (Year, Month, Week, Day) is built from one column list (buildColumns), so headers, body,
//   totals and resize handles always line up.
// - Column widths: hooks/useColumnWidths (drag a header edge, double-click to reset), saved per user and
//   per view. Width keys use the year position (y0 = newest), not the year value, so a saved width
//   still applies after the period moves to the next year.
import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, DollarSign, Hash, Search, X } from 'lucide-react';
import { ErpButton, ErpSegmentedControl } from '../ui/ErpButtons';
import { useColumnWidths } from '../../hooks/useColumnWidths';
import { growthAmtInfo, growthPctInfo } from '../dashboard/customerReport/GrowthHelpers';
import './CustomerReportTable.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type MatrixViewMode = 'ytd' | 'monthly' | 'weekly' | 'daily';

interface CustomerReportRow extends Record<string, unknown> {
  id: string;
  label: string;
  topItem?: string;
  topItemQty?: number;
}

interface GrowthPair {
  a: string;
  b: string;
}

interface CustomerReportTableProps {
  loading: boolean;
  baseYear: string;
  viewMode: MatrixViewMode;
  setViewMode?: (v: MatrixViewMode) => void;
  aggregationMode?: 'group' | 'customer';
  setAggregationMode?: (v: 'group' | 'customer') => void;
  tableData: {
    rows: CustomerReportRow[];
    colTotals: Record<string, number>;
    activeYears: string[];
  };
  displayYears: string[];
  displayMonths: string[];
  displayWeeks?: number[];
  displayDays?: string[];
  currentYearStr: string;
  currentMonthIdx: number;
  growthComparisons: GrowthPair[];
  sortOrder: 'desc' | 'asc';
  setSortOrder: (v: 'desc' | 'asc') => void;
  metric: string;
  setMetric?: (v: 'amount' | 'qty') => void;
  fmt: (val: number) => string;
  renderGrowthAmt: (baseVal: number, compVal: number) => { node: React.ReactNode, bgColor: string };
  renderGrowthPct: (baseVal: number, compVal: number, isTrulyNew?: boolean) => { node: React.ReactNode, bgColor: string };
  searchQuery?: string;
  setSearchQuery?: (value: string) => void;
}

/** One year line inside a stacked cell. */
interface StackValue {
  year: string;
  field: string;
  previous: boolean;
  future: boolean;
}

/** One Growth line inside a stacked cell (newer year a vs older year b). */
interface StackGrowth {
  a: string;
  b: string;
  fieldA: string;
  fieldB: string;
  newFlag: string;
  future: boolean;
}

/** One data column (second header row). */
interface MatrixColumn {
  /** Width key, saved by useColumnWidths */
  key: string;
  /** stack: Year view with 2+ years, one cell holds every year on its own line plus Growth % */
  kind: 'value' | 'total' | 'growthAmt' | 'growthPct' | 'stack';
  /** stack only: the year lines, the Growth % lines, and (Total column) the Growth amount lines */
  stackValues?: StackValue[];
  stackGrowth?: StackGrowth[];
  stackAmount?: boolean;
  /** stack only: the Total column (bold text) */
  stackTotal?: boolean;
  label: string;
  title?: string;
  /** value / total: row field to show */
  field?: string;
  /** growth: newer and older row fields, and the "new customer" flag field */
  fieldA?: string;
  fieldB?: string;
  newFlag?: string;
  /** Current month (the only highlighted column; totals stand out by bold text instead) */
  current?: boolean;
  /** An older year: shown in a softer text color */
  previous?: boolean;
  /** A month that has not started yet: an empty value shows "·" instead of 0 */
  future?: boolean;
  /** First column of a header group: draws the group divider */
  groupStart?: boolean;
}

/** One header group (first header row). */
interface MatrixColumnGroup {
  key: string;
  label: string;
  sub?: string;
  span: number;
}

const CUSTOMER_KEY = 'cust';
const WIDTH = { customer: 170, value: 96, total: 112, growthAmt: 118, growthPct: 100, stack: 108, stackTotal: 132, minFit: 64 };

/** Stacked cells: one text line is 15px tall, plus 4px padding above and below. */
const STACK_LINE_HEIGHT = 15;
const stackRowHeight = (lines: number) => lines * STACK_LINE_HEIGHT + 8;

// Fonts used to measure numbers: cells use --erp-text-control (12px), Growth uses --erp-text-panel (14px).
// Measured at the heaviest weight in use (900, Total row) so no column is too narrow.
const CELL_FONT = '900 12px';
const GROWTH_FONT = '900 14px';

let measureContext: CanvasRenderingContext2D | null | undefined;

function textWidth(text: string, font: string): number {
  if (measureContext === undefined) {
    try {
      measureContext = document.createElement('canvas').getContext('2d');
    } catch {
      measureContext = null;
    }
  }
  if (!measureContext) return text.length * 8;
  const family = getComputedStyle(document.body).fontFamily || 'Roboto, sans-serif';
  measureContext.font = `${font} ${family}`;
  return measureContext.measureText(text).width;
}

/** Keeps only the longest strings seen (by length), then measures those few. */
class LongestText {
  private maxLength = 0;
  private texts = new Set<string>();

  add(text: string) {
    if (text.length > this.maxLength) {
      this.maxLength = text.length;
      this.texts = new Set([text]);
    } else if (text.length === this.maxLength && this.texts.size < 24) {
      this.texts.add(text);
    }
  }

  fit(font: string, extra: number, min: number): number {
    let widest = 0;
    this.texts.forEach(t => { widest = Math.max(widest, textWidth(t, font)); });
    return Math.max(min, Math.ceil(widest + extra));
  }
}

/** Sum of every field the columns use (value, total and both sides of a growth pair). */
function sumColumnFields(rows: Record<string, unknown>[], columns: MatrixColumn[]): Record<string, number> | null {
  if (rows.length === 0) return null;
  const fields = new Set<string>();
  columns.forEach(c => {
    if (c.field) fields.add(c.field);
    if (c.fieldA) fields.add(c.fieldA);
    if (c.fieldB) fields.add(c.fieldB);
    c.stackValues?.forEach(v => fields.add(v.field));
    c.stackGrowth?.forEach(g => { fields.add(g.fieldA); fields.add(g.fieldB); });
  });
  const sums: Record<string, number> = {};
  fields.forEach(f => { sums[f] = rows.reduce((sum, r) => sum + Number(r[f] || 0), 0); });
  return sums;
}
// Width keys are prepared for up to this many years / days so saved widths are kept when the period changes.
const MAX_YEARS = 8;
const MAX_DAYS = 93;

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const WEEK_IDS = range(53).map(i => `W${i + 1}`);
const DAY_IDS = range(MAX_DAYS).map(i => `d${i}`);

function buildDefaultWidths(viewMode: MatrixViewMode): Record<string, number> {
  const widths: Record<string, number> = { [CUSTOMER_KEY]: WIDTH.customer };
  const years = range(MAX_YEARS);
  const growths = range(MAX_YEARS - 1);
  if (viewMode === 'ytd') {
    years.forEach(yi => {
      MONTHS.forEach(m => { widths[`y${yi}_${m}`] = WIDTH.value; });
      widths[`y${yi}_total`] = WIDTH.total;
    });
    growths.forEach(gi => {
      widths[`g${gi}_amt`] = WIDTH.growthAmt;
      widths[`g${gi}_pct`] = WIDTH.growthPct;
    });
    // Year view with 2+ years: one stacked column per month plus one Total column
    MONTHS.forEach(m => { widths[`s_${m}`] = WIDTH.stack; });
    widths.s_total = WIDTH.stackTotal;
  }
  const periodIds = viewMode === 'ytd' ? [] : viewMode === 'monthly' ? MONTHS : viewMode === 'weekly' ? WEEK_IDS : DAY_IDS;
  periodIds.forEach(p => {
    years.forEach(yi => { widths[`${p}_y${yi}`] = WIDTH.value; });
    growths.forEach(gi => {
      widths[`${p}_g${gi}_amt`] = WIDTH.growthAmt;
      widths[`${p}_g${gi}_pct`] = WIDTH.growthPct;
    });
  });
  years.forEach(yi => { widths[`tot_y${yi}`] = WIDTH.total; });
  return widths;
}

const DEFAULT_WIDTHS: Record<MatrixViewMode, Record<string, number>> = {
  ytd: buildDefaultWidths('ytd'),
  monthly: buildDefaultWidths('monthly'),
  weekly: buildDefaultWidths('weekly'),
  daily: buildDefaultWidths('daily'),
};

interface BuildColumnsInput {
  viewMode: MatrixViewMode;
  years: string[];
  months: string[];
  weeks: number[];
  days: string[];
  growth: GrowthPair[];
  metric: string;
  currentYearStr: string;
  currentMonthIdx: number;
  /** Stacked Year view: the one older year compared with the newest year */
  stackCompare: string;
}

function buildColumns({ viewMode, years, months, weeks, days, growth, metric, currentYearStr, currentMonthIdx, stackCompare }: BuildColumnsInput) {
  const groups: MatrixColumnGroup[] = [];
  const columns: MatrixColumn[] = [];
  const newestYear = years.reduce((max, yr) => (Number(yr) > Number(max) ? yr : max), years[0] || '');
  const isCurrentMonth = (yr: string, m: string) => yr === currentYearStr && MONTHS.indexOf(m) === currentMonthIdx;
  const isFutureMonth = (yr: string, m: string) =>
    Number(yr) > Number(currentYearStr) || (yr === currentYearStr && MONTHS.indexOf(m) > currentMonthIdx);
  const pairLabel = (pair: GrowthPair, base: string) => (growth.length > 1 ? `${base} vs ${pair.b}` : base);

  // Year view, 2+ years: one stacked cell per month with always 3 lines (newest year, one compare year,
  // Growth %), so all 12 months fit one screen. With 3+ years the toolbar picks the compare year.
  // Growth amount shows on hover; the Total column also lists it.
  if (viewMode === 'ytd' && years.length > 1) {
    const compareYear = years.includes(stackCompare) && stackCompare !== newestYear
      ? stackCompare
      : years.filter(yr => yr !== newestYear).sort((a, b) => Number(b) - Number(a))[0];
    const stackYears = [newestYear, compareYear];
    // Growth stays optional: no Growth line when every comparison was removed
    const stackPairs: GrowthPair[] = growth.length > 0 ? [{ a: newestYear, b: compareYear }] : [];
    const legend = [...stackYears, ...stackPairs.map(() => '%')].join(' / ');
    const legendTitle = [
      `${newestYear} (bold)`,
      compareYear,
      ...stackPairs.map(pair => `Growth % ${pair.a} vs ${pair.b}`),
    ].join(', ');
    const stackGrowth = (suffix: string, month?: string): StackGrowth[] => stackPairs.map(pair => ({
      a: pair.a,
      b: pair.b,
      fieldA: `${pair.a}_${suffix}`,
      fieldB: `${pair.b}_${suffix}`,
      newFlag: `isTrulyNew_${pair.a}`,
      // the newer year's month has not started: no growth to show yet
      future: month ? isFutureMonth(pair.a, month) : false,
    }));
    months.forEach(m => {
      groups.push({ key: `s_${m}`, label: m, span: 1 });
      columns.push({
        key: `s_${m}`, kind: 'stack', label: legend, title: `${m}: ${legendTitle}`,
        current: isCurrentMonth(newestYear, m), groupStart: true,
        stackValues: stackYears.map(yr => ({ year: yr, field: `${yr}_${m}`, previous: yr !== newestYear, future: isFutureMonth(yr, m) })),
        stackGrowth: stackGrowth(m, m),
      });
    });
    groups.push({ key: 's_total', label: metric === 'qty' ? 'Grand Total QTY' : 'Grand Total Sales', span: 1 });
    columns.push({
      key: 's_total', kind: 'stack', label: stackPairs.length > 0 ? `${legend} / Growth` : legend,
      title: `Year total: ${legendTitle}${stackPairs.length > 0 ? ', Growth amount' : ''}`,
      groupStart: true, stackTotal: true, stackAmount: true,
      stackValues: stackYears.map(yr => ({ year: yr, field: `${yr}_total`, previous: yr !== newestYear, future: false })),
      stackGrowth: stackGrowth('total'),
    });
    return { groups, columns };
  }

  // Year view, one year: one year block (months + Total).
  if (viewMode === 'ytd') {
    years.forEach((yr, yi) => {
      const previous = yr !== newestYear;
      groups.push({ key: `y${yi}`, label: yr, span: months.length + 1 });
      months.forEach((m, mi) => {
        columns.push({
          key: `y${yi}_${m}`, kind: 'value', label: m, field: `${yr}_${m}`,
          current: isCurrentMonth(yr, m), previous, future: isFutureMonth(yr, m), groupStart: mi === 0,
        });
      });
      columns.push({
        key: `y${yi}_total`, kind: 'total', label: 'Total', field: `${yr}_total`,
        previous, groupStart: months.length === 0,
      });
    });
    growth.forEach((pair, gi) => {
      groups.push({ key: `g${gi}`, label: 'Growth', sub: `${pair.a} vs ${pair.b}`, span: 2 });
      const fields = { fieldA: `${pair.a}_total`, fieldB: `${pair.b}_total`, newFlag: `isTrulyNew_${pair.a}` };
      columns.push({ key: `g${gi}_amt`, kind: 'growthAmt', label: 'Growth', title: `Growth amount (${pair.a} vs ${pair.b})`, groupStart: true, ...fields });
      columns.push({ key: `g${gi}_pct`, kind: 'growthPct', label: 'Growth %', title: `Growth rate % (${pair.a} vs ${pair.b})`, ...fields });
    });
    return { groups, columns };
  }

  // Month / Week / Day: one header group per period, with every year (and growth) inside it.
  const periods = viewMode === 'monthly'
    ? months.map(m => ({ id: m, label: m, suffix: m, month: m as string | undefined }))
    : viewMode === 'weekly'
      ? weeks.map(w => ({ id: `W${w}`, label: `W${w}`, suffix: `W${w}`, month: undefined }))
      : days.map((d, di) => {
        const [mm, dd] = d.split('-');
        return { id: `d${di}`, label: `${parseInt(dd, 10)} ${MONTHS[parseInt(mm, 10) - 1] || ''}`.trim(), suffix: `D_${d}`, month: undefined };
      });

  periods.forEach(p => {
    groups.push({ key: p.id, label: p.label, span: years.length + growth.length * 2 });
    years.forEach((yr, yi) => {
      columns.push({
        key: `${p.id}_y${yi}`, kind: 'value', label: yr, field: `${yr}_${p.suffix}`,
        current: p.month ? isCurrentMonth(yr, p.month) : false,
        previous: yr !== newestYear,
        future: p.month ? isFutureMonth(yr, p.month) : false,
        groupStart: yi === 0,
      });
    });
    growth.forEach((pair, gi) => {
      const fields = {
        fieldA: `${pair.a}_${p.suffix}`, fieldB: `${pair.b}_${p.suffix}`, newFlag: `isTrulyNew_${pair.a}`,
        // the newer year's month has not started: no growth to show yet
        future: p.month ? isFutureMonth(pair.a, p.month) : false,
      };
      columns.push({ key: `${p.id}_g${gi}_amt`, kind: 'growthAmt', label: pairLabel(pair, 'Growth'), title: `Growth amount (${pair.a} vs ${pair.b})`, ...fields });
      columns.push({ key: `${p.id}_g${gi}_pct`, kind: 'growthPct', label: pairLabel(pair, 'Growth %'), title: `Growth rate % (${pair.a} vs ${pair.b})`, ...fields });
    });
  });

  groups.push({ key: 'tot', label: metric === 'qty' ? 'Grand Total QTY' : 'Grand Total Sales', span: years.length });
  years.forEach((yr, yi) => {
    columns.push({
      key: `tot_y${yi}`, kind: 'total', label: `${yr} Total`, field: `${yr}_total`,
      previous: yr !== newestYear, groupStart: yi === 0,
    });
  });
  return { groups, columns };
}

// The Total row is pinned over the scrolling rows, so its cells must be opaque: a growth tint is laid
// over the header background there (a see-through tint let the rows below show through the text).
const growthCellStyle = (bgColor: string, isTotalRow: boolean): React.CSSProperties | undefined => {
  const tinted = bgColor && bgColor !== 'transparent';
  if (!isTotalRow) return tinted ? { background: bgColor } : undefined;
  return tinted ? { background: `linear-gradient(${bgColor}, ${bgColor}), var(--matrix-header-bg)` } : undefined;
};

const isGrowth = (col: MatrixColumn) => col.kind === 'growthAmt' || col.kind === 'growthPct';

const columnClass = (col: MatrixColumn) => [
  isGrowth(col) ? 'customer-matrix-td--growth' : 'customer-matrix-td--number',
  col.kind === 'stack' ? 'customer-matrix-td--stack' : '',
  col.kind === 'total' || col.stackTotal ? 'customer-matrix-td--total' : '',
  col.current ? 'customer-matrix-current' : '',
  col.groupStart ? 'customer-matrix-group-start' : '',
].filter(Boolean).join(' ');

type MatrixSkeletonStyle = React.CSSProperties & {
  '--matrix-skeleton-columns'?: number;
  '--matrix-skeleton-width'?: string;
};

type MatrixShellStyle = React.CSSProperties & {
  '--matrix-row-min-height'?: string;
  '--matrix-skeleton-column-width'?: string;
};

interface MatrixGridProps {
  viewMode: MatrixViewMode;
  groups: MatrixColumnGroup[];
  columns: MatrixColumn[];
  /** Rows after the search filter (shown) */
  rows: CustomerReportRow[];
  /** All rows before the search filter (used to size the columns) */
  fitRows: CustomerReportRow[];
  aggregationMode: 'group' | 'customer';
  metric: string;
  displayYears: string[];
  sortOrder: 'desc' | 'asc';
  setSortOrder: (v: 'desc' | 'asc') => void;
  fmt: (val: number) => string;
  renderGrowthAmt: CustomerReportTableProps['renderGrowthAmt'];
  renderGrowthPct: CustomerReportTableProps['renderGrowthPct'];
  onCustomerClick: (id: string) => void;
}

/** The table itself. Mounted per view (key = viewMode) so each view loads its own saved widths. */
function MatrixGrid({
  viewMode,
  groups,
  columns,
  rows,
  fitRows,
  aggregationMode,
  metric,
  displayYears,
  sortOrder,
  setSortOrder,
  fmt,
  renderGrowthAmt,
  renderGrowthPct,
  onCustomerClick,
}: MatrixGridProps) {
  const columnKeys = useMemo(() => [CUSTOMER_KEY, ...columns.map(c => c.key)], [columns]);

  // Total row: sum of the visible rows, per field used by any column.
  const totals = useMemo(() => sumColumnFields(rows, columns), [rows, columns]);

  // Starting widths fit the longest number of each column kind (all rows + Total row, so a search
  // does not make columns jump). A width the user dragged still wins over this.
  const defaultWidths = useMemo(() => {
    const isAmt = metric === 'amount';
    const allTotals = sumColumnFields(fitRows, columns) ?? {};
    const sources: Record<string, unknown>[] = [...fitRows, allTotals];
    const longest = { value: new LongestText(), total: new LongestText(), growthAmt: new LongestText() };
    // Stacked cells: month and Total columns are fitted apart (the Total column is wider)
    const stackLongest = {
      month: { value: new LongestText(), text: new LongestText() },
      total: { value: new LongestText(), text: new LongestText() },
    };
    const cellText = (val: number) => (isAmt ? fmt(val).replace('$', '') : fmt(val));
    columns.forEach(col => {
      const kind = col.kind;
      if (kind === 'growthPct') return;
      if (kind === 'stack') {
        const target = col.stackTotal ? stackLongest.total : stackLongest.month;
        sources.forEach(src => {
          col.stackValues?.forEach(v => target.value.add(cellText(Number(src[v.field] || 0))));
          col.stackGrowth?.forEach(g => {
            const a = Number(src[g.fieldA] || 0);
            const b = Number(src[g.fieldB] || 0);
            target.text.add(growthPctInfo(a, b).text);
            if (col.stackAmount) target.text.add(growthAmtInfo(a, b, fmt).text);
          });
        });
        return;
      }
      sources.forEach(src => {
        if (kind === 'growthAmt') {
          const diff = Number(src[col.fieldA!] || 0) - Number(src[col.fieldB!] || 0);
          longest.growthAmt.add(`+${fmt(Math.abs(diff))}`);
        } else {
          longest[kind].add(cellText(Number(src[col.field!] || 0)));
        }
      });
    });
    // padding 2 x 8 px + room for the resize handle; amounts also show a small "$"
    const extra = 16 + 8 + (isAmt ? 10 : 0);
    const fitted = {
      value: longest.value.fit(CELL_FONT, extra, WIDTH.minFit),
      total: longest.total.fit(CELL_FONT, extra, WIDTH.minFit),
      growthAmt: longest.growthAmt.fit(GROWTH_FONT, 16 + 8, WIDTH.minFit),
    };
    const stackFit = (s: { value: LongestText; text: LongestText }) =>
      Math.max(s.value.fit(CELL_FONT, extra, WIDTH.minFit), s.text.fit(CELL_FONT, 16 + 8, WIDTH.minFit));
    const fittedStack = { month: stackFit(stackLongest.month), total: stackFit(stackLongest.total) };
    const widths = { ...DEFAULT_WIDTHS[viewMode] };
    columns.forEach(col => {
      if (col.kind === 'stack') widths[col.key] = col.stackTotal ? fittedStack.total : fittedStack.month;
      else if (col.kind !== 'growthPct') widths[col.key] = fitted[col.kind];
    });
    return widths;
  }, [viewMode, columns, fitRows, metric, fmt]);

  const { tableRef, colRef, getWidth, tableStyle, handleProps } = useColumnWidths(
    `customer-matrix:${viewMode}`, defaultWidths, { minWidth: 56, keys: columnKeys },
  );

  const renderValue = (val: number, col: { future?: boolean }) => {
    if (col.future && val === 0) {
      return <span className="customer-matrix-future" title="Not started yet">·</span>;
    }
    const isAmt = metric === 'amount';
    const str = fmt(val);
    return (
      <span className="customer-matrix-cell-value">
        {isAmt && <span className="customer-matrix-currency">$</span>}
        <span>{isAmt ? str.replace('$', '') : str}</span>
      </span>
    );
  };

  // Stacked cell: one line per year (newest first, bold), then Growth % (NEW as plain text), and in the
  // Total column the Growth amount too. Hovering a month cell shows its Growth amount.
  const renderStackCell = (col: MatrixColumn, source: Record<string, unknown>, isTotalRow: boolean) => {
    const amountTips: string[] = [];
    const growthLines: React.ReactNode[] = [];
    const amountLines: React.ReactNode[] = [];
    col.stackGrowth?.forEach((g, gi) => {
      if (g.future) {
        growthLines.push(<span key={`g${gi}`} className="customer-matrix-stack-line customer-matrix-future">·</span>);
        return;
      }
      const a = Number(source[g.fieldA] || 0);
      const b = Number(source[g.fieldB] || 0);
      const pct = growthPctInfo(a, b, !isTotalRow && Boolean(source[g.newFlag]));
      const amt = growthAmtInfo(a, b, fmt);
      amountTips.push(`Growth ${g.a} vs ${g.b}: ${amt.text} (${pct.text})`);
      growthLines.push(
        <span key={`g${gi}`} className={`customer-matrix-stack-line customer-matrix-growth customer-matrix-growth--${pct.tone}`}>{pct.text}</span>,
      );
      if (col.stackAmount) {
        amountLines.push(
          <span key={`a${gi}`} className={`customer-matrix-stack-line customer-matrix-growth customer-matrix-growth--${amt.tone}`}>{amt.text}</span>,
        );
      }
    });
    return (
      <td key={col.key} className={`customer-matrix-td ${columnClass(col)}`} title={amountTips.length > 0 ? amountTips.join('\n') : undefined}>
        <div className="customer-matrix-stack">
          {col.stackValues?.map(v => {
            const val = Number(source[v.field] || 0);
            const tone = val === 0 ? 'customer-matrix-stack-line--zero' : v.previous ? 'customer-matrix-stack-line--previous' : 'customer-matrix-stack-line--newest';
            return <span key={v.year} className={`customer-matrix-stack-line ${tone}`}>{renderValue(val, v)}</span>;
          })}
          {growthLines}
          {amountLines}
        </div>
      </td>
    );
  };

  const renderCell = (col: MatrixColumn, source: Record<string, unknown>, isTotalRow: boolean) => {
    if (col.kind === 'stack') return renderStackCell(col, source, isTotalRow);
    if (isGrowth(col) && col.future) {
      return (
        <td key={col.key} className={`customer-matrix-td ${columnClass(col)}`}>
          <span className="customer-matrix-future" title="Not started yet">·</span>
        </td>
      );
    }
    if (isGrowth(col)) {
      const valA = Number(source[col.fieldA!] || 0);
      const valB = Number(source[col.fieldB!] || 0);
      const result = col.kind === 'growthAmt'
        ? renderGrowthAmt(valA, valB)
        : renderGrowthPct(valA, valB, !isTotalRow && Boolean(col.newFlag && source[col.newFlag]));
      return (
        <td key={col.key} className={`customer-matrix-td ${columnClass(col)}`} style={growthCellStyle(result.bgColor, isTotalRow)}>
          {result.node}
        </td>
      );
    }
    const val = Number(source[col.field!] || 0);
    const tone = val === 0 ? 'customer-matrix-td--zero' : col.previous ? 'customer-matrix-td--previous' : '';
    return (
      <td key={col.key} className={`customer-matrix-td ${columnClass(col)} ${tone}`.trim()}>
        {renderValue(val, col)}
      </td>
    );
  };

  return (
    <div className="customer-matrix-scroll content-scrollbar">
      <table ref={tableRef} className="customer-matrix-table" style={tableStyle}>
        <colgroup>
          {columnKeys.map(key => <col key={key} ref={colRef(key)} style={{ width: getWidth(key) }} />)}
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2} className="customer-matrix-th customer-matrix-th--top customer-matrix-th--customer">
              <div className="customer-matrix-sort-stack">
                <span>{aggregationMode === 'group' ? 'Customer Group' : 'Customer ID'}</span>
                <ErpButton
                  size="sm"
                  variant="ghost"
                  icon={sortOrder === 'desc' ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  title="Toggle sort order"
                >
                  {sortOrder === 'desc' ? 'High First' : 'Low First'}
                </ErpButton>
              </div>
              <span className="customer-matrix-resizer" {...handleProps(CUSTOMER_KEY, 'Customer')} />
            </th>
            {groups.map(g => (
              <th key={g.key} colSpan={g.span} className="customer-matrix-th customer-matrix-th--top customer-matrix-group-start">
                <span className="customer-matrix-group-label">{g.label}</span>
                {g.sub && <span className="customer-matrix-group-sub">{g.sub}</span>}
              </th>
            ))}
          </tr>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={`customer-matrix-th customer-matrix-th--sub ${columnClass(col)} ${col.previous ? 'customer-matrix-th--previous' : ''}`.trim()}
                title={col.title}
              >
                <span className="customer-matrix-th-label">{col.label}</span>
                <span className="customer-matrix-resizer" {...handleProps(col.key, col.title || col.label)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columnKeys.length} className="customer-matrix-empty">No customers match the current filter.</td>
            </tr>
          ) : rows.map(row => (
            <tr key={row.id} className="customer-matrix-row">
              <td className="customer-matrix-td customer-matrix-td--customer">
                <button
                  type="button"
                  className="customer-matrix-customer-link"
                  onClick={() => onCustomerClick(row.id)}
                  title={`View details for ${row.label}`}
                >
                  {row.label}
                </button>
                {viewMode === 'monthly' && metric === 'qty' && row.topItem && displayYears.some(yr => Number(row[`${yr}_total`] || 0) > 0) && (
                  <span className="customer-matrix-top-item">Top: {row.topItem} ({fmt(Number(row.topItemQty || 0))} pcs)</span>
                )}
              </td>
              {columns.map(col => renderCell(col, row, false))}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot className="customer-matrix-footer">
            <tr className="customer-matrix-row--total">
              <td className="customer-matrix-td customer-matrix-td--customer customer-matrix-footer-label">Total</td>
              {columns.map(col => renderCell(col, totals, true))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export default function CustomerReportTable({
  loading,
  baseYear,
  viewMode,
  aggregationMode = 'group',
  setAggregationMode,
  tableData,
  displayYears,
  displayMonths,
  displayWeeks,
  displayDays = [],
  currentYearStr,
  currentMonthIdx,
  growthComparisons,
  sortOrder,
  setSortOrder,
  metric,
  setMetric,
  fmt,
  renderGrowthAmt,
  renderGrowthPct,
  searchQuery = '',
  setSearchQuery,
}: CustomerReportTableProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const growth = useMemo(() => (displayYears.length > 1 ? growthComparisons : []), [displayYears.length, growthComparisons]);
  const activeGrowthCount = growth.length;

  // Stacked Year view: the newest year is compared with one older year. Default = the year the
  // Period's compare target sets, else the next newest; with 3+ years the toolbar switches it.
  const newestYear = useMemo(
    () => displayYears.reduce((max, yr) => (Number(yr) > Number(max) ? yr : max), displayYears[0] || ''),
    [displayYears],
  );
  const compareOptions = useMemo(
    () => displayYears.filter(yr => yr !== newestYear).sort((a, b) => Number(b) - Number(a)),
    [displayYears, newestYear],
  );
  const [stackCompareChoice, setStackCompareChoice] = React.useState<string | null>(null);
  const defaultStackCompare = growth.find(p => p.a === newestYear && compareOptions.includes(p.b))?.b ?? compareOptions[0] ?? '';
  const stackCompare = stackCompareChoice && compareOptions.includes(stackCompareChoice) ? stackCompareChoice : defaultStackCompare;
  const isStackedYear = viewMode === 'ytd' && displayYears.length > 1;
  const [searchDraft, setSearchDraft] = React.useState(searchQuery);
  const [appliedSearch, setAppliedSearch] = React.useState(searchQuery);
  const lastAppliedSearchRef = React.useRef(searchQuery);

  React.useEffect(() => {
    if (searchQuery !== lastAppliedSearchRef.current) {
      lastAppliedSearchRef.current = searchQuery;
      setSearchDraft(searchQuery);
      setAppliedSearch(searchQuery);
    }
  }, [searchQuery]);

  const applySearch = () => {
    const nextSearch = searchDraft.toUpperCase().trim();
    setSearchDraft(nextSearch);
    lastAppliedSearchRef.current = nextSearch;
    setAppliedSearch(nextSearch);
    setSearchQuery?.(nextSearch);
  };

  const clearSearch = () => {
    setSearchDraft('');
    lastAppliedSearchRef.current = '';
    setAppliedSearch('');
    setSearchQuery?.('');
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') applySearch();
    if (event.key === 'Escape') {
      const prev = lastAppliedSearchRef.current.toUpperCase();
      setSearchDraft(prev);
    }
  };

  const handleCustomerClick = (custId: string) => {
    const params = new URLSearchParams(searchParams);

    // Drop the opposing filter to avoid contradictions
    if (aggregationMode === 'group') {
      params.set('groups', custId);
      params.delete('customers');
    } else {
      params.set('customers', custId);
      params.delete('groups');
    }

    navigate(`/dashboard/sales-customer-detail?${params.toString()}`);
  };

  const visibleRows = useMemo(() => {
    if (!appliedSearch.trim()) return tableData.rows;
    const q = appliedSearch.trim().toUpperCase();
    return tableData.rows.filter(r =>
      String(r.id || '').toUpperCase().includes(q) ||
      String(r.label || '').toUpperCase().includes(q)
    );
  }, [tableData.rows, appliedSearch]);

  const weeks = useMemo(() => displayWeeks ?? range(53).map(i => i + 1), [displayWeeks]);
  const { groups, columns } = useMemo(() => buildColumns({
    viewMode,
    years: displayYears,
    months: displayMonths,
    weeks,
    days: displayDays,
    growth,
    metric,
    currentYearStr,
    currentMonthIdx,
    stackCompare,
  }), [viewMode, displayYears, displayMonths, weeks, displayDays, growth, metric, currentYearStr, currentMonthIdx, stackCompare]);

  // Loading skeleton: same column count and row heights as the final table.
  const skeletonYearCount = Math.max(displayYears.length, 1);
  const skeletonMonthCount = displayMonths.length > 0 ? displayMonths.length : 1;
  const skeletonColumnCount = useMemo(() => {
    const perPeriod = skeletonYearCount + activeGrowthCount * 2;
    if (viewMode === 'weekly') {
      return (displayWeeks && displayWeeks.length > 0 ? displayWeeks.length : 4) * perPeriod + skeletonYearCount;
    }
    if (viewMode === 'daily') {
      return (displayDays.length > 0 ? displayDays.length : 7) * perPeriod + skeletonYearCount;
    }
    if (viewMode === 'monthly') {
      return skeletonMonthCount * perPeriod + skeletonYearCount;
    }
    if (skeletonYearCount > 1) {
      // Year view, 2+ years: one stacked column per month, then one Total column
      return skeletonMonthCount + 1;
    }
    // 'ytd', one year
    return skeletonYearCount * (skeletonMonthCount + 1) + activeGrowthCount * 2;
  }, [viewMode, skeletonYearCount, skeletonMonthCount, activeGrowthCount, displayWeeks, displayDays]);

  const skeletonRowCount = aggregationMode === 'group' ? 4 : 10;
  const skeletonColumns = useMemo(() => range(Math.max(skeletonColumnCount, 1)), [skeletonColumnCount]);
  const skeletonRows = useMemo(() => range(skeletonRowCount), [skeletonRowCount]);
  const skeletonWidths = [54, 72, 60, 84, 66, 78, 58, 70, 88, 62, 76, 56];
  const skeletonGridStyle: MatrixSkeletonStyle = { '--matrix-skeleton-columns': skeletonColumns.length };

  // Stacked Year view (2+ years): taller rows, 2 year lines plus the Growth % line
  const stackLines = isStackedYear ? 2 + (activeGrowthCount > 0 ? 1 : 0) : 0;
  const shellStyle: MatrixShellStyle | undefined = stackLines > 0
    ? { '--matrix-row-min-height': `${stackRowHeight(stackLines)}px`, '--matrix-skeleton-column-width': `${WIDTH.stack}px` }
    : undefined;
  const skeletonCellStyle = (index: number): MatrixSkeletonStyle => ({
    '--matrix-skeleton-width': `${skeletonWidths[index % skeletonWidths.length]}%`,
  });

  if (loading) {
    return (
      <section className="customer-matrix-shell customer-matrix-shell--loading" style={shellStyle} aria-busy="true" aria-label="Loading customer report matrix">
        <div className="customer-matrix-control-bar customer-matrix-control-bar--loading">
          <span className="customer-matrix-skeleton customer-matrix-skeleton--segment" style={{ width: 112, height: 28 }} />
          <span className="customer-matrix-skeleton customer-matrix-skeleton--segment" style={{ width: 140, height: 28 }} />
          <span className="customer-matrix-skeleton customer-matrix-skeleton--search" style={{ width: 220, height: 28 }} />
          <span className="customer-matrix-skeleton" style={{ width: 68, height: 14 }} />
        </div>

        <div className="customer-matrix-scroll content-scrollbar">
          <div className="customer-matrix-loading-table" style={skeletonGridStyle}>
            <div className="customer-matrix-loading-row-grid customer-matrix-loading-row-grid--header">
              <div className="customer-matrix-loading-cell customer-matrix-loading-cell--customer customer-matrix-loading-cell--header">
                <span className="customer-matrix-skeleton customer-matrix-skeleton--customer-label" />
              </div>
              {skeletonColumns.map((columnIndex) => (
                <div key={`head_${columnIndex}`} className="customer-matrix-loading-cell customer-matrix-loading-cell--header">
                  <span className="customer-matrix-skeleton customer-matrix-skeleton--header" style={skeletonCellStyle(columnIndex)} />
                </div>
              ))}
            </div>

            <div className="customer-matrix-loading-row-grid customer-matrix-loading-row-grid--subheader">
              <div className="customer-matrix-loading-cell customer-matrix-loading-cell--customer customer-matrix-loading-cell--subheader">
                <span className="customer-matrix-skeleton customer-matrix-skeleton--sort" />
              </div>
              {skeletonColumns.map((columnIndex) => (
                <div key={`sub_${columnIndex}`} className="customer-matrix-loading-cell customer-matrix-loading-cell--subheader">
                  <span className="customer-matrix-skeleton customer-matrix-skeleton--subheader" style={skeletonCellStyle(columnIndex + 3)} />
                </div>
              ))}
            </div>

            {skeletonRows.map((rowIndex) => (
              <div key={`row_${rowIndex}`} className="customer-matrix-loading-row-grid customer-matrix-loading-row-grid--data">
                <div className="customer-matrix-loading-cell customer-matrix-loading-cell--customer">
                  <span className="customer-matrix-skeleton customer-matrix-skeleton--customer-id" style={skeletonCellStyle(rowIndex)} />
                </div>
                {skeletonColumns.map((columnIndex) => (
                  <div key={`cell_${rowIndex}_${columnIndex}`} className="customer-matrix-loading-cell">
                    <span className="customer-matrix-skeleton customer-matrix-skeleton--value" style={skeletonCellStyle(columnIndex + rowIndex)} />
                  </div>
                ))}
              </div>
            ))}

            <div className="customer-matrix-loading-row-grid customer-matrix-loading-row-grid--footer">
              <div className="customer-matrix-loading-cell customer-matrix-loading-cell--customer customer-matrix-loading-cell--footer">
                <span className="customer-matrix-skeleton" style={{ width: 48, height: 12 }} />
              </div>
              {skeletonColumns.map((columnIndex) => (
                <div key={`foot_${columnIndex}`} className="customer-matrix-loading-cell customer-matrix-loading-cell--footer">
                  <span className="customer-matrix-skeleton customer-matrix-skeleton--value" style={skeletonCellStyle(columnIndex + 8)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!baseYear) {
    return (
      <div className="customer-matrix-shell">
        <div className="customer-matrix-empty">No year selected. Please apply filters.</div>
      </div>
    );
  }

  return (
    <section className="customer-matrix-shell" style={shellStyle} aria-label="Customer report matrix">
      <div className="customer-matrix-control-bar">
        {setMetric && (
          <ErpSegmentedControl
            ariaLabel="Metric mode"
            value={metric === 'qty' ? 'qty' : 'amount'}
            onChange={(v) => setMetric(v as 'amount' | 'qty')}
            options={[
              { value: 'amount', label: 'Sales', icon: <DollarSign size={13} /> },
              { value: 'qty', label: 'Qty', icon: <Hash size={13} /> }
            ]}
          />
        )}

        {setAggregationMode && (
          <ErpSegmentedControl
            ariaLabel="Aggregation mode"
            value={aggregationMode}
            onChange={setAggregationMode}
            options={[
              { value: 'group', label: 'By Group' },
              { value: 'customer', label: 'By Customer' }
            ]}
          />
        )}

        {setSearchQuery && (
          <label className="customer-matrix-search">
            <Search size={14} />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value.toUpperCase())}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search customer"
            />
            {searchDraft.length > 0 && (
              <button
                type="button"
                onClick={clearSearch}
                className="customer-matrix-search-clear"
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </label>
        )}

        {isStackedYear && compareOptions.length > 1 && (
          <ErpSegmentedControl
            ariaLabel={`Compare ${newestYear} with`}
            value={stackCompare}
            onChange={(v) => setStackCompareChoice(v)}
            options={compareOptions.map(yr => ({ value: yr, label: `vs ${yr}` }))}
          />
        )}

        <span className="customer-matrix-count">
          {visibleRows.length} {aggregationMode === 'group' ? 'groups' : 'customers'}
        </span>
      </div>

      <MatrixGrid
        key={viewMode}
        viewMode={viewMode}
        groups={groups}
        columns={columns}
        rows={visibleRows}
        fitRows={tableData.rows}
        aggregationMode={aggregationMode}
        metric={metric}
        displayYears={displayYears}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        fmt={fmt}
        renderGrowthAmt={renderGrowthAmt}
        renderGrowthPct={renderGrowthPct}
        onCustomerClick={handleCustomerClick}
      />
    </section>
  );
}
