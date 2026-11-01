import type { CSSProperties } from "react";

/** Year-over-year change is a comparison, not a success/danger status. */
export function comparisonPctColor(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(pct) || Math.abs(pct) < 0.05) {
    return "var(--color-text-tertiary)";
  }
  return pct > 0 ? "var(--color-success-700)" : "var(--color-danger-700)";
}

export function formatSignedPct(pct: number): string {
  if (Math.abs(pct) < 0.05) return "0.0%";
  const abs = Math.abs(pct).toFixed(1);
  return pct > 0 ? `+${abs}%` : `−${abs}%`;
}

export function comparisonTextStyle(pct: number | null | undefined): CSSProperties {
  return {
    fontSize: "var(--erp-text-dense)",
    fontWeight: 800,
    color: comparisonPctColor(pct),
    letterSpacing: 0,
    background: "transparent",
    padding: 0,
  };
}
