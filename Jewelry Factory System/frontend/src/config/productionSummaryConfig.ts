// src/config/productionSummaryConfig.ts
// SSOT for Production Summary Dashboard (Year / Week / Month)

// ─── Production Steps (11 departments) ──────────────────────────────────────

export interface ProductionStep {
  code: string;       // Table prefix (GR, TB, AS, …)
  nameEN: string;     // English display name
  nameTH: string;     // Thai display name
}

export const PRODUCTION_STEPS: ProductionStep[] = [
  { code: 'GR', nameEN: 'Grind',          nameTH: 'Stone Setting' },
  { code: 'TB', nameEN: 'Tumbling',       nameTH: 'Sifting' },
  { code: 'AS', nameEN: 'Assemble',       nameTH: 'Assembly' },
  { code: 'LS', nameEN: 'Laser',          nameTH: 'Laser' },
  { code: 'FL', nameEN: 'Filing',         nameTH: 'Sanding' },
  { code: 'LP', nameEN: 'Lapping',        nameTH: 'Cutting' },
  { code: 'EP', nameEN: 'Epoxy',          nameTH: 'Epoxy' },
  { code: 'PL', nameEN: 'Polish',         nameTH: 'Polishing' },
  { code: 'CP', nameEN: 'Copper Plating', nameTH: 'Copper Plating' },
  { code: 'IQ', nameEN: 'IQC',            nameTH: 'QC' },
  { code: 'PT', nameEN: 'Plating',        nameTH: 'Plating' },
];

// ─── Production Modes ───────────────────────────────────────────────────────

export interface ProductionMode {
  key: string;
  label: string;
  labelTH: string;
}

export const PRODUCTION_MODES: ProductionMode[] = [
  { key: 'good',    label: 'Good Output',     labelTH: 'Completed Qty/Send Work' },
  { key: 'receive', label: 'Receive',         labelTH: 'Received Qty' },
  { key: 'bbs',     label: 'BBS Output',      labelTH: 'Bangle completed qty' },
  { key: 'nonbbs',  label: 'Non-BBS Output',  labelTH: 'Completed qty (excl. bangle)' },
];

// ─── View Modes ─────────────────────────────────────────────────────────────

export type ViewMode = 'year' | 'week' | 'month';

export const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: 'year',  label: 'Year' },
  { key: 'week',  label: 'Week' },
  { key: 'month', label: 'Month' },
];

// ─── Customer Groups (3 groups for Production Summary) ──────────────────────

export interface ProdCustomerGroup {
  id: string;
  label: string;
  custCodes: string[];
  color: string;  // CSS color value for charts
}

export const PROD_CUSTOMER_GROUPS: ProdCustomerGroup[] = [
  {
    id: 'N008',
    label: 'N008',
    custCodes: ['N008','N044','N048','N064','N065','N066','N067','N068','N069','N070','N071','N072','N073','N074','N075'],
    color: 'var(--color-customer-group-n008)',
  },
  {
    id: 'N098',
    label: 'N098',
    custCodes: ['N098'],
    color: 'var(--color-customer-group-n098)',
  },
  {
    id: 'N051',
    label: 'N051',
    custCodes: ['N051'],
    color: 'var(--color-customer-group-n051)',
  },
];

// Flat list of all customer codes used in SQL IN clause
export const ALL_PROD_CUST_CODES: string[] = PROD_CUSTOMER_GROUPS.flatMap(g => g.custCodes);

// ─── Chart Line Colors ──────────────────────────────────────────────────────

export const CHART_COLORS = {
  total: 'var(--color-chart-1)',
  avg:   'var(--color-chart-2)',
} as const;

// ─── Month Labels ───────────────────────────────────────────────────────────

export const MONTH_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const;
export const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const;

// ─── Year Range ─────────────────────────────────────────────────────────────

export const YEAR_MIN = 2026;

export function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 1;
  const arr: number[] = [];
  for (let y = YEAR_MIN; y <= maxYear; y++) arr.push(y);
  return arr;
}

// ─── NiceNum Algorithm (auto-scale Y axis) ──────────────────────────────────

export function niceNum(x: number): number {
  if (x <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / mag;
  let nf: number;
  if (f <= 1)        nf = 1;
  else if (f <= 2)   nf = 2;
  else if (f <= 2.5) nf = 2.5;
  else if (f <= 5)   nf = 5;
  else               nf = 10;
  return nf * mag;
}

// ─── Format helpers ─────────────────────────────────────────────────────────

/** Format number with comma separator, no decimal. Zero shows "-" */
export function fmtQty(v: number | null | undefined): string {
  if (v == null || v === 0) return '-';
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Format Avg. (can have 1 decimal) */
export function fmtAvg(v: number | null | undefined): string {
  if (v == null || v === 0) return '-';
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
