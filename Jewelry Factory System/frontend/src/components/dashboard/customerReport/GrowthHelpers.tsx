

export function renderGrowthAmt(
  baseVal: number,
  compVal: number,
  fmt: (val: number) => string,
  theme: string
) {
  const diff = baseVal - compVal;
  if (diff === 0) return {
    bgColor: 'transparent',
    node: (
      <div style={{ width: '100%', textAlign: 'right' }}>
        <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>{fmt(0)}</span>
      </div>
    )
  };
  const isUp = diff > 0;
  const isDown = diff < 0;
  const isRoyal = theme === 'royal-white';
  const bgColor = isRoyal
    ? (isUp ? 'color-mix(in srgb, var(--color-success-500) 15%, transparent)' : isDown ? 'color-mix(in srgb, var(--color-danger-500) 15%, transparent)' : 'transparent')
    : 'transparent';
  const textColor = isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)';
  const sign = isUp ? '+' : isDown ? '\u2212' : '';
  const signedValue = `${sign}${fmt(Math.abs(diff))}`;
  return {
    bgColor,
    node: (
      <div style={{ width: '100%', textAlign: 'right' }}>
        <span style={{ color: textColor, fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>{signedValue}</span>
      </div>
    )
  };
}

export function renderGrowthPct(
  baseVal: number,
  compVal: number,
  theme: string,
  isTrulyNew = false
) {
  if (compVal === 0 && baseVal === 0) return {
    bgColor: 'transparent',
    node: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
        <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>0.00%</span>
      </div>
    )
  };
  if (compVal === 0 && baseVal > 0 && isTrulyNew) return {
    bgColor: theme === 'royal-white' ? 'color-mix(in srgb, var(--color-success-500) 8%, var(--color-surface-0))' : 'transparent',
    node: (
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <span style={{ background: 'color-mix(in srgb, var(--color-success-500) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-success-500) 45%, var(--color-border-light))', color: 'var(--color-success-500)', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, fontSize: 'var(--erp-text-meta)', letterSpacing: 0 }}>NEW</span>
      </div>
    )
  };
  if (compVal === 0 && baseVal > 0) return {
    bgColor: 'transparent',
    node: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
        <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>0.00%</span>
      </div>
    )
  };
  const pct = ((baseVal - compVal) / compVal) * 100;
  if (pct === 0) return {
    bgColor: 'transparent',
    node: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
        <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>0.00%</span>
      </div>
    )
  };
  const isUp = pct > 0;
  const isDown = pct < 0;
  const isRoyal = theme === 'royal-white';
  const bgColor = isRoyal
    ? (isUp ? 'color-mix(in srgb, var(--color-success-500) 15%, transparent)' : isDown ? 'color-mix(in srgb, var(--color-danger-500) 15%, transparent)' : 'transparent')
    : 'transparent';
  const textColor = isUp ? 'var(--color-success-500)' : isDown ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)';
  const sign = isUp ? '+' : isDown ? '\u2212' : '';
  const arrow = isUp ? '↑ ' : isDown ? '↓ ' : '';
  return {
    bgColor,
    node: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', gap: 2 }}>
        <span style={{ color: textColor, fontWeight: 900, fontSize: 'var(--erp-text-panel)', fontVariantNumeric: 'tabular-nums' }}>
          {arrow}{sign}{Math.abs(pct).toFixed(2)}%
        </span>
      </div>
    )
  };
}
