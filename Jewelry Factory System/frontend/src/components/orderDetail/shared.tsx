// src/components/orderDetail/shared.tsx
// Small display components shared by OrderLineTable and LineDetailDrawer.
// Formatter functions live in ./format.ts (kept out of this file so Fast Refresh only sees
// component exports here).

export function SpecItem({ label, value }: { label: string; value: unknown }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
      <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 700 }}>{label}:</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{String(value)}</span>
    </div>
  );
}

export function DataPair({ label, value }: { label: string; value: unknown }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'capitalize' }}>{label}</span>
      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>{String(value)}</span>
    </div>
  );
}
