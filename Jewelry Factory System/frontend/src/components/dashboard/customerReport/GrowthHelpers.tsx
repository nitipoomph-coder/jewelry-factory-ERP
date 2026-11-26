// Growth formatting for the Customer Report Matrix (components/report/CustomerReportTable.tsx).
// growthPctInfo / growthAmtInfo hold the one Growth calculation; renderGrowthPct / renderGrowthAmt
// wrap them for the side-by-side columns, the stacked Year view uses the info functions directly.

export type GrowthTone = 'up' | 'down' | 'flat' | 'new';

export interface GrowthInfo {
  text: string;
  tone: GrowthTone;
}

const TONE_COLOR: Record<GrowthTone, string> = {
  up: 'var(--color-success-500)',
  down: 'var(--color-danger-500)',
  flat: 'var(--color-text-tertiary)',
  new: 'var(--color-success-500)',
};

/** Growth amount: base minus compare, with + or minus sign. */
export function growthAmtInfo(baseVal: number, compVal: number, fmt: (val: number) => string): GrowthInfo {
  const diff = baseVal - compVal;
  if (diff === 0) return { text: fmt(0), tone: 'flat' };
  const isUp = diff > 0;
  return { text: `${isUp ? '+' : '−'}${fmt(Math.abs(diff))}`, tone: isUp ? 'up' : 'down' };
}

/** Growth rate %: (base - compare) / compare. A customer new in the base year shows NEW. */
export function growthPctInfo(baseVal: number, compVal: number, isTrulyNew = false): GrowthInfo {
  if (compVal === 0 && baseVal === 0) return { text: '0.00%', tone: 'flat' };
  if (compVal === 0 && baseVal > 0 && isTrulyNew) return { text: 'NEW', tone: 'new' };
  if (compVal === 0 && baseVal > 0) return { text: '0.00%', tone: 'flat' };
  const pct = ((baseVal - compVal) / compVal) * 100;
  if (pct === 0) return { text: '0.00%', tone: 'flat' };
  const isUp = pct > 0;
  return { text: `${isUp ? '↑ +' : '↓ −'}${Math.abs(pct).toFixed(2)}%`, tone: isUp ? 'up' : 'down' };
}

const tintFor = (tone: GrowthTone, theme: string) => {
  if (theme !== 'royal-white') return 'transparent';
  if (tone === 'up') return 'color-mix(in srgb, var(--color-success-500) 15%, transparent)';
  if (tone === 'down') return 'color-mix(in srgb, var(--color-danger-500) 15%, transparent)';
  return 'transparent';
};

const growthNode = (info: GrowthInfo) => (
  <div style={{ width: '100%', textAlign: 'right' }}>
    <span style={{ color: TONE_COLOR[info.tone], fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>
      {info.text}
    </span>
  </div>
);

export function renderGrowthAmt(
  baseVal: number,
  compVal: number,
  fmt: (val: number) => string,
  theme: string
) {
  const info = growthAmtInfo(baseVal, compVal, fmt);
  return { bgColor: tintFor(info.tone, theme), node: growthNode(info) };
}

export function renderGrowthPct(
  baseVal: number,
  compVal: number,
  theme: string,
  isTrulyNew = false
) {
  // NEW is plain green text: no frame, no cell tint
  const info = growthPctInfo(baseVal, compVal, isTrulyNew);
  return { bgColor: tintFor(info.tone, theme), node: growthNode(info) };
}
